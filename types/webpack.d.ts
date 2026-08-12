import type { BuildMetaInjectorOptions } from './index.js';

/**
 * Minimal shape of the object returned by the webpack adapter. Deliberately does not
 * depend on webpack's own types (webpack is an optional peer dependency) — this is a
 * structural subset of `import('webpack').WebpackPluginInstance` sufficient for
 * `webpack.config.js`'s `plugins` array to accept the return value.
 */
export interface WebpackMetaInjectorPlugin {
  apply(compiler: unknown): void;
}

/**
 * Create a webpack plugin that injects build metadata comments into the emitted HTML.
 * Uses `html-webpack-plugin` hooks when available, falling back to scanning emitted
 * `.html` assets directly.
 */
export default function webpackAdapter(options?: BuildMetaInjectorOptions): WebpackMetaInjectorPlugin;
