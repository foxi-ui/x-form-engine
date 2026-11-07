# MVP M1（Engine 内核）实施计划

> **面向 agentic worker：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施本计划。步骤使用 `- [ ]` 复选框语法跟踪。

**目标（Goal）：** 在全新 pnpm monorepo 中落地可运行的 Engine 内核，使业务方仅依赖 SDK 就能用 Schema 渲染表单、填写、校验并获取标准化 Value。

**架构（Architecture）：** 按「完整架构保留、最小内核实现」拆包为 `types → core → formily → renderer → components → sdk` 六个包 + `apps/playground`。`types` 零依赖（无 React/Formily），承载领域类型**与引擎级纯契约接口**（`Registry`/`EventBus`/`FormEnginePlugin`/`FormEngine` 等，均无 React）；`core` 无 React，只放实现（registry/plugin/schema/engine 均可 node 环境单测）；React 边界收敛在 `formily` / `renderer` / `components` / `sdk` 四个包。`schema` 按 MVP 基线合并进 `core`，`readonly` / `mobile` / `designer` / `services` 留待 M2/M3。

**技术栈（Tech Stack）：** pnpm workspace + TypeScript 5.9（strict）+ Vitest 3.2（node/jsdom）+ React 17.0.2 + antd 4.22.8 + `@formily/*` 2.3.7。版本组合与测试栈沿用 `docs/tech-design/verification/` 已验证的锁定基线。

**规格（Spec）：**
- `docs/tech-design/mvp-roadmap.md`（§6 M1 任务 + §2.1 包拆分 + §10 范围控制 + BLOCK-02/07）
- `docs/tech-design/form-engine-architecture-design.md`（§3–§8、§14、§15）
- `docs/tech-design/02-specs/01-types.md`、`02-component-spec.md`、`03-registry-plugin.md`、`04-formily-adapter.md`、`05-renderer-sdk.md`、`06-runtime-context.md`、`10-testing-and-roadmap.md`
- `docs/tech-design/verification/01-version-lock.md`、`02-formily-api.md`

本计划的任务编号与 roadmap §6 M1 任务对应关系：`Task 1↔M1-01`，`Task 2↔M1-03`，`Task 3↔M1-02`，`Task 4↔M1-04`，`Task 5↔M1-05/06`，`Task 6↔M1-07`，`Task 7↔M1-08`，`Task 8↔M1-08 收口`，`Task 9↔M1-09`，`Task 10↔M1-10`，`Task 11↔M1-11`。

---

## 全局约束（Global Constraints）

以下约束逐字来自规格，每个任务的验收隐式包含本节；违反即视为任务未完成。

1. 版本硬约束：Node 22.23.2、pnpm 10.34.5、TypeScript 5.9.3、React/react-dom/react-is 17.0.2、antd 4.22.8、`@formily/core|react|json-schema` 2.3.7、`@formily/antd` 2.3.7、Vitest 3.2.7、jsdom 26.1.0、`@ant-design/icons` 4.8.3。
2. `tsconfig` 必须 `strict: true` 且 `skipLibCheck: true`（关闭会因 `@formily/antd` 与 antd 类型冲突、`rc-tree`、`resize-observer-polyfill` 报错）。
3. `types` 包不得依赖 React / Formily / Designable / 任何 UI 库；`core` 包不得依赖 React；`renderer/core` 不得依赖 antd；`formily` 不得依赖 Designable。依赖方向单向，业务项目只依赖 `sdk`。
4. 公共类型一律 `unknown` 优先于 `any`；不得把 Formily 内部类型泄漏到 `types`/`core`/`sdk` 的公共导出。
5. 不重写 Formily：引擎只映射 Registry→`components`、Scope→`scope`，保留 `x-reactions`/`x-validator`/`x-decorator`/Effects 原生能力。
6. `x-engine` 是唯一的引擎扩展命名空间；保留未知的 Formily 原生键，对未知 `x-engine` 子键按协议版本产生 warning 而非静默丢弃。
7. Registry 严格冲突：同名重复注册抛 `PLUGIN_CONFLICT`，禁止隐式「后注册覆盖先注册」；注册项记录来源（`sourcePlugin`）与注册时间。
8. M1 仅支持同步 Plugin（BLOCK-07）；插件安装按依赖拓扑排序、检测循环依赖、安装失败回滚、卸载只删除本插件资源、Engine 销毁按安装逆序 dispose。
9. `submit()` 不发起业务 HTTP；M1 的 `submit()` 只做「校验 → 获取 Value → 返回 `FormSubmitResult`（snapshot 为空占位，M3 实现真实 Candidate Snapshot）」。
10. 组件定义（protocol）与 UI 实现分离：PC 组件实现不得直接 `import 'antd'`，只允许借 `@formily/antd`，并登记「替换清单」供 antd 5 升级。
11. Formily 已验证签名：`createForm` 等生命周期来自 `@formily/core`；`createSchemaField`/`FormProvider`/`useForm`/`useField` 来自 `@formily/react`；`onFormValuesChange((form) => void)`（值读 `form.values`）；`useField`/`useFieldSchema` 必须在字段渲染上下文内；`createSchemaField` 返回 React 组件、用 JSX 渲染。
12. `Platform = 'pc' | 'mobile'`（MVP 基线 BLOCK-02：readonly 是渲染模式而非平台维度），`RenderMode = 'edit' | 'preview' | 'readonly'`。

---

## 评审重点（Review Focus）

规格是愿景文档，以下输入/边界是规格未明说、但最可能「咬到」使用者的坑，各条由标注的任务测试锁定：

1. **`x-engine` 与 Formily 原生键共存**：含 `x-engine` 的 schema 必须能被 Formily 正常编译渲染、不吞掉 `x-component`/`x-reactions` 等原生键；未知 `x-engine` 子键返回 warning 而非静默丢弃。→ Task 5/6。
2. **`createSchemaField` 必须 JSX 渲染 + scope 实例级覆盖工厂级**：函数式调用绕过组件边界（已由验证确认），scope 合并规则是「实例级同名覆盖、未覆盖走工厂级」。→ Task 6。
3. **`useField`/`useFieldSchema` 的字段上下文依赖**：自定义组件仅在 `<FormProvider>` 下取到空值，必须在 SchemaField 字段子树内。→ Task 9。
4. **`onFormValuesChange((form) => void)` 签名**：Renderer 的 `onValuesChange` 回读 `form.values`，不能按 `(form, values)` 解构。→ Task 7。
5. **插件资源归属与卸载隔离**：卸载 plugin A 不得删除 plugin B 的资源；跨 source 的 `unregister` 必须拒绝/报错。→ Task 2/4。
6. **`types` 包零 React/Formily 依赖**：`ComponentBinding` 的实现类型默认 `unknown`，React 类型只在 React 感知包内收窄。→ Task 1。

