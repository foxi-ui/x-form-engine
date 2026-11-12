# Phase 2 Generic Plugin Core — 完成报告

> 依据：`docs/architecture/02-form-engine-v2-task.md` Phase 2（Task 2.1–2.3）+ Phase 3（Task 3.1–3.2）
> 分支：`feat/form-engine-v2`
> 完成日期：2026-11-12
> 结论：Phase 2 验收达成 —— Generic Plugin Core 与 Runtime / Designer 业务模块解耦（静态守卫通过），`createPluginManager` 公开行为不变，新增 `uninstall(name)` 依赖保护与 `PLUGIN_DEPENDENCY_ACTIVE` 错误码。

---

## 1. 交付物清单

| 文件 | 动作 | 内容 |
|---|---|---|
| `packages/core/src/plugin/generic/dependency-resolver.ts` | 迁移 + 修改 | 原 `plugin/dependency-resolver.ts` 移入 `generic/`，泛型化为 `resolvePluginOrder<P extends PluginDefinition>` |
| `packages/core/src/plugin/generic/dependency-resolver.test.ts` | 新增 | 4 个用例：纯 `PluginDefinition` 排序、依赖缺失、循环依赖、同名插件 |
| `packages/core/src/plugin/generic/plugin-host.ts` | 新增 | `createGenericPluginHost`：install / uninstall / disposeAll / list / isInstalled；资源增量归属、失败回滚、依赖保护、逆序释放 |
| `packages/core/src/plugin/generic/plugin-host.test.ts` | 新增 | 18 个用例（覆盖任务书 Task 2.2 的 13 项 + 边界） |
| `packages/core/src/plugin/generic/no-business-deps.test.ts` | 新增 | 依赖边界守卫：`generic/` 生产源码只允许 `@x-form-engine/types`（含子路径）与解析后位于 `generic/` 内的相对导入；覆盖静态 import / export-from / 副作用 import / 动态 import / require；含匹配器自测与非空源码断言 |
| `packages/core/src/plugin/plugin-manager.ts` | 修改 | `createPluginManager` 委托 Generic Plugin Host，仅保留 Runtime 语义适配（上下文/资源/事件） |
| `packages/core/src/plugin/plugin.test.ts` | 修改 | 仅更新 `resolvePluginOrder` 导入路径 |
| `packages/core/src/engine.ts` | 修改 | 仅更新 `resolvePluginOrder` 导入路径 |
| `packages/core/src/index.ts` | 修改 | 仅更新 `resolvePluginOrder` 导出路径（公开符号不变） |
| `packages/types/src/errors.ts` | 修改 | `FormEngineErrorCode` 新增 `PLUGIN_DEPENDENCY_ACTIVE` |
| 本文档 | 新增 | Phase 2 完成报告 |

**删除的旧接口：无。** `resolvePluginOrder` 以 rename 方式迁移（Git 识别为 `R085`），`createPluginManager` 签名与 `PluginManager` 接口保持不变；`createGenericPluginHost` 属于 `@x-form-engine/core` 内部模块，未从包入口导出。

---

## 2. 各 Task 完成情况

### Task 2.1 — 抽取泛型编排核心 ✅

- 以原 `plugin-manager.ts` 为事实基础，抽出 `generic/dependency-resolver.ts` 与 `generic/plugin-host.ts`。
- 宿主只依赖 `PluginResourceRegistry`（`list` / `unregister`）这一最小注册表视图，不感知 `FormEngine`、`PluginContext`、`RegistryKind`、Designer、Formily、Designable、antd。
- 类型复用 `@x-form-engine/types` 的 `PluginDefinition` / `PluginLifecycleEvent`，未在 `core` 内重定义。
- 能力覆盖：依赖解析与拓扑排序、重复安装检测、安装失败回滚、资源归属（盘前快照 → 增量差异）、单插件 `uninstall(name)`、依赖保护、逆序资源清理、`disposeAll()`。

### Task 2.2 — 单元测试 ✅

- `dependency-resolver.test.ts`：4 用例。
- `plugin-host.test.ts`：18 用例，覆盖注册/重复注册、安装/重复安装、依赖缺失、拓扑顺序、循环依赖、安装失败回滚、资源归属、单插件卸载、依赖保护、逆序清理、`disposeAll` 幂等，以及 `dispose`/`teardown` 双路径与异常隔离、`createContext` 抛错、来源变化后不误删等边界。

