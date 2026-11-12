# Generic Plugin Core 抽取与 Runtime Plugin Host 迁移 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从现有 `createPluginManager` 抽取与 `FormEngine`/5 类 `RegistryKind` 解耦的 Generic Plugin Core（含 `uninstall` 依赖保护），并把 Runtime 插件机制迁移到其上，同时保持现有 Runtime 插件行为不退化。

**Architecture:** 泛型依赖解析器（`resolvePluginOrder<P extends PluginDefinition>`）+ 泛型编排核心（`createGenericPluginHost<P, C>`，以「资源注册表集合 + 生命周期上下文 + 事件回调」注入替代硬编码 `FormEngine`/`RegistryKind`）。`createPluginManager` 变为薄适配器，把 5 类 Runtime Registry、`PluginContext`、`plugin:*` 事件转发注入泛型核心。抽取 = 移动逻辑，不复制；`FormEnginePlugin`/`DesignerPlugin` 在结构上都满足 `PluginDefinition`（Phase 1 已用 `toMatchTypeOf` 验证），故泛型化向后兼容。

**Tech Stack:** TypeScript（strict）、Vitest 3、pnpm monorepo。本 Phase 无 React/Formily/Designable 依赖（`@x-form-engine/core` 已是 UI 无关包）。

**Spec:** `docs/architecture/02-form-engine-v2-task.md`（Phase 2 §5 / Phase 3 §6）+ `docs/tech-design/architecture-refactor-audit.md`（§6 泛型边界、§10 实施顺序）。

## 范围说明

本计划覆盖 **Phase 2（Generic Plugin Core）+ Phase 3（Runtime Plugin Host 迁移回归）** —— 二者不可分割：抽取若不同时把 `createPluginManager` 改指到泛型核心，就会产生「复制代码」（禁止）或「中间态破坏 Runtime」（禁止）。Phase 0/1 已完成（`git log`：`4412457` 审计、`83aacdd` Phase 1 类型）。Phase 4–9（Designer Core / Adapter / 物料 / 一致性 / 扩展 / 切换）是后续独立计划，不在本计划内。

## Global Constraints

- 版本锁定：React 17.x、React DOM 17.x、Formily 2.x（仓库锁定）、Designable beta、antd 4.x、antd-mobile 5.x —— **不擅自升级**。
- Generic Plugin Core 不得 import：`FormEngine`、`DesignerContext`、Runtime Registry、Designer Registry、Formily、Designable、antd（Task 2.1 / 2.3）。
- 不允许为拆包而复制代码 —— 抽取 = 移动逻辑（Task 1 删除旧 `dependency-resolver.ts`；Task 3 把 `createPluginManager` 重写为委托）。
- 不允许通过 `any` 绕过核心协议类型设计。
- `createPluginManager` 公开行为 `install` / `disposeAll` / `list` 保持不变（Task 3.1）；本 Phase **不**把 `uninstall` 暴露到 `FormEngine` 公开 API（Phase 4 的 `DesignerPluginHost` 才公开）。
- 每个 Task 结束跑测试 + `tsc --noEmit`；全部结束跑 `pnpm -r typecheck` + `pnpm test:run` + `@x-form-engine/core` 构建。
- `restoreSnapshot` 仅类型声明，不得标为已实现（C6）—— 本 Phase 不涉及 Snapshot。

## Review Focus

1. **`install` 返回清理函数且同时定义 `dispose`** —— 两者都应被调用，顺序为 `dispose` 先、teardown 后，任一抛错不阻断另一个。→ Task 2 测试 `dispose 与 install 返回的 teardown 都调用且异常隔离`。
2. **`install` 返回 `void`（FormEngine 风格）** —— 主机不得把 `undefined` 当 teardown 调用，只应调用 `dispose`。→ Task 2 测试 `install 返回 void 时仅调用 dispose`。
3. **`disposeAll` 不执行依赖保护（与 `uninstall` 相反）** —— 逆序全量卸载时，被依赖的插件应正常卸载。→ Task 2 测试 `disposeAll 逆序卸载依赖项不抛依赖保护`。
4. **卸载前资源已被其它来源重新注册** —— 归属校验按 `name + source` 匹配，来源变了则跳过，不得误删他人资源。→ Task 2 测试 `资源来源变化后 uninstall 不删除它`。
5. **`createContext()` 本身抛错** —— 不得留下半安装态：插件不进入 `list()`、无资源泄漏、错误向上抛。→ Task 2 测试 `createContext 抛错时 install 干净失败`。

