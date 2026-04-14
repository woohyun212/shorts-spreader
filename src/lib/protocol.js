const SUCCESSFUL_DELIVERY_MODES = ['replace', 'overlay'];
const REPLACED_TAG_TYPES = ['img', 'video'];
const INBOUND_MESSAGE_TYPES = ['register_client', 'register_dashboard', 'set_active_tab', 'spread', 'hit_confirm'];
const OUTBOUND_MESSAGE_TYPES = ['stats_update', 'spread_event', 'hit_event', 'hit'];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function ok(value) {
  return {
    ok: true,
    value
  };
}

function fail(reason) {
  return {
    ok: false,
    error: reason
  };
}

function validateExactKeys(target, allowedKeys, path) {
  if (!isPlainObject(target)) {
    return fail(`${path} must be an object`);
  }

  const sortedAllowedKeys = [...allowedKeys].sort();
  const actualKeys = Object.keys(target).sort();

  if (actualKeys.length !== sortedAllowedKeys.length || actualKeys.some((key, index) => key !== sortedAllowedKeys[index])) {
    return fail(`${path} must contain exactly: ${sortedAllowedKeys.join(', ')}`);
  }

  return ok(target);
}

function validateString(value, path) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fail(`${path} must be a non-empty string`);
  }

  return ok(value.trim());
}

function validateBoolean(value, path) {
  if (typeof value !== 'boolean') {
    return fail(`${path} must be a boolean`);
  }

  return ok(value);
}

function validateNumber(value, path) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fail(`${path} must be a number`);
  }

  return ok(value);
}

function validateInteger(value, path) {
  const numeric = validateNumber(value, path);

  if (!numeric.ok) {
    return numeric;
  }

  if (!Number.isInteger(value)) {
    return fail(`${path} must be an integer`);
  }

  return ok(value);
}

function validateOptionalString(value, path) {
  if (value === null) {
    return ok(value);
  }

  return validateString(value, path);
}

function validateIsoDateString(value, path) {
  const stringResult = validateString(value, path);

  if (!stringResult.ok) {
    return stringResult;
  }

  if (Number.isNaN(Date.parse(stringResult.value))) {
    return fail(`${path} must be a valid ISO date string`);
  }

  return ok(stringResult.value);
}

function validateUrl(value, path) {
  const stringResult = validateString(value, path);

  if (!stringResult.ok) {
    return stringResult;
  }

  try {
    return ok(new URL(stringResult.value).toString());
  } catch {
    return fail(`${path} must be a valid URL`);
  }
}

function validateEnum(value, options, path) {
  const stringResult = validateString(value, path);

  if (!stringResult.ok) {
    return stringResult;
  }

  if (!options.includes(stringResult.value)) {
    return fail(`${path} must be one of: ${options.join(', ')}`);
  }

  return ok(stringResult.value);
}

function validateRegisterClientPayload(payload) {
  const shape = validateExactKeys(payload, ['clientId', 'nickname'], 'payload');

  if (!shape.ok) {
    return shape;
  }

  const clientId = validateString(payload.clientId, 'payload.clientId');
  const nickname = validateString(payload.nickname, 'payload.nickname');

  if (!clientId.ok) {
    return clientId;
  }

  if (!nickname.ok) {
    return nickname;
  }

  return ok({
    clientId: clientId.value,
    nickname: nickname.value
  });
}

function validateRegisterDashboardPayload(payload) {
  if (payload === undefined) {
    return ok(undefined);
  }

  if (!isPlainObject(payload) || Object.keys(payload).length !== 0) {
    return fail('payload must be omitted or an empty object');
  }

  return ok(payload);
}

