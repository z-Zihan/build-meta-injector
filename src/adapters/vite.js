import { resolveOptions } from '../core/options.js';
import { collectMeta } from '../core/collect-meta.js';
import { injectHtml } from '../core/inject-html.js';

export default function viteAdapter(userOptions) {
  let resolvedOptions;
  let viteMode;
  let viteRoot;

  return {
    name: 'build-meta-injector',

    configResolved(config) {
      viteMode = config.mode;
      viteRoot = config.root;
      resolvedOptions = resolveOptions(userOptions);
    },

    transformIndexHtml(html) {
      if (!resolvedOptions) {
        resolvedOptions = resolveOptions(userOptions);
      }

      const mode = viteMode || (process.env.NODE_ENV === 'production' ? 'production' : 'development');

      if (mode === 'development' && !resolvedOptions.applyInDev) {
        return html;
      }

      const root = resolvedOptions.root || viteRoot || process.cwd();
      const meta = collectMeta(resolvedOptions, { mode, root });

      if (meta.length === 0) {
        return html;
      }

      return injectHtml(html, meta, resolvedOptions.position);
    }
  };
}