---

### Task 1: 抽取并泛型化依赖解析器 `resolvePluginOrder`

**Files:**
- Create: `packages/core/src/plugin/generic/dependency-resolver.ts`
- Create: `packages/core/src/plugin/generic/dependency-resolver.test.ts`
- Modify: `packages/core/src/engine.ts`（`import { resolvePluginOrder } from './plugin/dependency-resolver'` → `'./plugin/generic/dependency-resolver'`）
- Modify: `packages/core/src/plugin/plugin-manager.ts`（`import { resolvePluginOrder } from './dependency-resolver'` → `'./generic/dependency-resolver'`）
- Modify: `packages/core/src/index.ts`（公共 re-export 的 `./plugin/dependency-resolver` 路径 repoint —— 删除旧文件后必须改，否则公共入口解析失败）
- Modify: `packages/core/src/plugin/plugin.test.ts`（`import { resolvePluginOrder } from './dependency-resolver'` → `'./generic/dependency-resolver'` —— 仅 import 路径，测试行为不变）
- Delete: `packages/core/src/plugin/dependency-resolver.ts`（逻辑整体移入 generic 目录，不保留副本）

**Interfaces:**
- Consumes: `PluginDefinition`（`@x-form-engine/types`，`{ name; version; dependencies? }`）、`FormEngineError`（`@x-form-engine/types`）。
- Produces（后续 Task 2/3 依赖）:
  ```ts
  // packages/core/src/plugin/generic/dependency-resolver.ts
  export function resolvePluginOrder<P extends PluginDefinition>(plugins: P[]): P[];
  // 稳定拓扑排序（Kahn）；抛错：
  //  - FormEngineError('PLUGIN_CONFLICT', …, { plugin })  — 同名插件
  //  - FormEngineError('PLUGIN_CONFLICT', …, { plugins }) — 循环依赖
  //  - FormEngineError('PLUGIN_DEPENDENCY_MISSING', …, { plugin, dependency }) — 依赖缺失
  ```
  行为与旧 `resolvePluginOrder(FormEnginePlugin[])` 完全一致，仅放宽参数为 `P extends PluginDefinition`。旧调用方（`engine.ts` 传入 `FormEnginePlugin[]`）无需改动即可通过类型检查。

- [ ] **Step 1: 写失败测试** `packages/core/src/plugin/generic/dependency-resolver.test.ts`

```ts
import { resolvePluginOrder } from './dependency-resolver';
import type { PluginDefinition } from '@x-form-engine/types';

// 纯 PluginDefinition 对象（无 install），证明泛型化
test('resolvePluginOrder 接受纯 PluginDefinition 并按依赖拓扑排序', () => {
  const ordered = resolvePluginOrder<PluginDefinition>([
    { name: 'b', version: '1.0.0', dependencies: ['a'] },
    { name: 'a', version: '1.0.0' },
  ]);
  expect(ordered.map((p) => p.name)).toEqual(['a', 'b']);
});

test('依赖缺失抛 PLUGIN_DEPENDENCY_MISSING', () => {
  expect(() =>
    resolvePluginOrder([{ name: 'x', version: '1.0.0', dependencies: ['missing'] }])
  ).toThrowError(expect.objectContaining({ code: 'PLUGIN_DEPENDENCY_MISSING' }));
});

test('循环依赖抛 PLUGIN_CONFLICT', () => {
  expect(() =>
    resolvePluginOrder([
      { name: 'a', version: '1.0.0', dependencies: ['b'] },
      { name: 'b', version: '1.0.0', dependencies: ['a'] },
    ])
  ).toThrowError(expect.objectContaining({ code: 'PLUGIN_CONFLICT' }));
});

test('同名插件抛 PLUGIN_CONFLICT 而非误报循环依赖', () => {
  expect(() =>
    resolvePluginOrder([
      { name: 'dup', version: '1.0.0' },
      { name: 'dup', version: '2.0.0' },
    ])
  ).toThrowError(expect.objectContaining({ code: 'PLUGIN_CONFLICT' }));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @x-form-engine/core exec vitest run src/plugin/generic/dependency-resolver.test.ts`