### Task 2.3 — 验收门槛 ✅

- 全部单元测试通过（见 §4）。
- 不 import 任何 Runtime / Designer 业务模块：由 `no-business-deps.test.ts` 静态守卫固化并在全量测试中执行。

### Task 3.1 — 迁移 `createPluginManager` ✅

- `plugin-manager.ts` 由 221 行缩减为 93 行适配层：构造 `createContext`（注入 `registry` / `services` / `events` / `config`）、传入五类 Registry 作为追踪资源、把 `PluginLifecycleEvent` 映射为 `plugin:install` / `plugin:dispose` / `plugin:failed` 引擎事件。
- 所有安装事务、依赖校验、资源归属与回滚/卸载编排委托给 `createGenericPluginHost`。

### Task 3.2 — 回归测试 ✅

`plugin.test.ts` 13 用例全绿，覆盖重复安装 `PLUGIN_CONFLICT`、依赖缺失、循环依赖、失败回滚、增量资源归属、`disposeAll` 幂等/逆序、五类 Registry 不退化。**Runtime 插件行为未改变。**

### Task 4 — 依赖边界守卫与全量验收 ✅

- 新增 `no-business-deps.test.ts`，扫描 `generic/` 下全部非测试 `.ts` 源码，覆盖静态 import / export-from / 副作用 import / 动态 `import()` / `require()` 的模块说明符；白名单仅 `^@x-form-engine/types($|/)` 与 `path.resolve` 后仍位于 `generic/` 目录内的相对路径（拦截 `./../` 父目录穿越与 `@x-form-engine/types-evil`）。守卫含匹配器自测（副作用/动态/require/export-from/父目录穿越均判违规）与非空源码断言。
- 当前扫描对象：`dependency-resolver.ts`、`plugin-host.ts`；违规即失败。

---

## 3. 关键设计裁定

1. **资源归属用「增量差异」而非按 source 全量清理**：安装前对每个注册表做 `name -> source` 快照，安装后新增或来源变化的条目才归本次安装所有。插件名与内置 `builtin` 来源重名时不会误删内置资源；回滚同样只释放本次新增条目。
2. **插件名在宿主生命周期内保留**：`installedNames` 只在首次成功安装时写入，卸载后同名插件不可重复安装。这与迁移前 Runtime PluginManager 行为一致，避免同宿主出现两条同名 managed 记录。
3. **`uninstall` 幂等，依赖保护仅作用于单插件卸载**：未安装 / 已 inactive 时 no-op；存在其它 active 插件依赖目标时抛 `PLUGIN_DEPENDENCY_ACTIVE`（附带 `dependents`）。`disposeAll` 整体拆除时按安装逆序卸载，因此**不**执行依赖保护。
4. **停用顺序**：置 `active=false` → `dispose?` → `install` 返回的 teardown → `finally` 逆序释放归属资源 → 派发 `disposed`。`dispose` 与 `teardown` 各自 try/catch 隔离，一个失败不影响另一个，也不阻断资源释放。
5. **安装校验基于「已 active 插件 + 新插件」**：依赖必须已安装，同时拦截自依赖/循环/重名；`createContext`、依赖校验、`plugin.install` 任一抛错都走同一回滚路径并派发 `failed` 事件。
6. **惰性创建宿主**：`Engine` 以字段初始化器构造 pluginManager（早于构造函数内 `this.registry` 赋值），因此保持「到首次安装/查询时才读取 engine 状态」的时机，避免读取未初始化的 registry。

---

## 4. 验证结果

```text
$ pnpm --filter @x-form-engine/core exec vitest run src/plugin/generic/no-business-deps.test.ts
 ✓ |@x-form-engine/core| src/plugin/generic/no-business-deps.test.ts (2 tests) 1ms
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

```text
$ pnpm --filter @x-form-engine/core exec vitest run
 Test Files  10 passed (10)
      Tests  74 passed (74)
