import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * 静态守卫：只解析真实的 import / export / require 语句说明符。
 *
 * 不能用 `source.includes('@x-form-engine/renderer')` ——
 * `preview.tsx` 的注释里就出现了这个字符串（说明"刻意不复用 renderer"），
 * 文本包含式检查会误报。
 */
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

test('说明符解析器只识别语句，不误报注释/字符串中的同名字样', () => {
  const source = [
    "import { a } from '@x-form-engine/renderer';",
    "import type { B } from '@designable/core';",
    "export * from '@designable/shared';",
    "export { c } from '@designable/react';",
    "const d = require('@designable/formily-antd');",
    "const e = await import('@designable/formily-setters');",
    '// 刻意不复用 `@x-form-engine/renderer` 与 @designable/react',
    "const text = '未使用的 @designable/react';",
  ].join('\n');

  expect(extractSpecifiers(source).sort()).toEqual(
    [
      '@x-form-engine/renderer',
      '@designable/core',
      '@designable/shared',
      '@designable/react',
      '@designable/formily-antd',
      '@designable/formily-setters',
    ].sort()
  );
});

test('designer 源码不依赖 @x-form-engine/renderer（设计器与运行时解耦）', () => {
  const files = collectSourceFiles(resolve(__dirname, '..'));
  expect(files.length).toBeGreaterThan(0);

  const offenders = files.flatMap((file) =>
    extractSpecifiers(readFileSync(file, 'utf8'))
      .filter(
        (specifier) =>
          specifier === '@x-form-engine/renderer' ||
          specifier.startsWith('@x-form-engine/renderer/')
      )
      .map((specifier) => `${file}: ${specifier}`)
  );

  expect(offenders).toEqual([]);
});