Expected: FAIL —— `./dependency-resolver` 不存在（模块解析失败）。

- [ ] **Step 3: 实现 `resolvePluginOrder<P extends PluginDefinition>(plugins: P[]): P[]`**

把现有 `packages/core/src/plugin/dependency-resolver.ts` 的 Kahn 算法原样搬入新文件，仅把参数/返回值/`byName`/`ordered` 的 `FormEnginePlugin` 类型替换为泛型 `P`，其余逻辑与错误码不变。

- [ ] **Step 4: 更新 `engine.ts` 与 `plugin-manager.ts` 的 import 路径，删除旧文件**

`engine.ts` 与 `plugin-manager.ts` 的 `resolvePluginOrder` import 改为指向 `./plugin/generic/dependency-resolver`（`plugin-manager.ts` 用 `./generic/dependency-resolver`）；`git rm packages/core/src/plugin/dependency-resolver.ts`。

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm --filter @x-form-engine/core exec vitest run src/plugin/generic/dependency-resolver.test.ts src/plugin/plugin.test.ts`
Expected: PASS —— 新泛型测试全绿；`plugin.test.ts` 中依赖排序/循环/重复用例仍绿（`FormEnginePlugin[]` 仍满足 `PluginDefinition[]`）。

- [ ] **Step 6: 类型检查**

Run: `pnpm --filter @x-form-engine/core typecheck`
Expected: `tsc --noEmit` 无输出。

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/plugin/generic/dependency-resolver.ts packages/core/src/plugin/generic/dependency-resolver.test.ts packages/core/src/engine.ts packages/core/src/plugin/plugin-manager.ts
git rm packages/core/src/plugin/dependency-resolver.ts
git commit -m "refactor(core): 抽取并泛型化 resolvePluginOrder 到 generic 目录"
```

---

### Task 2: 实现 Generic Plugin Host（install / uninstall / disposeAll）

**Files:**
- Create: `packages/core/src/plugin/generic/plugin-host.ts`
- Create: `packages/core/src/plugin/generic/plugin-host.test.ts`
- Modify: `packages/types/src/errors.ts`（`FormEngineErrorCode` 联合新增 `'PLUGIN_DEPENDENCY_ACTIVE'`）

