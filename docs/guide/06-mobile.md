# 06. 移动端渲染（待编写）

> 状态：draft（占位）｜ 计划更新：待第 1–4 章评审后补充

## 计划覆盖

- 移动端物料入口：`@x-form-engine/components/mobile`
- 用 `createFormEngine({ platform: 'mobile' })` 设定默认平台
- 用 `<FormRenderer platform="mobile">` 按表单覆盖平台
- 七类 P0 antd-mobile 组件与移动端 FormItem
- PC 专用组件在移动端的回退行为与 `PlatformFallbackDiagnostic`
- `onDiagnostic` 与 Engine 事件 `component:platform-fallback`
- 移动端 bundle 不混入桌面 `antd` / `@formily/antd` 的边界

## 相关代码与规范

- `packages/components/src/mobile/`
- `packages/components/mobile.ts`
- `docs/tech-design/02-specs/05-renderer-sdk.md`
- `apps/mobile-demo`

## 当前可先阅读

`apps/mobile-demo/src/App.tsx` 展示了移动端 Engine 的创建、七类组件 Schema、`x-reactions` 复用以及回退诊断的用法。
