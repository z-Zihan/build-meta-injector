import { describe, it, mock, before, after, afterEach } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import child_process from 'child_process';

function hasMeta(comments, text) {
  return comments.some(c => c.includes(text));
}
function hasNoMeta(comments, text) {
  return !comments.some(c => c.includes(text));
}

// ─── Basic tests (no mocking needed) ───

describe('collect-meta - basic', () => {
  let collectMeta;

  before(async () => {
    const mod = await import('../../src/core/collect-meta.js');
    collectMeta = mod.collectMeta;
  });

  it('includes build time by default', () => {
    const comments = collectMeta({ version: false, environment: false, commitHash: false, commitMessage: false });
    const btLine = comments.find(c => c.startsWith('Build Time:'));
    assert.ok(btLine, 'Build Time comment should exist');
    assert.match(btLine, /\d{4}\/\d{1,2}\/\d{1,2} \d{2}:\d{2}:\d{2}/);
  });

  it('includes version when enabled', () => {
    const comments = collectMeta({ buildTime: false, environment: false, commitHash: false, commitMessage: false });
    const vLine = comments.find(c => c.startsWith('Version:'));
    assert.ok(vLine, 'Version comment should exist');
  });

  it('disables build time when buildTime is false', () => {
    const comments = collectMeta({ buildTime: false, environment: false, commitHash: false, commitMessage: false });
    assert.ok(hasNoMeta(comments, 'Build Time:'));
  });

  it('disables version when version is false', () => {
    const comments = collectMeta({ buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false });
    assert.ok(hasNoMeta(comments, 'Version:'));
  });

  it('disables commitHash when commitHash is false', () => {
    const comments = collectMeta({ buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false });
    assert.ok(hasNoMeta(comments, 'Commit Hash'));
  });

  it('returns empty array when all fields disabled', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false,
      commitHash: false, commitMessage: false, branch: false, customData: {},
    });
    assert.deepEqual(comments, []);
  });

  it('does not output null or undefined values', () => {
    const comments = collectMeta({ buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false });
    for (const c of comments) {
      assert.ok(!c.includes('null'), `contains null: ${c}`);
      assert.ok(!c.includes('undefined'), `contains undefined: ${c}`);
    }
  });

  it('includes custom data fields', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false,
      customData: { deployBranch: 'main', buildId: '42' },
    });
    assert.ok(hasMeta(comments, 'deployBranch: main'));
    assert.ok(hasMeta(comments, 'buildId: 42'));
  });

  it('ignores non-object customData', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false,
      customData: 'not-an-object',
    });
    assert.ok(hasNoMeta(comments, 'not-an-object'));
  });

  it('strips __proto__ from customData via JSON', () => {
    const obj = JSON.parse('{"__proto__":"evil","safe":"value"}');
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false,
      customData: obj,
    });
    assert.ok(hasNoMeta(comments, 'evil'));
    assert.ok(hasMeta(comments, 'safe: value'));
  });

  it('strips constructor and prototype keys', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false,
      customData: { constructor: 'no', prototype: 'no', ok: 'yes' },
    });
    assert.ok(hasMeta(comments, 'ok: yes'));
    assert.ok(!comments.some(c => c.includes('no')));
  });

  it('skips customData keys that sanitize to empty', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false,
      customData: { '   ': 'val' },
    });
    assert.ok(comments.length === 0);
  });

  it('truncates super long customData values', () => {
    const longVal = 'b'.repeat(500);
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false,
      customData: { key: longVal },
    });
    const line = comments.find(c => c.startsWith('key:'));
    assert.ok(line);
    assert.ok(line.replace('key: ', '').length <= 200);
  });

  it('truncates super long customData keys', () => {
    const longKey = 'c'.repeat(100);
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false,
      customData: { [longKey]: 'value' },
    });
    const line = comments.find(c => c.endsWith(': value'));
    assert.ok(line);
    assert.ok(line.replace(': value', '').length <= 50);
  });
});

// ─── Environment tests ───

