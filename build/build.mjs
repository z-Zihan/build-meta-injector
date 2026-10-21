import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, relative, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const TYPES = join(ROOT, 'types');

const ENTRIES = ['index.js', 'adapters/vite.js', 'adapters/webpack.js', 'adapters/rollup.js', 'adapters/rspack.js', 'adapters/esbuild.js'];

function readSource(relPath) {
  const abs = join(SRC, relPath);
  return readFileSync(abs, 'utf-8');
}

function parseImports(source) {
  const imports = [];
  const namedImportRe = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\n?/g;
  const defaultImportRe = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?\n?/g;
  const namedAndDefaultRe = /import\s+(\w+)\s*,\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\n?/g;
  const starImportRe = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?\n?/g;
  const sideEffectRe = /import\s+['"]([^'"]+)['"];?\n?/g;
  // Re-export statements (`export { x } from './y.js'`) also create a
  // dependency on the target module and must be inlined with it.
  const reexportRe = /export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\n?/g;

  // We need to check named+default first since it's a superset of default import
  let match;

  while ((match = namedAndDefaultRe.exec(source)) !== null) {
    imports.push({
      type: 'named-default',
      defaultName: match[1],
      names: match[2].split(',').map(n => n.trim()).filter(n => n),
      from: match[3],
      fullMatch: match[0],
    });
  }

  while ((match = namedImportRe.exec(source)) !== null) {
    const names = match[1].split(',').map(n => {
      const parts = n.trim().split(/\s+as\s+/);
      return { name: parts[0].trim(), alias: parts[1] ? parts[1].trim() : null };
    });
    imports.push({
      type: 'named',
      names,
      from: match[2],
      fullMatch: match[0],
    });
  }

  while ((match = defaultImportRe.exec(source)) !== null) {
    imports.push({
      type: 'default',
      name: match[1],
      from: match[2],
      fullMatch: match[0],
    });
  }

  while ((match = starImportRe.exec(source)) !== null) {
    imports.push({
      type: 'star',
      name: match[1],
      from: match[2],
      fullMatch: match[0],
    });
  }

  while ((match = sideEffectRe.exec(source)) !== null) {
    imports.push({
      type: 'side-effect',
      from: match[1],
      fullMatch: match[0],
    });
  }

  while ((match = reexportRe.exec(source)) !== null) {
    const names = match[1].split(',').map(n => {
      const parts = n.trim().split(/\s+as\s+/);
      return { name: parts[0].trim(), alias: parts[1] ? parts[1].trim() : null };
    });
    imports.push({
      type: 'reexport',
      names,
      from: match[2],
      fullMatch: match[0],
    });
  }

  return imports;
}

function parseExports(source) {
  const exports = [];

  const defaultExportRe = /export\s+default\s+(function\s+\w+[^{]*\{[^}]*\}|class\s+\w+[^{]*\{[^}]*\}|\w+);?\n?/gs;
  const namedExportDeclRe = /export\s+(const|let|var|function|class)\s+(\w+)/g;
  const namedExportListRe = /export\s+\{([^}]+)\}\s*(?:from\s+['"]([^'"]+)['"])?;?\n?/g;
  const exportDefaultExprRe = /export\s+default\s+([^;\n]+);?\n?/g;

  let match;

  while ((match = defaultExportRe.exec(source)) !== null) {
    exports.push({ type: 'default', value: match[1], fullMatch: match[0] });
  }

  while ((match = namedExportDeclRe.exec(source)) !== null) {
    exports.push({ type: 'named-decl', kind: match[1], name: match[2], fullMatch: match[0] });
  }

  while ((match = namedExportListRe.exec(source)) !== null) {
    const names = match[1].split(',').map(n => n.trim()).filter(n => n);
    exports.push({ type: 'named-list', names, from: match[2] || null, fullMatch: match[0] });
  }

  while ((match = exportDefaultExprRe.exec(source)) !== null) {
    exports.push({ type: 'default-expr', value: match[1].trim(), fullMatch: match[0] });
  }

  return exports;
}

function resolveImportPath(fromFile, importPath) {
  // Only resolve relative imports (starting with ./ or ../)
  if (!importPath.startsWith('.') && !importPath.startsWith('..')) {
    return null;
  }
  const fromDir = dirname(fromFile);
  let resolved = resolve(SRC, fromDir, importPath);

  // Add .js if no extension
  if (!resolved.endsWith('.js')) {
    resolved += '.js';
  }

  // Make it relative to SRC
  try {
    return relative(SRC, resolved);
  } catch (_err) {
    return null;
  }
}

