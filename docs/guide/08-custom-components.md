# 08. 自定义组件（待编写）

> 状态：draft（占位）｜ 计划更新：待第 1–4 章评审后补充

## 计划覆盖

- 组件协议 `ComponentProtocolDefinition`：`name`、`version`、`meta`、`capabilities`、`schema`
- `ComponentBinding`：`protocol`、`implementations`（`pc` / `mobile`）、`readonly`
- 自定义「员工选择器」的完整示例：编辑态 + 只读态 + 值 Adapter
- 组件注册到 `createFormEngine({ components })`
- 组件冲突与覆盖规则（`PLUGIN_CONFLICT`、显式 trusted 声明）
- 设计器物料与业务渲染复用同一组件协议
- 组件版本与快照中的 `componentVersion`

## 相关代码与规范

- `packages/types/src/component.ts`
- `packages/components/src/shared/protocols.ts`
- `docs/tech-design/02-specs/02-component-spec.md`
- `apps/mobile-demo` 中的 `LegacyNote` 组件示例

## 当前可先阅读

`packages/components/src/definitions/basic.ts`：七类基础组件就是按 `ComponentBinding` 注册的；自定义组件遵循同一结构。
