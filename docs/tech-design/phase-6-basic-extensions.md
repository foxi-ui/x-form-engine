# Phase 6 基础物料 / Setter / Plugin — 完成报告

> 依据：`docs/architecture/02-form-engine-v2-task.md` Phase 6（Task 6.1–6.3）
> 分支：`feat/form-engine-v2`
> 完成日期：2026-11-13
> 结论：Phase 6 验收达成 —— 新增 `@x-form-engine/materials-basic`、`@x-form-engine/setters-basic`、`@x-form-engine/plugins-basic` 三个基础扩展包，基于 Phase 4/5 协议提供基础物料（7 个）、基础 Setter（7 个）与基础插件（4 个）。

---

## 1. 交付物清单

| 文件 | 动作 | 内容 |
|---|---|---|
| `packages/materials-basic/{package.json,tsconfig.json,vitest.config.ts}` | 新增 | 框架无关基础物料包（deps 仅 types + components） |
| `packages/materials-basic/src/derive-materials.ts` | 迁移 | `deriveDesignerMaterials`（自 `designer-designable` 迁来，消除其对 Designable 的传递依赖） |
| `packages/materials-basic/src/index.ts` | 新增 | `basicMaterials`（7 物料）+ `basicMaterialsDiagnostics` |
| `packages/materials-basic/src/__tests__/no-designable-dep.test.ts` | 新增 | 无 Designable 依赖守卫 |
| `packages/setters-basic/{package.json,tsconfig.json,vitest.config.ts,vitest.setup.ts}` | 新增 | antd4 Setter 包 |
| `packages/setters-basic/src/basic-setters.tsx` | 新增 | 7 个受控 Setter（String/Number/Boolean/Select/Radio/JSON/Array） |
| `packages/setters-basic/src/index.ts` | 新增 | `basicSetters`（`SetterDefinition[]`） |
| `packages/plugins-basic/{package.json,tsconfig.json,vitest.config.ts}` | 新增 | 基础插件包 |
| `packages/plugins-basic/src/plugins.ts` | 新增 | 4 个 `DesignerPlugin`（属性面板/组件面板/工具栏/Schema 命令） |
| `packages/plugins-basic/src/index.ts` | 新增 | `basicPlugins` |
| `packages/designer-designable/src/index.ts` | 修改 | 移除迁走的 `derive-materials` 导出 |

测试：materials-basic 3 文件 / 9 用例、setters-basic 1 文件 / 6 用例、plugins-basic 1 文件 / 4 用例。

---

## 2. 各 Task 完成情况

- **Task 6.1 materials-basic** ✅：`basicMaterials`（Input/Textarea/Number/Select/Radio/Checkbox/DatePicker 共 7 个，以现有组件能力为准）；每个声明 `runtimeTarget: {kind:'component'}`；`createSchema` 生成 `x-decorator: FormItem` + `x-component` 可被 Runtime 渲染的字段；不直接操作 Designable（依赖守卫通过）。
- **Task 6.2 setters-basic** ✅：StringSetter/NumberSetter/BooleanSetter/SelectSetter/RadioSetter/JSONSetter/ArraySetter；基于 `SetterDefinition`；antd4；受控 `value`/`onChange`；支持 `disabled`/`readonly`；JSON Setter 非法输入不崩溃。
- **Task 6.3 plugins-basic** ✅：属性面板、组件面板、工具栏、Schema 导入导出命令 4 个插件；经 Panel/Toolbar/Command Registry 注册；Schema 命令通过 `SchemaEditor` 受控读写，不重新实现平行功能。

---

## 3. 关键裁定

1. **`deriveDesignerMaterials` 从 `designer-designable` 迁到 `materials-basic`**：它是框架无关的派生工具（无 Designable），迁出后 `materials-basic` 不再传递依赖 Designable，`designer-designable` 只保留 Designable 专属转换。
2. **`basicMaterials` 仅含 7 个现有组件**：Switch/Divider/Grid/Layout 尚未存在于 `components`（任务书「以现有组件能力为准」），留待后续补充组件后扩展。
3. **面板/工具栏用占位组件**（`() => null`）：Phase 6 只注册定义，具体 UI 由 Phase 9 / demo 提供，不平行实现。
4. **`SetterOption.value` 收窄为 `string | number`**：对齐 antd Select/Radio 的 options 类型（`unknown` 与 antd 类型不兼容）。
5. **基础物料/Setter 不依赖高级 Setter/Plugin**：三个包相互独立，均只依赖公开协议。

---

## 4. 验证结果

```text
materials-basic  vitest → 3 文件 / 9 用例全绿（含无 Designable 守卫）
setters-basic    vitest → 1 文件 / 6 用例全绿
plugins-basic    vitest → 1 文件 / 4 用例全绿
三包 typecheck          → 0 错误
三包 build              → ESM + CJS + DTS 成功
pnpm -r typecheck       → 16 包 + 3 app 全部 Done
pnpm test:run           → 72 文件 / 348 用例全绿
```

---

## 5. 遗留与下一阶段

- **Switch / Divider / Grid / Layout 组件**：需先在 `components` 补充运行时组件，再在 `materials-basic` 扩展物料。
- **面板/工具栏实际 UI**：占位组件待 Phase 9 / demo 落地。
- **Material Adapter 的组件专属 Setter**：`basicMaterials` 目前无 `setters`（字段级默认面板），组件专属属性 Setter（如 Select 的 options）需在 materials-basic 补充 `setters` 声明。
- **`deriveDesignerMaterials` 的 propsSchema 派生**：现有 `packages/designer` 的 `createDesignerMaterials`（ComponentBinding → Designable + propsSchema）尚未与新派生合流，Phase 9 统一。

下一步进入 **Phase 7（Material → Schema → Runtime 一致性闭环）**：新增 Material Contract / Schema Contract / Runtime Binding Contract Tests，验证基础物料生成的 Schema 能被 Runtime Parser/Validator 接受、`component` target 能找到 Runtime Binding、`designer-only` 不直接导出、缺组件/平台实现产生诊断。
