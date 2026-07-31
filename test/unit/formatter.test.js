import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { formatTime, sanitizeCommentValue, sanitizeCommentKey } from '../../src/core/formatter.js';

describe('formatter - formatTime', () => {
  it('returns a formatted time string with / and : separators', () => {
    const time = formatTime('Asia/Shanghai', 'zh-CN');
    assert.ok(typeof time === 'string');
    assert.match(time, /^\d{4}\/\d{1,2}\/\d{1,2}\s+\d{2}:\d{2}:\d{2}$/);
  });

  it('returns null on invalid timeZone', () => {
    const time = formatTime('Invalid/Zone', 'zh-CN');
    assert.equal(time, null);
  });

  it('works with UTC timeZone', () => {
    const time = formatTime('UTC', 'en-US');
    assert.ok(typeof time === 'string');
  });
});

describe('formatter - sanitizeCommentValue', () => {
  it('replaces -- with em-dash pair', () => {
    const result = sanitizeCommentValue('hello--world');
    assert.equal(result, 'hello— —world');
  });

  it('replaces newlines and tabs with spaces', () => {
    const result = sanitizeCommentValue('line1\nline2\t\tline3');
    assert.ok(!result.includes('\n'));
    assert.ok(!result.includes('\t'));
  });

  it('removes control characters', () => {
    const result = sanitizeCommentValue('hello\x00world\x1Ftest');
    assert.equal(result, 'helloworldtest');
  });

  it('truncates to maxLength', () => {
    const result = sanitizeCommentValue('a'.repeat(300), 50);
    assert.equal(result.length, 50);
  });

  it('defaults maxLength to 200', () => {
    const result = sanitizeCommentValue('a'.repeat(250));
    assert.equal(result.length, 200);
  });

  it('trims whitespace', () => {
    const result = sanitizeCommentValue('  hello  ');
    assert.equal(result, 'hello');
  });

  it('returns empty string for null', () => {
    assert.equal(sanitizeCommentValue(null), '');
  });

  it('converts non-string to string', () => {
    assert.equal(sanitizeCommentValue(123), '123');
  });
});

describe('formatter - sanitizeCommentKey', () => {
  it('removes < and > characters', () => {
    const result = sanitizeCommentKey('<script>alert(1)</script>');
    assert.equal(result, 'scriptalert(1)/script');
  });

  it('replaces -- with em-dash pair', () => {
    const result = sanitizeCommentKey('key--name');
    assert.equal(result, 'key— —name');
  });

  it('truncates to default 50', () => {
    const key = 'a'.repeat(100);
    const result = sanitizeCommentKey(key);
    assert.equal(result.length, 50);
  });

  it('returns empty string for null', () => {
    assert.equal(sanitizeCommentKey(null), '');
  });

  it('removes control characters', () => {
    const result = sanitizeCommentKey('key\x00name');
    assert.equal(result, 'keyname');
  });
});
