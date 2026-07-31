import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { resolveOptions } from '../../src/core/options.js';

describe('options - resolveOptions', () => {
  it('returns defaults when no options passed', () => {
    const opts = resolveOptions();
    assert.equal(opts.buildTime, true);
    assert.equal(opts.branch, false);
    assert.equal(opts.position, 'after-doctype');
    assert.deepEqual(opts.environmentKeys, ['APP_ENV', 'DEPLOY_ENV', 'NODE_ENV', 'MODE']);
    assert.deepEqual(opts.customData, {});
  });

  it('merges user options over defaults', () => {
    const opts = resolveOptions({ position: 'top', branch: true, buildTime: false });
    assert.equal(opts.position, 'top');
    assert.equal(opts.branch, true);
    assert.equal(opts.buildTime, false);
    assert.equal(opts.version, true); // unchanged default
  });

  it('rejects invalid position and falls back to default', () => {
    const opts = resolveOptions({ position: 'invalid-pos' });
    assert.equal(opts.position, 'after-doctype');
  });

  it('rejects non-plain-object customData', () => {
    const opts = resolveOptions({ customData: 'not-an-object' });
    assert.deepEqual(opts.customData, {});
  });

  it('rejects array as customData', () => {
    const opts = resolveOptions({ customData: [1, 2, 3] });
    assert.deepEqual(opts.customData, {});
  });

  it('rejects null as customData', () => {
    const opts = resolveOptions({ customData: null });
    assert.deepEqual(opts.customData, {});
  });

  it('strips __proto__ from customData', () => {
    const obj = JSON.parse('{"__proto__":"evil","safe":"value"}');
    const opts = resolveOptions({ customData: obj });
    // __proto__ should not appear as an own key
    assert.ok(!Object.keys(opts.customData).includes('__proto__'));
    assert.equal(opts.customData.safe, 'value');
  });

  it('strips constructor and prototype keys from customData', () => {
    const opts = resolveOptions({ customData: { constructor: 'no', prototype: 'no', ok: 'yes' } });
    // constructor and prototype are filtered by stripProtoKeys
    assert.equal(opts.customData.ok, 'yes');
    assert.ok(!Object.keys(opts.customData).includes('constructor'));
    assert.ok(!Object.keys(opts.customData).includes('prototype'));
  });

  it('type-checks boolean fields by coercing', () => {
    const opts = resolveOptions({ buildTime: 'yes', branch: 1, debug: 'truthy' });
    assert.equal(opts.buildTime, true);
    assert.equal(opts.branch, true);
    assert.equal(opts.debug, true);
  });

  it('type-checks boolean fields with falsy values', () => {
    const opts = resolveOptions({ buildTime: 0, branch: '', debug: null });
    assert.equal(opts.buildTime, false);
    assert.equal(opts.branch, false);
    assert.equal(opts.debug, false);
  });

  it('ignores unknown keys', () => {
    const opts = resolveOptions({ unknownKey: 'value', foo: 42 });
    assert.equal(opts.unknownKey, undefined);
  });

  it('returns defaults for non-plain-object userOptions', () => {
    const opts = resolveOptions('string');
    assert.equal(opts.position, 'after-doctype');
  });

  it('accepts valid customData as plain object', () => {
    const opts = resolveOptions({ customData: { deployBranch: 'main', buildId: '123' } });
    assert.equal(opts.customData.deployBranch, 'main');
    assert.equal(opts.customData.buildId, '123');
  });

  it('validates environmentKeys must be string array', () => {
    const opts = resolveOptions({ environmentKeys: ['CUSTOM_ENV'] });
    assert.deepEqual(opts.environmentKeys, ['CUSTOM_ENV']);
  });

  it('rejects non-array environmentKeys', () => {
    const opts = resolveOptions({ environmentKeys: 'not-array' });
    assert.deepEqual(opts.environmentKeys, ['APP_ENV', 'DEPLOY_ENV', 'NODE_ENV', 'MODE']);
  });
});
