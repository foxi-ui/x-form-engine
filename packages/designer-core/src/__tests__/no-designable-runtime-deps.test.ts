import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// C13：designer-core 不得依赖 Designable / antd / antd-mobile / Runtime Renderer /
// FormEngine。这里做源码级 + package.json 级守卫。
const SRC_DIR = resolve(__dirname, '..');

const FORBIDDEN_PACKAGE =
  /^(@designable\/|antd($|\/)|antd-mobile($|\/)|@x-form-engine\/(renderer|formily|components)($|\/))/;

// Runtime 专属符号（FormEngineError 是共享错误类型，不算 FormEngine 依赖，故不在列）。
const FORBIDDEN_RUNTIME_SYMBOL =
  /\b(createFormEngine|createPluginManager|createEngineRegistry|EngineRegistry|PluginContext|FormEnginePlugin|FormEngineOptions|FormEngine|PluginManager)\b/;

const SPECIFIER = /\b(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;

function extractSpecifiers(source: string): string[] {
  return [...source.matchAll(SPECIFIER)].map((match) => match[1]);
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

test('package.json 不依赖 designable / antd / renderer / formily / components', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies };
  for (const key of Object.keys(deps)) {
    expect(key).not.toMatch(/designable|antd|@x-form-engine\/(renderer|formily|components)/);
  }
});

test('designer-core 源码不 import Designable / antd / renderer / formily / components', () => {
  const files = collectSources(SRC_DIR);
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    for (const spec of extractSpecifiers(readFileSync(file, 'utf8'))) {
      expect(spec).not.toMatch(FORBIDDEN_PACKAGE);
    }
  }
});

test('designer-core 源码不引用 Runtime FormEngine 符号（C13）', () => {
  const files = collectSources(SRC_DIR);
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    expect(readFileSync(file, 'utf8')).not.toMatch(FORBIDDEN_RUNTIME_SYMBOL);
  }
});