**Interfaces:**
- Consumes: Task 1 的 `resolvePluginOrder`；`PluginDefinition`、`PluginLifecycleEvent`、`FormEngineError`（均来自 `@x-form-engine/types`）。
- Produces（Task 3 依赖）:
  ```ts
  // packages/core/src/plugin/generic/plugin-host.ts
  export interface PluginResourceRegistry {
    list(): Array<{ name: string; source?: string }>;
    unregister(name: string, source?: string): void;
  }
  export interface InstallablePlugin<C> {
    name: string;
    version: string;
    dependencies?: string[];
    install(context: C): void | (() => void);   // 返回可选清理函数
    dispose?(context: C): void;                  // 可选显式 dispose
  }
  export interface GenericPluginHostOptions<P extends InstallablePlugin<C>, C> {
    createContext(): C;
    resources: PluginResourceRegistry[];
    /** 生命周期事件回调；复用 `@x-form-engine/types` 的 `PluginLifecycleEvent`（`{ plugin; status; error? }`），不在 core 重声明。 */
    onEvent?(event: PluginLifecycleEvent): void;
  }
  export interface GenericPluginHost<P extends InstallablePlugin<C>, C> {
    install(plugin: P): void;
    uninstall(name: string): void;
    disposeAll(): void;
    list(): Array<{ plugin: P; active: boolean }>;
    isInstalled(name: string): boolean;
  }
  export function createGenericPluginHost<P extends InstallablePlugin<C>, C>(
    options: GenericPluginHostOptions<P, C>
  ): GenericPluginHost<P, C>;
  ```

  关键语义（实现者据此写函数体，这些是抽取自现有 `plugin-manager.ts` 的行为 + 新增 `uninstall`）：
  - **不变式**：`options.resources` 是快照/回滚/归属追踪的对象集；`options.createContext()` 必须把同一批注册表暴露给插件，否则归属追踪会漏记（宿主职责，通用核心不校验）。
  - `install`：同名已安装抛 `PLUGIN_CONFLICT`；以「已 active 插件 + 新插件」调 `resolvePluginOrder` 校验依赖（缺依赖 `PLUGIN_DEPENDENCY_MISSING`、环/重名 `PLUGIN_CONFLICT`）；安装前对全部 `resources` 快照 → 调 `plugin.install(context)` 并记录返回值（若为函数记为 teardown）→ 失败时仅回滚本次新增资源（增量归属）并 `onEvent({ plugin, status: 'failed', error })`、向上抛；成功记录归属、标记 active、`onEvent({ plugin, status: 'active' })`。
  - `uninstall(name)`：未安装/已 inactive → 幂等 no-op；若存在其它 active 插件在其 `dependencies` 中引用 `name` → 抛 `FormEngineError('PLUGIN_DEPENDENCY_ACTIVE', …, { plugin: name, dependents })`；否则标记 inactive → 调 `dispose?(context)` 再调 teardown（各自 try/catch 隔离，异常 `onEvent({ plugin, status: 'failed', error })`）→ `finally` 逆序释放归属资源并 `onEvent({ plugin, status: 'disposed' })`。
  - `disposeAll()`：逆序、幂等、单插件异常隔离、`finally` 保证资源释放；**不**执行依赖保护。每个插件先置 inactive，再 dispose/teardown，`finally` 释放资源；dispose 抛错时 `onEvent` `failed`、`finally` 再 `onEvent` `disposed`（与现有 Runtime `plugin:failed` + `plugin:dispose` 双发行为一致）。

- [ ] **Step 1: 新增错误码 `PLUGIN_DEPENDENCY_ACTIVE`**

在 `packages/types/src/errors.ts` 的 `FormEngineErrorCode` 联合中，`'PLUGIN_DEPENDENCY_MISSING'` 之后加 `| 'PLUGIN_DEPENDENCY_ACTIVE'`。跑 `pnpm --filter @x-form-engine/types typecheck` 确认无输出。

- [ ] **Step 2: 写失败测试** `packages/core/src/plugin/generic/plugin-host.test.ts`

测试辅助（写在测试文件顶部，自包含、不 import Runtime 业务模块）：

```ts
import { createGenericPluginHost } from './plugin-host';
import type { InstallablePlugin, PluginResourceRegistry } from './plugin-host';

class TestResourceRegistry implements PluginResourceRegistry {
  private map = new Map<string, { name: string; source?: string }>();
  register(name: string, source?: string) { this.map.set(name, { name, source }); }
  list() { return [...this.map.values()]; }
  unregister(name: string, source?: string) {
    const e = this.map.get(name);
    if (e && e.source === source) this.map.delete(name);
  }
}
interface TestContext { registry: TestResourceRegistry }
function makeHost() {
  const resources = [new TestResourceRegistry()];
  const host = createGenericPluginHost<InstallablePlugin<TestContext>, TestContext>({
    createContext: () => ({ registry: resources[0] }),
    resources,
  });
  return { host, resources };
}
```

14 个用例（覆盖任务书 Task 2.2 的 13 项 + 依赖保护）：

