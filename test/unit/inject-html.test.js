import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { injectHtml } from '../../src/core/inject-html.js';

const comments = ['Build Time: 2026/7/31 13:30:00', 'Version: 1.0.0'];

function hasComment(html, text) {
  return html.includes(text);
}

describe('inject-html - injectHtml', () => {
  // ===== ALL 7 positions =====

  it('position: top', () => {
    const html = '<!doctype html><html><head></head><body></body></html>';
    const result = injectHtml(html, comments, 'top');
    assert.ok(result.startsWith('\n<!-- Build Time:'));
    assert.ok(result.includes('</html>'));
    assert.ok(result.includes('Version: 1.0.0'));
  });

  it('position: bottom', () => {
    const html = '<!doctype html><html><head></head><body></body></html>';
    const result = injectHtml(html, comments, 'bottom');
    // Ends with comments + newline or </html> + comments + newline
    assert.ok(result.includes('Version: 1.0.0'));
    assert.ok(result.endsWith('\n'));
    const idxLastHtml = result.lastIndexOf('</html>');
    const idxComment = result.indexOf('Build Time');
    assert.ok(idxComment > idxLastHtml);
  });

  it('position: after-doctype', () => {
    const html = '<!doctype html>\n<html><head></head><body></body></html>';
    const result = injectHtml(html, comments, 'after-doctype');
    assert.ok(result.indexOf('<!doctype html>') < result.indexOf('Build Time'));
    assert.ok(result.includes('</html>'));
  });

  it('position: head-start', () => {
    const html = '<!doctype html><html><head><title>Test</title></head><body></body></html>';
    const result = injectHtml(html, comments, 'head-start');
    assert.ok(result.indexOf('<head>') < result.indexOf('Build Time'));
    assert.ok(result.indexOf('Build Time') < result.indexOf('<title>'));
  });

  it('position: head-end', () => {
    const html = '<!doctype html><html><head><title>Test</title></head><body></body></html>';
    const result = injectHtml(html, comments, 'head-end');
    assert.ok(result.indexOf('Build Time') < result.indexOf('</head>'));
    assert.ok(result.indexOf('</head>') < result.indexOf('<body'));
  });

  it('position: body-start', () => {
    const html = '<!doctype html><html><head></head><body><p>Hello</p></body></html>';
    const result = injectHtml(html, comments, 'body-start');
    assert.ok(result.indexOf('<body>') < result.indexOf('Build Time'));
    assert.ok(result.indexOf('Build Time') < result.indexOf('<p>'));
  });

  it('position: body-end', () => {
    const html = '<!doctype html><html><head></head><body><p>Hello</p></body></html>';
    const result = injectHtml(html, comments, 'body-end');
    assert.ok(result.indexOf('Build Time') < result.indexOf('</body>'));
    assert.ok(result.indexOf('</body>') < result.indexOf('</html>'));
  });

  // ===== case-insensitive doctype =====

  it('handles case-insensitive doctype (lowercase)', () => {
    const html = '<!doctype html>\n<html><head></head><body></body></html>';
    const result = injectHtml(html, comments, 'after-doctype');
    assert.ok(result.indexOf('<!doctype html>') < result.indexOf('Build Time'));
  });

  it('handles case-insensitive doctype (uppercase)', () => {
    const html = '<!DOCTYPE html>\n<html><head></head><body></body></html>';
    const result = injectHtml(html, comments, 'after-doctype');
    assert.ok(result.indexOf('<!DOCTYPE html>') < result.indexOf('Build Time'));
  });

  it('handles case-insensitive doctype (mixed case)', () => {
    const html = '<!DoCtYpE html>\n<html><head></head><body></body></html>';
    const result = injectHtml(html, comments, 'after-doctype');
    assert.ok(result.indexOf('<!DoCtYpE html>') < result.indexOf('Build Time'));
  });

  it('handles DOCTYPE HTML (full uppercase)', () => {
    const html = '<!DOCTYPE HTML>\n<html><head></head><body></body></html>';
    const result = injectHtml(html, comments, 'after-doctype');
    assert.ok(result.indexOf('<!DOCTYPE HTML>') < result.indexOf('Build Time'));
  });

  // ===== no doctype fallback =====

  it('fallback to top when no doctype', () => {
    const html = '<html><head></head><body></body></html>';
    const result = injectHtml(html, comments, 'after-doctype');
    assert.ok(result.startsWith('\n<!-- Build Time'));
  });

  // ===== no head fallback =====

  it('fallback to top when no <head> for head-start', () => {
    const html = '<!doctype html><html><body></body></html>';
    const result = injectHtml(html, comments, 'head-start');
    assert.ok(result.startsWith('\n<!-- Build Time'));
  });

  it('fallback to bottom when no </head> for head-end', () => {
    const html = '<!doctype html><html><body></body></html>';
    const result = injectHtml(html, comments, 'head-end');
    assert.ok(hasComment(result, 'Build Time'));
    assert.ok(result.lastIndexOf('</html>') < result.lastIndexOf('Build Time'));
  });

  // ===== no body fallback =====

  it('fallback to top when no <body> for body-start', () => {
    const html = '<!doctype html><html><head></head></html>';
    const result = injectHtml(html, comments, 'body-start');
    assert.ok(result.startsWith('\n<!-- Build Time'));
  });

  it('fallback to bottom when no </body> for body-end', () => {
    const html = '<!doctype html><html><head></head></html>';
    const result = injectHtml(html, comments, 'body-end');
    assert.ok(hasComment(result, 'Build Time'));
    assert.ok(result.lastIndexOf('</html>') < result.lastIndexOf('Build Time'));
  });

  // ===== empty html =====

  it('returns empty string as-is', () => {
    const result = injectHtml('', comments, 'top');
    assert.equal(result, '');
  });

  it('returns empty string as-is (multiple positions)', () => {
    for (const pos of ['top', 'bottom', 'after-doctype', 'head-start', 'head-end', 'body-start', 'body-end']) {
      assert.equal(injectHtml('', comments, pos), '');
    }
  });

  // ===== non-string html =====

  it('returns null as-is', () => {
    const result = injectHtml(null, comments, 'top');
    assert.equal(result, null);
  });

  it('returns undefined as-is', () => {
    const result = injectHtml(undefined, comments, 'top');
    assert.equal(result, undefined);
  });

  it('returns number as-is', () => {
    const result = injectHtml(123, comments, 'top');
    assert.equal(result, 123);
  });

  it('returns object as-is', () => {
    const obj = { html: 'test' };
    const result = injectHtml(obj, comments, 'top');
    assert.equal(result, obj);
  });

  // ===== empty comments =====

  it('returns html as-is when comments is empty array', () => {
    const html = '<!doctype html><html><head></head><body></body></html>';
    const result = injectHtml(html, [], 'top');
    assert.equal(result, html);
  });

  it('returns html as-is when comments is null', () => {
    const html = '<!doctype html><html><head></head><body></body></html>';
    const result = injectHtml(html, null, 'top');
    assert.equal(result, html);
  });

  it('returns html as-is when comments is not an array', () => {
    const html = '<!doctype html><html><head></head><body></body></html>';
    const result = injectHtml(html, 'not array', 'top');
    assert.equal(result, html);
  });

  it('returns html as-is when comments is undefined', () => {
    const html = '<!doctype html><html><head></head><body></body></html>';
    const result = injectHtml(html, undefined, 'top');
    assert.equal(result, html);
  });

  // ===== original html not lost =====

  it('original html content is not lost (simple)', () => {
    const html = '<!doctype html><html><head><title>My App</title></head><body><div id="app">Hello World</div><script src="main.js"></script></body></html>';
    const result = injectHtml(html, comments, 'after-doctype');
    assert.ok(result.includes('My App'));
    assert.ok(result.includes('Hello World'));
    assert.ok(result.includes('main.js'));
    assert.ok(result.includes('div id="app"'));
    assert.ok(result.includes('</html>'));
  });

  it('original html content is not lost (all positions)', () => {
    const html = '<!doctype html><html><head><script src="app.js"></script></head><body><p>content</p></body></html>';
    for (const pos of ['top', 'bottom', 'after-doctype', 'head-start', 'head-end', 'body-start', 'body-end']) {
      const result = injectHtml(html, comments, pos);
      assert.ok(result.includes('app.js'), `content lost at position: ${pos}`);
      assert.ok(result.includes('content'), `content lost at position: ${pos}`);
    }
  });

  // ===== multiple comment lines =====

  it('preserves all lines in multiple comment lines', () => {
    const manyComments = [
      'Line 1: First',
      'Line 2: Second',
      'Line 3: Third',
      'Line 4: Fourth',
      'Line 5: Fifth',
    ];
    const html = '<!doctype html><html><head></head><body></body></html>';
    const result = injectHtml(html, manyComments, 'after-doctype');
    assert.ok(result.includes('Line 1: First'));
    assert.ok(result.includes('Line 2: Second'));
    assert.ok(result.includes('Line 3: Third'));
    assert.ok(result.includes('Line 4: Fourth'));
    assert.ok(result.includes('Line 5: Fifth'));
    // Verify each is a proper HTML comment
    const commentMatches = result.match(/<!-- [^>]* -->/g);
    assert.equal(commentMatches.length, 5);
  });

  it('multiple comment lines with single comment still works', () => {
    const singleComment = ['Only one line'];
    const html = '<!doctype html><html><head></head><body></body></html>';
    const result = injectHtml(html, singleComment, 'after-doctype');
    assert.ok(result.includes('Only one line'));
    const commentMatches = result.match(/<!-- [^>]* -->/g);
    assert.equal(commentMatches.length, 1);
  });

  it('comment lines are separated by newlines', () => {
    const twoComments = ['First comment', 'Second comment'];
    const html = '<!doctype html><html><head></head><body></body></html>';
    const result = injectHtml(html, twoComments, 'after-doctype');
    const idx1 = result.indexOf('First comment');
    const idx2 = result.indexOf('Second comment');
    assert.ok(idx1 < idx2);
    // There should be a newline between them
    const between = result.slice(idx1, idx2);
    assert.ok(between.includes('\n'));
  });

  // ===== additional edge cases =====

  it('handles <head> with attributes', () => {
    const html = '<!doctype html><html><head lang="en"><title>Test</title></head><body></body></html>';
    const result = injectHtml(html, comments, 'head-start');
    assert.ok(result.indexOf('<head lang="en">') < result.indexOf('Build Time'));
  });

  it('handles <body> with attributes', () => {
    const html = '<!doctype html><html><head></head><body class="main"><p>Hello</p></body></html>';
    const result = injectHtml(html, comments, 'body-start');
    assert.ok(result.indexOf('<body class="main">') < result.indexOf('Build Time'));
  });

  it('case-insensitive head-start', () => {
    const html = '<!doctype html><html><HEAD><title>Test</title></HEAD><body></body></html>';
    const result = injectHtml(html, comments, 'head-start');
    assert.ok(hasComment(result, 'Build Time'));
  });

  it('case-insensitive head-end', () => {
    const html = '<!doctype html><html><head><title>Test</title></HEAD><body></body></html>';
    const result = injectHtml(html, comments, 'head-end');
    assert.ok(hasComment(result, 'Build Time'));
  });

  it('case-insensitive body-start', () => {
    const html = '<!doctype html><html><head></head><BODY><p>Hello</p></BODY></html>';
    const result = injectHtml(html, comments, 'body-start');
    assert.ok(hasComment(result, 'Build Time'));
  });

  it('case-insensitive body-end', () => {
    const html = '<!doctype html><html><head></head><body><p>Hello</p></BODY></html>';
    const result = injectHtml(html, comments, 'body-end');
    assert.ok(hasComment(result, 'Build Time'));
  });

  it('default position is after-doctype', () => {
    const html = '<!doctype html><html><head></head><body></body></html>';
    const result = injectHtml(html, comments);
    assert.ok(hasComment(result, 'Build Time'));
    assert.ok(result.indexOf('<!doctype html>') < result.indexOf('Build Time'));
  });

  it('works with HTML5 boilerplate', () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
    const result = injectHtml(html, comments, 'after-doctype');
    assert.ok(hasComment(result, 'Build Time'));
    assert.ok(result.includes('<div id="root">'));
    assert.ok(result.includes('</html>'));
  });

  it('handles unknown position gracefully', () => {
    const html = '<!doctype html><html><head></head><body></body></html>';
    const result = injectHtml(html, comments, 'unknown-position');
    assert.equal(result, html);
  });
});
