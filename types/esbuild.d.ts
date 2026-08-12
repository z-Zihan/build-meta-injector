import type { BuildMetaInjectorOptions } from './index.js';

/**
 * Minimal shape of the object returned by the esbuild adapter. Deliberately does not
 * depend on esbuild's own types (esbuild is an optional peer dependency) — this is a
 * structural subset of `import('esbuild').Plugin` sufficient for esbuild's `plugins`
 * array to accept the return value.
 */
export interface EsbuildMetaInjectorPlugin {
  name: string;
  setup(build: unknown): void;
}

/**
 * Create an esbuild plugin that injects build metadata comments into an HTML file.
 * Unlike the other adapters, esbuild has no built-in HTML pipeline: provide
 * `options.html` (source) and optionally `options.outputHtml` (destination, defaults
 * to `index.html` next to the source) for the plugin to read and write.
 */
export default function esbuildAdapter(options?: BuildMetaInjectorOptions): EsbuildMetaInjectorPlugin;
