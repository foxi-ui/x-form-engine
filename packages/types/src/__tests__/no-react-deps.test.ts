import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FORBIDDEN_PACKAGES = 'react|react-dom|@formily|@designable|antd';

// 匹配 import / export-from / require / 动态 import 的模块说明符，
// 支持裸包名（'react'）与子路径（'@formily/json-schema'、'antd/es/button'）。
function hasForbiddenDependency(source: string): boolean {
  return new RegExp(
    `\\b(?:from|import|require)\\s*\\(?\\s*['"](${FORBIDDEN_PACKAGES})(?:['"/])`
  ).test(source);
}

test('types 包 package.json 不依赖 react/formily/designable（含 optional）', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies };
  for (const k of Object.keys(deps)) {
    expect(k).not.toMatch(/react|formily|designable|antd/);
  }
});

test('依赖守卫识别子路径 / require / 动态 import / 副作用 import', () => {
  const forbidden = [
    "import type { ISchema } from '@formily/json-schema'",
    "import { createDesigner } from '@designable/core'",
    "import { createRoot } from 'react-dom/client'",
    "import { Button } from 'antd/es/button'",
    "require('react')",
    "import('react')",
    "import 'react'",
  ];
  for (const line of forbidden) {
    expect(hasForbiddenDependency(line)).toBe(true);
  }
});

test('依赖守卫不误伤非依赖文本', () => {
  expect(hasForbiddenDependency("const s = 'reactivity';")).toBe(false);
  expect(hasForbiddenDependency('// 具体类型为 React.ReactNode')).toBe(false);
});

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

test('types 源码不 import react/formily/designable', () => {
  const srcDir = resolve(__dirname, '../..');
  for (const file of collectSources(srcDir)) {
    expect(hasForbiddenDependency(readFileSync(file, 'utf8'))).toBe(false);
  }
});

test('plugin.ts 无任何 import/require（C9 Generic Plugin Core 无编译期依赖）', () => {
  const pluginSrc = readFileSync(resolve(__dirname, '../plugin.ts'), 'utf8');
  expect(pluginSrc).not.toMatch(/^\s*import\s/m);
  expect(pluginSrc).not.toMatch(/\bfrom\s+['"]/);
  expect(pluginSrc).not.toMatch(/\brequire\s*\(/);
});