function validateSetActiveTabPayload(payload) {
  const shape = validateExactKeys(payload, ['clientId', 'ineligibleReason', 'isEligible', 'pageTitle', 'pageUrl', 'siteDomain', 'tabId'], 'payload');

  if (!shape.ok) {
    return shape;
  }

  const clientId = validateString(payload.clientId, 'payload.clientId');
  const tabId = validateInteger(payload.tabId, 'payload.tabId');
  const pageUrl = validateUrl(payload.pageUrl, 'payload.pageUrl');
  const pageTitle = validateString(payload.pageTitle, 'payload.pageTitle');
  const siteDomain = validateString(payload.siteDomain, 'payload.siteDomain');
  const isEligible = validateBoolean(payload.isEligible, 'payload.isEligible');
  const ineligibleReason = validateOptionalString(payload.ineligibleReason, 'payload.ineligibleReason');

  for (const result of [clientId, tabId, pageUrl, pageTitle, siteDomain, isEligible, ineligibleReason]) {
    if (!result.ok) {
      return result;
    }
  }

  return ok({
    clientId: clientId.value,
    tabId: tabId.value,
    pageUrl: pageUrl.value,
    pageTitle: pageTitle.value,
    siteDomain: siteDomain.value,
    isEligible: isEligible.value,
    ineligibleReason: ineligibleReason.value
  });
}

function validateSpreadPayload(payload) {
  const shape = validateExactKeys(payload, ['shortsTitle', 'shortsUrl', 'spreaderName'], 'payload');

  if (!shape.ok) {
    return shape;
  }

  const shortsUrl = validateUrl(payload.shortsUrl, 'payload.shortsUrl');
  const shortsTitle = validateString(payload.shortsTitle, 'payload.shortsTitle');
  const spreaderName = validateString(payload.spreaderName, 'payload.spreaderName');

  for (const result of [shortsUrl, shortsTitle, spreaderName]) {
    if (!result.ok) {
      return result;
    }
  }

  return ok({
    shortsUrl: shortsUrl.value,
    shortsTitle: shortsTitle.value,
    spreaderName: spreaderName.value
  });
}

function validateHitConfirmPayload(payload) {
  const shape = validateExactKeys(payload, ['deliveryMode', 'idempotencyKey', 'pageUrl', 'replacedTagType', 'siteDomain', 'spreadId', 'victimClientId', 'victimName'], 'payload');

  if (!shape.ok) {
    return shape;
  }

  const spreadId = validateString(payload.spreadId, 'payload.spreadId');
  const victimClientId = validateString(payload.victimClientId, 'payload.victimClientId');
  const victimName = validateString(payload.victimName, 'payload.victimName');
  const replacedTagType = validateEnum(payload.replacedTagType, REPLACED_TAG_TYPES, 'payload.replacedTagType');
  const pageUrl = validateUrl(payload.pageUrl, 'payload.pageUrl');
  const siteDomain = validateString(payload.siteDomain, 'payload.siteDomain');
  const deliveryMode = validateEnum(payload.deliveryMode, SUCCESSFUL_DELIVERY_MODES, 'payload.deliveryMode');
  const idempotencyKey = validateString(payload.idempotencyKey, 'payload.idempotencyKey');

  for (const result of [spreadId, victimClientId, victimName, replacedTagType, pageUrl, siteDomain, deliveryMode, idempotencyKey]) {
    if (!result.ok) {
      return result;
    }
  }

  return ok({
    spreadId: spreadId.value,
    victimClientId: victimClientId.value,
    victimName: victimName.value,
    replacedTagType: replacedTagType.value,
    pageUrl: pageUrl.value,
    siteDomain: siteDomain.value,
    deliveryMode: deliveryMode.value,
    idempotencyKey: idempotencyKey.value
  });
}

function validateInboundPayload(type, payload) {
  switch (type) {
    case 'register_client':
      return validateRegisterClientPayload(payload);
    case 'register_dashboard':
      return validateRegisterDashboardPayload(payload);
    case 'set_active_tab':
      return validateSetActiveTabPayload(payload);
    case 'spread':
      return validateSpreadPayload(payload);
    case 'hit_confirm':
      return validateHitConfirmPayload(payload);
    default:
      return fail(`Unsupported inbound message type: ${type}`);
  }
}

