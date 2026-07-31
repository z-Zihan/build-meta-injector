import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let esbuildAvailable = false;
try { require('esbuild'); esbuildAvailable = true; } catch (_e) { /* not installed */ }

describe('integration - esbuild', { skip: !esbuildAvailable ? 'esbuild not installed' : false }, () => {
  it('injects meta comments into output HTML', async () => {
    const esbuild = await import('esbuild');
    const buildMetaInjector = (await import('../../src/adapters/esbuild.js')).default;
    const tmp = join(tmpdir(), `bmi-esbuild-test-${Date.now()}`);
    try {
      mkdirSync(tmp, { recursive: true });
      mkdirSync(join(tmp, 'dist'));
      writeFileSync(join(tmp, 'index.html'), '<!doctype html>\n<html><head></head><body></body></html>');
      await esbuild.build({
        entryPoints: [],
        outdir: join(tmp, 'dist'),
        plugins: [buildMetaInjector({
          buildTime: true, version: false, environment: false,
          commitHash: false, commitMessage: false,
          html: join(tmp, 'index.html'),
          outputHtml: join(tmp, 'dist', 'index.html'),
        })],
      });
      const output = readFileSync(join(tmp, 'dist', 'index.html'), 'utf-8');
      assert.ok(output.includes('Build Time:'));
      assert.ok(output.includes('</html>'));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
