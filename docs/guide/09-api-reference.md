# 09. API 参考（待编写）

> 状态：draft（占位）｜ 计划更新：第 1–4 章稳定后补齐完整签名

## 计划覆盖

- `@x-form-engine/sdk` 的全部导出：函数、组件、Hooks、类型
- `createFormEngine` 的 `FormEngineOptions` 完整字段
- `FormRenderer` props 与 `FormRendererInstance` 方法
- `ReadonlyRenderer` props
- `FormSubmitResult` / `FormSnapshot` / `FieldSnapshot`
- `parseSchemaDocument` / `validateEngineSchema`
- 错误码与异常形态（`SCHEMA_INVALID`、`PLUGIN_CONFLICT`、`ENGINE_DISPOSED` 等）
- `@x-form-engine/components` 与 `@x-form-engine/components/mobile` 的导出

## 当前可用的速查

- 第 1–4 章 API 速查：[`04-submit-and-snapshot.md#7-本阶段-api-速查`](04-submit-and-snapshot.md#7-本阶段-api-速查)
- 文档导览中的公开 API 表：[`README.md`](README.md#本阶段可用的公开-api)
- 已实现接口的权威定义：`packages/types`、`packages/sdk/src/index.ts`

## 维护约定

本参考只列公开包导出，不重复抄写 `packages/types` 中的类型定义；签名变化时以源码为准并同步本页。
