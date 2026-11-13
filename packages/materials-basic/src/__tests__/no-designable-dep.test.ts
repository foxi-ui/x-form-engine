import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// materials-basic 是框架无关的基础物料包（Task 6.1「不直接操作 Designable」），
// 只允许依赖 types + components，不得依赖 Designable / designer-designable / antd 直接入口。
const FORBIDDEN = /designable|^antd$|^antd-mobile$/;

test('package.json 不依赖 Designable / designer-designable / antd 直接入口', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.peerDependencies };
  for (const key of Object.keys(deps)) {
    expect(key).not.toMatch(FORBIDDEN);
  }
});

test('只依赖 types + components（框架无关）', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
  expect(Object.keys(pkg.dependencies ?? {}).sort()).toEqual([
    '@x-form-engine/components',
    '@x-form-engine/types',
  ]);
});
