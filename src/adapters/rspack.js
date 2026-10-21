import { resolveOptions } from '../core/options.js';
import { collectMeta } from '../core/collect-meta.js';
import { injectHtml } from '../core/inject-html.js';
import { processHtmlAsset } from '../core/process-html-asset.js';

export default function rspackAdapter(userOptions) {
  const options = resolveOptions(userOptions);

  return {
    apply(compiler) {
      const pluginName = 'build-meta-injector';
      const mode = compiler.options.mode || (process.env.NODE_ENV === 'production' ? 'production' : 'development');

      if (mode === 'development' && !options.applyInDev) {
        return;
      }

      compiler.hooks.compilation.tap(pluginName, (compilation) => {
        // Try HtmlRspackPlugin first
        let HtmlRspackPlugin;
        try {
          // eslint-disable-next-line no-undef
          HtmlRspackPlugin = require('@rspack/core').HtmlRspackPlugin;
        } catch (_err) {
          // Not available
        }

        if (HtmlRspackPlugin) {
          let getHooks;
          try {
            getHooks = HtmlRspackPlugin.getHooks;
          } catch (_err) {
            // Hooks not available
          }

          if (getHooks) {
            try {
              getHooks(compilation).beforeEmit.tapAsync(pluginName, (data, cb) => {
                processHtmlAsset(data, options, mode, compiler.context);
                cb(null, data);
              });
              return;
            } catch (_err) {
              // Hooks API failed
            }
          }
        }

        // Also try html-webpack-plugin (rspack is compatible)
        let HtmlWebpackPlugin;
        try {
          // eslint-disable-next-line no-undef
          HtmlWebpackPlugin = require('html-webpack-plugin');
        } catch (_err) {
          // Not available
        }

        if (HtmlWebpackPlugin) {
          let getHooks;
          try {
            getHooks = HtmlWebpackPlugin.getHooks;
          } catch (_err) {
            // Hooks not available
          }

          if (getHooks) {
            try {
              getHooks(compilation).beforeEmit.tapAsync(pluginName, (data, cb) => {
                processHtmlAsset(data, options, mode, compiler.context);
                cb(null, data);
              });
              return;
            } catch (_err) {
              // Hooks API failed
            }
          }
        }

        // Fallback: scan compilation assets for .html files
        compiler.hooks.emit.tapAsync(pluginName, (compilation, cb) => {
          const assets = compilation.assets;
          for (const filename of Object.keys(assets)) {
            if (filename.endsWith('.html')) {
              const source = assets[filename].source();
              if (typeof source === 'string') {
                const meta = collectMeta(options, { mode, root: compiler.context });
                if (meta.length > 0) {
                  const injected = injectHtml(source, meta, options.position);
                  compilation.assets[filename] = {
                    source: () => injected,
                    size: () => Buffer.byteLength(injected, 'utf-8'),
                  };
                }
              }
            }
          }
          cb();
        });
      });
    }
  };
}
