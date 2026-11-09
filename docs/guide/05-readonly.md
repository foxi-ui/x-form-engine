# 05. 只读渲染与历史回显（待编写）

> 状态：draft（占位）｜ 计划更新：待第 1–4 章评审后补充

## 计划覆盖

- `ReadonlyRenderer` 的 props：`schema`、`snapshot`、`values`、`platform`、`locale`、`permission`
- 只读渲染器与编辑态的区别：不创建 Formily Form、不执行编辑态 effects / reactions
- 展示值优先级：快照 `displayValue` → 组件只读实现 → Formatter → 静态 Schema 规则 → 原始值 + 诊断
- 用第 04 章保存的 `snapshot` 还原员工登记详情页
- 空值、未知组件、枚举缺失时的兜底与诊断
- 前端权限只影响展示，后端仍需独立鉴权

## 相关代码与规范

- `packages/renderer/src/readonly/ReadonlyRenderer.tsx`
- `packages/components/src/readonly/`
- `docs/tech-design/02-specs/08-readonly-renderer.md`
- `apps/playground` 中的「历史只读还原」区域

## 当前可先阅读

第 04 章的 `FormSubmitResult.snapshot` 结构，以及 [`01-types`](../tech-design/02-specs/01-types.md) 中 `FormSnapshot` / `FieldSnapshot` 的字段说明。
