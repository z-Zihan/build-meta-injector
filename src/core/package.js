import { readFileSync } from 'fs';
import { dirname, resolve, join } from 'path';

export function readPackageVersion(root, fsImpl, pathImpl) {
  const _fs = fsImpl || { readFileSync };
  const _path = pathImpl || { dirname, resolve, join };

  const startDir = root || process.cwd();
  let currentDir = _path.resolve(startDir);

  for (let i = 0; i <= 5; i++) {
    const pkgPath = _path.join(currentDir, 'package.json');
    try {
      const content = _fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(content);
      if (pkg.version && typeof pkg.version === 'string' && pkg.version.trim()) {
        return pkg.version.trim();
      }
    } catch (_err) {
      // File not found or parse error — walk up
    }

    const parent = _path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  return null;
}
