import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * 静态守卫：先剥离注释与字符串字面量，再对剩余代码解析
 * import / export / require 语句的模块说明符。
 *
 * 为什么不能直接对原始文本做 `source.includes('@x-form-engine/renderer')`：
 * `preview.tsx` 的注释里就出现了这个字符串（说明"刻意不复用 renderer"），
 * 文本包含式检查会误报；同理，注释里写一条完整的 import 语句也会被误报。
 *
 * 字符串剥离后仍需保留模块说明符本身，因此字符串字面量会被替换为带引号的
 * 占位符（如 `'__XF_STRING_0__'`），匹配后再从旁表还原。
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

const STRING_PLACEHOLDER = /^__XF_STRING_(\d+)__$/;

function readQuoted(source: string, start: number, quote: string): { value: string; end: number } {
  let i = start + 1;
  let value = '';
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      value += source.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (ch === quote) return { value, end: i + 1 };
    value += ch;
    i++;
  }
  return { value, end: i };
}

/** 跳过 `${ ... }` 表达式，直到与之配对的 `}`，返回其后一位的下标。 */
function skipTemplateExpression(source: string, start: number): number {
  let depth = 1;
  let i = start;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      i = readQuoted(source, i, ch).end;
      continue;
    }
    if (ch === '`') {
      i = readTemplate(source, i).end;
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return i;
}

function readTemplate(source: string, start: number): { value: string; end: number } {
  let i = start + 1;
  let value = '';
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      value += source.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (ch === '`') return { value, end: i + 1 };
    if (ch === '$' && source[i + 1] === '{') {
      const end = skipTemplateExpression(source, i + 2);
      value += source.slice(i, end);
      i = end;
      continue;
    }
    value += ch;
    i++;
  }
  return { value, end: i };
}

function maskCommentsAndStrings(source: string): { masked: string; strings: string[] } {
  const strings: string[] = [];
  let masked = '';
  let i = 0;

  const pushString = (value: string, quote: string) => {
    strings.push(value);
    return `${quote}__XF_STRING_${strings.length - 1}__${quote}`;
  };

  while (i < source.length) {
    const ch = source[i];

    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') {
        masked += ' ';
        i++;
      }
      continue;
    }

    if (ch === '/' && source[i + 1] === '*') {
      masked += '  ';
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        masked += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < source.length) {
        masked += '  ';
        i += 2;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      const { value, end } = readQuoted(source, i, ch);
      masked += pushString(value, ch);
      i = end;
      continue;
    }

    if (ch === '`') {
      const { value, end } = readTemplate(source, i);
      masked += pushString(value, '`');
      i = end;
      continue;
    }

    masked += ch;
    i++;
  }

  return { masked, strings };
}

function extractSpecifiers(source: string): string[] {
  const { masked, strings } = maskCommentsAndStrings(source);
  const specifiers = new Set<string>();

  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of masked.matchAll(pattern)) {
      const placeholder = STRING_PLACEHOLDER.exec(match[1]);
      specifiers.add(placeholder ? strings[Number(placeholder[1])] : match[1]);
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

test('注释与字符串中的完整 import 语句不触发守卫', () => {
  const source = [
    "// import { FormRenderer } from '@x-form-engine/renderer';",
    "/* export * from '@x-form-engine/renderer'; */",
    "const a = \"import { FormRenderer } from '@x-form-engine/renderer'\";",
    "const b = `require('@x-form-engine/renderer')`;",
  ].join('\n');

  expect(extractSpecifiers(source)).toEqual([]);
});

test('真实 import / export / require 说明符仍被命中（锁住无漏检）', () => {
  const source = [
    "import { a } from '@x-form-engine/renderer';",
    "import type { B } from '@designable/core';",
    "export * from '@designable/shared';",
    "export { c } from '@designable/react';",
    "const d = require('@designable/formily-antd');",
    "const e = await import('@designable/formily-setters');",
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
