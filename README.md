# build-meta-injector

> Inject build time, version, environment and Git metadata into HTML across Vite, Webpack, Rollup, Rspack and esbuild.

[English](#english) | [中文](#中文)

---

## English

### Introduction

`build-meta-injector` is a universal front-end build metadata injection plugin. It injects build metadata (as HTML comments) into the final HTML files during the build stage, making it easy to troubleshoot production issues, verify deployed versions, and manage CI/CD pipelines.

### Problems Solved

- ❓ When was the production app built?
- ❓ What version is currently deployed?
- ❓ What environment is running?
- ❓ Which Git Commit does this correspond to?
- ❓ Production version doesn't match the source code?

### Supported Build Tools

| Build Tool | Integration | Extra Plugin Needed |
|------------|------------|---------------------|
| Vite | `transformIndexHtml` | ❌ |
| Webpack | `html-webpack-plugin` hooks / asset scanning | ⚠️ Optional |
| Rollup | `generateBundle` | ❌ |
| Rspack | `html-webpack-plugin` / `@rspack/core` | ⚠️ Optional |
| esbuild | `onStart` / `onEnd` | ❌ |

### Features

- 📦 Build time injection (configurable timezone & locale)
- 🏷️ Version injection (reads host project's `package.json`)
- 🌍 Environment info injection (multi-level priority resolution)
- 🔗 Git Commit Hash injection
- 💬 Git Commit Message injection
- 🌿 Git Branch injection
- 📝 Custom data injection
- 🛡️ HTML comment sanitization
- 📍 7 injection positions
- 🔧 Development mode control
- 📦 Monorepo support
- 📦 Dual ESM + CommonJS output

### Installation

```bash
npm install build-meta-injector -D
```

### Quick Start (Zero Config)

All options are optional — **pass nothing and it just works**:

```js
// Vite
import buildMetaInjector from 'build-meta-injector/vite';
export default { plugins: [buildMetaInjector()] };

// Webpack
const buildMetaInjector = require('build-meta-injector/webpack');
module.exports = { plugins: [buildMetaInjector()] };

// Rollup
import buildMetaInjector from 'build-meta-injector/rollup';
export default { plugins: [buildMetaInjector()] };
```

> ⚠️ esbuild requires `html` and `outputHtml` options since esbuild doesn't process HTML files natively.

By default, the plugin injects: build time, version, environment, commit hash, and commit message.

### Vite Example

```js
import { defineConfig } from 'vite';
import buildMetaInjector from 'build-meta-injector/vite';

export default defineConfig({
  plugins: [
    buildMetaInjector({
      buildTime: true,
      version: true,
      environment: true,
      commitHash: true,
      commitMessage: true,
    }),
  ],
});
```

### Webpack Example

```js
const buildMetaInjector = require('build-meta-injector/webpack');

module.exports = {
  plugins: [
    buildMetaInjector({
      buildTime: true,
      version: true,
      environment: true,
    }),
  ],
});
```

> **Note**: The Webpack adapter prefers `html-webpack-plugin` hooks. If `html-webpack-plugin` is not installed, it scans build output for `.html` files and injects into them.

### Rollup Example

```js
import buildMetaInjector from 'build-meta-injector/rollup';

export default {
  plugins: [
    buildMetaInjector({
      buildTime: true,
      environment: true,
      commitHash: true,
    }),
  ],
});
```

> **Note**: Rollup itself doesn't generate HTML. This plugin processes HTML assets in the build output (requires another HTML generation plugin).

### Rspack Example

```js
const buildMetaInjector = require('build-meta-injector/rspack');

module.exports = {
  plugins: [
    buildMetaInjector({
      buildTime: true,
      version: true,
      environment: true,
    }),
  ],
});
```

### esbuild Example

```js
import esbuild from 'esbuild';
import buildMetaInjector from 'build-meta-injector/esbuild';

await esbuild.build({
  entryPoints: ['src/index.js'],
  outdir: 'dist',
  plugins: [
    buildMetaInjector({
      buildTime: true,
      version: true,
      environment: true,
      html: 'index.html',
      outputHtml: 'dist/index.html',
    }),
  ],
});
```

> **Note**: esbuild doesn't generate HTML natively. You must specify source and output HTML paths via `html` and `outputHtml`.

### Full Configuration Reference

#### `buildTime`

- **Type**: `boolean`
- **Default**: `true`
- **Values**: `true` | `false`
- **Description**: Whether to inject the build timestamp. Uses `Intl.DateTimeFormat` with configurable timezone and locale. Output format: `Build Time: 2026/7/31 13:30:00`.

#### `version`

- **Type**: `boolean`
- **Default**: `true`
- **Values**: `true` | `false`
- **Description**: Whether to inject the package version. Reads from the host project's `package.json` `version` field. Walks up to 5 parent directories (monorepo support). Output format: `Version: 1.0.0`.

#### `environment`

- **Type**: `boolean`
- **Default**: `true`
- **Values**: `true` | `false`
- **Description**: Whether to inject the environment name. Resolved via priority: `environmentValue` → build tool mode → `environmentKeys` env vars. Output format: `Environment: production`.

#### `commitHash`

- **Type**: `boolean`
- **Default**: `true`
- **Values**: `true` | `false`
- **Description**: Whether to inject the short Git commit hash. Uses `git rev-parse --short HEAD`. Output format: `Commit Hash (Short): abcdef12`. Skipped silently if Git is unavailable.

#### `commitMessage`

- **Type**: `boolean`
- **Default**: `true`
- **Values**: `true` | `false`
- **Description**: Whether to inject the latest Git commit message (subject line only). Uses `git log -1 --pretty=%s`. Output format: `Commit Message: feat: add new feature`. Skipped silently if Git is unavailable.

#### `branch`

- **Type**: `boolean`
- **Default**: `false`
- **Values**: `true` | `false`
- **Description**: Whether to inject the current Git branch name. Uses `git rev-parse --abbrev-ref HEAD`. Output format: `Branch: main`. Skipped silently if Git is unavailable.

#### `environmentValue`

- **Type**: `string`
- **Default**: `undefined`
- **Values**: Any string, e.g. `'production'`, `'staging'`, `'development'`
- **Description**: Manually specify the environment name. Takes the highest priority in environment resolution. If set, overrides mode detection and env var lookup.

#### `environmentKeys`

- **Type**: `string[]`
- **Default**: `['APP_ENV', 'DEPLOY_ENV', 'NODE_ENV', 'MODE']`
- **Values**: Array of environment variable names, e.g. `['NODE_ENV', 'APP_ENV']`, `['DEPLOY_ENV']`
- **Description**: Environment variable key names to check when `environmentValue` is not set and no build tool mode is available. The first non-empty match is used. Order matters — earlier keys take priority.

#### `timeZone`

- **Type**: `string`
- **Default**: `'Asia/Shanghai'`
- **Values**: Any valid IANA timezone string, e.g. `'UTC'`, `'America/New_York'`, `'Europe/London'`, `'Asia/Tokyo'`
- **Description**: Timezone for the build timestamp. Passed to `Intl.DateTimeFormat`. Must be a valid IANA timezone identifier.

#### `locale`

- **Type**: `string`
- **Default**: `'zh-CN'`
- **Values**: Any valid locale string, e.g. `'en-US'`, `'zh-CN'`, `'ja-JP'`, `'de-DE'`, `'fr-FR'`
- **Description**: Locale for the build timestamp formatting. Passed to `Intl.DateTimeFormat`. Controls date/time formatting conventions.

#### `position`

- **Type**: `string`
- **Default**: `'after-doctype'`
- **Values**: `'after-doctype'` | `'head-start'` | `'head-end'` | `'body-start'` | `'body-end'` | `'top'` | `'bottom'`
- **Description**: Where to inject the HTML comment block in the HTML file.

  | Value | Position | Fallback |
  |-------|----------|----------|
  | `'after-doctype'` | After `<!doctype html>` | `top` if no doctype |
  | `'head-start'` | After `<head>` tag | `top` if no `<head>` |
  | `'head-end'` | Before `</head>` | `bottom` if no `</head>` |
  | `'body-start'` | After `<body>` tag | `top` if no `<body>` |
  | `'body-end'` | Before `</body>` | `bottom` if no `</body>` |
  | `'top'` | Very beginning of file | — |
  | `'bottom'` | Very end of file | — |

#### `fullCommitHash`

- **Type**: `boolean`
- **Default**: `false`
- **Values**: `true` | `false`
- **Description**: Whether to use the full 40-character commit hash instead of the short hash. When `true`, injects both short and full hash. Uses `git rev-parse HEAD`. Output format: `Commit Hash: abcdef1234567890abcdef1234567890abcdef12`.

#### `applyInDev`

- **Type**: `boolean`
- **Default**: `true`
- **Values**: `true` | `false`
- **Description**: Whether to inject metadata in development mode. When `false`, the plugin only runs during production builds. When `true` (default), metadata is injected in both dev and production modes.

#### `customData`

- **Type**: `object`
- **Default**: `{}`
- **Values**: Any plain object with string keys and string/number values, e.g. `{ deployTarget: 'us-east-1', releaseId: 'v2.1.0' }`
- **Description**: Custom key-value pairs to inject as additional HTML comments. Keys and values are sanitized (HTML comment safe). **Never put secrets, tokens, or API keys here** — HTML comments are visible to all users.

#### `root`

- **Type**: `string`
- **Default**: `undefined`
- **Values**: Absolute or relative path, e.g. `'/path/to/project'`, `'.'`, `'..'`
- **Description**: Project root directory. Used for finding `package.json` (version) and running Git commands. When `undefined`, the plugin uses the build tool's root or `process.cwd()`.

#### `debug`

- **Type**: `boolean`
- **Default**: `false`
- **Values**: `true` | `false`
- **Description**: Enable debug mode. When `true`, the plugin may output additional diagnostic information to help troubleshoot issues.

#### `html`

- **Type**: `string`
- **Default**: `undefined`
- **Values**: Path to source HTML file, e.g. `'index.html'`, `'src/template.html'`
- **Description**: **esbuild only.** Path to the source HTML file. Required for esbuild since it doesn't process HTML natively.

#### `outputHtml`

- **Type**: `string`
- **Default**: `undefined`
- **Values**: Path for output HTML file, e.g. `'dist/index.html'`
- **Description**: **esbuild only.** Path where the injected HTML should be written. If not specified, defaults to the same directory as `html` with `index.html` as the filename.

### Default Configuration

The plugin works with **zero configuration**. All fields have defaults:

```js
{
  buildTime: true,
  version: true,
  environment: true,
  commitHash: true,
  commitMessage: true,
  branch: false,
  environmentValue: undefined,
  environmentKeys: ['APP_ENV', 'DEPLOY_ENV', 'NODE_ENV', 'MODE'],
  timeZone: 'Asia/Shanghai',
  locale: 'zh-CN',
  position: 'after-doctype',
  fullCommitHash: false,
  applyInDev: true,
  customData: {},
}
```

### Environment Resolution Priority

1. User-specified `environmentValue`
2. Build tool's mode (e.g., Vite's `config.mode`)
3. `environmentKeys` env vars (checked in order)
4. Skipped if none found

### HTML Output Example

```html
<!doctype html>
<!-- Build Time: 2026/7/31 13:30:00 -->
<!-- Package Version: 1.0.0 -->
<!-- Environment: production -->
<!-- Commit Hash: abcdef123456 -->
<!-- Commit Message: feat: add new feature -->
<!-- Git Branch: main -->
<html>
<head></head>
<body></body>
</html>
```

### Injection Positions

| Position | Description |
|----------|-------------|
| `after-doctype` | After `<!doctype html>` (default) |
| `head-start` | After `<head>` |
| `head-end` | Before `</head>` |
| `body-start` | After `<body>` |
| `body-end` | Before `</body>` |
| `top` | Very beginning of the HTML file |
| `bottom` | Very end of the HTML file |

### Multi-Page Build

The plugin processes all HTML files in the build output, supporting multi-page applications.

### Non-Git Environment Behavior

- Git info is skipped when `.git` is not available (e.g., CI without checkout)
- Build never fails due to Git errors
- Use `debug: true` for diagnostic info

### Docker Notes

- Docker builds may not have `.git` directory — Git info is skipped
- Recommended: build and inject in CI stage, then package Docker image

### CI/CD Notes

- CI environments usually have Git info available
- `NODE_ENV` is typically `production`
- Use `environmentValue` to explicitly set the environment

### Monorepo Support

- The plugin walks up from `root` (or build tool's root) to find `package.json`
- Searches up to 5 parent directories
- Uses the first `package.json` with a `version` field

### esbuild HTML Limitation

esbuild doesn't generate HTML files. You must specify `html` and `outputHtml` options.

### Webpack HTML Plugin Notes

- Prefers `html-webpack-plugin` hooks when available
- Falls back to scanning build assets for `.html` files
- `html-webpack-plugin` is an optional peer dependency

### Safety

⚠️ **Important**:
- The plugin **never** injects full `process.env`
- Environment info outputs only a single environment name
- HTML comments are **visible to all users**
- **Do not** inject Tokens, Secrets, passwords, or API Keys via `customData`
- Git info is skipped silently when `.git` is unavailable
- Version info is skipped silently when `package.json` is not found

### Node.js Requirement

- Node.js >= 16.0.0

### Build Tool Requirements

- Vite >= 3.0.0
- Webpack >= 5.0.0
- Rollup >= 3.0.0
- @rspack/core >= 0.5.0
- esbuild >= 0.17.0
- html-webpack-plugin >= 5.0.0 (optional)

### FAQ

**Q: Does it inject in development mode?**
A: Yes, by default `applyInDev` is `true`. Set it to `false` to only inject in production builds.

**Q: What happens if Git info retrieval fails?**
A: The corresponding fields are skipped — the build never fails.

**Q: Can I inject custom data?**
A: Yes, use the `customData` option.

**Q: Does it support TypeScript?**
A: The plugin is written in pure JavaScript, but works fine in TypeScript projects.

### License

[MIT](LICENSE)

---

## 中文

### 项目介绍

`build-meta-injector` 是一个通用的前端构建信息注入插件。它在构建阶段向最终生成的 HTML 文件中注入构建元信息（以 HTML 注释形式），方便线上问题排查、版本确认和 CI/CD 管理。

### 解决的问题

- ❓ 线上应用是什么时候构建的？
- ❓ 当前部署的是哪个版本？
- ❓ 当前运行的是什么环境？
- ❓ 对应哪个 Git Commit？
- ❓ 线上版本和源码不一致？

### 支持的构建工具

| 构建工具 | 支持方式 | 需要额外插件 |
|---------|---------|-------------|
| Vite | `transformIndexHtml` | ❌ |
| Webpack | `html-webpack-plugin` hooks / asset scanning | ⚠️ 可选 |
| Rollup | `generateBundle` | ❌ |
| Rspack | `html-webpack-plugin` / `@rspack/core` | ⚠️ 可选 |
| esbuild | `onStart` / `onEnd` | ❌ |

### 功能列表

- 📦 构建时间注入（支持时区和语言配置）
- 🏷️ 版本号注入（读取宿主项目 `package.json`）
- 🌍 环境信息注入（多级优先级解析）
- 🔗 Git Commit Hash 注入
- 💬 Git Commit Message 注入
- 🌿 Git Branch 注入
- 📝 自定义数据注入
- 🛡️ HTML 注释安全处理
- 📍 7 种注入位置
- 🔧 开发模式控制
- 📦 Monorepo 支持
- 📦 Dual ESM + CommonJS 输出

### 安装

```bash
npm install build-meta-injector -D
```

### 快速开始（零配置）

所有参数都是可选的，**什么也不传就能用**：

```js
// Vite — 无参数调用
import buildMetaInjector from 'build-meta-injector/vite';
export default { plugins: [buildMetaInjector()] };

// Webpack — 无参数调用
const buildMetaInjector = require('build-meta-injector/webpack');
module.exports = { plugins: [buildMetaInjector()] };

// Rollup — 无参数调用
import buildMetaInjector from 'build-meta-injector/rollup';
export default { plugins: [buildMetaInjector()] };
```

> ⚠️ esbuild 需要指定 `html` 和 `outputHtml` 参数，因为 esbuild 本身不处理 HTML 文件。

默认会注入：构建时间、版本号、环境信息、Commit Hash、Commit Message。

### Vite 示例

```js
import { defineConfig } from 'vite';
import buildMetaInjector from 'build-meta-injector/vite';

export default defineConfig({
  plugins: [
    buildMetaInjector({
      buildTime: true,
      version: true,
      environment: true,
      commitHash: true,
      commitMessage: true,
    }),
  ],
});
```

### Webpack 示例

```js
const buildMetaInjector = require('build-meta-injector/webpack');

module.exports = {
  plugins: [
    buildMetaInjector({
      buildTime: true,
      version: true,
      environment: true,
    }),
  ],
});
```

> **注意**：Webpack 适配器优先使用 `html-webpack-plugin` 的 hooks。如果未安装 `html-webpack-plugin`，会扫描构建产物中的 `.html` 文件并注入。

### Rollup 示例

```js
import buildMetaInjector from 'build-meta-injector/rollup';

export default {
  plugins: [
    buildMetaInjector({
      buildTime: true,
      environment: true,
      commitHash: true,
    }),
  ],
});
```

> **注意**：Rollup 本身不生成 HTML。本插件会处理构建输出中的 HTML asset（需要其他 HTML 生成插件配合）。

### Rspack 示例

```js
const buildMetaInjector = require('build-meta-injector/rspack');

module.exports = {
  plugins: [
    buildMetaInjector({
      buildTime: true,
      version: true,
      environment: true,
    }),
  ],
});
```

### esbuild 示例

```js
import esbuild from 'esbuild';
import buildMetaInjector from 'build-meta-injector/esbuild';

await esbuild.build({
  entryPoints: ['src/index.js'],
  outdir: 'dist',
  plugins: [
    buildMetaInjector({
      buildTime: true,
      version: true,
      environment: true,
      html: 'index.html',
      outputHtml: 'dist/index.html',
    }),
  ],
});
```

> **注意**：esbuild 本身不生成 HTML。需要通过 `html` 和 `outputHtml` 选项指定源 HTML 和输出路径。

### 完整配置参考

#### `buildTime`

- **类型**：`boolean`
- **默认值**：`true`
- **可选值**：`true` | `false`
- **说明**：是否注入构建时间戳。使用 `Intl.DateTimeFormat` 格式化，支持配置时区和语言。输出格式：`Build Time: 2026/7/31 13:30:00`。

#### `version`

- **类型**：`boolean`
- **默认值**：`true`
- **可选值**：`true` | `false`
- **说明**：是否注入包版本号。从宿主项目的 `package.json` 的 `version` 字段读取。最多向上查找 5 级目录（支持 Monorepo）。输出格式：`Version: 1.0.0`。

#### `environment`

- **类型**：`boolean`
- **默认值**：`true`
- **可选值**：`true` | `false`
- **说明**：是否注入环境名称。解析优先级：`environmentValue` → 构建工具 mode → `environmentKeys` 环境变量。输出格式：`Environment: production`。

#### `commitHash`

- **类型**：`boolean`
- **默认值**：`true`
- **可选值**：`true` | `false`
- **说明**：是否注入 Git 短 Commit Hash。使用 `git rev-parse --short HEAD`。输出格式：`Commit Hash (Short): abcdef12`。Git 不可用时静默跳过。

#### `commitMessage`

- **类型**：`boolean`
- **默认值**：`true`
- **可选值**：`true` | `false`
- **说明**：是否注入最新 Git Commit Message（仅 subject 行）。使用 `git log -1 --pretty=%s`。输出格式：`Commit Message: feat: add new feature`。Git 不可用时静默跳过。

#### `branch`

- **类型**：`boolean`
- **默认值**：`false`
- **可选值**：`true` | `false`
- **说明**：是否注入当前 Git 分支名。使用 `git rev-parse --abbrev-ref HEAD`。输出格式：`Branch: main`。Git 不可用时静默跳过。

#### `environmentValue`

- **类型**：`string`
- **默认值**：`undefined`
- **可选值**：任意字符串，如 `'production'`、`'staging'`、`'development'`
- **说明**：手动指定环境名称。在环境解析中优先级最高。设置后覆盖 mode 检测和环境变量查找。

#### `environmentKeys`

- **类型**：`string[]`
- **默认值**：`['APP_ENV', 'DEPLOY_ENV', 'NODE_ENV', 'MODE']`
- **可选值**：环境变量名数组，如 `['NODE_ENV', 'APP_ENV']`、`['DEPLOY_ENV']`
- **说明**：当 `environmentValue` 未设置且无构建工具 mode 时，按顺序检查的环境变量键名。第一个非空值会被使用。顺序影响优先级。

#### `timeZone`

- **类型**：`string`
- **默认值**：`'Asia/Shanghai'`
- **可选值**：任意有效 IANA 时区字符串，如 `'UTC'`、`'America/New_York'`、`'Europe/London'`、`'Asia/Tokyo'`
- **说明**：构建时间戳的时区。传递给 `Intl.DateTimeFormat`。必须是有效的 IANA 时区标识符。

#### `locale`

- **类型**：`string`
- **默认值**：`'zh-CN'`
- **可选值**：任意有效 locale 字符串，如 `'en-US'`、`'zh-CN'`、`'ja-JP'`、`'de-DE'`、`'fr-FR'`
- **说明**：构建时间戳的语言格式。传递给 `Intl.DateTimeFormat`。控制日期/时间的格式化规则。

#### `position`

- **类型**：`string`
- **默认值**：`'after-doctype'`
- **可选值**：`'after-doctype'` | `'head-start'` | `'head-end'` | `'body-start'` | `'body-end'` | `'top'` | `'bottom'`
- **说明**：HTML 注释块在 HTML 文件中的注入位置。

  | 值 | 位置 | 降级策略 |
  |----|------|---------|
  | `'after-doctype'` | `<!doctype html>` 之后 | 无 doctype 时降级为 `top` |
  | `'head-start'` | `<head>` 标签之后 | 无 `<head>` 时降级为 `top` |
  | `'head-end'` | `</head>` 之前 | 无 `</head>` 时降级为 `bottom` |
  | `'body-start'` | `<body>` 标签之后 | 无 `<body>` 时降级为 `top` |
  | `'body-end'` | `</body>` 之前 | 无 `</body>` 时降级为 `bottom` |
  | `'top'` | 文件最前面 | — |
  | `'bottom'` | 文件最后面 | — |

#### `fullCommitHash`

- **类型**：`boolean`
- **默认值**：`false`
- **可选值**：`true` | `false`
- **说明**：是否使用完整 40 字符 Commit Hash。设为 `true` 时同时注入短 Hash 和完整 Hash。使用 `git rev-parse HEAD`。输出格式：`Commit Hash: abcdef1234567890abcdef1234567890abcdef12`。

#### `applyInDev`

- **类型**：`boolean`
- **默认值**：`true`
- **可选值**：`true` | `false`
- **说明**：是否在开发模式下注入元信息。设为 `false` 时仅在生产构建时注入。设为 `true`（默认）时开发和生产模式都会注入。

#### `customData`

- **类型**：`object`
- **默认值**：`{}`
- **可选值**：任意键值对对象，键为字符串，值为字符串/数字，如 `{ deployTarget: 'us-east-1', releaseId: 'v2.1.0' }`
- **说明**：自定义键值对，作为额外的 HTML 注释注入。键和值会做安全处理（HTML 注释安全）。**切勿放入 Token、Secret、密码或 API Key** — HTML 注释对所有访问者公开可见。

#### `root`

- **类型**：`string`
- **默认值**：`undefined`
- **可选值**：绝对路径或相对路径，如 `'/path/to/project'`、`'.'`、`'..'`
- **说明**：项目根目录。用于查找 `package.json`（版本号）和执行 Git 命令。未设置时使用构建工具的 root 或 `process.cwd()`。

#### `debug`

- **类型**：`boolean`
- **默认值**：`false`
- **可选值**：`true` | `false`
- **说明**：调试模式。设为 `true` 时可能输出额外的诊断信息，帮助排查问题。

#### `html`

- **类型**：`string`
- **默认值**：`undefined`
- **可选值**：源 HTML 文件路径，如 `'index.html'`、`'src/template.html'`
- **说明**：**仅 esbuild。** 源 HTML 文件路径。esbuild 不处理 HTML，必须指定。

#### `outputHtml`

- **类型**：`string`
- **默认值**：`undefined`
- **可选值**：输出 HTML 文件路径，如 `'dist/index.html'`
- **说明**：**仅 esbuild。** 注入后 HTML 的写入路径。未指定时默认与 `html` 同目录，文件名为 `index.html`。

### 默认配置

插件**支持零配置使用**，不传任何参数即可生效。以下为默认配置：

```js
{
  buildTime: true,
  version: true,
  environment: true,
  commitHash: true,
  commitMessage: true,
  branch: false,
  environmentValue: undefined,
  environmentKeys: ['APP_ENV', 'DEPLOY_ENV', 'NODE_ENV', 'MODE'],
  timeZone: 'Asia/Shanghai',
  locale: 'zh-CN',
  position: 'after-doctype',
  fullCommitHash: false,
  applyInDev: true,
  customData: {},
}
```

### 环境信息获取优先级

1. 用户显式设置的 `environmentValue`
2. 构建工具本身提供的 mode（如 Vite 的 `config.mode`）
3. 按 `environmentKeys` 顺序读取环境变量
4. 无法获取时跳过环境信息

### HTML 输出示例

```html
<!doctype html>
<!-- Build Time: 2026/7/31 13:30:00 -->
<!-- Package Version: 1.0.0 -->
<!-- Environment: production -->
<!-- Commit Hash: abcdef123456 -->
<!-- Commit Message: feat: add new feature -->
<!-- Git Branch: main -->
<html>
<head></head>
<body></body>
</html>
```

### 注入位置

| 位置 | 说明 |
|------|------|
| `after-doctype` | `<!doctype html>` 之后（默认） |
| `head-start` | `<head>` 之后 |
| `head-end` | `</head>` 之前 |
| `body-start` | `<body>` 之后 |
| `body-end` | `</body>` 之前 |
| `top` | HTML 最前面 |
| `bottom` | HTML 最后面 |

### 多页面构建

插件会处理所有构建产物中的 HTML 文件，支持多页面应用。

### 非 Git 环境行为

- CI 中没有 `.git` 时跳过 Git 信息
- 不会导致构建失败
- 可通过 `debug: true` 查看调试信息

### Docker 注意事项

- Docker 构建中可能没有 `.git` 目录，Git 信息会被跳过
- 建议在 CI 阶段构建并注入信息，再打包 Docker 镜像

### CI/CD 注意事项

- CI 环境通常有 Git 信息，可正常注入
- `NODE_ENV` 通常为 `production`
- 可通过 `environmentValue` 显式指定环境

### Monorepo 使用说明

- 插件会从 `root`（或构建工具提供的根目录）开始向上查找 `package.json`
- 最多向上查找 5 级目录
- 找到的第一个包含 `version` 的 `package.json` 会被使用

### esbuild HTML 限制

esbuild 本身不生成 HTML 文件。必须通过 `html` 和 `outputHtml` 配置指定源文件和输出路径。

### Webpack HTML 插件说明

- 优先使用 `html-webpack-plugin` 的 hooks
- 如果未安装，会扫描构建产物中的 `.html` 文件
- `html-webpack-plugin` 是可选 peer dependency

### 安全说明

⚠️ **重要**：
- 插件**不会**注入完整的 `process.env`
- 环境信息只输出单个环境名称
- HTML 中的信息**对所有访问者公开**
- **不要**通过 `customData` 注入 Token、Secret、密码或 API Key
- CI 中没有 `.git` 时会跳过 Git 信息
- `package.json` 不存在时会跳过版本信息

### Node.js 版本要求

- Node.js >= 16.0.0

### 构建工具版本要求

- Vite >= 3.0.0
- Webpack >= 5.0.0
- Rollup >= 3.0.0
- @rspack/core >= 0.5.0
- esbuild >= 0.17.0
- html-webpack-plugin >= 5.0.0（可选）

### 常见问题

**Q: 开发模式下会注入吗？**
A: 会，`applyInDev` 默认是 `true`。设为 `false` 可以只在生产构建时注入。

**Q: Git 信息获取失败会怎样？**
A: 跳过对应字段，不会导致构建失败。

**Q: 可以注入自定义信息吗？**
A: 可以，使用 `customData` 配置项。

**Q: 支持 TypeScript 吗？**
A: 本插件使用纯 JavaScript，但可以在 TypeScript 项目中正常使用。

### License

[MIT](LICENSE)