---

## Task 1: Monorepo 脚手架与 `@x-form-engine/types` 公共类型（M1-01）

**Files:**
- Create: `package.json`（根）、`pnpm-workspace.yaml`、`.npmrc`、`tsconfig.base.json`、`vitest.workspace.ts`、`.gitignore`
- Create: `packages/types/package.json`、`packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`、`src/base.ts`、`src/component.ts`、`src/schema.ts`、`src/value.ts`、`src/services.ts`、`src/errors.ts`、`src/engine.ts`
- Test: `packages/types/src/__tests__/errors.test.ts`、`__tests__/types.test.ts`、`__tests__/no-react-deps.test.ts`

**Interfaces:**
- Consumes: 无（首个任务）
- Produces（后续任务依赖，签名必须一致）:

```ts
// base.ts
export type Platform = 'pc' | 'mobile';
export type RenderMode = 'edit' | 'preview' | 'readonly';
export type Primitive = string | number | boolean | null;
export type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;
export type FieldPath = string;
export type ComponentName = string;
export type PluginName = string;

// component.ts —— 协议侧无 React；Impl 默认 unknown
export interface ComponentCapabilities {
  editable: boolean;
  readonly: boolean;
  mobile: boolean;
  datasource?: boolean;
  validation?: boolean;
  snapshot?: boolean;
  children?: boolean;
}
export interface ComponentMeta {
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  deprecated?: boolean;
}
export interface ComponentSchemaDefinition {
  type: 'object';
  properties?: Record<string, unknown>;
  default?: Record<string, unknown>;
}
export interface AdapterContext {
  schema: Record<string, unknown>;
  path: string;
  locale: string;
  displayState?: Record<string, unknown>;
}
export interface ComponentAdapter<Value = unknown, Snapshot = unknown> {
  normalizeValue?(value: unknown, context: AdapterContext): Value;
  serializeValue?(value: Value, context: AdapterContext): unknown;
  createSnapshot?(value: Value, context: AdapterContext): Snapshot;
  restoreSnapshot?(snapshot: Snapshot, context: AdapterContext): Value;
}
export interface ComponentProtocolDefinition {
  name: ComponentName;
  version: string;
  meta: ComponentMeta;
  capabilities: ComponentCapabilities;
  schema: ComponentSchemaDefinition;
  adapter?: ComponentAdapter;
}
export interface ComponentImplementations<Impl = unknown> {
  pc?: Impl;
  mobile?: Impl;
}
export interface ComponentBinding<Impl = unknown> {
  protocol: ComponentProtocolDefinition;
  implementations: ComponentImplementations<Impl>;
}

// schema.ts
export const ENGINE_SCHEMA_VERSION = '1.0.0';
export interface FormSchemaDocument {
  schemaId: string;
  version: number;
  engineSchemaVersion: string;
  formilyVersion?: string;
  schema: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// value.ts
export interface FormSubmitResult {
  values: Record<string, unknown>;
  snapshot: FormSnapshot;
  schemaId?: string;
  schemaVersion?: number;
}
export interface FormSnapshot {
  snapshotVersion: string;
  schemaId: string;
  schemaVersion: number;
  createdAt: string;
  locale?: string;
  fields: Record<string, FieldSnapshot>;
}
export interface FieldSnapshot {
  path: FieldPath;
  component: ComponentName;
  componentVersion?: string;
  title?: string;
  value: unknown;
  displayValue?: unknown;
  options?: Array<{ label: string; value: unknown }>;
  metadata?: Record<string, unknown>;
}

// services.ts —— M1 仅 datasource；permission/i18n/snapshot 留 M2/M3 追加可选字段
export interface DatasourceRequest {
  service: string;
  params?: Record<string, unknown>;
  keyword?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}
export interface DatasourceResult<T = unknown> {
  items: T[];
  total?: number;
  hasMore?: boolean;
}
export interface DatasourceService {
  query<T = unknown>(request: DatasourceRequest): Promise<DatasourceResult<T>>;
}
export interface EngineServices {
  datasource?: DatasourceService;
}

// errors.ts
export type FormEngineErrorCode =
  | 'SCHEMA_INVALID'
  | 'SCHEMA_VERSION_UNSUPPORTED'
  | 'COMPONENT_NOT_FOUND'
  | 'COMPONENT_CAPABILITY_MISMATCH'
  | 'PLUGIN_CONFLICT'
  | 'PLUGIN_DEPENDENCY_MISSING'
  | 'DATASOURCE_FAILED'
  | 'SNAPSHOT_FAILED'
  | 'PERMISSION_DENIED'
  | 'RENDER_FAILED';
export class FormEngineError extends Error {
  constructor(
    public readonly code: FormEngineErrorCode,
    message: string,
    public readonly details?: unknown
  );
}

// engine.ts —— 引擎级纯契约接口（均无 React/Formily；core 只提供实现）
export type EngineStatus =
  | 'created' | 'initializing' | 'ready' | 'failed' | 'disposed';

export interface RegistryEntry<T> {
  name: string;
  value: T;
  source?: string;
  registeredAt: number;
}
export interface Registry<T> {
  register(name: string, value: T, source?: string): void;   // 重名抛 PLUGIN_CONFLICT
  unregister(name: string, source?: string): void;           // source 不匹配抛 PLUGIN_CONFLICT
  get(name: string): T | undefined;
  has(name: string): boolean;
  list(): RegistryEntry<T>[];
}
export interface EngineRegistry {
  components: Registry<ComponentBinding>;
  decorators: Registry<unknown>;
  services: Registry<unknown>;
  formatters: Registry<unknown>;
  designer: Registry<unknown>;
}
export interface EventBus {
  on<T>(event: string, handler: (payload: T) => void): () => void;
  once<T>(event: string, handler: (payload: T) => void): () => void;
  emit<T>(event: string, payload: T): void;
}
export interface PluginContext {
  registry: EngineRegistry;
  services: EngineServices;
  events: EventBus;
  config: FormEngineOptions;
}
export interface FormEnginePlugin {
  name: string;
  version: string;
  dependencies?: string[];
  install(context: PluginContext): void;    // 同步（BLOCK-07），抛错即安装失败
  dispose?(context: PluginContext): void;
}
export interface FormEngineOptions {
  id?: string;
  platform?: Platform;
  locale?: string;
  debug?: boolean;
  components?: ComponentBinding[];
  plugins?: FormEnginePlugin[];
  services?: Partial<EngineServices>;
}
export interface FormEngine {
  readonly id: string;
  readonly options: FormEngineOptions;
  readonly registry: EngineRegistry;
  readonly events: EventBus;
  readonly services: EngineServices;
  readonly status: EngineStatus;
  installPlugin(plugin: FormEnginePlugin): void;
  dispose(): void;
}
```

