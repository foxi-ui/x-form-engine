import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Phase 5 依赖边界：designer-designable 是 Designable Adapter，允许依赖 Designable /
// antd / designer-core（公开入口），但不得依赖 Runtime Renderer / Formily Adapter，
// 也不得深依赖 designer-core / core 的内部源码路径（只走包公开入口）。
const SRC_DIR = resolve(__dirname, '..');

const FORBIDDEN_PACKAGE = /^@x-form-engine\/(renderer|formily)($|\/)/;
const FORBIDDEN_DEEP_IMPORT = /@x-form-engine\/(designer-core|core)\/src\//;

const SPECIFIER = /\b(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;

function extractSpecifiers(source: string): string[] {
  return [...source.matchAll(SPECIFIER)].map((m) => m[1]);
}

function collectSources(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      result.push(...collectSources(full));
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      result.push(full);
    }
  }
  return result;
}

test('package.json 不依赖 Runtime Renderer / Formily Adapter', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies };
  for (const key of Object.keys(deps)) {
    expect(key).not.toMatch(/@x-form-engine\/(renderer|formily)/);
  }
});

test('源码不 import Runtime Renderer / Formily Adapter', () => {
  const files = collectSources(SRC_DIR);
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    for (const spec of extractSpecifiers(readFileSync(file, 'utf8'))) {
      expect(spec).not.toMatch(FORBIDDEN_PACKAGE);
    }
  }
});

test('不深依赖 designer-core / core 内部源码路径', () => {
  const files = collectSources(SRC_DIR);
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    expect(src).not.toMatch(FORBIDDEN_DEEP_IMPORT);
  }
});
