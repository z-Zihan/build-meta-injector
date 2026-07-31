# build-meta-injector

> Inject build time, version, environment and Git metadata into HTML across Vite, Webpack, Rollup, Rspack and esbuild.

[English](#english) | [中文](#中文)

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
};
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
};
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
};
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

### 完整配置表

| 配置项 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| `buildTime` | boolean | `true` | 是否注入构建时间 |
| `version` | boolean | `true` | 是否注入版本号 |
| `environment` | boolean | `true` | 是否注入环境信息 |
| `commitHash` | boolean | `true` | 是否注入 Commit Hash |
| `commitMessage` | boolean | `true` | 是否注入 Commit Message |
| `branch` | boolean | `false` | 是否注入 Git Branch |
| `environmentValue` | string | `undefined` | 手动指定环境名称 |
| `environmentKeys` | string[] | `['APP_ENV', 'DEPLOY_ENV', 'NODE_ENV', 'MODE']` | 环境变量键名列表 |
| `timeZone` | string | `'Asia/Shanghai'` | 时区 |
| `locale` | string | `'zh-CN'` | 语言 |
| `position` | string | `'after-doctype'` | 注入位置 |
| `fullCommitHash` | boolean | `false` | 是否使用完整 Commit Hash |
| `applyInDev` | boolean | `false` | 是否在开发模式执行 |
| `customData` | object | `{}` | 自定义构建信息 |
| `root` | string | `undefined` | 项目根目录 |
| `debug` | boolean | `false` | 调试模式 |
| `html` | string | `undefined` | esbuild 源 HTML 路径 |
| `outputHtml` | string | `undefined` | esbuild 输出 HTML 路径 |

### 默认配置

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
  applyInDev: false,
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
A: 默认不会。设置 `applyInDev: true` 可以在开发模式下注入。

**Q: Git 信息获取失败会怎样？**
A: 跳过对应字段，不会导致构建失败。

**Q: 可以注入自定义信息吗？**
A: 可以，使用 `customData` 配置项。

**Q: 支持 TypeScript 吗？**
A: 本插件使用纯 JavaScript，但可以在 TypeScript 项目中正常使用。

### License

[MIT](LICENSE)

---

## English

A cross-tool plugin that injects build metadata (build time, version, environment, Git info) as HTML comments into built HTML files. Supports Vite, Webpack, Rollup, Rspack, and esbuild.

### Installation

```bash
npm install build-meta-injector -D
```

### Quick Example (Vite)

```js
import buildMetaInjector from 'build-meta-injector/vite';

export default {
  plugins: [buildMetaInjector({ buildTime: true, version: true })],
};
```

### Safety

- Does NOT inject `process.env`
- Only outputs a single environment name
- HTML comments are visible to all users — do NOT inject secrets via `customData`

### Links

- GitHub Repository: https://github.com/z-Zihan/build-meta-injector
- Issues: https://github.com/z-Zihan/build-meta-injector/issues
- Author: https://github.com/z-Zihan/

### License

MIT
