const {
  buildStatsUpdatePayload,
  getStateSnapshot,
  makeProcessedHitKey,
  recordHitConfirm,
  recordSpread,
  registerClient,
  registerDashboard,
  resetState,
  setActiveTab,
  unregisterClient
} = require('../../src/lib/state');
const { createStatsUpdateEvent, validateOutboundMessage } = require('../../src/lib/protocol');

describe('state protocol foundations', () => {
  beforeEach(() => {
    resetState();
  });

  it('uses clientId as identity while keeping nickname display-only', () => {
    registerClient({ clientId: 'client-1', nickname: 'Alpha' });
    registerClient({ clientId: 'client-1', nickname: 'Bravo' });

    const snapshot = getStateSnapshot({ clientId: 'client-1' });

    expect(snapshot.stats.activeUsers).toBe(1);
    expect(snapshot.clients.extensions).toEqual([
      expect.objectContaining({
        clientId: 'client-1',
        nickname: 'Bravo'
      })
    ]);
    expect(snapshot.stats.personalCounters).toEqual({
      clientId: 'client-1',
      nickname: 'Bravo',
      totalSpreads: 0,
      totalHits: 0
    });
  });

  it('counts active users from extension clients only and excludes dashboards', () => {
    registerClient({ clientId: 'extension-a', nickname: 'Alpha' });
    registerClient({ clientId: 'extension-b', nickname: 'Beta' });
    registerDashboard({ dashboardId: 'dashboard-a' });

    expect(getStateSnapshot().stats.activeUsers).toBe(2);

    unregisterClient('extension-b');

    expect(getStateSnapshot().stats.activeUsers).toBe(1);
    expect(getStateSnapshot().stats.peakActiveUsers).toBe(2);
  });

  it('tracks active tab metadata per extension client', () => {
    registerClient({ clientId: 'client-1', nickname: 'Alpha' });

    setActiveTab({
      clientId: 'client-1',
      tabId: 44,
      pageUrl: 'https://example.com/article',
      pageTitle: 'Example Article',
      siteDomain: 'example.com',
      isEligible: true,
      ineligibleReason: null
    });

    expect(getStateSnapshot().clients.extensions[0].activeTab).toEqual({
      tabId: 44,
      pageUrl: 'https://example.com/article',
      pageTitle: 'Example Article',
      siteDomain: 'example.com',
      isEligible: true,
      ineligibleReason: null,
      lastUpdatedAt: expect.any(String)
    });
  });

  it('records spreads, leaderboard inputs, and optional personal counters in stats updates', () => {
    registerClient({ clientId: 'client-1', nickname: 'Alpha' });

    recordSpread({
      spreadId: 'spread-1',
      clientId: 'client-1',
      shortsUrl: 'https://www.youtube.com/shorts/abc123',
      shortsTitle: 'Demo Shorts',
      spreaderName: 'Alpha',
      victimClientIds: ['client-2', 'client-3']
    });

    const publicStats = buildStatsUpdatePayload();
    const personalStats = buildStatsUpdatePayload({ clientId: 'client-1' });

    expect(publicStats).not.toHaveProperty('personalCounters');
    expect(personalStats.personalCounters).toEqual({
      clientId: 'client-1',
      nickname: 'Alpha',
      totalSpreads: 1,
      totalHits: 0
    });
    expect(getStateSnapshot().leaderboard.spreaders).toEqual([
      {
        name: 'Alpha',
        totalSpreads: 1
      }
    ]);
    expect(createStatsUpdateEvent(personalStats)).toEqual({
      type: 'stats_update',
      payload: personalStats
    });
    expect(validateOutboundMessage({ type: 'stats_update', payload: publicStats }).ok).toBe(true);
  });

  it('dedupes repeated hit_confirm updates for the same spread and victim identity', () => {
    registerClient({ clientId: 'spreader-1', nickname: 'Spreader' });
    registerClient({ clientId: 'victim-1', nickname: 'Victim' });

    recordSpread({
      spreadId: 'spread-1',
      clientId: 'spreader-1',
      shortsUrl: 'https://www.youtube.com/shorts/abc123',
      shortsTitle: 'Demo Shorts',
      spreaderName: 'Spreader',
      victimClientIds: ['victim-1']
    });

    const first = recordHitConfirm({
      spreadId: 'spread-1',
      victimClientId: 'victim-1',
      victimName: 'Victim',
      replacedTagType: 'img',
      pageUrl: 'https://example.com',
      siteDomain: 'example.com',
      deliveryMode: 'replace',
      idempotencyKey: 'spread-1:victim-1:1'
    });
    const second = recordHitConfirm({
      spreadId: 'spread-1',
      victimClientId: 'victim-1',
      victimName: 'Victim renamed',
      replacedTagType: 'video',
      pageUrl: 'https://example.com/again',
      siteDomain: 'example.com',
      deliveryMode: 'overlay',
      idempotencyKey: 'spread-1:victim-1:2'
    });

    expect(first).toMatchObject({ accepted: true, duplicate: false, key: makeProcessedHitKey('spread-1', 'victim-1') });
    expect(second).toMatchObject({ accepted: false, duplicate: true, key: makeProcessedHitKey('spread-1', 'victim-1') });
    expect(getStateSnapshot()).toMatchObject({
      stats: {
        totalSpreads: 1,
        totalHits: 1,
        hitsPerUser: {
          Victim: 1
        },
        hitSites: {
          'example.com': 1
        }
      }
    });
  });
});
