import type { BuildMetaInjectorOptions } from './index.js';

/**
 * Minimal shape of the object returned by the Rollup adapter. Deliberately does not
 * depend on Rollup's own types (Rollup is an optional peer dependency) — this is a
 * structural subset of `import('rollup').Plugin` sufficient for `rollup.config.js`
 * to accept the return value wherever a `Plugin` is expected.
 */
export interface RollupMetaInjectorPlugin {
  name: string;
  generateBundle(outputOptions: unknown, bundle: unknown): void;
}

/** Create a Rollup plugin that injects build metadata comments into emitted `.html` assets. */
export default function rollupAdapter(options?: BuildMetaInjectorOptions): RollupMetaInjectorPlugin;
