// 依赖边界检查（Task 9.2 / C8 / C13）。
//
// 依据 docs/architecture/02-form-engine-v2-task.md Phase 9 Task 9.2 与 AGENTS.md
// 「Form Engine V2 已确认约束」。只读 packages/*/package.json + 源码深路径 import，
// 对不满足边界规则的依赖报错，作为 CI / 本地校验入口。
//
// 运行：node scripts/check-dependency-boundaries.mjs

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = join(ROOT, 'packages');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const pkgName = (dir) => {
  const p = join(PACKAGES_DIR, dir, 'package.json');
  return existsSync(p) ? readJson(p).name : null;
};

const failures = [];
const fail = (msg) => failures.push(msg);

function collectPackageDirs() {
  return readdirSync(PACKAGES_DIR).filter((d) => {
    const full = join(PACKAGES_DIR, d);
    return statSync(full).isDirectory() && existsSync(join(full, 'package.json'));
  });
}

function allDeps(pkg) {
  return new Set(
    Object.keys({
      ...(pkg.dependencies ?? {}),
      ...(pkg.peerDependencies ?? {}),
      ...(pkg.optionalDependencies ?? {}),
    })
  );
}

function assertNoDeps(pkg, forbidden, rule) {
  const deps = allDeps(pkg);
  for (const dep of deps) {
    for (const re of forbidden) {
      if (re.test(dep)) {
        fail(`[${pkg.name}] ${rule}: 禁止依赖 ${dep}`);
      }
    }
  }
}

function assertHasDeps(pkg, required, rule) {
  const deps = allDeps(pkg);
  for (const re of required) {
    if (![...deps].some((d) => re.test(d))) {
      fail(`[${pkg.name}] ${rule}: 缺少依赖 ${re}`);
    }
  }
}

function assertDepsSubset(pkg, allowed, rule) {
  const deps = allDeps(pkg);
  for (const dep of deps) {
    if (dep.startsWith('@x-form-engine/') || dep.startsWith('@designable/') || /^(antd|antd-mobile|react|react-dom|@formily\/)/.test(dep)) {
      if (!allowed.some((re) => re.test(dep))) {
        fail(`[${pkg.name}] ${rule}: 依赖越界 ${dep}`);
      }
    }
  }
}

const DESIGNER_DEPS = /^@x-form-engine\/(designer|designer-core|designer-designable)($|\/)/;
const DESIGNER_EXT_DEPS =
  /^@x-form-engine\/(materials-basic|setters-basic|setters-advanced|plugins-basic|plugins-advanced)($|\/)/;
const DESIGNABLE = /^@designable\//;
const RUNTIME_DEPS = /^@x-form-engine\/(renderer|formily|components|sdk)($|\/)/;

const RUNTIME_LAYER = ['core', 'formily', 'adapters', 'services', 'renderer', 'components', 'sdk'];