describe('collect-meta - environment', () => {
  let collectMeta;

  before(async () => {
    const mod = await import('../../src/core/collect-meta.js');
    collectMeta = mod.collectMeta;
  });

  afterEach(() => {
    delete process.env.TEST_ENV_1;
    delete process.env.TEST_ENV_2;
    delete process.env.APP_ENV;
    delete process.env.DEPLOY_ENV;
    delete process.env.MODE;
    // Don't delete NODE_ENV as it may affect test runner
    process.env.NODE_ENV = 'test';
  });

  it('uses environmentValue when provided', () => {
    const comments = collectMeta({
      buildTime: false, version: false, commitHash: false, commitMessage: false,
      environmentValue: 'staging',
    });
    assert.ok(hasMeta(comments, 'Environment: staging'));
  });

  it('uses mode from context', () => {
    process.env.NODE_ENV = 'test';
    const comments = collectMeta({
      buildTime: false, version: false, commitHash: false, commitMessage: false,
      environmentKeys: ['NONEXISTENT_KEY_XYZ'],
    }, { mode: 'production' });
    assert.ok(hasMeta(comments, 'Environment: production'));
  });

  it('uses env var when no environmentValue or mode', () => {
    process.env.NODE_ENV = 'test';
    process.env.APP_ENV = 'from-env';
    const comments = collectMeta({
      buildTime: false, version: false, commitHash: false, commitMessage: false,
      environmentKeys: ['APP_ENV', 'NODE_ENV'],
    }, { mode: ''    });
    assert.ok(hasMeta(comments, 'Environment: from-env'));
  });

  it('environmentValue takes priority over mode and env', () => {
    process.env.APP_ENV = 'from-env';
    const comments = collectMeta({
      buildTime: false, version: false, commitHash: false, commitMessage: false,
      environmentValue: 'override',
      environmentKeys: ['APP_ENV'],
    }, { mode: 'mode-val' });
    assert.ok(hasMeta(comments, 'Environment: override'));
  });

  it('mode takes priority over env keys', () => {
    process.env.APP_ENV = 'from-env';
    const comments = collectMeta({
      buildTime: false, version: false, commitHash: false, commitMessage: false,
      environmentKeys: ['APP_ENV'],
    }, { mode: 'from-mode' });
    assert.ok(hasMeta(comments, 'Environment: from-mode'));
  });

  it('skips empty environmentValue and falls through to mode', () => {
    const comments = collectMeta({
      buildTime: false, version: false, commitHash: false, commitMessage: false,
      environmentValue: '',
      environmentKeys: ['NONEXISTENT_KEY_XYZ'],
    }, { mode: 'production' });
    assert.ok(hasMeta(comments, 'Environment: production'));
  });

  it('skips whitespace-only environmentValue and falls through', () => {
    const comments = collectMeta({
      buildTime: false, version: false, commitHash: false, commitMessage: false,
      environmentValue: '   ',
      environmentKeys: ['NONEXISTENT_KEY_XYZ'],
    }, { mode: 'production' });
    assert.ok(hasMeta(comments, 'Environment: production'));
  });

  it('disables environment when set to false', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false,
      environmentValue: 'should-not-appear',
    });
    assert.ok(hasNoMeta(comments, 'Environment'));
  });

  it('first non-empty env key wins', () => {
    process.env.TEST_ENV_1 = 'first';
    process.env.TEST_ENV_2 = 'second';
    const comments = collectMeta({
      buildTime: false, version: false, commitHash: false, commitMessage: false,
      environmentKeys: ['TEST_ENV_1', 'TEST_ENV_2'],
    }, { mode: '' });
    assert.ok(hasMeta(comments, 'Environment: first'));
  });
});

// ─── Git tests (mock child_process.execFileSync) ───

describe('collect-meta - git (mocked)', () => {
  let collectMeta;

  before(async () => {
    mock.method(child_process, 'execFileSync', function(cmd, args, opts) {
      if (args[0] === 'rev-parse' && args[1] === '--short') return 'abc1234\n';
      if (args[0] === 'rev-parse' && args[1] === 'HEAD') return 'abcdef1234567890abcdef1234567890abcdef12\n';
      if (args[0] === 'log') return 'feat: add feature\n';
      if (args.includes('--abbrev-ref')) return 'main\n';
      return '';
    });
    const mod = await import('../../src/core/collect-meta.js');
    collectMeta = mod.collectMeta;
  });

  after(() => {
    mock.restoreAll();
  });

  it('collects commit hash', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: true, commitMessage: false,
    });
    assert.ok(hasMeta(comments, 'Commit Hash (Short): abc1234'));
  });

  it('collects full commit hash when fullCommitHash is true', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: true, fullCommitHash: true,
    });
    assert.ok(hasMeta(comments, 'Commit Hash: abcdef1234567890abcdef1234567890abcdef12'));
  });

  it('collects commit message', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: true,
    });
    assert.ok(hasMeta(comments, 'Commit Message: feat: add feature'));
  });

  it('collects branch', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false, branch: true,
    });
    assert.ok(hasMeta(comments, 'Branch: main'));
  });

  it('collects all git info when enabled', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false,
      commitHash: true, commitMessage: true, branch: true, fullCommitHash: true,
    });
    assert.ok(hasMeta(comments, 'Commit Hash: abcdef1234567890abcdef1234567890abcdef12'));
    assert.ok(hasMeta(comments, 'Commit Hash: abcdef1234567890abcdef1234567890abcdef12'));
    assert.ok(hasMeta(comments, 'Commit Message: feat: add feature'));
    assert.ok(hasMeta(comments, 'Branch: main'));
  });
});

