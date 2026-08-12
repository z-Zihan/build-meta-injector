import type { BuildMetaInjectorOptions } from './index.js';

/**
 * Minimal shape of the object returned by the Rspack adapter. Deliberately does not
 * depend on `@rspack/core`'s own types (it's an optional peer dependency) — this is a
 * structural subset sufficient for `rspack.config.js`'s `plugins` array to accept the
 * return value.
 */
export interface RspackMetaInjectorPlugin {
  apply(compiler: unknown): void;
}

/**
 * Create an Rspack plugin that injects build metadata comments into the emitted HTML.
 * Uses `HtmlRspackPlugin` or `html-webpack-plugin` hooks when available, falling back
 * to scanning emitted `.html` assets directly.
 */
export default function rspackAdapter(options?: BuildMetaInjectorOptions): RspackMetaInjectorPlugin;