for (const dir of collectPackageDirs()) {
  const pkg = readJson(join(PACKAGES_DIR, dir, 'package.json'));
  const name = pkg.name;
  if (!name) continue;

  if (name === '@x-form-engine/types') {
    assertNoDeps(pkg, [/./], 'types 是根协议包，不允许任何依赖');
    continue;
  }

  if (RUNTIME_LAYER.includes(name.replace('@x-form-engine/', ''))) {
    // Runtime 不得依赖 Designer / Designable / 扩展包。
    assertNoDeps(pkg, [DESIGNER_DEPS, DESIGNER_EXT_DEPS, DESIGNABLE], 'Runtime 不得依赖 Designer/Designable/扩展包');
    continue;
  }

  if (name === '@x-form-engine/designer-core') {
    assertNoDeps(pkg, [DESIGNABLE, RUNTIME_DEPS], 'designer-core 不得依赖 Designable / Runtime Renderer');
    assertNoDeps(pkg, [/^(antd|antd-mobile|react|react-dom|@formily\/)/], 'designer-core 不得依赖 antd / react / formily');
    assertDepsSubset(pkg, [/^@x-form-engine\/(types|core)$/], 'designer-core 只允许依赖 types + core');
    continue;
  }

  if (name === '@x-form-engine/designer-designable') {
    assertHasDeps(pkg, [/^@x-form-engine\/designer-core$/], 'designer-designable 必须依赖 designer-core');
    assertHasDeps(pkg, [DESIGNABLE], 'designer-designable 必须依赖 @designable/*');
    continue;
  }

  if (name === '@x-form-engine/designer') {
    // 旧兼容 Facade（M2）：允许依赖 designer-designable + Designable，但 Runtime 层不得反向依赖它。
    assertHasDeps(pkg, [/^@x-form-engine\/designer-designable$/], 'designer 兼容 Facade 应委托 designer-designable');
    continue;
  }

  if (name === '@x-form-engine/materials-basic') {
    assertNoDeps(pkg, [DESIGNABLE], 'materials-basic 不得依赖 Designable');
    continue;
  }

  if (name === '@x-form-engine/setters-basic') {
    assertNoDeps(pkg, [DESIGNABLE, DESIGNER_DEPS], 'setters-basic 不得依赖 Designable / Designer');
    continue;
  }

  if (name === '@x-form-engine/plugins-basic') {
    assertNoDeps(pkg, [DESIGNABLE, /^@x-form-engine\/designer-designable/], 'plugins-basic 不得依赖 Designable');
    assertHasDeps(pkg, [/^@x-form-engine\/designer-core$/], 'plugins-basic 必须基于 designer-core');
    continue;
  }

  // 高级扩展：只允许依赖公开协议（types / designer-core）+ 对应基础扩展 + antd/react。
  if (name === '@x-form-engine/setters-advanced') {
    assertDepsSubset(pkg, [/^@x-form-engine\/types$/, /^(antd|react|react-dom)$/], 'setters-advanced 只允许依赖 types + antd/react');
    assertNoDeps(pkg, [/^@x-form-engine\/core$/, /^@x-form-engine\/renderer/, /^@x-form-engine\/components/, /^@x-form-engine\/formily/, /^@x-form-engine\/sdk/, DESIGNABLE], 'setters-advanced 不得依赖 Core 内部 / Designable');
    continue;
  }

  if (name === '@x-form-engine/plugins-advanced') {
    assertDepsSubset(pkg, [/^@x-form-engine\/types$/, /^@x-form-engine\/designer-core$/, /^@x-form-engine\/setters-advanced$/], 'plugins-advanced 只允许依赖 types + designer-core + setters-advanced');
    assertNoDeps(pkg, [/^@x-form-engine\/core$/, /^@x-form-engine\/renderer/, /^@x-form-engine\/components/, /^@x-form-engine\/formily/, /^@x-form-engine\/sdk/, DESIGNABLE], 'plugins-advanced 不得依赖 Core 内部 / Designable');
    continue;
  }

  fail(`[${name}] 未覆盖的包，请补充边界规则`);
}

// 源码级：禁止任何包深路径 import 内部源码路径（`@x-form-engine/xxx/src/...`）。
const DEEP_IMPORT = /from\s+['"]@x-form-engine\/[^'"]+\/src\//;
function collectSources(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    if (e === '__tests__' || e === 'node_modules' || e === 'dist') continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...collectSources(full));
    else if (/\.(ts|tsx|mjs|js)$/.test(e)) out.push(full);
  }
  return out;
}
for (const dir of collectPackageDirs()) {
  const srcDir = join(PACKAGES_DIR, dir, 'src');
  if (!existsSync(srcDir)) continue;
  for (const file of collectSources(srcDir)) {
    const text = readFileSync(file, 'utf8');
    if (DEEP_IMPORT.test(text)) {
      const hit = text.match(DEEP_IMPORT)[0];
      fail(`[${dir}] 深路径 import 内部源码：${file} -> ${hit}`);
    }
  }
}

if (failures.length > 0) {
  console.error('依赖边界检查失败：\n' + failures.map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log(`依赖边界检查通过（${collectPackageDirs().length} 个包）。`);
