import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { resolveEnvironment } from '../../src/core/environment.js';

describe('environment - resolveEnvironment', () => {
  afterEach(() => {
    delete process.env.TEST_ENV_VAR;
    delete process.env.CUSTOM_1;
    delete process.env.CUSTOM_2;
  });

  it('uses environmentValue over all else', () => {
    process.env.TEST_ENV_VAR = 'from-env';
    const result = resolveEnvironment(
      { environmentValue: 'production', environmentKeys: ['TEST_ENV_VAR'] },
      'development'
    );
    assert.equal(result, 'production');
  });

  it('falls back to mode when environmentValue is empty', () => {
    process.env.TEST_ENV_VAR = 'from-env';
    const result = resolveEnvironment(
      { environmentValue: '', environmentKeys: ['TEST_ENV_VAR'] },
      'staging'
    );
    assert.equal(result, 'staging');
  });

  it('falls back to environmentKeys when mode is empty', () => {
    process.env.TEST_ENV_VAR = 'from-env';
    const result = resolveEnvironment(
      { environmentValue: undefined, environmentKeys: ['TEST_ENV_VAR'] },
      ''
    );
    assert.equal(result, 'from-env');
  });

  it('falls back to environmentKeys with multiple keys', () => {
    process.env.CUSTOM_2 = 'second-priority';
    const result = resolveEnvironment(
      { environmentValue: undefined, environmentKeys: ['CUSTOM_1', 'CUSTOM_2'] },
      ''
    );
    assert.equal(result, 'second-priority');
  });

  it('returns null when nothing is set', () => {
    const result = resolveEnvironment(
      { environmentValue: undefined, environmentKeys: ['NONEXISTENT'] },
      ''
    );
    assert.equal(result, null);
  });

  it('strips whitespace from environmentValue', () => {
    const result = resolveEnvironment(
      { environmentValue: '  production  ' },
      'development'
    );
    assert.equal(result, 'production');
  });

  it('strips whitespace from mode', () => {
    const result = resolveEnvironment(
      { environmentValue: '' },
      '  staging  '
    );
    assert.equal(result, 'staging');
  });

  it('skips non-string env vars', () => {
    process.env.TEST_ENV_VAR = 'valid';
    const result = resolveEnvironment(
      { environmentValue: undefined, environmentKeys: ['TEST_ENV_VAR'] },
      ''
    );
    assert.equal(result, 'valid');
  });

  it('uses first non-empty environment key', () => {
    process.env.FIRST = 'first-value';
    process.env.SECOND = 'second-value';
    const result = resolveEnvironment(
      { environmentValue: undefined, environmentKeys: ['FIRST', 'SECOND'] },
      ''
    );
    assert.equal(result, 'first-value');
    delete process.env.FIRST;
    delete process.env.SECOND;
  });
});
