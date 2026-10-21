import viteAdapter from './vite.js';
import rollupAdapter from './rollup.js';
import esbuildAdapter from './esbuild.js';
import { resolveOptions } from '../core/options.js';
import { collectMeta } from '../core/collect-meta.js';
import { injectHtml } from '../core/inject-html.js';

const PLUGIN_NAME = 'build-meta-injector';

// webpack's asset pipeline compresses `.html` assets: webpack >= 5.112 runs
// minimizer-webpack-plugin over text/html (html-minifier-terser, strips
// comments by default), and html-webpack-plugin's own production minify does
// the same earlier. Verified end to end: a comment injected before or during
// optimization is gone from the written file, while injecting at
// PROCESS_ASSETS_STAGE_ANALYSE (4000) survives to disk — html-webpack-plugin
// emits its asset asynchronously and it only appears in the compilation after
// OPTIMIZE_INLINE (700), so OPTIMIZE+500 is still too early. ANALYSE runs
// after every optimizer and after the html exists, right before the final
// REPORT pass. Rspack exposes the same processAssets API, so one path covers
// both. Keep a large fallback stage for hosts that miss newer constants.
const PROCESS_ASSETS_STAGE_LATE = 4000;

// The exact comment line shape injectHtml writes for a built-in key:
// `<!-- Build Time: 2026-10-21T... -->` (one space on each side, single line).
// Matching the plugin's own comment format, rather than a bare "Build Time"
// substring, keeps the re-entrancy guard from skipping user HTML that merely
// mentions the same words.
const INJECTED_MARKER = /<!-- (?:Build Time|Version|Environment|Commit Hash|Commit Hash \(Short\)|Commit Message|Branch): [^\r\n]*? -->/;

function hasInjectedMeta(html) {
  return INJECTED_MARKER.test(html);
}

function assetContent(source) {
  if (!source) return null;
  return typeof source.source === 'function' ? source.source() : source;
}

// `compilation.updateAsset` wants a webpack Source. Prefer the real RawSource so
// later pipeline stages can call `.buffer()`/`updateHash()`; fall back to a
// Source-shaped object for hosts or test doubles that do not expose one.
function createSource(compiler, content) {
  const sources =
    (compiler.webpack && compiler.webpack.sources) ||
    (compiler.rspack && compiler.rspack.sources);

  if (sources && typeof sources.RawSource === 'function') {
    return new sources.RawSource(content);
  }

  return {
    source: () => content,
    size: () => Buffer.byteLength(content, 'utf-8'),
  };
}

/**
 * webpack / rspack integration. Both tools fire `apply(compiler)` and share the
 * `compilation.hooks.processAssets` API, so the late-injection logic is common.
 */
function applyCompiler(compiler, options) {
  const mode = compiler.options.mode || (process.env.NODE_ENV === 'production' ? 'production' : 'development');

  if (mode === 'development' && !options.applyInDev) {
    return;
  }

  compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
    const processAssets = compilation.hooks && compilation.hooks.processAssets;
    if (!processAssets) return;

    processAssets.tap({ name: PLUGIN_NAME, stage: PROCESS_ASSETS_STAGE_LATE }, () => {
      // Read the assets as they stand after optimization. html-webpack-plugin's
      // output is already in the compilation by this point, so the generated
      // html is treated exactly like any other .html asset.
      const assets = typeof compilation.getAssets === 'function'
        ? compilation.getAssets()
        : Object.keys(compilation.assets || {}).map(name => ({ name, source: compilation.assets[name] }));

      const htmlAssets = assets.filter(asset => asset.name && asset.name.endsWith('.html'));
      if (htmlAssets.length === 0) return;

      const root = options.root || compiler.context || process.cwd();
      const meta = collectMeta(options, { mode, root });
      if (meta.length === 0) return;

      for (const asset of htmlAssets) {
        const content = assetContent(asset.source);
        if (typeof content !== 'string' || hasInjectedMeta(content)) continue;

        const injected = injectHtml(content, meta, options.position);
        if (injected === content) continue;

        if (typeof compilation.updateAsset === 'function') {
          compilation.updateAsset(asset.name, createSource(compiler, injected));
        } else {
          compilation.assets[asset.name] = createSource(compiler, injected);
        }
      }
    });
  });
}

