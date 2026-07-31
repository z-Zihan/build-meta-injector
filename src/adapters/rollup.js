import { resolveOptions } from '../core/options.js';
import { collectMeta } from '../core/collect-meta.js';
import { injectHtml } from '../core/inject-html.js';

export default function rollupAdapter(userOptions) {
  const options = resolveOptions(userOptions);

  return {
    name: 'build-meta-injector',

    generateBundle(_outputOptions, bundle) {
      let mode = 'production';
      if (process.env.NODE_ENV === 'development') {
        mode = 'development';
      }

      if (mode === 'development' && !options.applyInDev) {
        return;
      }

      const root = options.root || process.cwd();

      for (const [filename, chunk] of Object.entries(bundle)) {
        if (filename.endsWith('.html') && chunk.type === 'asset') {
          const source = typeof chunk.source === 'function' ? chunk.source() : chunk.source;
          if (typeof source === 'string') {
            const meta = collectMeta(options, { mode, root });
            if (meta.length > 0) {
              const injected = injectHtml(source, meta, options.position);
              if (typeof chunk.source === 'function') {
                chunk.source = () => injected;
              } else {
                chunk.source = injected;
              }
            }
          }
        }
      }
    }
  };
}
