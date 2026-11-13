// 一次性迁移脚本：把 publishable 包的 main/module/types/exports 从 ./src/*.ts 指向
// 已构建的 ./dist/* 产物（Task 9.3），使 pnpm pack / 外部项目可消费。
//
// 规则：
// - 单入口包（src/index.ts）→ dist/index.{cjs,js,d.ts}
// - components 是多入口（src/index.ts + mobile.ts），tsup 保留目录结构：
//   主入口 → dist/src/index.*，子路径 ./mobile → dist/mobile.*
//
// 幂等：重复运行不改变结果。运行：node scripts/rewire-dist-exports.mjs

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = resolve(__dirname, '../packages');

const MULTI_ENTRY = new Map([
  ['@x-form-engine/components', { mainDir: 'src', subpaths: ['mobile'] }],
]);

for (const dir of readdirSync(PACKAGES_DIR)) {
  const pkgPath = join(PACKAGES_DIR, dir, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (!pkg.name || pkg.private) continue;

  const special = MULTI_ENTRY.get(pkg.name);
  const mainDir = special?.mainDir ?? '';

  pkg.main = `./dist/${mainDir ? mainDir + '/' : ''}index.cjs`;
  pkg.module = `./dist/${mainDir ? mainDir + '/' : ''}index.js`;
  pkg.types = `./dist/${mainDir ? mainDir + '/' : ''}index.d.ts`;

  const mainTypes = `./dist/${mainDir ? mainDir + '/' : ''}index.d.ts`;
  const mainImport = `./dist/${mainDir ? mainDir + '/' : ''}index.js`;
  const mainRequire = `./dist/${mainDir ? mainDir + '/' : ''}index.cjs`;

  const exportsMap = {
    '.': {
      types: mainTypes,
      import: mainImport,
      require: mainRequire,
      default: mainImport,
    },
  };

  for (const sub of special?.subpaths ?? []) {
    exportsMap[`./${sub}`] = {
      types: `./dist/${sub}.d.ts`,
      import: `./dist/${sub}.js`,
      require: `./dist/${sub}.cjs`,
      default: `./dist/${sub}.js`,
    };
  }

  pkg.exports = exportsMap;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`rewired ${pkg.name}`);
}