function collectDeps(entryRel, visited = new Set()) {
  if (visited.has(entryRel)) return [];
  visited.add(entryRel);

  const source = readSource(entryRel);
  const imports = parseImports(source);
  const deps = [];

  for (const imp of imports) {
    const resolvedPath = resolveImportPath(entryRel, imp.from);
    if (resolvedPath && !visited.has(resolvedPath)) {
      const subDeps = collectDeps(resolvedPath, visited);
      deps.push(resolvedPath, ...subDeps);
    }
  }

  return deps;
}

// Simple regex-based approach to strip imports and exports for inlined modules
function stripImports(source) {
  // Only strip relative imports (./ or ../)
  return source
    .replace(/import\s+\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"];?\n?/g, '')
    .replace(/import\s+(\w+)\s+from\s+['"](\.[^'"]+)['"];?\n?/g, '')
    .replace(/import\s+(\w+)\s*,\s*\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"];?\n?/g, '')
    .replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"](\.[^'"]+)['"];?\n?/g, '')
    .replace(/import\s+['"](\.[^'"]+)['"];?\n?/g, '');
}

function stripExports(source) {
  return source
    // Drop `export { a, b } from './x.js'` whole: the source module is inlined
    // separately, so nothing should be re-exported from a now-stripped specifier.
    .replace(/export\s+\{[^}]*\}\s*from\s*['"][^'"]+['"];?\n?/g, '')
    .replace(/export\s+\*\s*from\s*['"][^'"]+['"];?\n?/g, '')
    // Drop bare `export { a, b };` lists. This must run before the generic
    // `export ` strip, otherwise the list is left behind without its keyword.
    .replace(/export\s+\{[^}]*\}\s*;?\n?/g, '')
    .replace(/export\s+(default\s+)?/g, '');
}

// Rewrite `export { a, b } from './x.js'` to `export { a, b };` once the
// target module's contents have been inlined into the same bundle scope.
// Bare (non-relative) re-exports are left untouched — they are valid ESM and
// cannot be inlined.
function inlineRelativeReexports(source) {
  return source.replace(
    /export\s+\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"];?\n?/g,
    (_full, names) => `export { ${names.trim()} };\n`
  );
}

function bundleEsm(entryRel) {
  const visited = new Set();
  const deps = [];
  
  function collect(rel) {
    if (visited.has(rel)) return;
    visited.add(rel);
    
    const source = readSource(rel);
    const imports = parseImports(source);
    
    for (const imp of imports) {
      const resolvedPath = resolveImportPath(rel, imp.from);
      if (resolvedPath) {
        collect(resolvedPath);
      }
    }
    
    deps.push(rel);
  }
  
  collect(entryRel);
  
  // Remove the entry from deps
  const entryIdx = deps.indexOf(entryRel);
  if (entryIdx !== -1) deps.splice(entryIdx, 1);
  
  const chunks = [];
  
  for (const dep of deps) {
    let source = readSource(dep);
    source = stripImports(source);
    source = stripExports(source);
    source = source.trim();
    if (source) {
      chunks.push(source);
    }
  }
  
  // Entry module — strip only imports, keep exports. Relative re-exports are
  // rewritten to plain export lists since their targets are already inlined.
  let entrySource = readSource(entryRel);
  entrySource = stripImports(entrySource);
  entrySource = inlineRelativeReexports(entrySource);
  chunks.push(entrySource.trim());
  
  return chunks.join('\n\n');
}

