import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { collectGitInfo } from '../../src/core/git.js';

describe('git - collectGitInfo', () => {
  it('collects short hash when commitHash is true', () => {
    const mockRunner = (args) => {
      if (args[0] === 'rev-parse' && args[1] === '--short') return 'abc1234';
      return null;
    };
    const info = collectGitInfo({ commitHash: true, root: '/test' }, mockRunner);
    assert.equal(info.shortHash, 'abc1234');
  });

  it('collects full commit hash when fullCommitHash is true', () => {
    const mockRunner = (args) => {
      if (args[0] === 'rev-parse' && args[1] === 'HEAD') return 'abcdef1234567890abcdef1234567890abcdef12';
      return null;
    };
    const info = collectGitInfo({ commitHash: true, fullCommitHash: true, root: '/test' }, mockRunner);
    assert.equal(info.fullHash, 'abcdef1234567890abcdef1234567890abcdef12');
    assert.equal(info.shortHash, 'abcdef1234567890abcdef1234567890abcdef12');
  });

  it('collects commit message', () => {
    const mockRunner = (args) => {
      if (args[0] === 'log') return 'fix: update build config';
      return null;
    };
    const info = collectGitInfo({ commitMessage: true, root: '/test' }, mockRunner);
    assert.equal(info.commitMessage, 'fix: update build config');
  });

  it('collects branch', () => {
    const mockRunner = (args) => {
      if (args.includes('--abbrev-ref')) return 'main';
      return null;
    };
    const info = collectGitInfo({ branch: true, root: '/test' }, mockRunner);
    assert.equal(info.branch, 'main');
  });

  it('returns null fields on git errors', () => {
    const mockRunner = () => {
      throw new Error('git not found');
    };
    const info = collectGitInfo({ commitHash: true, commitMessage: true, root: '/test' }, mockRunner);
    assert.equal(info.shortHash, undefined);
    assert.equal(info.commitMessage, undefined);
  });

  it('accepts gitRunner injection via dependency injection', () => {
    let called = false;
    const mockRunner = () => { called = true; return 'test'; };
    collectGitInfo({ commitHash: true, root: '/tmp' }, mockRunner);
    assert.equal(called, true);
  });

  it('skips git when all git options are false', () => {
    const mockRunner = () => { throw new Error('should not be called'); };
    const info = collectGitInfo({
      commitHash: false,
      commitMessage: false,
      branch: false,
      fullCommitHash: false,
    }, mockRunner);
    assert.deepEqual(info, {});
  });

  it('uses process.cwd() when root is undefined', () => {
    let capturedCwd;
    const mockRunner = (_args, cwd) => { capturedCwd = cwd; return null; };
    collectGitInfo({ commitHash: true }, mockRunner);
    assert.equal(capturedCwd, process.cwd());
  });
});
