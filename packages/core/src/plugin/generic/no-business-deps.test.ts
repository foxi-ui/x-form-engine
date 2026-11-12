import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

// generic 目录的生产源码只允许 import @x-form-engine/types（含子路径）与
// 解析后仍位于 generic/ 目录内的相对导入，从而排除 FormEngine / RegistryKind /
// Designer / formily / designable / antd 等业务依赖，并拦截父目录穿越。
const GENERIC_DIR = resolve(__dirname);
const ALLOWED_PACKAGE = /^@x-form-engine\/types($|\/)/;

// 匹配 import / export-from / 副作用 import / 动态 import / require 的模块说明符。
// `\s*` 覆盖跨行写法；`\(?` 覆盖 import(...) / require(...)。
const SPECIFIER = /\b(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;

function extractSpecifiers(source: string): string[] {
  return [...source.matchAll(SPECIFIER)].map((match) => match[1]);
}

function isAllowedSpecifier(spec: string, fileDir: string): boolean {
  if (ALLOWED_PACKAGE.test(spec)) {
    return true;
  }
  if (spec.startsWith('.')) {
    const resolved = resolve(fileDir, spec);
    return resolved === GENERIC_DIR || resolved.startsWith(GENERIC_DIR + sep);
  }
  return false;
}

function collectSources(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) result.push(...collectSources(full));
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) result.push(full);
  }
  return result;
}

test('守卫识别副作用/动态 import、require、export-from 与父目录穿越', () => {
  const forbidden = [
    "import { x } from '@x-form-engine/core'",
    "export * from '@x-form-engine/designer'",
    "import 'antd/dist/reset.css'",
    "import('@x-form-engine/designer')",
    "require('formily')",
    "import { y } from './../plugin-manager'",
    "import { z } from '../plugin-manager'",
    "import { w } from '@x-form-engine/types-evil'",
  ];
  for (const line of forbidden) {
    const specs = extractSpecifiers(line);
    expect(specs.length).toBeGreaterThan(0);
    expect(specs.every((spec) => isAllowedSpecifier(spec, GENERIC_DIR))).toBe(false);
  }

  const allowed = [
    "import { FormEngineError } from '@x-form-engine/types'",
    "import type { PluginDefinition } from '@x-form-engine/types/plugin'",
    "import { resolvePluginOrder } from './dependency-resolver'",
  ];
  for (const line of allowed) {
    const specs = extractSpecifiers(line);
    expect(specs.length).toBeGreaterThan(0);
    expect(specs.every((spec) => isAllowedSpecifier(spec, GENERIC_DIR))).toBe(true);
  }
});

test('generic 目录生产源码不 import Runtime/Designer 业务模块', () => {
  const files = collectSources(GENERIC_DIR);
  expect(files.length).toBeGreaterThan(0);

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const spec of extractSpecifiers(src)) {
      expect(isAllowedSpecifier(spec, resolve(file, '..'))).toBe(true);
    }
  }
});