function bundleCjs(entryRel) {
  const esmOutput = bundleEsm(entryRel);
  
  // Convert bare module imports to require for CJS
  let cjs = esmOutput
    // import X from 'bare-module' -> const X = require('bare-module')
    .replace(/import\s+(\w+)\s+from\s+['"]([^'".][^'"]*)['"];?\n?/g, "const $1 = require('$2');\n")
    // import { X, Y } from 'bare-module' -> const { X, Y } = require('bare-module')
    .replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'".][^'"]*)['"];?\n?/g, "const { $1 } = require('$2');\n")
    // import * as X from 'bare-module' -> const X = require('bare-module')
    .replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'".][^'"]*)['"];?\n?/g, "const $1 = require('$2');\n")
    // import 'bare-module' (side effect) -> require('bare-module')
    .replace(/import\s+['"]([^'".][^'"]*)['"];?\n?/g, "require('$1');\n");
  
  // Now transform the ESM exports to CJS
  // export default => module.exports =
  // export { X, Y } => module.exports.X = X; module.exports.Y = Y;
  // export const/let/var X = => const X = ... + module.exports.X = X
  // export function X() => function X() ... + module.exports.X = X
  
  // Collect export statements before transforming
  const exportDefaultDecl = /export\s+default\s+function\s+(\w+)/;
  const exportDefaultArrow = /export\s+default\s+(\([^)]*\)\s*=>)/;
  const exportDefaultId = /export\s+default\s+(\w+);?$/m;
  const exportNamedDecl = /export\s+(const|let|var|function|class)\s+(\w+)/g;
  const exportNamedList = /export\s+\{([^}]+)\}\s*;?/g;
  
  // Handle export default function name() {...}
  const defaultFuncMatch = cjs.match(exportDefaultDecl);
  if (defaultFuncMatch) {
    cjs = cjs.replace(/export\s+default\s+/, '');
    const funcName = defaultFuncMatch[1];
    cjs += `\nmodule.exports = ${funcName};`;
  }
  
  // Handle export default (args) => { ... }
  const defaultArrowMatch = cjs.match(exportDefaultArrow);
  if (defaultArrowMatch) {
    cjs = cjs.replace(/export\s+default\s+/, 'const _default = ');
    cjs += '\nmodule.exports = _default;';
  }
  
  // Handle export default identifier;
  const defaultIdMatch = cjs.match(exportDefaultId);
  if (defaultIdMatch && !defaultFuncMatch && !defaultArrowMatch) {
    const idName = defaultIdMatch[1];
    cjs = cjs.replace(/export\s+default\s+\w+;?/, '');
    cjs += `\nmodule.exports = ${idName};`;
  }
  
  // Handle export const/let/var/function/class name
  const namedExports = [];
  let nm;
  while ((nm = exportNamedDecl.exec(esmOutput)) !== null) {
    namedExports.push(nm[2]);
  }
  cjs = cjs.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');
  
  for (const name of namedExports) {
    cjs += `\nmodule.exports.${name} = ${name};`;
  }
  
  // Handle export { X, Y };
  const listMatch = cjs.match(exportNamedList);
  if (listMatch) {
    for (const list of listMatch) {
      const inner = list.match(/\{([^}]+)\}/);
      if (inner) {
        const names = inner[1].split(',').map(n => n.trim()).filter(n => n);
        cjs = cjs.replace(list, '');
        for (const name of names) {
          cjs += `\nmodule.exports.${name} = ${name};`;
        }
      }
    }
  }
  
  return cjs.trim();
}

// Main build
if (!existsSync(DIST)) {
  mkdirSync(DIST, { recursive: true });
}

for (const entry of ENTRIES) {
  const entryRel = entry;
  const baseName = entry.replace(/^adapters\//, '').replace(/\.js$/, '');
  
  console.log(`Building ${entryRel}...`);
  
  // ESM output
  const esm = bundleEsm(entryRel);
  writeFileSync(join(DIST, `${baseName}.js`), esm + '\n', 'utf-8');
  
  // CJS output
  const cjs = bundleCjs(entryRel);
  writeFileSync(join(DIST, `${baseName}.cjs`), cjs + '\n', 'utf-8');
  
  console.log(`  -> dist/${baseName}.js (ESM)`);
  console.log(`  -> dist/${baseName}.cjs (CJS)`);

  // Type declarations: copy the hand-written .d.ts and mirror it as .d.cts for
  // the require() resolution path.
  const dtsPath = join(TYPES, `${baseName}.d.ts`);
  if (existsSync(dtsPath)) {
    const dts = readFileSync(dtsPath, 'utf-8');
    writeFileSync(join(DIST, `${baseName}.d.ts`), dts, 'utf-8');
    writeFileSync(join(DIST, `${baseName}.d.cts`), dts, 'utf-8');
    console.log(`  -> dist/${baseName}.d.ts`);
    console.log(`  -> dist/${baseName}.d.cts`);
  }
}

console.log('Build complete!');
