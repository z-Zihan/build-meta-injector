# Changelog

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
