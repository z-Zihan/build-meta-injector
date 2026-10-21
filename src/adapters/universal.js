import viteAdapter from './vite.js';
import rollupAdapter from './rollup.js';
import webpackAdapter from './webpack.js';
import rspackAdapter from './rspack.js';
import esbuildAdapter from './esbuild.js';

// The exact comment line shape injectHtml writes for a built-in key:
// `<!-- Build Time: 2026-10-21T... -->` (one space on each side, single line).
// Matching the plugin's own comment format, rather than a bare "Build Time"
// substring, keeps the re-entrancy guard from skipping user HTML that merely
// mentions the same words.
const INJECTED_MARKER = /<!-- (?:Build Time|Version|Environment|Commit Hash|Commit Hash \(Short\)|Commit Message|Branch): [^\r\n]*? -->/;

function hasInjectedMeta(html) {
  return INJECTED_MARKER.test(html);
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
  const vite = viteAdapter(userOptions);
  const rollup = rollupAdapter(userOptions);
  const webpack = webpackAdapter(userOptions);
  const rspack = rspackAdapter(userOptions);
  const esbuild = esbuildAdapter(userOptions);

  // Output html that already went through an injector during this plugin
  // instance's lifetime. Vite emits the transformIndexHtml result as an asset,
  // so the later generateBundle pass sees it here and skips it.
  const injected = new Set();

  return {
    name: 'build-meta-injector',

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
      // Rspack exposes itself on the compiler; everything else is webpack.
      const isRspack = Boolean(compiler && (compiler.rspack || compiler.__rspack));
      if (isRspack) {
        rspack.apply(compiler);
      } else {
        webpack.apply(compiler);
      }
    },

    setup(build) {
      esbuild.setup(build);
    },
  };
}
