import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { resolveOptions } from '../core/options.js';
import { collectMeta } from '../core/collect-meta.js';
import { injectHtml } from '../core/inject-html.js';

export default function esbuildAdapter(userOptions) {
  const options = resolveOptions(userOptions);
  let htmlContent = null;

  return {
    name: 'build-meta-injector',

    setup(build) {
      const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production';

      if (mode === 'development' && !options.applyInDev) {
        return;
      }

      build.onStart(() => {
        const htmlPath = options.html ? resolve(options.html) : null;
        if (htmlPath && existsSync(htmlPath)) {
          try {
            htmlContent = readFileSync(htmlPath, 'utf-8');
          } catch (_err) {
            htmlContent = null;
          }
        }
      });

      build.onEnd(() => {
        if (!htmlContent) return;

        const root = options.root || process.cwd();
        const meta = collectMeta(options, { mode, root });

        if (meta.length === 0) return;

        const injected = injectHtml(htmlContent, meta, options.position);

        let outputPath;
        if (options.outputHtml) {
          outputPath = resolve(options.outputHtml);
        } else if (options.html) {
          const parsed = resolve(options.html);
          outputPath = join(dirname(parsed), 'index.html');
        } else {
          return;
        }

        try {
          const dir = dirname(outputPath);
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          writeFileSync(outputPath, injected, 'utf-8');
        } catch (_err) {
          // Write failed — don't break the build
        }

        htmlContent = null;
      });
    }
  };
}
