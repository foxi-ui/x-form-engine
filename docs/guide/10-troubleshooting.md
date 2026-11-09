# 10. 常见问题与排错（待编写）

> 状态：draft（占位）｜ 计划更新：随 issue 反馈逐步沉淀

## 计划覆盖

- 安装与版本问题：私有源、React 17 / antd 4 / Formily 2.3.7 版本不匹配
- 渲染问题：组件未注册、缺少 `x-decorator`、样式未引入
- 校验问题：`submit()` / `validate()` reject 的形态与处理
- 联动问题：`dependencies` 路径、`{{ }}` 表达式、`scope` 引用不稳定
- 提交与快照：`schemaId` / `schemaVersion` 缺失、快照字段缺失、权限过滤
- 移动端回退诊断的读取方式
- 设计器 Schema 导入后的版本校验

## 当前已知问题速查

| 现象 | 排查入口 |
|---|---|
| 字段无标签/无校验提示 | 检查 `x-decorator: 'FormItem'` |
| 页面无样式 | 应用入口是否 `import 'antd/dist/antd.css'` |
| 表单值在重渲染后丢失 | Engine 是否在渲染路径中重复创建；用 `useMemo` + `dispose()` |
| 提交无反应 | 是否被必填校验 reject；`catch` 中是否有提示 |
| 快照 `schemaId` 为空 | `FormRenderer` 是否传入 `schemaId` / `schemaVersion` |
| 隐藏字段仍有旧值 | 当前 Formily 2.3.7 中值会变为 `undefined`；升级后需回归 |

## 相关规范

- 错误协议与错误码：`packages/types`、[`01-types`](../tech-design/02-specs/01-types.md)
- 平台回退诊断：`packages/renderer/src/diagnostics.ts`
