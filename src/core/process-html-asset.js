import { collectMeta } from './collect-meta.js';
import { injectHtml } from './inject-html.js';

/**
 * Inject metadata into an html-webpack-plugin / HtmlRspackPlugin `beforeEmit`
 * payload. Shared by the webpack and rspack adapters: it lives in core because
 * the bundler inlines both adapters into a single module scope, where two
 * top-level `function processHtmlAsset` declarations would collide.
 */
export function processHtmlAsset(data, options, mode, compilerContext) {
  const root = options.root || compilerContext || process.cwd();
  const meta = collectMeta(options, { mode, root });
  if (meta.length > 0) {
    data.html = injectHtml(data.html, meta, options.position);
  }
}
