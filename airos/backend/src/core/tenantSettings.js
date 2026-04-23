function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

const DEFAULT_AI_CONFIG = {
  platformManaged: true,
  tenantApiKeysAllowed: false,
  agentName: 'Chator Assistant',
  temperature: 0.4,
  maxTokens: 300,
  systemPrompt: 'You are a helpful assistant for an eCommerce business. Reply in the same language as the customer.',
  autoReply: false,
  suggestOnly: true,
};

const DEFAULT_GLOBAL_SETTINGS = {
  autoClose: true,
  autoCloseHours: 48,
  assignBot: true,
  workingHours: true,
  defaultLang: 'ar',
  soundNotifs: true,
  desktopNotifs: false,
  workStart: '09:00',
  workEnd: '18:00',
  workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
};

const DEFAULT_PROFANITY_CONTROLS = {
  flagForReview: true,
  autoBlockAfterThree: false,
};

const DEFAULT_COMPANY_SCORE = {
  enabled: true,
  minRevenue: 1000,
  minOrders: 3,
  vipThreshold: 5000,
};

const DEFAULT_VISITOR_ROUTING = {
  mode: 'round_robin',
  fallback: 'AI Bot',
  threshold: 30,
};

const DEFAULT_WHATSAPP_SETTINGS = {
  welcome_msg: '',
  away_msg: '',
  business_hours: true,
  hours_from: '09:00',
  hours_to: '22:00',
  read_receipts: true,
  typing_indicator: true,
};

const DEFAULT_CONVERSATION_LAYOUT = {
  density: 'comfortable',
  bubbleStyle: 'rounded',
  showScore: true,
  showIntent: true,
  showChannel: true,
  showTimestamp: true,
  agentBubble: '#6366f1',
  customerBubble: '#0f172a',
};

function normalizeTenantSettings(rawSettings = {}) {
  const settings = isPlainObject(rawSettings) ? { ...rawSettings } : {};

  settings.profile = isPlainObject(settings.profile) ? settings.profile : {};
  settings.company = isPlainObject(settings.company) ? settings.company : {};
  settings.global = {
    ...DEFAULT_GLOBAL_SETTINGS,
    ...(isPlainObject(settings.global) ? settings.global : {}),
  };
  settings.aiConfig = {
    ...DEFAULT_AI_CONFIG,
    ...(isPlainObject(settings.aiConfig) ? settings.aiConfig : {}),
  };
  settings.profanity = Array.isArray(settings.profanity) ? settings.profanity : [];
  settings.profanityControls = {
    ...DEFAULT_PROFANITY_CONTROLS,
    ...(isPlainObject(settings.profanityControls) ? settings.profanityControls : {}),
  };
  settings.leadRules = Array.isArray(settings.leadRules) ? settings.leadRules : [];
  settings.compScore = {
    ...DEFAULT_COMPANY_SCORE,
    ...(isPlainObject(settings.compScore) ? settings.compScore : {}),
  };
  settings.visitorRouting = {
    ...DEFAULT_VISITOR_ROUTING,
    ...(isPlainObject(settings.visitorRouting) ? settings.visitorRouting : {}),
  };
  settings.routing = Array.isArray(settings.routing) ? settings.routing : [];
  settings.spammers = Array.isArray(settings.spammers) ? settings.spammers : [];
  settings.operators = Array.isArray(settings.operators) ? settings.operators : [];
  settings.depts = Array.isArray(settings.depts) ? settings.depts : [];
  settings.profileFields = Array.isArray(settings.profileFields) ? settings.profileFields : [];
  settings.emailTpls = Array.isArray(settings.emailTpls) ? settings.emailTpls : [];
  settings.tags = Array.isArray(settings.tags) ? settings.tags : [];
  settings.brands = Array.isArray(settings.brands) ? settings.brands : [];
  settings.channels = isPlainObject(settings.channels) ? settings.channels : {};
  settings.layout = {
    ...DEFAULT_CONVERSATION_LAYOUT,
    ...(isPlainObject(settings.layout) ? settings.layout : {}),
  };
  settings.triggers = Array.isArray(settings.triggers) ? settings.triggers : [];
  settings.schedReports = Array.isArray(settings.schedReports) ? settings.schedReports : [];
  settings.recycled = Array.isArray(settings.recycled) ? settings.recycled : [];
  settings.triggerLogs = Array.isArray(settings.triggerLogs) ? settings.triggerLogs : [];
  settings.broadcastHistory = Array.isArray(settings.broadcastHistory) ? settings.broadcastHistory : [];
  settings.waTemplates = Array.isArray(settings.waTemplates) ? settings.waTemplates : [];
  settings.igSettings = isPlainObject(settings.igSettings) ? settings.igSettings : {};
  settings.messengerSettings = isPlainObject(settings.messengerSettings) ? settings.messengerSettings : {};
  settings.broadcastBalance = Number.isFinite(Number(settings.broadcastBalance))
    ? Number(settings.broadcastBalance)
    : 0;
  settings.waSettings = {
    ...DEFAULT_WHATSAPP_SETTINGS,
    ...(isPlainObject(settings.waSettings) ? settings.waSettings : {}),
  };

  return settings;
}