1. `install 后 list/isInstalled 反映 active` —— `host.install(p)`；`host.list()` 为 `[{plugin: p, active: true}]`、`host.isInstalled('p') === true`。
2. `install 调用 plugin.install 并传入 createContext 的上下文` —— 捕获入参对象，`expect(ctx).toBe(makeHost 返回的同一 resources[0] 包装)`（即 `install(context)` 收到的 `context.registry === resources[0]`）。
3. `重复 install 同名插件抛 PLUGIN_CONFLICT` —— 第二次 `install` 抛 `code === 'PLUGIN_CONFLICT'`。
4. `依赖缺失抛 PLUGIN_DEPENDENCY_MISSING` —— `install({ name:'a', dependencies:['missing'], install(){}}) ` 抛对应 code。
5. `依赖拓扑：先装被依赖项 B 再装 A 成功；先装 A（依赖未装 B）抛依赖缺失` —— 两个断言。
6. `install 中途抛错回滚已注册资源` —— `install` 内 `context.registry.register('X', 'boom')` 后 `throw`；断言 `resources[0].list()` 不含 `X`，且错误向上抛。
7. `插件资源归属：unload 只释放自身资源` —— A 注册 `X`（source 'a'）、B 注册 `Y`（source 'b'）；`uninstall('A')`；`X` 删除、`Y` 保留。
8. `install 返回的 teardown 在 unload 时调用` —— install 返回 `() => teardownCalled = true`；`uninstall('A')`；`teardownCalled === true`。
9. `dispose 与 install 返回的 teardown 都调用且异常隔离`（Review Focus 1）—— 插件同时定义 `dispose` 与返回 teardown；断言 dispose 先于 teardown、两者都被调；再测 dispose 抛错时 teardown 仍被调、`disposeAll` 不抛。
10. `install 返回 void 时仅调用 dispose`（Review Focus 2）—— `install` 无返回、有 `dispose`；卸载后仅 `dispose` 被调。
11. `disposeAll 逆序调用 dispose/teardown` —— A、B 顺序 install；`disposeAll`；记录顺序 `['B','A']`。
12. `disposeAll 幂等` —— 两次 `disposeAll`；teardown 仅调用一次。
13. `单插件 teardown 抛错不影响其它插件卸载` —— 坏插件 teardown throw、好插件 teardown 记录；`disposeAll` 不抛、好插件已卸载、`failed` 事件含坏插件名。
14. `createContext 抛错时 install 干净失败`（Review Focus 5）—— `createContext: () => { throw new Error('ctx fail') }`；`install` 抛该错、`list()` 为空、无资源泄漏。

再加 3 个 `uninstall` 专测（Task 2.2 第 10/11 + Review Focus 3/4）：

15. `uninstall 未安装/已卸载插件为幂等 no-op` —— `uninstall('nope')` 不抛；对已 uninstall 的插件再 `uninstall` 不抛、不重复释放（teardown 仅一次）。
16. `依赖保护：卸载被 active 插件依赖的插件抛 PLUGIN_DEPENDENCY_ACTIVE` —— B（无依赖）、A（deps ['B']）先后 install；`uninstall('B')` 抛 `code === 'PLUGIN_DEPENDENCY_ACTIVE'` 且 `details.dependents` 含 'A'；A、B 仍 active。
17. `disposeAll 逆序卸载依赖项不抛依赖保护`（Review Focus 3）—— B、A（deps ['B']）install；`disposeAll()` 不抛，两者都 inactive。
18. `资源来源变化后 uninstall 不删除它`（Review Focus 4）—— A install 注册 `X`（source 'a'）；随后直接改 `resources[0]` 使 `X` 的 source 变为 'b'（测试用 `register` 前先清空或用同 name 覆盖）；`uninstall('A')` 后 `X` 仍在（source 不匹配被跳过）。

> 注：用例 6/9/13/18 的细节在实现前用 `TestResourceRegistry` 即可表达；18 通过 `resources[0].unregister('X','a')` 后再 `register('X','b')` 模拟来源变化。

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter @x-form-engine/core exec vitest run src/plugin/generic/plugin-host.test.ts`
Expected: FAIL —— `./plugin-host` 不存在。

- [ ] **Step 4: 实现 `createGenericPluginHost<P, C>` 于 `packages/core/src/plugin/generic/plugin-host.ts`**

按 Interfaces 块语义实现。内部结构（可直接从现有 `plugin-manager.ts` 平移改泛型）：`ManagedPlugin { plugin, context, active, owned, teardown? }`；`owned: Array<{ resourceIndex: number; name: string; source?: string }>`；快照 `Map<string, string | undefined>[]`（每 resource 一个）；`collectNew` 对每个 resource 做 `before`/`after` 差集；`releaseOwned` 逆序、按 `current.source === owned.source` 才 `unregister`。`uninstall` 的依赖保护：扫描 `managed` 中 active 且 `dependencies?.includes(name)` 的插件。

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm --filter @x-form-engine/core exec vitest run src/plugin/generic/plugin-host.test.ts`
Expected: PASS —— 18 用例全绿。

