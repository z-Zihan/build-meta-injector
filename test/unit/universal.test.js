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

function makeSource(content) {
  return {
    source: () => content,
    size: () => Buffer.byteLength(content, 'utf-8'),
  };
}

function makeWebpackCompiler(mode = 'production') {
  const handlers = { compilation: [] };
  return {
    options: { mode },
    context: process.cwd(),
    hooks: {
      compilation: { tap(_name, fn) { handlers.compilation.push(fn); } },
    },
    handlers,
  };
}

function makeCompilation(compiler, files) {
  const assets = {};
  for (const [name, content] of Object.entries(files)) {
    assets[name] = makeSource(content);
  }

  const processAssetsHandlers = [];

  const compilation = {
    assets,
    compiler,
    hooks: {
      processAssets: {
        tap(options, fn) {
          processAssetsHandlers.push({ options, fn });
        },
        tapAsync(options, fn) {
          processAssetsHandlers.push({ options, fn });
        },
      },
    },
    processAssetsHandlers,
    getAssets() {
      return Object.keys(assets).map(name => ({ name, source: assets[name] }));
    },
    getAsset(name) {
      return assets[name];
    },
    updateAsset(name, source) {
      assets[name] = source;
    },
  };

  return compilation;
}

function runProcessAssets(compiler, compilation) {
  assert.equal(compiler.handlers.compilation.length, 1);
  compiler.handlers.compilation[0](compilation);

  assert.equal(compilation.processAssetsHandlers.length, 1);
  const { options, fn } = compilation.processAssetsHandlers[0];
  // Must run after the default optimizers (minimizer-webpack-plugin compresses
  // text/html at PROCESS_ASSETS_STAGE_OPTIMIZE, i.e. stage 100).
  assert.ok(options.stage > 100, `expected late stage, got ${options.stage}`);
  fn();
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

  it('esbuild accepts the plugin object (only name/setup enumerable)', () => {
    const plugin = buildMetaInjector(OPTIONS);

    // esbuild walks enumerable own keys and rejects any plugin option other
    // than `name` / `setup`.
    assert.deepEqual(Object.keys(plugin).sort(), ['name', 'setup']);

    // The hidden hooks must remain directly accessible for Vite, Rollup and
    // Webpack/Rspack, which do not enumerate plugin keys.
    assert.equal(typeof plugin.transformIndexHtml, 'function');
    assert.equal(typeof plugin.configResolved, 'function');
    assert.equal(typeof plugin.generateBundle, 'function');
    assert.equal(typeof plugin.apply, 'function');
    assert.equal(plugin.name, 'build-meta-injector');
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
  it('injects html assets in a late processAssets stage', () => {
    const plugin = buildMetaInjector(OPTIONS);
    const compiler = makeWebpackCompiler();
    plugin.apply(compiler);

    const compilation = makeCompilation(compiler, {
      'index.html': HTML,
      'app.js': 'console.log(1);',
    });
    runProcessAssets(compiler, compilation);

    const output = compilation.getAsset('index.html').source();
    assert.ok(output.includes('Build Time:'));
    assert.equal(countBuildTime(output), 1);
    assert.equal(compilation.getAsset('app.js').source(), 'console.log(1);');
  });

  it('does not inject twice into an asset that already carries the marker', () => {
    const plugin = buildMetaInjector(OPTIONS);
    const compiler = makeWebpackCompiler();
    plugin.apply(compiler);

    const compilation = makeCompilation(compiler, { 'index.html': HTML });
    runProcessAssets(compiler, compilation);
    // The plugin's own handler runs again in a later compilation pass (or a
    // host that calls processAssets callbacks more than once).
    compilation.processAssetsHandlers[0].fn();

    assert.equal(countBuildTime(compilation.getAsset('index.html').source()), 1);
  });

  it('skips development builds when applyInDev is false', () => {
    const plugin = buildMetaInjector({ ...OPTIONS, applyInDev: false });
    const compiler = makeWebpackCompiler('development');
    plugin.apply(compiler);
    assert.equal(compiler.handlers.compilation.length, 0);
  });

  it('routes rspack compilers through the same processAssets path', () => {
    const plugin = buildMetaInjector(OPTIONS);
    const compiler = makeWebpackCompiler();
    compiler.rspack = {};
    plugin.apply(compiler);

    const compilation = makeCompilation(compiler, { 'index.html': HTML });
    runProcessAssets(compiler, compilation);

    assert.ok(compilation.getAsset('index.html').source().includes('Build Time:'));
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