> `Registry` / `EventBus` / `FormEnginePlugin` / `FormEngine` 等接口全部放 `types`（均为无 React 的纯契约），`core` 只提供 `createRegistry` / `createEventBus` / `createEngineRegistry` / `createFormEngine` / 插件管理器等实现。这样 `FormEngineOptions.plugins` 引用 `FormEnginePlugin` 不会产生 types→core 反向依赖。

- [ ] **Step 1: 写失败测试**

`packages/types/src/__tests__/errors.test.ts`：
```ts
import { FormEngineError } from '../errors';

test('FormEngineError 保留 code/name/details 且是 Error 实例', () => {
  const e = new FormEngineError('PLUGIN_CONFLICT', '重复注册 Input', { name: 'Input' });
  expect(e).toBeInstanceOf(Error);
  expect(e.name).toBe('FormEngineError');
  expect(e.code).toBe('PLUGIN_CONFLICT');
  expect(e.details).toEqual({ name: 'Input' });
});
```

`__tests__/types.test.ts`（类型级，用 `expectTypeOf`）：
```ts
import { expectTypeOf } from 'vitest';
import type { Platform, RenderMode, ComponentBinding } from '../index';

test('Platform 不含 readonly，RenderMode 含 readonly', () => {
  expectTypeOf<'pc'>().toMatchTypeOf<Platform>();
  expectTypeOf<'mobile'>().toMatchTypeOf<Platform>();
  // @ts-expect-error readonly 不是 Platform
  const _p: Platform = 'readonly';
  expectTypeOf<'readonly'>().toMatchTypeOf<RenderMode>();
});

test('ComponentBinding 默认实现类型为 unknown', () => {
  expectTypeOf<ComponentBinding['implementations']>().toEqualTypeOf<
    { pc?: unknown; mobile?: unknown }
  >();
});
```

`__tests__/no-react-deps.test.ts`：
```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('types 包 package.json 不依赖 react/formily/designable', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.peerDependencies };
  for (const k of Object.keys(deps)) {
    expect(k).not.toMatch(/react|formily|designable|antd/);
  }
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/types/src/__tests__`
Expected: FAIL（`../errors`、`../index` 模块不存在 / 无法解析）。

- [ ] **Step 3: 落地脚手架与 types 源码**

根：`pnpm-workspace.yaml` 声明 `packages/*` 与 `apps/*`；`.npmrc` 设 registry 镜像与 `strict-peer-dependencies=false`；`tsconfig.base.json` 设 `strict:true`、`skipLibCheck:true`、`target es2020`、`moduleResolution node`；`vitest.workspace.ts` 用 glob 引入 `packages/*`。`packages/types` 按 Produces 逐个文件写入类型；`index.ts` 全量 re-export。

- [ ] **Step 4: 运行测试确认通过 + 类型检查**

Run: `pnpm vitest run packages/types/src/__tests__`，再 `pnpm --filter @x-form-engine/types typecheck`
Expected: 3 个测试文件全 PASS；`tsc --noEmit` 通过（strict）。

- [ ] **Step 5: 提交**

```bash
git add package.json pnpm-workspace.yaml .npmrc tsconfig.base.json vitest.workspace.ts .gitignore packages/types
git commit -m "feat(types): 初始化 pnpm monorepo 与公共类型契约"
```

---

## Task 2: `@x-form-engine/core` Registry 与 EventBus（M1-03）

**Files:**
- Create: `packages/core/package.json`、`packages/core/tsconfig.json`、`packages/core/vitest.config.ts`（`environment: 'node'`）
- Create: `packages/core/src/registry/registry.ts`、`src/registry/engine-registry.ts`、`src/events/event-bus.ts`、`src/index.ts`
- Test: `packages/core/src/registry/registry.test.ts`、`src/events/event-bus.test.ts`

**Interfaces:**
- Consumes: `types` 的 `Registry`/`RegistryEntry`/`EngineRegistry`/`EventBus`/`ComponentBinding`/`FormEngineError`（接口已在 Task 1 定义）。
- Produces（Task 3/4/6 依赖）—— 仅实现工厂，接口归属 types:

```ts
// registry/registry.ts
export function createRegistry<T>(): Registry<T>;

// registry/engine-registry.ts
export function createEngineRegistry(): EngineRegistry;

// events/event-bus.ts
export function createEventBus(): EventBus;
```

- [ ] **Step 1: 写失败测试**

`registry.test.ts`：
```ts
import { createRegistry } from './registry';
import { FormEngineError } from '@x-form-engine/types';

test('重复注册同名抛 PLUGIN_CONFLICT', () => {
  const r = createRegistry<unknown>();
  r.register('Input', {}, 'plugin-a');
  expect(() => r.register('Input', {}, 'plugin-b'))
    .toThrowError(expect.objectContaining({ code: 'PLUGIN_CONFLICT' }));
});

test('list 记录 source 与 registeredAt', () => {
  const r = createRegistry<unknown>();
  r.register('Input', { a: 1 }, 'plugin-a');
  const [e] = r.list();
  expect(e.name).toBe('Input');
  expect(e.source).toBe('plugin-a');
  expect(typeof e.registeredAt).toBe('number');
});

test('跨 source 的 unregister 抛错，同 source 可卸载', () => {
  const r = createRegistry<unknown>();
  r.register('Input', {}, 'plugin-a');
  expect(() => r.unregister('Input', 'plugin-b')).toThrowError(FormEngineError);
  r.unregister('Input', 'plugin-a');
  expect(r.has('Input')).toBe(false);
});
```

