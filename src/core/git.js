import child_process from 'child_process';

function runGitCmd(args, cwd, timeout) {
  try {
    const result = child_process.execFileSync('git', args, {
      cwd,
      timeout,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return result.trim();
  } catch (_err) {
    return null;
  }
}

export function collectGitInfo(options, gitRunner) {
  const runner = gitRunner || runGitCmd;
  const cwd = options.root || process.cwd();
  const timeout = 5000;
  const info = {};

  if (options.commitHash || options.commitMessage || options.branch || options.fullCommitHash) {
    if (options.commitHash || options.fullCommitHash) {
      try {
        const hashArgs = options.fullCommitHash
          ? ['rev-parse', 'HEAD']
          : ['rev-parse', '--short', 'HEAD'];
        const hash = runner(hashArgs, cwd, timeout);

        if (options.fullCommitHash) {
          info.fullHash = hash;
        }
        info.shortHash = hash;
      } catch (_err) {
        // Git command failed — skip this field
      }
    }

    if (options.commitMessage) {
      try {
        info.commitMessage = runner(['log', '-1', '--pretty=%s'], cwd, timeout);
      } catch (_err) {
        // Git command failed — skip this field
      }
    }

    if (options.branch) {
      try {
        info.branch = runner(['rev-parse', '--abbrev-ref', 'HEAD'], cwd, timeout);
      } catch (_err) {
        // Git command failed — skip this field
      }
    }
  }

  return info;
}