// ─── Git failure tests ───

describe('collect-meta - git failures', () => {
  let collectMeta;

  before(async () => {
    mock.method(child_process, 'execFileSync', function() {
      throw new Error('git command failed');
    });
    const mod = await import('../../src/core/collect-meta.js');
    collectMeta = mod.collectMeta;
  });

  after(() => {
    mock.restoreAll();
  });

  it('handles git failure without crashing', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: true, commitMessage: true,
    });
    assert.ok(hasNoMeta(comments, 'Commit Hash'));
    assert.ok(hasNoMeta(comments, 'Commit Message'));
  });
});

// ─── Git timeout ───

describe('collect-meta - git timeout', () => {
  let collectMeta;

  before(async () => {
    mock.method(child_process, 'execFileSync', function() {
      const err = new Error('Command timed out');
      err.code = 'ETIMEDOUT';
      throw err;
    });
    const mod = await import('../../src/core/collect-meta.js');
    collectMeta = mod.collectMeta;
  });

  after(() => {
    mock.restoreAll();
  });

  it('handles git timeout without crashing', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: true, commitMessage: true,
    });
    assert.ok(hasNoMeta(comments, 'Commit Hash'));
    assert.ok(hasNoMeta(comments, 'Commit Message'));
  });
});

// ─── Special characters ───

describe('collect-meta - special characters', () => {
  let collectMeta;

  before(async () => {
    const mod = await import('../../src/core/collect-meta.js');
    collectMeta = mod.collectMeta;
  });

  it('sanitizes -- in customData values', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false,
      customData: { Note: 'fix -- issue' },
    });
    const line = comments.find(c => c.startsWith('Note:'));
    assert.ok(line);
    assert.ok(!line.includes('--'), `should not contain --: ${line}`);
    assert.ok(line.includes('— —'), `should contain em-dash: ${line}`);
  });

  it('sanitizes newlines in customData values', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false,
      customData: { Note: 'line1\nline2' },
    });
    const line = comments.find(c => c.startsWith('Note:'));
    assert.ok(line);
    assert.ok(!line.includes('\n'));
    assert.ok(line.includes('line1') && line.includes('line2'));
  });

  it('truncates super long values', () => {
    const longMsg = 'a'.repeat(500);
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: false, commitMessage: false,
      customData: { msg: longMsg },
    });
    const line = comments.find(c => c.startsWith('msg:'));
    assert.ok(line);
    assert.ok(line.replace('msg: ', '').length <= 200);
  });
});

// ─── Package.json tests ───

describe('collect-meta - package.json', () => {
  let collectMeta;

  before(async () => {
    const mod = await import('../../src/core/collect-meta.js');
    collectMeta = mod.collectMeta;
  });

  it('handles missing package.json (root to nonexistent path)', () => {
    const comments = collectMeta({
      buildTime: false, version: true, environment: false, commitHash: false, commitMessage: false,
      root: '/nonexistent/path/that/does/not/exist',
    });
    assert.ok(hasNoMeta(comments, 'Version:'));
  });

  it('handles missing package.json with empty root', () => {
    const comments = collectMeta({
      buildTime: false, version: true, environment: false, commitHash: false, commitMessage: false,
      root: '/tmp',
    });
    assert.ok(Array.isArray(comments));
  });
});

// ─── Root resolution ───

describe('collect-meta - root resolution', () => {
  let collectMeta;

  before(async () => {
    mock.method(child_process, 'execFileSync', function(cmd, args, opts) {
      if (args[0] === 'rev-parse' && args[1] === '--short') return 'abc1234\n';
      return '';
    });
    const mod = await import('../../src/core/collect-meta.js');
    collectMeta = mod.collectMeta;
  });

  after(() => {
    mock.restoreAll();
  });

  it('uses context.root for git resolution', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: true,
    }, { root: '/custom/root' });
    assert.ok(hasMeta(comments, 'Commit Hash (Short): abc1234'));
  });

  it('uses options.root over context.root', () => {
    const comments = collectMeta({
      buildTime: false, version: false, environment: false, commitHash: true, root: '/opt-root',
    }, { root: '/ctx-root' });
    assert.ok(hasMeta(comments, 'Commit Hash (Short): abc1234'));
  });
});
