import type { BuildMetaInjectorOptions } from './index.js';

/**
 * Minimal shape of the object returned by the Vite adapter. Deliberately does not
 * depend on Vite's own types (Vite is an optional peer dependency) — this is a
 * structural subset of `import('vite').Plugin` sufficient for `vite.config.ts`
 * to accept the return value wherever a `Plugin` is expected.
 */
export interface ViteMetaInjectorPlugin {
  name: string;
  configResolved(config: { mode?: string; root?: string; [key: string]: unknown }): void;
  transformIndexHtml(html: string): string;
}

/** Create a Vite plugin that injects build metadata comments into `index.html`. */
export default function viteAdapter(options?: BuildMetaInjectorOptions): ViteMetaInjectorPlugin;