function buildCompanyContext(tenant = {}) {
  const settings = normalizeTenantSettings(tenant.settings);
  const company = isPlainObject(settings.company) ? settings.company : {};
  const activeBrand = Array.isArray(settings.brands)
    ? settings.brands.find((brand) => brand?.active) || settings.brands[0]
    : null;

  return {
    name: company.name || tenant.name || 'our store',
    agentName: settings.aiConfig.agentName || company.agentName || 'Chator Assistant',
    email: company.email || tenant.email || '',
    website: company.website || '',
    address: company.address || '',
    industry: company.industry || '',
    currency: company.currency || '',
    timezone: company.timezone || '',
    brandTone: activeBrand?.tone || '',
    brandLanguage: activeBrand?.lang || settings.global.defaultLang || '',
  };
}

function containsProfanity(content, blockedWords = []) {
  if (typeof content !== 'string' || !content.trim()) return false;
  if (!Array.isArray(blockedWords) || blockedWords.length === 0) return false;

  const text = content.toLowerCase();
  return blockedWords.some((word) => {
    if (typeof word !== 'string' || !word.trim()) return false;
    return text.includes(word.trim().toLowerCase());
  });
}

function isBlockedSpammer(customer = {}, spammers = []) {
  if (!Array.isArray(spammers) || spammers.length === 0) return false;

  const values = [
    customer.phone,
    customer.id,
    customer.channelCustomerId,
    customer.name,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  if (values.length === 0) return false;

  return spammers.some((entry) => {
    const value = typeof entry?.value === 'string' ? entry.value.trim().toLowerCase() : '';
    return value && values.includes(value);
  });
}

function getWeekdayLabel(date = new Date()) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
}

function isWithinWorkingHours(globalSettings = {}, date = new Date()) {
  const settings = {
    ...DEFAULT_GLOBAL_SETTINGS,
    ...(isPlainObject(globalSettings) ? globalSettings : {}),
  };

  if (!settings.workingHours) return true;

  const day = getWeekdayLabel(date);
  if (!Array.isArray(settings.workDays) || !settings.workDays.includes(day)) return false;

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = parseTimeToMinutes(settings.workStart);
  const endMinutes = parseTimeToMinutes(settings.workEnd);

  if (startMinutes == null || endMinutes == null) return true;
  if (startMinutes <= endMinutes) return currentMinutes >= startMinutes && currentMinutes <= endMinutes;

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function parseTimeToMinutes(value) {
  if (typeof value !== 'string' || !value.includes(':')) return null;
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  return hours * 60 + minutes;
}

module.exports = {
  isPlainObject,
  normalizeTenantSettings,
  buildCompanyContext,
  containsProfanity,
  isBlockedSpammer,
  isWithinWorkingHours,
};