/**
 * Build a single plugin object that carries the hooks of all five supported
 * build tools. Each tool uses the hook it understands and ignores the rest, so
 * the same instance can be dropped into a Vite, Rollup, Webpack, Rspack or
 * esbuild config without any detection step.
 *
 * Vite builds run Rollup underneath, so both `transformIndexHtml` and
 * `generateBundle` fire for the same HTML. A shared set of already-injected
 * output strings makes the first hook win and the rest no-ops.
 */
export default function buildMetaInjector(userOptions) {
  const options = resolveOptions(userOptions);
  const vite = viteAdapter(userOptions);
  const rollup = rollupAdapter(userOptions);
  const esbuild = esbuildAdapter(userOptions);

  // Output html that already went through an injector during this plugin
  // instance's lifetime. Vite emits the transformIndexHtml result as an asset,
  // so the later generateBundle pass sees it here and skips it.
  const injected = new Set();

  const plugin = {
    name: PLUGIN_NAME,

    configResolved(config) {
      vite.configResolved(config);
    },

    transformIndexHtml(html, context) {
      if (typeof html !== 'string') return html;

      // Re-entrant call on output this plugin already produced (Vite dev can
      // hand the same document back through the hook): return it untouched
      // instead of injecting a second comment block.
      if (injected.has(html) || hasInjectedMeta(html)) return html;

      const result = vite.transformIndexHtml(html);
      if (typeof result === 'string' && result !== html) {
        injected.add(result);
      }
      return result;
    },

    generateBundle(outputOptions, bundle) {
      if (!bundle || typeof bundle !== 'object') return;

      // Only hand rollup the html assets that no earlier hook has injected.
      // Chunk objects are shared by reference, so rollup's mutations land in
      // the real bundle.
      const pending = {};
      let hasPending = false;

      for (const filename of Object.keys(bundle)) {
        const chunk = bundle[filename];
        if (!chunk || chunk.type !== 'asset' || !filename.endsWith('.html')) continue;

        const source = typeof chunk.source === 'function' ? chunk.source() : chunk.source;
        if (typeof source !== 'string' || injected.has(source)) continue;

        pending[filename] = chunk;
        hasPending = true;
      }

      if (!hasPending) return;

      rollup.generateBundle(outputOptions, pending);

      for (const filename of Object.keys(pending)) {
        const chunk = pending[filename];
        const source = typeof chunk.source === 'function' ? chunk.source() : chunk.source;
        if (typeof source === 'string') {
          injected.add(source);
        }
      }
    },

    apply(compiler) {
      // `apply` means two completely different things depending on the host:
      //
      // 1. webpack / rspack: apply(compiler) is the plugin entry point. The
      //    argument is a compiler object that always exposes `hooks` and
      //    `options`.
      // 2. Vite: `apply` is NOT a hook. It is a plugin filter that Vite calls
      //    during resolveConfig as `p.apply({ ...config, mode }, configEnv)`
      //    and keeps the plugin only when the return value is truthy. The
      //    argument is an ordinary config object (or undefined), so it has no
      //    `hooks`/`options`. Reading `compiler.options.mode` there throws
      //    "Cannot read properties of undefined (reading 'mode')" and crashes
      //    the build.
      //
      // So discriminate on the compiler shape first: only route to the
      // webpack/rspack path when this really looks like a compiler.
      // Everything else is Vite probing the filter, where `true` enables the
      // plugin for both build and serve.
      const isCompiler = Boolean(
        compiler &&
        typeof compiler === 'object' &&
        compiler.hooks &&
        compiler.options
      );

      if (!isCompiler) return true;

      // Rspack exposes itself on the compiler (`compiler.rspack` /
      // `compiler.__rspack`). Both hosts share the processAssets-based
      // implementation, so there is no separate adapter to dispatch to.
      applyCompiler(compiler, options);
    },

    setup(build) {
      esbuild.setup(build);
    },
  };

  // esbuild validates every object in the `plugins` array by walking its
  // enumerable own keys and rejects anything other than `name` and `setup`
  // ("Invalid option on plugin \"build-meta-injector\": \"configResolved\"").
  // Vite, Rollup and Webpack/Rspack all read plugin hooks by direct property
  // access (`p.transformIndexHtml`, `p.generateBundle`, `p.apply`), which is
  // unaffected by enumerability, so hiding the foreign hooks keeps every host
  // working while leaving Object.keys(plugin) as `['name', 'setup']`.
  for (const hook of ['configResolved', 'transformIndexHtml', 'generateBundle', 'apply']) {
    Object.defineProperty(plugin, hook, {
      value: plugin[hook],
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }

  return plugin;
}