- [ ] **Step 6: 类型检查**

Run: `pnpm --filter @x-form-engine/core typecheck && pnpm --filter @x-form-engine/types typecheck`
Expected: 均无输出。

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/plugin/generic/plugin-host.ts packages/core/src/plugin/generic/plugin-host.test.ts packages/types/src/errors.ts
git commit -m "feat(core): Generic Plugin Host（install/rollback/ownership/uninstall 依赖保护/disposeAll）"
```

---

### Task 3: 迁移 `createPluginManager` 到 Generic Plugin Host（Phase 3）

**Files:**
- Modify: `packages/core/src/plugin/plugin-manager.ts`（重写为委托适配器，删除内部编排逻辑）

**Interfaces:**
- Consumes: Task 1 `resolvePluginOrder`、Task 2 `createGenericPluginHost` + 类型；`FormEngine`、`PluginContext`、`Registry`（`@x-form-engine/types`）。
- Produces（对外不变）:
  ```ts
  export interface PluginManager {
    install(plugin: FormEnginePlugin): void;
    disposeAll(): void;
    list(): Array<{ plugin: FormEnginePlugin; active: boolean }>;
  }
  export function createPluginManager(engine: FormEngine): PluginManager;
  ```
  内部委托 `createGenericPluginHost<FormEnginePlugin, PluginContext>`：
  - `createContext: () => ({ registry: engine.registry, services: engine.services, events: engine.events, config: engine.options })`
  - `resources: [engine.registry.components, engine.registry.decorators, engine.registry.services, engine.registry.formatters, engine.registry.designer]`（`Registry<T>` 结构满足 `PluginResourceRegistry`）
  - `onEvent`：按 `PluginLifecycleEvent.status` 转发 —— `status === 'active'` → `engine.events.emit('plugin:install', { plugin })`；`status === 'disposed'` → `emit('plugin:dispose', { plugin })`；`status === 'failed'` → `emit('plugin:failed', { plugin, error: event.error })`。
  - 保留 `install`/`disposeAll`/`list` 三个公开方法签名不变；删除本文件内 `RegistryKind`/快照/归属/回滚等已抽走的逻辑。
  - **实现要点（修正）**：宿主必须**惰性创建**（首次 `install`/`disposeAll`/`list` 时才 `createGenericPluginHost`），因为 `Engine` 以字段初始化器 `private readonly pluginManager = createPluginManager(this)` 创建 manager，早于构造函数内 `this.registry`/`this.events` 赋值；急切构造会读到未初始化的 `engine.registry`。

- [ ] **Step 1: 重写 `plugin-manager.ts` 为委托适配器**

按 Interfaces 块实现。这是纯重构，测试即为现有 `plugin.test.ts`（13 用例，覆盖重复/依赖/回滚/归属/逆序/disposeAll/`plugin:failed` 事件），无需新增测试。

- [ ] **Step 2: 运行 Runtime 插件回归**

Run: `pnpm --filter @x-form-engine/core exec vitest run src/plugin/plugin.test.ts`
Expected: PASS —— 13 用例全绿（`plugin.test.ts` 是 Runtime 行为的事实基线，绿 = 行为不退化）。

- [ ] **Step 3: 全量 core 测试**

Run: `pnpm --filter @x-form-engine/core exec vitest run`
Expected: PASS —— `core` 包全部测试（engine/registry/schema/events/migration/identity/plugin）全绿。

- [ ] **Step 4: 类型检查与构建**

Run: `pnpm --filter @x-form-engine/core typecheck && pnpm --filter @x-form-engine/core build`
Expected: `tsc` 无输出；`tsup` 产出 `dist/`（esm+cjs+dts）成功。

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/plugin/plugin-manager.ts
git commit -m "refactor(core): createPluginManager 迁移到 Generic Plugin Host（行为不变）"
```

---

