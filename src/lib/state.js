const MAX_SPREAD_LOG_SIZE = 200;
const SUCCESSFUL_DELIVERY_MODES = new Set(['replace', 'overlay']);

function createEmptyState() {
  return {
    extensionClients: new Map(),
    dashboards: new Map(),
    spreads: new Map(),
    processedHitKeys: new Set(),
    spreadLog: [],
    stats: {
      totalSpreads: 0,
      totalHits: 0,
      peakActiveUsers: 0,
      spreadsPerUser: {},
      hitsPerUser: {},
      hitSites: {}
    }
  };
}

const sharedState = createEmptyState();

function incrementCounter(bucket, key) {
  bucket[key] = (bucket[key] || 0) + 1;
}

function normalizeNickname(nickname, fallback) {
  if (typeof nickname === 'string' && nickname.trim()) {
    return nickname.trim();
  }

  return fallback;
}

function activeUsers() {
  return sharedState.extensionClients.size;
}

function updatePeakActiveUsers() {
  const current = activeUsers();

  if (current > sharedState.stats.peakActiveUsers) {
    sharedState.stats.peakActiveUsers = current;
  }
}

function calculateConversionRate() {
  if (sharedState.stats.totalSpreads === 0) {
    return 0;
  }

  return Number(((sharedState.stats.totalHits / sharedState.stats.totalSpreads) * 100).toFixed(2));
}

function cloneActiveTab(activeTab) {
  if (!activeTab) {
    return null;
  }

  return {
    ...activeTab
  };
}

function snapshotExtensionClient(client) {
  return {
    clientId: client.clientId,
    nickname: client.nickname,
    role: 'extension',
    connectedAt: client.connectedAt,
    activeTab: cloneActiveTab(client.activeTab),
    counters: {
      totalSpreads: client.counters.totalSpreads,
      totalHits: client.counters.totalHits
    }
  };
}

function snapshotDashboardClient(dashboard) {
  return {
    dashboardId: dashboard.dashboardId,
    role: 'dashboard',
    connectedAt: dashboard.connectedAt
  };
}

function buildTopEntries(source, valueKey, limit = 5) {
  return Object.entries(source)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([name, value]) => ({
      name,
      [valueKey]: value
    }));
}

function makeProcessedHitKey(spreadId, victimClientId) {
  return `${spreadId}::${victimClientId}`;
}

function appendSpreadLog(entry) {
  sharedState.spreadLog.unshift(entry);

  if (sharedState.spreadLog.length > MAX_SPREAD_LOG_SIZE) {
    sharedState.spreadLog.length = MAX_SPREAD_LOG_SIZE;
  }
}

function getClientCounters(clientId) {
  const client = sharedState.extensionClients.get(clientId);

  if (!client) {
    return null;
  }

  return {
    clientId,
    nickname: client.nickname,
    totalSpreads: client.counters.totalSpreads,
    totalHits: client.counters.totalHits
  };
}

function registerClient({ clientId, nickname, connectedAt = new Date().toISOString() }) {
  const existing = sharedState.extensionClients.get(clientId);
  const client = {
    clientId,
    nickname: normalizeNickname(nickname, existing?.nickname || clientId),
    connectedAt: existing?.connectedAt || connectedAt,
    activeTab: existing?.activeTab || null,
    counters: existing?.counters || {
      totalSpreads: 0,
      totalHits: 0
    }
  };

  sharedState.extensionClients.set(clientId, client);
  updatePeakActiveUsers();

  return snapshotExtensionClient(client);
}

function unregisterClient(clientId) {
  return sharedState.extensionClients.delete(clientId);
}

function registerDashboard({ dashboardId = `dashboard-${sharedState.dashboards.size + 1}`, connectedAt = new Date().toISOString() } = {}) {
  const dashboard = {
    dashboardId,
    connectedAt
  };

  sharedState.dashboards.set(dashboardId, dashboard);

  return snapshotDashboardClient(dashboard);
}

function unregisterDashboard(dashboardId) {
  return sharedState.dashboards.delete(dashboardId);
}

function setActiveTab({
  clientId,
  tabId,
  pageUrl,
  pageTitle,
  siteDomain,
  isEligible,
  lastUpdatedAt = new Date().toISOString(),
  ineligibleReason = null
}) {
  const client = sharedState.extensionClients.get(clientId);

  if (!client) {
    throw new Error(`Unknown extension client: ${clientId}`);
  }

  client.activeTab = {
    tabId,
    pageUrl,
    pageTitle,
    siteDomain,
    isEligible,
    ineligibleReason,
    lastUpdatedAt
  };

  return cloneActiveTab(client.activeTab);
}

