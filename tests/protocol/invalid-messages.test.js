const {
  INBOUND_MESSAGE_TYPES,
  OUTBOUND_MESSAGE_TYPES,
  validateInboundMessage,
  validateOutboundMessage
} = require('../../src/lib/protocol');

describe('invalid-messages protocol guards', () => {
  it('documents the inbound and outbound message families required by task 2', () => {
    expect(INBOUND_MESSAGE_TYPES).toEqual([
      'register_client',
      'register_dashboard',
      'set_active_tab',
      'spread',
      'hit_confirm'
    ]);
    expect(OUTBOUND_MESSAGE_TYPES).toEqual([
      'stats_update',
      'spread_event',
      'hit_event',
      'hit'
    ]);
  });

  it('accepts valid inbound and outbound protocol messages', () => {
    expect(validateInboundMessage({
      type: 'register_dashboard'
    })).toEqual({
      ok: true,
      value: {
        type: 'register_dashboard',
        payload: undefined
      }
    });

    expect(validateInboundMessage({
      type: 'register_client',
      payload: {
        clientId: 'client-1',
        nickname: 'Alpha'
      }
    })).toEqual({
      ok: true,
      value: {
        type: 'register_client',
        payload: {
          clientId: 'client-1',
          nickname: 'Alpha'
        }
      }
    });

    expect(validateOutboundMessage({
      type: 'hit_event',
      payload: {
        spreadId: 'spread-1',
        victimClientId: 'victim-1',
        victimName: 'Victim',
        replacedTagType: 'img',
        siteDomain: 'example.com',
        deliveryMode: 'replace',
        timestamp: '2026-04-13T12:44:14.000Z'
      }
    }).ok).toBe(true);
  });

  it('rejects malformed or unknown inbound payloads without throwing', () => {
    expect(validateInboundMessage({
      type: 'register_client',
      payload: {
        nickname: 'Alpha'
      }
    })).toEqual({
      ok: false,
      error: 'payload must contain exactly: clientId, nickname'
    });

    expect(validateInboundMessage({
      type: 'spread_now',
      payload: {}
    })).toEqual({
      ok: false,
      error: 'Unknown inbound message type: spread_now'
    });

    expect(validateInboundMessage({
      type: 'hit_confirm',
      payload: {
        spreadId: 'spread-1',
        victimClientId: 'victim-1',
        victimName: 'Victim',
        replacedTagType: 'img',
        pageUrl: 'https://example.com',
        siteDomain: 'example.com',
        deliveryMode: 'embed_blocked',
        idempotencyKey: 'spread-1:victim-1'
      }
    })).toEqual({
      ok: false,
      error: 'payload.deliveryMode must be one of: replace, overlay'
    });
  });

  it('rejects malformed outbound payloads without throwing', () => {
    expect(validateOutboundMessage({
      type: 'stats_update',
      payload: {
        activeUsers: 1,
        totalSpreads: 2,
        totalHits: 3,
        peakActiveUsers: 4,
        conversionRate: 150,
        extra: true
      }
    })).toEqual({
      ok: false,
      error: 'payload contains unknown key: extra'
    });

    expect(validateOutboundMessage({
      type: 'broadcast_everything',
      payload: {}
    })).toEqual({
      ok: false,
      error: 'Unknown outbound message type: broadcast_everything'
    });
  });
});
