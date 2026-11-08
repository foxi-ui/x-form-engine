# M3「Value / Snapshot / Readonly 闭环」执行计划

> 设计：`docs/superpowers/specs/2026-11-08-m3-value-snapshot-readonly-design.md`
> 日期：2026-11-08
> 基线：80 测试全绿、7 包 typecheck 通过

## 任务顺序（依赖驱动）

1. **T1 `packages/types` 契约扩展**（M3-01/06 + 权限/迁移/只读/Formatter/I18n 类型）
2. **T2 `packages/core` 迁移注册表 + 字段身份**（M3-03/04/13 内核）
3. **T3 `packages/adapters` 新包：Value 规范化 + Candidate Snapshot**（M3-02/05）
4. **T4 `packages/services` 新包：权限/Formatter/I18n/Datasource**（M3-09/12）
5. **T5 `packages/components` 只读实现**（M3-10）
6. **T6 `packages/renderer` 只读渲染器 + `submit()` 接入**（M3-05/07/08/11/12）
7. **T7 `packages/sdk` 公共 API 聚合**
8. **T8 `apps/playground` 历史只读 Demo + 出差申请闭环**（M3-13 演示）
9. **T9 文档更新 + 全量验证**（`pnpm test:run` + `pnpm -r typecheck` + 边界守卫）

## 每项交付物与验收

### T1 — types 契约
- `value.ts`：`FormValue`/`NormalizeResult`/`NormalizeWarning`/`NormalizeError`/`SNAPSHOT_VERSION`/`FieldSnapshot.fieldId`/`RepeatItemSnapshot`/`CandidateSnapshot`/`CanonicalSnapshot`
- 新 `permission.ts` / `migration.ts` / `readonly.ts` / `formatter.ts` / `i18n.ts`
- `component.ts`：`ComponentBinding.readonly`；`services.ts`：`EngineServices.permission/i18n/snapshot`；`errors.ts` 新错误码
- 守卫测试：`types` 无 React 依赖、`unknown` 优先

### T2 — core
- `migration.ts`：`createMigrationRegistry()`（环/歧义/输出版本/非破坏，8 个协议用例迁移为生产测试）
- `identity.ts`：`createFieldId`/`createItemId`（含 UNSTABLE 诊断）

### T3 — adapters（新包）
- `value.ts`：`normalizeFormValues`；`snapshot.ts`：`createCandidateSnapshot`；`entity.ts`/`dict.ts` 参考适配器
- 测试：normalize 边界、快照 title/displayValue/componentVersion、itemId 稳定性

### T4 — services（新包）
- `permission.ts`（8 个 fail-closed 用例）、`formatters.ts`（9 个 Formatter + `defaultFormatters`）、`i18n.ts`、`datasource.ts`

### T5 — components 只读
- `readonly.tsx`：默认只读组件 + 枚举/日期解析；基础组件 binding 挂 `readonly`

### T6 — renderer
- `readonly/ReadonlyRenderer.tsx` + resolver + context（不建 Formily Form）
- `FormRenderer.submit()` 接入 normalize + candidate snapshot + 权限收敛
- 测试：只读渲染、Unknown 降级、权限过滤、snapshot 优先展示

### T7 — sdk
- 聚合 adapters/services/renderer 只读 + 新类型导出；守卫：无 Designable 依赖

### T8 — playground
- 出差申请历史只读 Demo（内存数据闭环）

### T9 — 文档与全量验证
- `AGENTS.md` 更新 M3 状态；`08/09` spec 标注实现状态；`pnpm test:run` + `pnpm -r typecheck` 全绿

## 边界守卫（贯穿）
- `types` 无 React/Formily/Designable import；`core/adapters/services` 无 React；`renderer` 无 antd/Designable
- 业务包依赖仅 `sdk` + `components`