function recordSpread({
  spreadId,
  clientId,
  shortsUrl,
  shortsTitle,
  spreaderName,
  victimClientIds = [],
  createdAt = new Date().toISOString()
}) {
  const client = sharedState.extensionClients.get(clientId);
  const displayName = normalizeNickname(spreaderName, client?.nickname || clientId);
  const spreadEntry = {
    spreadId,
    clientId,
    spreaderName: displayName,
    shortsUrl,
    shortsTitle,
    victimClientIds: [...victimClientIds],
    createdAt
  };

  sharedState.spreads.set(spreadId, spreadEntry);
  appendSpreadLog({
    type: 'spread',
    ...spreadEntry
  });

  sharedState.stats.totalSpreads += 1;
  incrementCounter(sharedState.stats.spreadsPerUser, displayName);

  if (client) {
    client.nickname = displayName;
    client.counters.totalSpreads += 1;
  }

  return {
    ...spreadEntry
  };
}

function recordHitConfirm({
  spreadId,
  victimClientId,
  victimName,
  replacedTagType,
  pageUrl,
  siteDomain,
  deliveryMode,
  idempotencyKey,
  timestamp = new Date().toISOString()
}) {
  const processedHitKey = makeProcessedHitKey(spreadId, victimClientId);

  if (sharedState.processedHitKeys.has(processedHitKey)) {
    return {
      accepted: false,
      duplicate: true,
      key: processedHitKey
    };
  }

  if (!SUCCESSFUL_DELIVERY_MODES.has(deliveryMode)) {
    return {
      accepted: false,
      duplicate: false,
      key: processedHitKey,
      reason: 'unsupported_delivery_mode'
    };
  }

  const spread = sharedState.spreads.get(spreadId);
  const client = sharedState.extensionClients.get(victimClientId);
  const displayName = normalizeNickname(victimName, client?.nickname || victimClientId);
  const hitEntry = {
    type: 'hit',
    spreadId,
    victimClientId,
    victimName: displayName,
    replacedTagType,
    pageUrl,
    siteDomain,
    deliveryMode,
    idempotencyKey,
    timestamp
  };

  sharedState.processedHitKeys.add(processedHitKey);
  appendSpreadLog(hitEntry);
  sharedState.stats.totalHits += 1;
  incrementCounter(sharedState.stats.hitsPerUser, displayName);
  incrementCounter(sharedState.stats.hitSites, siteDomain);

  if (client) {
    client.nickname = displayName;
    client.counters.totalHits += 1;
  }

  return {
    accepted: true,
    duplicate: false,
    key: processedHitKey,
    spread,
    hit: {
      ...hitEntry
    }
  };
}

function getSpreadLog(limit = MAX_SPREAD_LOG_SIZE) {
  return sharedState.spreadLog.slice(0, limit).map((entry) => ({
    ...entry,
    victimClientIds: entry.victimClientIds ? [...entry.victimClientIds] : undefined
  }));
}

function getLeaderboardSnapshot(limit = 5) {
  return {
    spreaders: buildTopEntries(sharedState.stats.spreadsPerUser, 'totalSpreads', limit),
    hitters: buildTopEntries(sharedState.stats.hitsPerUser, 'totalHits', limit),
    sites: buildTopEntries(sharedState.stats.hitSites, 'totalHits', limit)
  };
}

function buildStatsUpdatePayload({ clientId } = {}) {
  const payload = {
    activeUsers: activeUsers(),
    totalSpreads: sharedState.stats.totalSpreads,
    totalHits: sharedState.stats.totalHits,
    peakActiveUsers: sharedState.stats.peakActiveUsers,
    conversionRate: calculateConversionRate()
  };

  if (clientId) {
    const personalCounters = getClientCounters(clientId);

    if (personalCounters) {
      payload.personalCounters = personalCounters;
    }
  }

  return payload;
}

function getStateSnapshot(options = {}) {
  return {
    stats: {
      ...buildStatsUpdatePayload(options),
      spreadsPerUser: {
        ...sharedState.stats.spreadsPerUser
      },
      hitsPerUser: {
        ...sharedState.stats.hitsPerUser
      },
      hitSites: {
        ...sharedState.stats.hitSites
      }
    },
    clients: {
      extensions: Array.from(sharedState.extensionClients.values()).map(snapshotExtensionClient),
      dashboards: Array.from(sharedState.dashboards.values()).map(snapshotDashboardClient)
    },
    spreadLog: getSpreadLog(),
    logs: getSpreadLog(),
    leaderboard: getLeaderboardSnapshot()
  };
}

function resetState() {
  const nextState = createEmptyState();

  sharedState.extensionClients = nextState.extensionClients;
  sharedState.dashboards = nextState.dashboards;
  sharedState.spreads = nextState.spreads;
  sharedState.processedHitKeys = nextState.processedHitKeys;
  sharedState.spreadLog = nextState.spreadLog;
  sharedState.stats = nextState.stats;
}

module.exports = {
  MAX_SPREAD_LOG_SIZE,
  SUCCESSFUL_DELIVERY_MODES,
  sharedState,
  activeUsers,
  buildStatsUpdatePayload,
  getClientCounters,
  getLeaderboardSnapshot,
  getSpreadLog,
  getStateSnapshot,
  makeProcessedHitKey,
  recordHitConfirm,
  recordSpread,
  registerClient,
  registerDashboard,
  resetState,
  setActiveTab,
  unregisterClient,
  unregisterDashboard
};
