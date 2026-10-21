# Changelog

## 1.0.5 (2026-10-21)

### Features

- ✨ Universal default export with auto-detection for all 5 build tools: `import buildMetaInjector from 'build-meta-injector'` now returns one plugin object that works unchanged in Vite, Webpack, Rollup, Rspack and esbuild — no per-tool subpath and no configuration. It carries `transformIndexHtml`, `generateBundle`, `apply` and `setup`, plus Vite's `configResolved`; each tool uses the hooks it understands and ignores the rest.
- ✨ `apply` dispatches to the Rspack or Webpack implementation based on the compiler, so a single instance covers both.
- ✨ Once-guard prevents double injection when one build fires more than one hook (Vite builds run `transformIndexHtml` and then Rollup's `generateBundle` over the same HTML).
- ✨ TypeScript declarations for the universal plugin on the main entry.

### Changed

- 🧹 The shared `beforeEmit` injection helper moved to `src/core/process-html-asset.js`. Webpack and Rspack adapter behavior is unchanged; the move keeps the adapters from declaring the same top-level function when bundled together.

## 1.0.4 (2026-10-21)

### Fixed

- 🐛 **Critical**: `dist/index.js` (main entry) was invalid syntax on all previous published versions (1.0.0–1.0.3). The bundler did not understand `export { x } from './y.js'` re-export statements, emitting bare `{ x } from './y.js'` — importing the package main entry always threw a SyntaxError. Adapter entry points (`/vite`, `/webpack`, etc.) were unaffected.
- Build bundler now recognizes re-export statements as dependencies, inlines the target modules, and rewrites `export { x } from './y.js'` to `export { x }` in the bundle.

## 1.0.3 (2026-08-12)

### Changes

- ✨ Added full TypeScript type declarations for all 6 entry points (`index`, `vite`, `webpack`, `rollup`, `rspack`, `esbuild`)
- ✨ `package.json` `exports` now exposes `types` conditions (`.d.ts` for ESM, `.d.cts` for CJS) — fixes `ts(7016)` when importing `build-meta-injector/vite` etc. in TS projects
- ✨ Added `types/` hand-written declarations, copied into `dist/` by the build script

## 1.0.2 (2026-08-03)

### Changes

- 💥 **Breaking**: `applyInDev` default changed from `false` to `true` — the plugin now injects metadata in development mode by default
- 📖 README restructured: English documentation moved to the top, Chinese documentation below
- 📖 Added detailed configuration reference with all possible values for every option
- 📖 Added `position` fallback behavior table
- 📖 Updated FAQ to reflect new `applyInDev` default

## 1.0.1 (2026-07-31)

### Changes

- 📖 Added zero-config usage documentation
- 📖 README supplemented with no-argument examples for all adapters

## 1.0.0 (2026-07-31)

### Initial Release

- ✨ Support Vite via `transformIndexHtml` hook
- ✨ Support Webpack via `html-webpack-plugin` hooks (with fallback asset scanning)
- ✨ Support Rollup via `generateBundle` hook
- ✨ Support Rspack via `html-webpack-plugin` / `@rspack/core` compatibility
- ✨ Support esbuild via `onStart`/`onEnd` hooks
- ✨ Inject build time (configurable timezone & locale)
- ✨ Inject package version from host project's `package.json`
- ✨ Inject environment info (priority: `environmentValue` > mode > env keys)
- ✨ Inject Git commit hash, commit message, and branch
- ✨ Support custom data injection
- ✨ HTML comment sanitization (prevent `--` injection, control chars, etc.)
- ✨ 7 injection positions (after-doctype, head-start, head-end, body-start, body-end, top, bottom)
- ✨ Development mode control (`applyInDev`)
- ✨ Monorepo support (walk up to find `package.json`)
- ✨ Dual ESM + CommonJS output
- ✨ Cross-platform (Windows, macOS, Linux)
