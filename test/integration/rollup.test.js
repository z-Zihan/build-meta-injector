import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let rollupAvailable = false;
try { require('rollup'); rollupAvailable = true; } catch (_e) { /* not installed */ }

describe('integration - rollup', { skip: !rollupAvailable ? 'rollup not installed' : false }, () => {
  it('injects meta comments into HTML assets', async () => {
    const rollup = await import('rollup');
    const buildMetaInjector = (await import('../../src/adapters/rollup.js')).default;
    const tmp = join(tmpdir(), `bmi-rollup-test-${Date.now()}`);
    try {
      mkdirSync(tmp, { recursive: true });
      const htmlContent = '<!doctype html>\n<html><head></head><body></body></html>';
      const bundle = await rollup.rollup({
        input: 'virtual-entry',
        plugins: [
          {
            name: 'virtual',
            resolveId(id) { if (id === 'virtual-entry') return id; return null; },
            load(id) { if (id === 'virtual-entry') return 'console.log("hello");'; return null; },
          },
          buildMetaInjector({ buildTime: true, version: false, environment: false, commitHash: false, commitMessage: false }),
          {
            name: 'html-asset',
            generateBundle() {
              this.emitFile({ type: 'asset', fileName: 'index.html', source: htmlContent });
            },
          },
        ],
      });
      await bundle.write({ dir: tmp, format: 'es' });
      await bundle.close();
      const output = readFileSync(join(tmp, 'index.html'), 'utf-8');
      assert.ok(output.includes('Build Time:'));
      assert.ok(output.includes('</html>'));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
