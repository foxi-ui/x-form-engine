import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** 静态守卫：只解析真实的 import / export / require 语句说明符，不做文本包含匹配。 */
const SPECIFIER_PATTERNS: RegExp[] = [
  // import x from 'pkg' / import type { x } from 'pkg' / import 'pkg'
  /\bimport\s+(?:type\s+)?(?:[^;'"]*?\bfrom\s+)?['"]([^'"]+)['"]/g,
  // export * from 'pkg' / export { x } from 'pkg' / export type { x } from 'pkg'
  /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s*['"]([^'"]+)['"]/g,
  // import('pkg')
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // require('pkg')
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function extractSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();
  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      specifiers.add(match[1]);
    }
  }
  return [...specifiers];
}

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    // 守卫针对随包发布的源码；测试目录内含说明符样例字符串，会自我触发。
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : collectSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function findDesignableSpecifiers(dir: string): string[] {
  return collectSourceFiles(dir).flatMap((file) =>
    extractSpecifiers(readFileSync(file, 'utf8'))
      .filter(
        (specifier) => specifier === '@designable' || specifier.startsWith('@designable/')
      )
      .map((specifier) => `${file}: ${specifier}`)
  );
}

test('说明符解析器只识别语句，不误报注释/字符串中的同名字样', () => {
  const source = [
    "import { a } from '@designable/core';",
    "export * from '@designable/shared';",
    "const b = require('@designable/react');",
    "const c = await import('@designable/formily-antd');",
    '// 注释里的 @designable/react 不算依赖',
    "const text = '未使用的 @designable/core';",
  ].join('\n');

  expect(extractSpecifiers(source).sort()).toEqual(
    [
      '@designable/core',
      '@designable/shared',
      '@designable/react',
      '@designable/formily-antd',
    ].sort()
  );
});

test('renderer 源码不依赖 @designable（运行时与设计器解耦）', () => {
  const dir = resolve(__dirname, '../../../renderer/src');
  expect(collectSourceFiles(dir).length).toBeGreaterThan(0);
  expect(findDesignableSpecifiers(dir)).toEqual([]);
});

test('sdk 源码不依赖 @designable', () => {
  const dir = resolve(__dirname, '..');
  expect(collectSourceFiles(dir).length).toBeGreaterThan(0);
  expect(findDesignableSpecifiers(dir)).toEqual([]);
});
