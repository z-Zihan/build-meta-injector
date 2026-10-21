export { resolveOptions, defaultOptions } from './core/options.js';
export { collectGitInfo } from './core/git.js';
export { resolveEnvironment } from './core/environment.js';
export { readPackageVersion } from './core/package.js';
export { formatTime, sanitizeCommentValue, sanitizeCommentKey } from './core/formatter.js';
export { injectHtml } from './core/inject-html.js';
export { collectMeta } from './core/collect-meta.js';

import buildMetaInjector from './adapters/universal.js';
export default buildMetaInjector;