```

```text
$ pnpm -r typecheck
Scope: 12 of 13 workspace projects
packages/types typecheck: Done
packages/services typecheck: Done
packages/core typecheck: Done
packages/adapters typecheck: Done
packages/formily typecheck: Done
packages/renderer typecheck: Done
packages/components typecheck: Done
packages/sdk typecheck: Done
packages/designer typecheck: Done
apps/playground typecheck: Done
apps/mobile-demo typecheck: Done
apps/designer-demo typecheck: Done
```

```text
$ pnpm test:run
 Test Files  53 passed (53)
      Tests  243 passed (243)
```

基线对照：Phase 1 报告记录 50 文件 / 219 用例；本 Phase 新增 3 个 generic 测试文件、24 个用例（4 + 18 + 2），现为 53 文件 / 243 用例，无失败。

---

## 5. `createPluginManager` 公开行为不变说明

| 公开方法 | 行为 |
|---|---|
| `install(plugin)` | 同名重复安装抛 `PLUGIN_CONFLICT`；依赖缺失/循环抛对应错误；安装抛错时回滚本次新增资源并派发 `plugin:failed`；成功派发 `plugin:install` |
| `disposeAll()` | 按安装顺序逆序卸载，幂等；重复调用不重复 `dispose`；派发 `plugin:dispose` |
| `list()` | 返回 `Array<{ plugin, active }>`，语义与迁移前一致 |

`PluginManager` 接口未新增方法：`uninstall` 尚未在 Runtime 公开（见 §7）。

---

## 6. 尚未完成（Phase 4–9）

- **Phase 4**：Designer Core（Engine / Context / MaterialRegistry / SetterRegistry / SchemaEditor / Designer Plugin Host / Diagnostics）。
- **Phase 5**：Designable Adapter。
- **Phase 6**：基础 Material / Setter / Plugin。
- **Phase 7**：Material → Schema → Runtime 一致性闭环（含 Contract Tests）。
- **Phase 8**：高级扩展示例与外部项目消费 Demo。
- **Phase 9**：分阶段开发与统一切换。

---

## 7. 已知技术债

1. **`uninstall` 未在 Runtime 公开**：Generic Host 已实现并测试，但 `PluginManager`、`FormEngine` 均未暴露；将在 Phase 4 `DesignerPluginHost` 中正式对外，届时需评估是否同步补 Runtime 侧 API。
2. **卸载后重装语义未定**：当前 `installedNames` 永久保留，卸载后同名插件不可重装（与迁移前一致）。是否允许「卸载后重装」留待 Phase 4 结合 Designer 热插拔场景裁定。
3. **惰性宿主创建**：`createPluginManager` 在首次调用时才创建宿主（为规避 `engine.registry` 的字段初始化时序）。若未来改为立即创建，需调整 `Engine` 构造顺序并补回归测试。
4. **Generic Host 未从包入口导出**：`createGenericPluginHost` / `InstallablePlugin` / `PluginResourceRegistry` 目前是 `core` 内部模块。Phase 4 若在独立包中复用，需要决定「导出 core 子路径」还是「下沉到独立包」，不得跨包引用 `src` 内部路径。
5. **依赖边界守卫的剩余限制**：守卫已覆盖静态 import / export-from / 副作用 import / 动态 `import()` / `require()`，并用 `path.resolve` 与 `^@x-form-engine/types($|/)` 收紧白名单；但按任务书范围仍只扫描 `.ts`，不扫描 `.tsx` 生产文件（当前 `generic/` 无 `.tsx`，新增时需同步扩展）。关于 `packages/adapters` / `packages/services` 既有的 `no-ui-deps` 守卫：已核查，无影响 —— 二者只在各自包目录内扫描（`resolve(__dirname, '../..')`），且正则仅精确匹配 `from 'antd'` 等说明符；本 Phase 的 core 守卫测试中 `import 'antd/dist/reset.css'` 只是测试文件内的字符串字面量（非生产源码、非 `from` 形式），不会被其命中。

---

## 8. 下一阶段

- **Phase 4（Designer Core）**：基于本 Phase 的 Generic Plugin Core 提供 `DesignerPluginHost`，注入 `DesignerContext`；实现 Material / Setter / Panel / Command / Toolbar Registry、SchemaEditor 与 Diagnostics。
- 硬约束：Designer Core 不依赖 Designable、antd、antd-mobile、Runtime Renderer / FormEngine；不得复制 Runtime Plugin Manager 实现；插件资源必须归属插件并支持带依赖保护的单插件卸载。