### Task 4: 依赖边界守卫与全量验收

**Files:**
- Create: `packages/core/src/plugin/generic/no-business-deps.test.ts`
- Create: `docs/tech-design/phase-2-generic-plugin-core.md`（Phase 2 完成报告）

**Interfaces:**
- Consumes: 无（只读源码做静态断言）。
- Produces: 依赖边界事实（供 Phase 4 `DesignerPluginHost` 复用 Generic Plugin Core 时引用）。

- [ ] **Step 1: 写依赖边界守卫测试** `packages/core/src/plugin/generic/no-business-deps.test.ts`

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// generic 目录的生产源码只允许 import @x-form-engine/types 与同目录 ./ 相对导入，
// 从而排除 FormEngine / RegistryKind / Designer / formily / designable / antd 等业务依赖。
const IMPORT = /\bfrom\s+['"]([^'"]+)['"]/g;

function collectSources(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) result.push(...collectSources(full));
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) result.push(full);
  }
  return result;
}

test('generic 目录生产源码不 import Runtime/Designer 业务模块', () => {
  for (const file of collectSources(__dirname)) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(IMPORT)) {
      const spec = m[1];
      expect(spec.startsWith('@x-form-engine/types') || spec.startsWith('./')).toBe(true);
    }
  }
});
```

- [ ] **Step 2: 运行守卫测试确认通过**

Run: `pnpm --filter @x-form-engine/core exec vitest run src/plugin/generic/no-business-deps.test.ts`
Expected: PASS —— `dependency-resolver.ts` / `plugin-host.ts` 仅 import `@x-form-engine/types` 与 `./` 相对路径。

- [ ] **Step 3: 全量验收**

Run: `pnpm --filter @x-form-engine/core exec vitest run && pnpm -r typecheck && pnpm test:run`
Expected: `core` 包测试全绿；`pnpm -r typecheck` 12 包 + 3 app 全 Done；`pnpm test:run` 全仓测试全绿（Phase 1 基线为 50 文件 / 215 用例，本 Phase 后应新增 generic 三测试文件且无失败）。

- [ ] **Step 4: 写 Phase 2 完成报告** `docs/tech-design/phase-2-generic-plugin-core.md`

内容按任务书 §15 要求：实际修改/新增/删除文件、`createPluginManager` 公开行为不变说明、`uninstall` 依赖保护新增 `PLUGIN_DEPENDENCY_ACTIVE` 错误码、测试命令与结果、尚未完成（Phase 4–9）、已知技术债（`uninstall` 未在 Runtime 公开、待 Phase 4 `DesignerPluginHost` 暴露）、下一阶段（Phase 4 Designer Core）。

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/plugin/generic/no-business-deps.test.ts docs/tech-design/phase-2-generic-plugin-core.md
git commit -m "test(core): Generic Plugin Core 依赖边界守卫 + Phase 2 报告"
```

---

## 自检结论

- **Spec 覆盖**：Phase 2 §5（抽取泛型编排、uninstall、依赖保护、失败回滚、逆序销毁 → Task 2/3；单测 13 项 → Task 1/2 测试；验收门槛「不 import Runtime/Designer 业务模块」→ Task 4 守卫）+ Phase 3 §6（迁移 `createPluginManager` → Task 3；回归测试 → Task 3 Step 2/3）。Phase 2.3「抽取导致 Runtime 行为改变须先解决」由 Task 3 的 `plugin.test.ts` 回归闭环保证。
- **类型一致性**：`PluginDefinition`（types）→ `resolvePluginOrder<P extends PluginDefinition>`（Task 1）→ `InstallablePlugin<C>`（Task 2）→ `createGenericPluginHost`（Task 2）→ `createPluginManager` 委托（Task 3），命名与签名一致；`FormEnginePlugin`/`DesignerPlugin` 满足 `PluginDefinition` 已在 Phase 1 用 `toMatchTypeOf` 固化。
- **Review Focus**：5 项各对应 Task 2 的用例 9/10/17/18/14，均已落测试。
- **比例**：本计划 4 个 Task、约 200 行实现 + 约 250 行测试，与任务书 Phase 2/3 规模匹配，非代码转录。