function validateMessageEnvelope(message, allowedTypes, direction, options = {}) {
  if (!isPlainObject(message)) {
    return fail('message must be an object');
  }

  const allowedKeys = options.allowMissingPayload ? ['payload', 'type'] : ['payload', 'type'];
  const actualKeys = Object.keys(message).sort();
  const hasOnlyAllowedKeys = actualKeys.every((key) => allowedKeys.includes(key));

  if (!hasOnlyAllowedKeys || !actualKeys.includes('type')) {
    return fail(`message must contain ${options.allowMissingPayload ? 'type and optional payload only' : 'exactly: payload, type'}`);
  }

  if (!options.allowMissingPayload && !actualKeys.includes('payload')) {
    return fail('message must contain exactly: payload, type');
  }

  const type = validateString(message.type, 'message.type');

  if (!type.ok) {
    return type;
  }

  if (!allowedTypes.includes(type.value)) {
    return fail(`Unknown ${direction} message type: ${type.value}`);
  }

  return ok(type.value);
}

function validateStatsUpdatePayload(payload) {
  if (!isPlainObject(payload)) {
    return fail('payload must be an object');
  }

  const allowedKeys = ['activeUsers', 'conversionRate', 'peakActiveUsers', 'personalCounters', 'totalHits', 'totalSpreads'];
  const unknownKey = Object.keys(payload).find((key) => !allowedKeys.includes(key));

  if (unknownKey) {
    return fail(`payload contains unknown key: ${unknownKey}`);
  }

  const activeUsers = validateInteger(payload.activeUsers, 'payload.activeUsers');
  const totalSpreads = validateInteger(payload.totalSpreads, 'payload.totalSpreads');
  const totalHits = validateInteger(payload.totalHits, 'payload.totalHits');
  const peakActiveUsers = validateInteger(payload.peakActiveUsers, 'payload.peakActiveUsers');
  const conversionRate = validateNumber(payload.conversionRate, 'payload.conversionRate');

  for (const result of [activeUsers, totalSpreads, totalHits, peakActiveUsers, conversionRate]) {
    if (!result.ok) {
      return result;
    }
  }

  let personalCounters;

  if (payload.personalCounters !== undefined) {
    const personalShape = validateExactKeys(payload.personalCounters, ['clientId', 'nickname', 'totalHits', 'totalSpreads'], 'payload.personalCounters');

    if (!personalShape.ok) {
      return personalShape;
    }

    const personalResults = [
      validateString(payload.personalCounters.clientId, 'payload.personalCounters.clientId'),
      validateString(payload.personalCounters.nickname, 'payload.personalCounters.nickname'),
      validateInteger(payload.personalCounters.totalSpreads, 'payload.personalCounters.totalSpreads'),
      validateInteger(payload.personalCounters.totalHits, 'payload.personalCounters.totalHits')
    ];

    for (const result of personalResults) {
      if (!result.ok) {
        return result;
      }
    }

    personalCounters = {
      clientId: payload.personalCounters.clientId,
      nickname: payload.personalCounters.nickname,
      totalSpreads: payload.personalCounters.totalSpreads,
      totalHits: payload.personalCounters.totalHits
    };
  }

  return ok({
    activeUsers: payload.activeUsers,
    totalSpreads: payload.totalSpreads,
    totalHits: payload.totalHits,
    peakActiveUsers: payload.peakActiveUsers,
    conversionRate: payload.conversionRate,
    ...(personalCounters ? { personalCounters } : {})
  });
}

function validateSpreadEventPayload(payload) {
  const shape = validateExactKeys(payload, ['shortsTitle', 'spreadId', 'spreaderName', 'timestamp', 'victimCount'], 'payload');

  if (!shape.ok) {
    return shape;
  }

  const checks = [
    validateString(payload.spreaderName, 'payload.spreaderName'),
    validateString(payload.shortsTitle, 'payload.shortsTitle'),
    validateInteger(payload.victimCount, 'payload.victimCount'),
    validateString(payload.spreadId, 'payload.spreadId'),
    validateIsoDateString(payload.timestamp, 'payload.timestamp')
  ];

  for (const result of checks) {
    if (!result.ok) {
      return result;
    }
  }

  return ok({
    spreaderName: payload.spreaderName,
    shortsTitle: payload.shortsTitle,
    victimCount: payload.victimCount,
    spreadId: payload.spreadId,
    timestamp: payload.timestamp
  });
}