`event-bus.test.ts`：
```ts
test('on 返回 unsubscribe，emit 同步触发，销毁后不再触发', () => {
  const bus = createEventBus();
  const calls: number[] = [];
  const off = bus.on<number>('plugin:install', (p) => calls.push(p));
  bus.emit('plugin:install', 1);
  off();
  bus.emit('plugin:install', 2);
  expect(calls).toEqual([1]);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/core/src/registry packages/core/src/events`
Expected: FAIL（`createRegistry`/`createEventBus` 未定义）。

- [ ] **Step 3: 实现 `createRegistry` / `createEngineRegistry` / `createEventBus`**

`createRegistry` 内部用 `Map<string, RegistryEntry<T>>`；`register` 先 `has` 再写；`unregister` 校验 source 匹配。`createEventBus` 用 `Map<event, Set<handler>>`。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run packages/core/src/registry packages/core/src/events`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/core
git commit -m "feat(core): 通用 Registry（严格冲突+来源归属）与 EventBus"
```

---

## Task 3: `@x-form-engine/core` FormEngine 创建与销毁（M1-02）

**Files:**
- Create: `packages/core/src/engine.ts`、`src/engine.test.ts`
- Modify: `packages/core/src/index.ts`（导出 engine）

**Interfaces:**
- Consumes: `createEngineRegistry`/`createEventBus`（Task 2）、`types` 的 `FormEngine`/`FormEngineOptions`/`EngineStatus`/`EngineServices`/`FormEnginePlugin`（接口已在 Task 1 定义）。
- Produces（Task 4/6/7/8 依赖）—— `FormEngine` 接口归属 types，core 提供工厂:

```ts
export function createFormEngine(options?: FormEngineOptions): FormEngine;
// 内部类 Engine implements FormEngine；installPlugin 委托 PluginManager（Task 4 接）
```

生命周期：`created →(注册 components/plugins)→ ready`；`dispose()` 后 `status === 'disposed'`，重复 `dispose` 幂等；`engine:init` / `engine:dispose` 事件触发。

- [ ] **Step 1: 写失败测试**

`engine.test.ts`：
```ts
import { createFormEngine } from './engine';

test('createFormEngine 返回 ready 状态的引擎，注册内置组件', () => {
  const engine = createFormEngine({
    id: 'e1',
    platform: 'pc',
    components: [{ protocol: { name: 'Input', version: '1.0.0', meta: { title: '输入' }, capabilities: { editable: true, readonly: true, mobile: false }, schema: { type: 'object' } }, implementations: { pc: {} } }],
  });
  expect(engine.status).toBe('ready');
  expect(engine.registry.components.has('Input')).toBe(true);
});

test('dispose 幂等且置为 disposed，释放监听器', () => {
  const engine = createFormEngine();
  const events: string[] = [];
  const off = engine.events.on('engine:dispose', () => events.push('dispose'));
  engine.dispose();
  engine.dispose();
  off();
  expect(engine.status).toBe('disposed');
  expect(events).toEqual(['dispose']);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/core/src/engine.test.ts`
Expected: FAIL（`createFormEngine` 未定义）。

- [ ] **Step 3: 实现 `createFormEngine` + `FormEngine`**

内部类 `Engine` 持有 id/options/registry/events/services/status；`createFormEngine` 依次：建 registry/events → 注册 `options.components`（source 固定为 `'builtin'`）→ `installPlugin` 各 `options.plugins`（Task 4 后生效）→ `status='ready'` → `emit('engine:init')`。`dispose` 置 `disposed`、清空 listeners、`emit('engine:dispose')`。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run packages/core/src/engine.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/core
git commit -m "feat(core): FormEngine 创建/销毁与生命周期"
```

---

## Task 4: `@x-form-engine/core` 同步 Plugin 系统（M1-04）

**Files:**
- Create: `packages/core/src/plugin/dependency-resolver.ts`、`src/plugin/plugin-manager.ts`、`src/plugin/plugin.test.ts`
- Modify: `packages/core/src/engine.ts`（接 `installPlugin` 实现）

**Interfaces:**
- Consumes: `types` 的 `FormEngine`/`FormEnginePlugin`/`PluginContext`/`EngineRegistry`/`EventBus`/`EngineServices`（接口已在 Task 1 定义）、`createFormEngine`（Task 3）。
- Produces（Task 6/8 依赖）—— `FormEnginePlugin`/`PluginContext` 归属 types，core 提供:

```ts
// dependency-resolver.ts —— 拓扑排序 + 循环检测
export function resolvePluginOrder(plugins: FormEnginePlugin[]): FormEnginePlugin[];
// 依赖缺失抛 PLUGIN_DEPENDENCY_MISSING；循环依赖抛 PLUGIN_CONFLICT

// plugin-manager.ts
export interface PluginManager {
  install(plugin: FormEnginePlugin): void;
  disposeAll(): void;
  list(): Array<{ plugin: FormEnginePlugin; active: boolean }>;
}
export function createPluginManager(engine: FormEngine): PluginManager;
```

安装事务：记录本插件在 registry 里新增的 name（按 source 归属），`install` 抛错时回滚这些资源并 `emit('plugin:failed')`。

- [ ] **Step 1: 写失败测试**

`plugin.test.ts`：
```ts
test('插件按依赖拓扑排序安装（B 依赖 A 时 A 先装）', () => {
  const order: string[] = [];
  const engine = createFormEngine({
    plugins: [
      { name: 'b', version: '1.0.0', dependencies: ['a'], install: () => order.push('b') },
      { name: 'a', version: '1.0.0', install: () => order.push('a') },
    ],
  });
  expect(order).toEqual(['a', 'b']);
});

test('依赖缺失抛 PLUGIN_DEPENDENCY_MISSING', () => {
  expect(() => createFormEngine({
    plugins: [{ name: 'x', version: '1.0.0', dependencies: ['missing'], install: () => {} }],
  })).toThrowError(expect.objectContaining({ code: 'PLUGIN_DEPENDENCY_MISSING' }));
});

