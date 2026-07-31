const DEFAULT_OPTIONS = {
  buildTime: true,
  version: true,
  environment: true,
  commitHash: true,
  commitMessage: true,
  branch: false,
  environmentValue: undefined,
  environmentKeys: ['APP_ENV', 'DEPLOY_ENV', 'NODE_ENV', 'MODE'],
  timeZone: 'Asia/Shanghai',
  locale: 'zh-CN',
  position: 'after-doctype',
  fullCommitHash: false,
  applyInDev: false,
  customData: {},
  root: undefined,
  debug: false,
  html: undefined,
  outputHtml: undefined,
};

const VALID_POSITIONS = new Set([
  'after-doctype',
  'head-start',
  'head-end',
  'body-start',
  'body-end',
  'top',
  'bottom',
]);

const BOOLEAN_FIELDS = new Set([
  'buildTime',
  'version',
  'environment',
  'commitHash',
  'commitMessage',
  'branch',
  'fullCommitHash',
  'applyInDev',
  'debug',
]);

const STRING_FIELDS = new Set([
  'timeZone',
  'locale',
  'position',
  'environmentValue',
  'root',
  'html',
  'outputHtml',
]);

function isValidPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

function stripProtoKeys(obj) {
  const result = {};
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    result[key] = obj[key];
  }
  return result;
}

export function resolveOptions(userOptions) {
  const options = { ...DEFAULT_OPTIONS };

  if (!isValidPlainObject(userOptions)) {
    return options;
  }

  for (const key of Object.keys(userOptions)) {
    if (!(key in DEFAULT_OPTIONS)) continue;

    const userVal = userOptions[key];

    if (key === 'customData') {
      if (isValidPlainObject(userVal)) {
        options.customData = stripProtoKeys(userVal);
      }
      continue;
    }

    if (key === 'environmentKeys') {
      if (Array.isArray(userVal) && userVal.every(v => typeof v === 'string')) {
        options.environmentKeys = userVal;
      }
      continue;
    }

    if (BOOLEAN_FIELDS.has(key)) {
      options[key] = Boolean(userVal);
      continue;
    }

    if (STRING_FIELDS.has(key)) {
      if (typeof userVal === 'string') {
        if (key === 'position') {
          if (VALID_POSITIONS.has(userVal)) {
            options[key] = userVal;
          }
        } else {
          options[key] = userVal;
        }
      }
      continue;
    }
  }

  return options;
}

export const defaultOptions = DEFAULT_OPTIONS;
