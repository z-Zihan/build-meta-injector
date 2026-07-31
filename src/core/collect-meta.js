import { resolveOptions } from './options.js';
import { collectGitInfo } from './git.js';
import { resolveEnvironment } from './environment.js';
import { readPackageVersion } from './package.js';
import { formatTime, sanitizeCommentValue, sanitizeCommentKey } from './formatter.js';

export function collectMeta(userOptions, context) {
  const options = resolveOptions(userOptions);
  const ctx = context || {};
  const mode = ctx.mode;
  const root = ctx.root || options.root;

  const comments = [];

  if (options.buildTime) {
    const time = formatTime(options.timeZone, options.locale);
    if (time) {
      comments.push(`Build Time: ${time}`);
    }
  }

  if (options.version) {
    const version = readPackageVersion(root);
    if (version) {
      comments.push(`Version: ${version}`);
    }
  }

  if (options.environment) {
    const env = resolveEnvironment(options, mode);
    if (env) {
      comments.push(`Environment: ${env}`);
    }
  }

  if (options.commitHash || options.commitMessage || options.branch || options.fullCommitHash) {
    const gitInfo = collectGitInfo(options);

    if (options.commitHash && gitInfo.shortHash) {
      const label = options.fullCommitHash ? 'Commit Hash' : 'Commit Hash (Short)';
      comments.push(`${label}: ${gitInfo.shortHash}`);
    }

    if (options.fullCommitHash && gitInfo.fullHash) {
      comments.push(`Commit Hash: ${gitInfo.fullHash}`);
    }

    if (options.commitMessage && gitInfo.commitMessage) {
      comments.push(`Commit Message: ${gitInfo.commitMessage}`);
    }

    if (options.branch && gitInfo.branch) {
      comments.push(`Branch: ${gitInfo.branch}`);
    }
  }

  if (options.customData && typeof options.customData === 'object') {
    for (const key of Object.keys(options.customData)) {
      const skey = sanitizeCommentKey(key);
      if (!skey) continue;
      const sval = sanitizeCommentValue(options.customData[key]);
      comments.push(`${skey}: ${sval}`);
    }
  }

  return comments;
}
