import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let viteAvailable = false;
try { execSync('node -e "require(\'vite\')"', { stdio: 'ignore' }); viteAvailable = true; } catch (_e) { /* not installed */ }

describe('integration - vite', { skip: !viteAvailable ? 'vite not installed' : false }, () => {
  it('injects meta comments into built HTML', () => {
    const tmp = join(tmpdir(), `bmi-vite-test-${Date.now()}`);
    try {
      mkdirSync(tmp, { recursive: true });
      mkdirSync(join(tmp, 'src'));
      writeFileSync(join(tmp, 'package.json'), JSON.stringify({
        name: 'vite-test', version: '1.0.0', type: 'module',
        scripts: { build: 'vite build' },
        dependencies: { vite: '*' },
      }));
      writeFileSync(join(tmp, 'index.html'), '<!doctype html>\n<html><head><title>Test</title></head><body><div id="app"></div></body></html>');
      writeFileSync(join(tmp, 'vite.config.js'), `
import { defineConfig } from 'vite';
import buildMetaInjector from '${join(process.cwd(), 'src', 'adapters', 'vite.js')}';
export default defineConfig({
  plugins: [buildMetaInjector({ buildTime: true, version: true, environment: true, commitHash: false, commitMessage: false })],
  root: '${tmp}',
});
`);
      execSync('npx vite build --outDir dist', { cwd: tmp, stdio: 'pipe', timeout: 30000 });
      const output = readFileSync(join(tmp, 'dist', 'index.html'), 'utf-8');
      assert.ok(output.includes('Build Time:'));
      assert.ok(output.includes('Version: 1.0.0'));
      assert.ok(output.includes('</html>'));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
