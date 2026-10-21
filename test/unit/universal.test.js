import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import buildMetaInjector from '../../src/adapters/universal.js';

// Only build time is enabled, so the test does not depend on Git state.
const OPTIONS = {
  buildTime: true,
  version: false,
  environment: false,
  commitHash: false,
  commitMessage: false,
};

const HTML = '<!doctype html>\n<html><head><title>Test</title></head><body></body></html>';

function countBuildTime(html) {
  return (html.match(/Build Time:/g) || []).length;
}

function makeWebpackCompiler() {
  const handlers = { compilation: [], emit: [] };
  return {
    options: { mode: 'production' },
    context: process.cwd(),
    hooks: {
      compilation: { tap(_name, fn) { handlers.compilation.push(fn); } },
      emit: { tapAsync(_name, fn) { handlers.emit.push(fn); } },
    },
    handlers,
  };
}

describe('universal - shape', () => {
  it('exposes name and the hooks of all five build tools', () => {
    const plugin = buildMetaInjector(OPTIONS);
    assert.equal(plugin.name, 'build-meta-injector');
    assert.equal(typeof plugin.transformIndexHtml, 'function');
    assert.equal(typeof plugin.generateBundle, 'function');
    assert.equal(typeof plugin.apply, 'function');
    assert.equal(typeof plugin.setup, 'function');
  });
});

describe('universal - vite', () => {
  it('vite calls apply as a plugin filter', () => {
    const plugin = buildMetaInjector(OPTIONS);

    // Vite's resolveConfig runs `typeof p.apply === 'function' ? p.apply({...config, mode}, configEnv) : ...`
    // and keeps the plugin when the result is truthy. A plain config object
    // has no `hooks`/`options`, so the webpack-style branch must not run.
    let result;
    assert.doesNotThrow(() => {
      result = plugin.apply(
        { mode: 'production' },
        { command: 'build', mode: 'production' },
      );
    });
    assert.equal(result, true);

    // The same filter is called without an argument in some paths.
    assert.equal(plugin.apply(), true);
  });

  it('injects metadata through transformIndexHtml', () => {
    const plugin = buildMetaInjector(OPTIONS);
    const result = plugin.transformIndexHtml(HTML);
    assert.ok(result.includes('Build Time:'));
    assert.ok(result.includes('</html>'));
    assert.equal(countBuildTime(result), 1);
  });

  it('uses the resolved vite mode and root from configResolved', () => {
    const plugin = buildMetaInjector({ ...OPTIONS, environment: true });
    plugin.configResolved({ mode: 'staging', root: process.cwd() });
    const result = plugin.transformIndexHtml(HTML);
    assert.ok(result.includes('Environment: staging'));
  });
});

describe('universal - rollup', () => {
  it('injects metadata into html assets through generateBundle', () => {
    const plugin = buildMetaInjector(OPTIONS);
    const bundle = {
      'index.html': { type: 'asset', fileName: 'index.html', source: HTML },
      'app.js': { type: 'chunk', fileName: 'app.js' },
    };
    plugin.generateBundle({}, bundle);
    assert.ok(bundle['index.html'].source.includes('Build Time:'));
    assert.equal(bundle['app.js'].source, undefined);
  });

  it('handles chunk sources exposed as functions', () => {
    const plugin = buildMetaInjector(OPTIONS);
    const bundle = {
      'index.html': { type: 'asset', fileName: 'index.html', source: () => HTML },
    };
    plugin.generateBundle({}, bundle);
    const source = bundle['index.html'].source();
    assert.ok(source.includes('Build Time:'));
  });
});

describe('universal - esbuild', () => {
  it('registers onStart and onEnd through setup', () => {
    const plugin = buildMetaInjector(OPTIONS);
    const registered = [];
    const fakeBuild = {
      onStart(fn) { registered.push(['start', fn]); },
      onEnd(fn) { registered.push(['end', fn]); },
    };
    plugin.setup(fakeBuild);
    assert.deepEqual(registered.map(([name]) => name), ['start', 'end']);
    assert.ok(registered.every(([, fn]) => typeof fn === 'function'));
  });
});

describe('universal - webpack / rspack', () => {
  it('registers a compilation hook and injects emitted html assets', () => {
    const plugin = buildMetaInjector(OPTIONS);
    const compiler = makeWebpackCompiler();
    plugin.apply(compiler);

    assert.equal(compiler.handlers.compilation.length, 1);

    const assets = {
      'index.html': { source: () => HTML },
      'app.js': { source: () => 'console.log(1);' },
    };
    const compilation = { assets, compiler };
    compiler.handlers.compilation[0](compilation);

    assert.equal(compiler.handlers.emit.length, 1);
    compiler.handlers.emit[0](compilation, () => {});

    const output = compilation.assets['index.html'].source();
    assert.ok(output.includes('Build Time:'));
    assert.equal(compilation.assets['app.js'].source(), 'console.log(1);');
  });

  it('routes rspack compilers to the rspack adapter', () => {
    const plugin = buildMetaInjector(OPTIONS);
    const compiler = makeWebpackCompiler();
    compiler.rspack = {};
    plugin.apply(compiler);
    assert.equal(compiler.handlers.compilation.length, 1);
  });
});

describe('universal - once guard', () => {
  it('injects only once when transformIndexHtml then generateBundle both fire', () => {
    const plugin = buildMetaInjector(OPTIONS);

    const transformed = plugin.transformIndexHtml(HTML);
    assert.equal(countBuildTime(transformed), 1);

    // Vite emits the already-transformed html as a rollup asset.
    const bundle = {
      'index.html': { type: 'asset', fileName: 'index.html', source: transformed },
    };
    plugin.generateBundle({}, bundle);

    assert.equal(countBuildTime(bundle['index.html'].source), 1);
    assert.equal(bundle['index.html'].source, transformed);
  });

  it('drops re-entrant transformIndexHtml calls on already-injected output', () => {
    const plugin = buildMetaInjector(OPTIONS);
    const first = plugin.transformIndexHtml(HTML);
    const second = plugin.transformIndexHtml(first);
    assert.equal(countBuildTime(second), 1);
  });
});
