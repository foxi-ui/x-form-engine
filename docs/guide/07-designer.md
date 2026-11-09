# 07. 设计器接入（待编写）

> 状态：draft（占位）｜ 计划更新：待第 1–4 章评审后补充

## 计划覆盖

- 设计器产出的 Schema 形态：`x-decorator` + `x-component` + `x-component-props`
- 设计器导出 JSON 的信封结构与版本字段
- 业务侧加载设计器 Schema 并渲染的完整流程
- 设计器物料与业务渲染组件共用同一份 `FormComponentDefinition`
- 预览模式与编辑模式的差异
- Schema 升级/迁移的边界与注意事项

## 相关代码与规范

- `packages/designer`
- `docs/tech-design/02-specs/07-designer-adapter.md`
- `apps/designer-demo`
- `apps/playground` 的「导入 Schema」功能

## 当前可先阅读

第 02 章的「两种 Schema」与第 04 章的「从后端文档加载 Schema」：设计器导出的文档可以先用 `parseSchemaDocument` 校验信封，再交给 `FormRenderer`。
