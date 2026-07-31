import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { readPackageVersion } from '../../src/core/package.js';

describe('package - readPackageVersion', () => {
  it('reads package.json version from current directory', () => {
    const mockFs = {
      readFileSync: (path, _encoding) => {
        if (path.endsWith('package.json')) {
          return JSON.stringify({ version: '2.5.0' });
        }
        throw new Error('ENOENT');
      }
    };
    const mockPath = {
      dirname: (p) => p.substring(0, p.lastIndexOf('/')),
      resolve: (p) => p,
      join: (a, b) => a + '/' + b,
    };
    const version = readPackageVersion('/project', mockFs, mockPath);
    assert.equal(version, '2.5.0');
  });

  it('walks up directories to find package.json', () => {
    const rootPath = '/project/src/sub/deep';
    let callCount = 0;
    const mockFs = {
      readFileSync: (path, _encoding) => {
        callCount++;
        // Succeed on 3rd call (walked up twice)
        if (callCount === 3) {
          return JSON.stringify({ version: '1.0.0' });
        }
        throw new Error('ENOENT');
      }
    };
    const mockPath = {
      dirname: (p) => {
        const idx = p.lastIndexOf('/');
        return idx === -1 ? p : p.substring(0, idx);
      },
      resolve: (p) => p,
      join: (a, b) => a + '/' + b,
    };
    const version = readPackageVersion(rootPath, mockFs, mockPath);
    assert.equal(version, '1.0.0');
  });

  it('returns null on missing package.json after walk', () => {
    const mockFs = {
      readFileSync: () => { throw new Error('ENOENT'); }
    };
    const mockPath = {
      dirname: (p) => p,
      resolve: (p) => p,
      join: (a, b) => a + '/' + b,
    };
    const version = readPackageVersion('/deep/nested', mockFs, mockPath);
    assert.equal(version, null);
  });

  it('returns null on JSON parse error', () => {
    const mockFs = {
      readFileSync: () => 'invalid json {{{'
    };
    const mockPath = {
      dirname: (p) => p,
      resolve: (p) => p,
      join: (a, b) => a + '/' + b,
    };
    const version = readPackageVersion('/project', mockFs, mockPath);
    assert.equal(version, null);
  });

  it('returns null when version field is missing', () => {
    const mockFs = {
      readFileSync: () => JSON.stringify({ name: 'test', version: '' })
    };
    const mockPath = {
      dirname: (p) => p,
      resolve: (p) => p,
      join: (a, b) => a + '/' + b,
    };

    const v1 = readPackageVersion('/proj', mockFs, mockPath);
    assert.equal(v1, null);

    const v2 = readPackageVersion('/proj', {
      readFileSync: () => JSON.stringify({ name: 'test' }),
    }, mockPath);
    assert.equal(v2, null);
  });
});