function validateHitEventPayload(payload) {
  const shape = validateExactKeys(payload, ['deliveryMode', 'replacedTagType', 'siteDomain', 'spreadId', 'timestamp', 'victimClientId', 'victimName'], 'payload');

  if (!shape.ok) {
    return shape;
  }

  const checks = [
    validateString(payload.spreadId, 'payload.spreadId'),
    validateString(payload.victimClientId, 'payload.victimClientId'),
    validateString(payload.victimName, 'payload.victimName'),
    validateEnum(payload.replacedTagType, REPLACED_TAG_TYPES, 'payload.replacedTagType'),
    validateString(payload.siteDomain, 'payload.siteDomain'),
    validateEnum(payload.deliveryMode, SUCCESSFUL_DELIVERY_MODES, 'payload.deliveryMode'),
    validateIsoDateString(payload.timestamp, 'payload.timestamp')
  ];

  for (const result of checks) {
    if (!result.ok) {
      return result;
    }
  }

  return ok({
    spreadId: payload.spreadId,
    victimClientId: payload.victimClientId,
    victimName: payload.victimName,
    replacedTagType: payload.replacedTagType,
    siteDomain: payload.siteDomain,
    deliveryMode: payload.deliveryMode,
    timestamp: payload.timestamp
  });
}

function validateHitPayload(payload) {
  const shape = validateExactKeys(payload, ['shortsId', 'shortsTitle', 'spreadId', 'spreaderName'], 'payload');

  if (!shape.ok) {
    return shape;
  }

  const checks = [
    validateString(payload.shortsId, 'payload.shortsId'),
    validateString(payload.shortsTitle, 'payload.shortsTitle'),
    validateString(payload.spreaderName, 'payload.spreaderName'),
    validateString(payload.spreadId, 'payload.spreadId')
  ];

  for (const result of checks) {
    if (!result.ok) {
      return result;
    }
  }

  return ok({
    shortsId: payload.shortsId,
    shortsTitle: payload.shortsTitle,
    spreaderName: payload.spreaderName,
    spreadId: payload.spreadId
  });
}

function validateOutboundPayload(type, payload) {
  switch (type) {
    case 'stats_update':
      return validateStatsUpdatePayload(payload);
    case 'spread_event':
      return validateSpreadEventPayload(payload);
    case 'hit_event':
      return validateHitEventPayload(payload);
    case 'hit':
      return validateHitPayload(payload);
    default:
      return fail(`Unsupported outbound message type: ${type}`);
  }
}

function validateInboundMessage(message) {
  const envelope = validateMessageEnvelope(message, INBOUND_MESSAGE_TYPES, 'inbound', { allowMissingPayload: true });

  if (!envelope.ok) {
    return envelope;
  }

  const payload = validateInboundPayload(envelope.value, message.payload);

  if (!payload.ok) {
    return payload;
  }

  return ok({
    type: envelope.value,
    payload: payload.value
  });
}

function validateOutboundMessage(message) {
  const envelope = validateMessageEnvelope(message, OUTBOUND_MESSAGE_TYPES, 'outbound');

  if (!envelope.ok) {
    return envelope;
  }

  const payload = validateOutboundPayload(envelope.value, message.payload);

  if (!payload.ok) {
    return payload;
  }

  return ok({
    type: envelope.value,
    payload: payload.value
  });
}

function createStatsUpdateEvent(payload) {
  const validated = validateOutboundMessage({
    type: 'stats_update',
    payload
  });

  if (!validated.ok) {
    throw new Error(validated.error);
  }

  return validated.value;
}

module.exports = {
  INBOUND_MESSAGE_TYPES,
  OUTBOUND_MESSAGE_TYPES,
  REPLACED_TAG_TYPES,
  SUCCESSFUL_DELIVERY_MODES,
  createStatsUpdateEvent,
  validateInboundMessage,
  validateOutboundMessage
};