test('install 中途抛错回滚已注册资源，不留半安装态', () => {
  const engine = createFormEngine();
  expect(() => engine.installPlugin({
    name: 'boom', version: '1.0.0',
    install: ({ registry }) => {
      registry.components.register('Temp', { protocol: { name: 'Temp', version: '1', meta: { title: 'T' }, capabilities: { editable: true, readonly: false, mobile: false }, schema: { type: 'object' } }, implementations: {} }, 'boom');
      throw new Error('install fail');
    },
  })).toThrowError(/install fail/);
  expect(engine.registry.components.has('Temp')).toBe(false);
});

test('卸载不删除其它插件的资源', () => {
  const engine = createFormEngine({
    plugins: [
      { name: 'a', version: '1.0.0', install: ({ registry }) => registry.components.register('Input', /* binding */{} as any, 'a') },
    ],
  });
  // disposeAll 逆序，且不触碰 source 非 'a' 的资源
  engine.registry.components.register('Other', {} as any, 'b');
  engine.dispose();
  expect(engine.registry.components.has('Other')).toBe(true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/core/src/plugin/plugin.test.ts`
Expected: FAIL（`FormEnginePlugin`/`installPlugin` 未实现）。

- [ ] **Step 3: 实现 `resolvePluginOrder` + `PluginManager` + 接入 `engine.installPlugin`**

`resolvePluginOrder` 用 Kahn 拓扑排序（依赖边 = 依赖指向被依赖者）；先建 name→plugin 映射，缺名抛 `PLUGIN_DEPENDENCY_MISSING`，入度无法清空（含环）抛 `PLUGIN_CONFLICT`。`PluginManager.install` 先 `resolvePluginOrder([plugin])`，再建事务（记录 `registry.list()` 中 `source===plugin.name` 的增量），执行 `install`，失败回滚增量。`engine.installPlugin` 委托 manager；`engine.dispose` 按安装逆序 `disposeAll`。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run packages/core/src/plugin/plugin.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/core packages/types
git commit -m "feat(core): 同步 Plugin 系统（拓扑排序/回滚/资源归属）"
```

---

## Task 5: `@x-form-engine/core` Schema 解析与校验（M1-05/06）

**Files:**
- Create: `packages/core/src/schema/parser.ts`、`src/schema/validator.ts`、`src/schema/schema.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `types` 的 `FormSchemaDocument`、`ENGINE_SCHEMA_VERSION`、`FormEngineError`。
- Produces（Task 6/7 依赖）:

```ts
// parser.ts
export function parseSchemaDocument(input: unknown): FormSchemaDocument;
// 非对象 / schemaId 非 string / version 非 number / engineSchemaVersion 非 string
// / schema 非 object 时抛 SCHEMA_INVALID

// validator.ts
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
export const KNOWN_X_ENGINE_KEYS = [
  'platform', 'readonly', 'snapshot', 'permission', 'datasource', 'validation', 'i18n',
] as const;
export function validateEngineSchema(schema: unknown): SchemaValidationResult;
// 校验：schema 是对象；每个属性若含 x-engine 必须是对象；
// 未知 x-engine 子键进 warnings（不静默丢弃）；engineSchemaVersion 非受支持版本 → errors
```

- [ ] **Step 1: 写失败测试**

`schema.test.ts`：
```ts
test('parseSchemaDocument 接受合法文档', () => {
  const doc = parseSchemaDocument({ schemaId: 's1', version: 3, engineSchemaVersion: '1.0.0', schema: { type: 'object', properties: {} } });
  expect(doc.schemaId).toBe('s1');
});

test('parseSchemaDocument 缺 schemaId 抛 SCHEMA_INVALID', () => {
  expect(() => parseSchemaDocument({ version: 1, engineSchemaVersion: '1.0.0', schema: {} }))
    .toThrowError(expect.objectContaining({ code: 'SCHEMA_INVALID' }));
});

test('validateEngineSchema 对未知 x-engine 键告警、对 Formily 原生键不告警', () => {
  const r = validateEngineSchema({
    type: 'object',
    properties: {
      a: { type: 'string', 'x-component': 'Input', 'x-engine': { platform: { pc: {} }, bogus: true } },
    },
  });
  expect(r.valid).toBe(true);
  expect(r.warnings).toContain('unknown x-engine key: bogus');
  expect(r.warnings).not.toContain('unknown x-engine key: platform');
});

test('validateEngineSchema 对非对象 schema 报错', () => {
  expect(validateEngineSchema(null).valid).toBe(false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/core/src/schema/schema.test.ts`
Expected: FAIL（`parseSchemaDocument`/`validateEngineSchema` 未定义）。

- [ ] **Step 3: 实现 `parseSchemaDocument` / `validateEngineSchema`**

`parseSchemaDocument` 逐字段做 `typeof` 校验后抛 `FormEngineError('SCHEMA_INVALID', ...)`。`validateEngineSchema` 递归遍历顶层 `properties`，对每字段的 `x-engine` 若存在则校验为对象，`Object.keys` 不在 `KNOWN_X_ENGINE_KEYS` 的进 warnings；`x-engine.engineSchemaVersion`（若有）非 `ENGINE_SCHEMA_VERSION` 进 errors。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run packages/core/src/schema/schema.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/core
git commit -m "feat(core): Schema 基础解析与 x-engine 校验"
```

---

## Task 6: `@x-form-engine/formily` Adapter（M1-07）

**Files:**
- Create: `packages/formily/package.json`、`packages/formily/tsconfig.json`、`packages/formily/vitest.config.ts`（`environment: 'jsdom'`）
- Create: `packages/formily/src/component-map.ts`、`src/create-schema-field.ts`、`src/index.ts`
- Test: `packages/formily/src/adapter.test.tsx`

**Interfaces:**
- Consumes: `FormEngine`（Task 3）、`ComponentBinding`（Task 1）。
- Produces（Task 7 依赖）:

```ts
// component-map.ts —— Registry → Formily components/decorators
export interface FormilyComponentMap {
  components: Record<string, React.ComponentType<unknown>>;
  decorators: Record<string, React.ComponentType<unknown>>;
}
export function resolveFormilyComponentMap(
  engine: FormEngine,
  platform: 'pc' | 'mobile'
): FormilyComponentMap;
// 只取 implementations[platform]；缺失平台实现抛 COMPONENT_CAPABILITY_MISMATCH

// create-schema-field.ts —— 必须 JSX 渲染；scope 实例级覆盖工厂级
export function createEngineSchemaField(
  engine: FormEngine,
  platform: 'pc' | 'mobile',
  scope?: Record<string, unknown>
): React.ComponentType<{ schema: unknown; scope?: Record<string, unknown> }>;
```

实现要点：`createEngineSchemaField` 内部 `createSchemaField({ components, scope: toScope(engine) })`，返回 React 组件（JSX 用）；`toScope` 把引擎暴露能力合并为受控对象，保留 `engine`/`app`/`custom` 三命名空间。

- [ ] **Step 1: 写失败测试**

`adapter.test.tsx`（jsdom + Testing Library，引入 `render`/`screen`/`fireEvent` 与 jest-dom 匹配器）：
```tsx
import { render, screen } from '@testing-library/react';
import { useField } from '@formily/react';

// 最小自定义字段组件：通过 useField 读写值，证明字段上下文可用
function TextInput() {
  const field = useField();
  return (
    <input
      data-testid="field"
      value={String(field.value ?? '')}
      onChange={(e) => field.onInput?.(e.target.value)}
    />
  );
}
const inputBinding = {
  protocol: { name: 'Input', version: '1', meta: { title: 'I' }, capabilities: { editable: true, readonly: true, mobile: false }, schema: { type: 'object' } },
  implementations: { pc: TextInput },
};

test('resolveFormilyComponentMap 按平台取实现、缺实现抛错', () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const map = resolveFormilyComponentMap(engine, 'pc');
  expect(map.components.Input).toBeDefined();
  expect(() => resolveFormilyComponentMap(engine, 'mobile'))
    .toThrowError(expect.objectContaining({ code: 'COMPONENT_CAPABILITY_MISMATCH' }));
});

test('createEngineSchemaField 以 JSX 渲染，registry 组件在字段上下文内可用', async () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const SchemaField = createEngineSchemaField(engine, 'pc');
  render(
    <SchemaField schema={{ type: 'object', properties: { a: { type: 'string', 'x-component': 'Input', default: 'hello' } } }} />
  );
  expect((await screen.findByTestId('field')).value).toBe('hello');
});

test('含 x-engine 的 schema 可正常渲染且保留 Formily 原生键', async () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const SchemaField = createEngineSchemaField(engine, 'pc');
  render(
    <SchemaField
      schema={{
        type: 'object',
        properties: {
          a: { type: 'string', 'x-component': 'Input', 'x-engine': { platform: { pc: {} } } },
        },
      }}
    />
  );
  expect(await screen.findByTestId('field')).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/formily/src/adapter.test.tsx`
Expected: FAIL（`resolveFormilyComponentMap`/`createEngineSchemaField` 未定义）。

- [ ] **Step 3: 实现 `resolveFormilyComponentMap` / `createEngineSchemaField`**

`resolveFormilyComponentMap` 遍历 `engine.registry.components.list()`，取 `implementations[platform]`，无则抛 `COMPONENT_CAPABILITY_MISMATCH`。`createEngineSchemaField` 调 `createSchemaField({ components, scope })`，返回组件；`scope` 用 `lazyMerge` 语义（实例级覆盖工厂级同名 key，Formily 已内置该合并，直接透传实例级 `scope` prop 即可，工厂级放 options.scope）。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run packages/formily/src/adapter.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/formily
git commit -m "feat(formily): Formily Adapter（组件映射 + SchemaField + scope）"
```

---

## Task 7: `@x-form-engine/renderer` FormRenderer + Provider/Hooks（M1-08）

**Files:**
- Create: `packages/renderer/package.json`、`packages/renderer/tsconfig.json`、`packages/renderer/vitest.config.ts`（`environment: 'jsdom'`）
- Create: `packages/renderer/src/context.tsx`、`src/FormRenderer.tsx`、`src/types.ts`、`src/index.ts`
- Test: `packages/renderer/src/FormRenderer.test.tsx`

**Interfaces:**
- Consumes: `FormEngine`（Task 3）、`createEngineSchemaField`（Task 6）、`FormSubmitResult`（Task 1）。
- Produces（Task 8/10/11 依赖）:

```ts
// types.ts
export interface FormRendererProps {
  schema: Record<string, unknown>;
  mode?: 'edit' | 'preview';
  platform?: 'pc' | 'mobile';
  initialValues?: Record<string, unknown>;
  disabled?: boolean;
  readOnly?: boolean;
  scope?: Record<string, unknown>;
  onValuesChange?: (values: Record<string, unknown>) => void;
}
export interface FormRendererInstance {
  getValues(): Record<string, unknown>;
  setValues(values: Record<string, unknown>): void;
  validate(): Promise<void>;
  reset(): void;
  submit(): Promise<FormSubmitResult>;
  destroy(): void;
}

// context.tsx —— Provider 外调用抛错
export function FormEngineProvider(props: { engine: FormEngine; children?: React.ReactNode }): JSX.Element;
export function useFormEngine(): FormEngine;   // 无 Provider 时 throw

// FormRenderer.tsx —— forwardRef 暴露 FormRendererInstance
export const FormRenderer: React.ForwardRefExoticComponent<
  FormRendererProps & React.RefAttributes<FormRendererInstance>
>;
```

`submit()`：`form.validate()` → `form.values` → 组装 `FormSubmitResult`（`snapshot` 为空占位：`{ snapshotVersion:'1.0.0', schemaId:'', schemaVersion:0, createdAt:new Date().toISOString(), fields:{} }`）。`onValuesChange` 通过 `onFormValuesChange((form) => ...)` 读 `form.values`。

- [ ] **Step 1: 写失败测试**

`FormRenderer.test.tsx`（jsdom + Testing Library）：
```tsx
import { render, act, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { useField } from '@formily/react';

function TextInput() {
  const field = useField();
  return <input data-testid="field" value={String(field.value ?? '')} onChange={(e) => field.onInput?.(e.target.value)} />;
}
const inputBinding = {
  protocol: { name: 'Input', version: '1', meta: { title: 'I' }, capabilities: { editable: true, readonly: true, mobile: false }, schema: { type: 'object' } },
  implementations: { pc: TextInput },
};

test('useFormEngine 在 Provider 外抛错', () => {
  function C() { useFormEngine(); return null; }
  expect(() => render(<C />)).toThrow();
});

test('渲染 + 填值 + getValues/submit 闭环', async () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const ref = createRef<FormRendererInstance>();
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer ref={ref} schema={{ type: 'object', properties: { name: { type: 'string', 'x-component': 'Input', 'x-validator': [{ required: true }] } } }} />
    </FormEngineProvider>
  );
  act(() => ref.current!.setValues({ name: '张三' }));
  expect(ref.current!.getValues().name).toBe('张三');
  await act(() => ref.current!.submit());  // 已填值，required 校验通过，返回 FormSubmitResult
});

test('onValuesChange 回读 form.values 且与 getValues 一致', async () => {
  const engine = createFormEngine({ components: [inputBinding] });
  const seen: Record<string, unknown>[] = [];
  const ref = createRef<FormRendererInstance>();
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer
        ref={ref}
        schema={{ type: 'object', properties: { name: { type: 'string', 'x-component': 'Input' } } }}
        onValuesChange={(values) => seen.push(values)}
      />
    </FormEngineProvider>
  );
  fireEvent.change(screen.getByTestId('field'), { target: { value: 'x' } });
  expect(seen.at(-1)).toEqual(ref.current!.getValues());
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/renderer/src/FormRenderer.test.tsx`
Expected: FAIL（`FormRenderer`/`useFormEngine` 未定义）。

- [ ] **Step 3: 实现 context + FormRenderer**

`context.tsx` 用 `createContext<FormEngine | null>(null)`；`useFormEngine` 读不到则 throw。`FormRenderer` 用 `forwardRef` + `useImperativeHandle`：内部 `useMemo(() => createForm({ values: initialValues }), [])`，`SchemaField = useMemo(() => createEngineSchemaField(engine, platform), [engine, platform])`，JSX 渲染 `<FormProvider form={form}><SchemaField schema={schema} /></FormProvider>`；用 `useFormEffects`/`onFormValuesChange` 接 `onValuesChange`；实例方法操作 `form`。`disabled`/`readOnly` 通过 Form 级 `setState` 或 `FormProvider` 透传（M1 最小实现：`form.setPattern`）。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run packages/renderer/src/FormRenderer.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/renderer
git commit -m "feat(renderer): FormRenderer 实例 API 与 Engine Provider/Hooks"
```

---

## Task 8: `@x-form-engine/sdk` 最小公共 API（M1-08 收口）

**Files:**
- Create: `packages/sdk/package.json`、`packages/sdk/tsconfig.json`
- Create: `packages/sdk/src/index.ts`
- Test: `packages/sdk/src/sdk.test.tsx`（jsdom，仅验证 re-export 可用）

**Interfaces:**
- Consumes: `createFormEngine`（core，Task 3）、`FormRenderer`/`FormEngineProvider`/`useFormEngine`（renderer，Task 7）、`types` 全部公共类型。
- Produces（Task 10/11 依赖）: `sdk` 导出 `createFormEngine`、`FormEngineProvider`、`FormRenderer`、`useFormEngine`、以及 `types` 的全部类型 re-export。

- [ ] **Step 1: 写失败测试**

`sdk.test.tsx`：
```tsx
import { createFormEngine, FormEngineProvider, FormRenderer, useFormEngine } from './index';

test('sdk 暴露创建、Provider、Renderer、Hook', () => {
  expect(typeof createFormEngine).toBe('function');
  expect(FormEngineProvider).toBeDefined();
  expect(FormRenderer).toBeDefined();
  expect(useFormEngine).toBeDefined();
  const engine = createFormEngine({ platform: 'pc' });
  expect(engine.status).toBe('ready');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/sdk/src/sdk.test.tsx`
Expected: FAIL（`./index` 未导出）。

- [ ] **Step 3: 实现 `sdk/src/index.ts`**

re-export `@x-form-engine/core` 的 `createFormEngine`、`FormEngine`、`EngineStatus`、`FormEnginePlugin` 等；re-export `@x-form-engine/renderer` 的 `FormRenderer`/`FormEngineProvider`/`useFormEngine`/`FormRendererInstance`；re-export `@x-form-engine/types` 全部。`package.json` 的 `exports` 指向 `src/index.ts`。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run packages/sdk/src/sdk.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/sdk
git commit -m "feat(sdk): 最小公共 API（createFormEngine/Provider/Renderer/Hooks）"
```

---

## Task 9: `@x-form-engine/components` 基础组件（M1-09）

**Files:**
- Create: `packages/components/package.json`、`packages/components/tsconfig.json`、`packages/components/vitest.config.ts`（jsdom）
- Create: `packages/components/src/types.ts`（定义 `ReactComponentBinding = ComponentBinding<React.ComponentType<unknown>>`）
- Create: `packages/components/src/definitions/basic.ts`、`src/replacements.md`（antd5 替换清单）
- Create: `packages/components/src/index.ts`
- Test: `packages/components/src/basic.test.tsx`

**Interfaces:**
- Consumes: `types` 的 `ComponentBinding`、`ComponentProtocolDefinition`；`@formily/antd` 已连接组件。
- Produces（Task 10/11 依赖）:

```ts
export type ReactComponentBinding = ComponentBinding<React.ComponentType<unknown>>;
export const basicComponents: ReactComponentBinding[];  // Input/Textarea/Number/Select/Radio/Checkbox/DatePicker
```

组件 → `@formily/antd` 映射：`Input→Input`、`Textarea→Input.TextArea`、`Number→NumberPicker`、`Select→Select`、`Radio→Radio.Group`、`Checkbox→Checkbox.Group`、`DatePicker→DatePicker`。每个 protocol `version:'1.0.0'`、`capabilities.editable=true`、`schema.properties` 含对应 props 默认值。M1 基础组件不配 Adapter（值即原生 primitive）。`replacements.md` 登记 7 个「借自 @formily/antd」的组件供 antd5 升级替换。

- [ ] **Step 1: 写失败测试**

`basic.test.tsx`（jsdom）：
```tsx
test('basicComponents 含 7 个 P0 组件且可注册', () => {
  expect(basicComponents.map(b => b.protocol.name)).toEqual(
    ['Input', 'Textarea', 'Number', 'Select', 'Radio', 'Checkbox', 'DatePicker']
  );
  const engine = createFormEngine({ components: basicComponents });
  for (const name of ['Input', 'Textarea', 'Number', 'Select', 'Radio', 'Checkbox', 'DatePicker']) {
    expect(engine.registry.components.has(name)).toBe(true);
  }
});

test('Input 在字段上下文内 useField 可用且值可回写', async () => {
  const engine = createFormEngine({ components: basicComponents });
  const ref = createRef<FormRendererInstance>();
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer ref={ref} schema={{ type: 'object', properties: { name: { type: 'string', 'x-component': 'Input' } } }} />
    </FormEngineProvider>
  );
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'hello' } });
  expect(ref.current!.getValues().name).toBe('hello');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/components/src/basic.test.tsx`
Expected: FAIL（`basicComponents` 未定义）。

- [ ] **Step 3: 实现 `definitions/basic.ts` 与 `types.ts`**

逐个组件构造 `ReactComponentBinding`，`implementations.pc` 指向 `@formily/antd` 对应组件（`Input.TextArea` 用 `TextArea` 名）；`Radio`/`Checkbox` 的 `x-component-props` 默认 `options` 空数组并在测试中注入静态 options。`index.ts` 导出 `basicComponents` 与 `ReactComponentBinding`。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run packages/components/src/basic.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/components
git commit -m "feat(components): P0 基础组件（借 @formily/antd，登记替换清单）"
```

---

## Task 10: 集成验证 — 校验 / 联动 / Scope（M1-10）

**Files:**
- Create: `packages/renderer/src/integration.test.tsx`（或 `apps/playground` 内的集成测试；本计划放 `packages/renderer/src/__tests__/m1-integration.test.tsx`）
- Test: `packages/renderer/src/__tests__/m1-integration.test.tsx`

**Interfaces:**
- Consumes: `sdk`（Task 8）的 `createFormEngine`/`FormEngineProvider`/`FormRenderer`，`basicComponents`（Task 9）。

- [ ] **Step 1: 写失败测试**

`m1-integration.test.tsx`（对应 roadmap M1 验收 + 出差天数联动）：
```tsx
test('M1 闭环：渲染 → 联动计算 → 校验 → 获取标准化 Value → 销毁', async () => {
  const engine = createFormEngine({ platform: 'pc', components: basicComponents, locale: 'zh-CN' });
  const ref = createRef<FormRendererInstance>();
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer
        ref={ref}
        schema={{
          type: 'object',
          properties: {
            出发日期: { type: 'string', 'x-component': 'DatePicker', 'x-validator': [{ required: true }] },
            返回日期: { type: 'string', 'x-component': 'DatePicker' },
            出差天数: {
              type: 'number', 'x-component': 'Number',
              'x-reactions': {
                dependencies: ['出发日期', '返回日期'],
                fulfill: { state: { value: '{{ $deps[1] && $deps[0] ? (new Date($deps[1]) - new Date($deps[0])) / 86400000 : 0 }}' },
              },
            },
          },
        }}
      />
    </FormEngineProvider>
  );
  await act(() => ref.current!.validate().catch(() => {})); // 必填未填 → 校验失败
  await act(() => ref.current!.submit());                    // 应抛校验错误
  act(() => ref.current!.setValues({ 出发日期: '2026-11-01', 返回日期: '2026-11-05' }));
  expect(ref.current!.getValues()).toMatchObject({ 出发日期: '2026-11-01', 返回日期: '2026-11-05' });
  engine.dispose();
  expect(engine.status).toBe('disposed');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/renderer/src/__tests__/m1-integration.test.tsx`
Expected: FAIL（未通过或缺少 DatePicker 联动）。

- [ ] **Step 3: 打通闭环（按失败信息修复）**

本任务不改新模块，只修复集成暴露的缺口（如 DatePicker 值格式、`x-reactions` 表达式、`validate` 抛错语义），使「填写 → 联动 → 校验 → getValues → dispose」全链通过。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run packages/renderer/src/__tests__/m1-integration.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/renderer
git commit -m "test(renderer): M1 闭环集成测试（联动/校验/Value/销毁）"
```

---

## Task 11: `apps/playground` 基础演示应用（M1-11）

**Files:**
- Create: `apps/playground/package.json`、`apps/playground/tsconfig.json`、`apps/playground/vite.config.ts`
- Create: `apps/playground/index.html`、`apps/playground/src/main.tsx`、`src/App.tsx`

**Interfaces:**
- Consumes: `@x-form-engine/sdk`（Task 8）、`@x-form-engine/components` 的 `basicComponents`（Task 9）。

- [ ] **Step 1: 写验收清单（无自动化单测，人工/脚本验证）**

`App.tsx` 用 `createFormEngine({ components: basicComponents })` + `<FormEngineProvider>` + `<FormRenderer ref={ref}>`，渲染一段含 Input/Select/DatePicker 的 schema，页面提供「提交」按钮调 `ref.submit()` 并 `console.log(result.values)`。

- [ ] **Step 2: 启动确认可运行**

Run: `pnpm --filter playground dev`
Expected: 浏览器打开可渲染、可填写、提交打印 Value、无控制台报错。

- [ ] **Step 3: 提交**

```bash
git add apps/playground
git commit -m "feat(playground): 基础演示应用（渲染+填写+提交）"
```

---

## 完成定义（DoD，逐任务适用）

任一任务只有同时满足才算完成：符合公共接口契约；有对应测试且通过；关键异常路径已验证；不破坏已有闭环；不违反「全局约束」的依赖方向与类型治理；未实现能力（readonly/mobile/designer/真实 Snapshot/异步插件）在代码注释或 `replacements.md` 中显式标注为 M2/M3。

## 待后续确认（不阻塞 M1）

- npm 包 scope 名暂定 `@x-form-engine`，如与实际发布 scope 不一致需在建包前统一替换。
- `FormSchemaDocument.engineSchemaVersion` 的受支持版本清单 M1 仅 `'1.0.0'`，多版本轴与迁移在 M2（FUT-04）。
- `EngineServices` 的 `permission`/`i18n`/`snapshot` 服务接口 M2/M3 追加（追加可选字段为兼容扩展）。
