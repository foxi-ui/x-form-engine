# Mobile 渲染器设计（M4）

> 状态：已定稿，待用户批准实施 ｜ 日期：2026-11-08 ｜ 范围：`packages/components`、`packages/formily`、`packages/renderer`、`packages/types`、`apps/mobile-demo`、文档

## 1. 背景与意图

M1–M3 已交付 Engine、Designer、Value/Snapshot/Readonly 闭环，但 `platform="mobile"` 目前是死路：

- `packages/formily/src/component-map.ts` 按 `implementations[platform]` 严格取值，缺实现直接抛 `COMPONENT_CAPABILITY_MISMATCH`。
- `packages/components/src/definitions/basic.ts` 与 `decorators.ts` 的七个基础组件和 `FormItem` 只有 `pc` 实现，`capabilities.mobile` 全为 `false`。

目标：让业务方在移动端（H5）用同一份 Schema 完成**编辑、校验、提交、只读还原**，业务 Value 协议与 PC 完全一致；移动应用不夹带桌面端 antd 与 `@formily/antd`。

官方生态现状（已核实）：

- `@formily/antd-mobile` 只发布到 `1.0.0-beta.3`（Formily 1 时代）。
- 社区 `formily-antd-mobile-v2` 依赖 `@formily/react-schema-renderer@1.x`，实际也是 Formily 1。
- 结论：**没有可用的 Formily 2.3.7 + antd-mobile 适配包，移动组件由本仓库自建 `@formily/react` 包装。**

## 2. 目标

1. 七类 P0 组件与 `FormItem` 装饰器具备 antd-mobile v5 实现。
2. `@x-form-engine/components/mobile` 独立入口：移动应用只引入该入口时，产物不包含 `@formily/antd`、桌面 `antd` 及其 `.less`。
3. 移动端缺少实现时按字段回退到 `pc` 实现并产生诊断，不整表失败；PC 端保持现有严格语义。
4. `apps/mobile-demo` 跑通七类组件的编辑、校验、提交（Value + Candidate Snapshot）与只读还原。
5. 文档落地：路线图、组件协议、Renderer/SDK 规格的移动端状态与落地对照。

## 3. 非目标

- 不做 Array/Repeater、上传、日期区间、人员选择等 P1 组件。
- 不做同一个 engine 运行时切换 PC/移动（已确认无此诉求）。
- 不做移动端 Designer（设计器仍为 PC）。
- 不新增异步插件、后端 Canonical Snapshot 集成、Devtools、发布治理。
- 不为移动端单独定义 Value/Snapshot 协议。

## 4. 已定决策（用户确认）

| # | 决策 |
|---|---|
| D1 | 移动端使用真正的移动组件库（antd-mobile v5），不是 PC 组件响应式兜底。 |
| D2 | 缺 mobile 实现时按字段降级到 `pc` 实现，并记录诊断。 |
| D3 | 只做路线图七类 P0：Input / Textarea / Number / Select / Radio / Checkbox / DatePicker，外加 `FormItem` 装饰器。 |
| D4 | 不新增 `MobileRenderer` 公共组件，入口统一为 `<FormRenderer platform="mobile" />`。 |
| D5 | 按应用/engine 选平台；不要求同一 engine 运行时切换。 |
| D6 | 单独新建 `apps/mobile-demo` 作为验收应用。 |

## 5. 方案

### 5.1 平台在应用启动时选定，物料按平台拆入口

因为 registry 同名组件只能注册一个 binding，同一 engine 不能同时持有两套平台实现。方案是把物料拆成两个互不依赖的入口：

```
@x-form-engine/components          → PC 物料（import @formily/antd）
@x-form-engine/components/mobile   → 移动物料（import antd-mobile）
packages/components/src/shared/    → 纯协议定义（无 UI 依赖，两边共用）
```

- `packages/components/package.json` 增加 `./mobile` subpath export，并保留根入口行为不变（PC）。
  - 开发态 `exports["./mobile"]` 指向源码入口 `./mobile.ts`（仓库根 `moduleResolution: node` 可解析）。
  - 构建/发布态 `publishConfig.exports["./mobile"]` 指向 `./dist/mobile.js` / `./dist/mobile.d.ts`，`tsup` 构建增加 `mobile.ts` 入口。
  - `tsconfig.json` 的 `include` 增加 `mobile.ts`，保证类型检查覆盖。
- 两个入口导出同名符号 `basicComponents` / `basicDecorators`，由应用按平台选择 import 路径。
- 纯协议（名称、版本、meta、schema、capabilities）抽到共享模块，避免两份定义漂移；平台能力按入口声明（移动入口 `capabilities.mobile: true`）。
- `ReadonlyText` 等只读实现放共享模块，两边复用。

一个应用若同时需要两端，必须显式引入两个入口并承担双份体积；这是已接受的代价。

### 5.2 组件解析：mobile 逐字段回退 + 诊断

修改 `packages/formily/src/component-map.ts`：

- `platform === 'pc'`：保持现状，缺实现抛 `COMPONENT_CAPABILITY_MISMATCH`。
- `platform === 'mobile'`：`implementations.mobile ?? implementations.pc`；装饰器同理。回退产生一条诊断。
- 解析结果从 `{ components, decorators }` 扩展为 `{ components, decorators, diagnostics }`；旧调用方兼容（保留原函数签名，新增带诊断的入口或选项）。
- 诊断只针对当前 Schema 实际引用的 `x-component` / `x-decorator` 名称（由 Renderer 遍历 Schema 收集后过滤），避免注册表里未被使用的组件产生噪音。
- 诊断去重：同一组件名每次挂载只报一次。

诊断类型放入 `packages/types`：

```ts
export interface PlatformFallbackDiagnostic {
  kind: 'component' | 'decorator';
  name: string;
  requestedPlatform: Platform;
  fallbackPlatform: Platform;
}
```

暴露通道（两者都做）：

1. `engine.events.emit('component:platform-fallback', diagnostic)`——与现有 `plugin:*` / `engine:*` 命名一致，便于业务统一埋点。
2. `FormRendererProps.onDiagnostic?: (diagnostic: PlatformFallbackDiagnostic) => void`——便于测试与局部处理。
3. `engine.options.debug` 为真时 `console.warn` 一条可读信息。

诊断在对 SchemaField 的解析结果产生后、提交到事件总线前完成过滤，避免在 React render 阶段产生副作用。

### 5.3 移动组件实现（自建 Formily 包装）

在 `packages/components/src/mobile/` 下，用 `@formily/react` 的 `connect` / `mapProps` / `useField` 包装 antd-mobile v5 组件。初步映射：

| Schema 组件 | antd-mobile v5 | 受控值 | 业务 Value（与 PC 一致） |
|---|---|---|---|
| Input | `Input` | `value` / `onChange(string)` | `string` |
| Textarea | `TextArea` | `value` / `onChange(string)` | `string` |
| Number | `Input type="number"` + 数值解析（必要时改 `Stepper`） | 字符串 ↔ `number \| null` | `number \| null` |
| Select | `Picker` + 触发 Cell；`multiple` 时用 `Selector`（多选） | `Picker` 的 `string[]` ↔ 单值 / 数组 | 单值或数组，与 PC 一致 |
| Radio | `Radio.Group` | `value` / `onChange` | primitive |
| Checkbox | `Checkbox.Group` | `value` / `onChange` | `unknown[]` |
| DatePicker | `DatePicker` | `Date` ↔ `'YYYY-MM-DD'` | `string`（与 PC 的 `formatMomentValue` 一致） |
| FormItem（装饰器） | `Form.Item` | `label` / `help` / `required` | — |

约束：

- 日期必须输出 `'YYYY-MM-DD'` 字符串；PC 的 `@formily/antd` DatePicker 经 `formatMomentValue` 输出字符串，移动端不能输出 `Date` 或 dayjs。
- 单选/多选、数值的 Value 结构与 PC 完全一致，不引入移动端专属结构。
- `Select` 必须支持 `multiple: true`：移动端 Value 为数组，与 PC 一致，不允许静默降为标量。`Picker` 不原生支持多选，多选分支用 `Selector`（`multiple`）。
- 选项来源与 PC 相同：接受 Formily 的 `dataSource` / `options`（`enum` 会被 Formily 转成 `dataSource`）。可搜索、远程 `x-engine.datasource` 在 PC 端当前也未接线，移动端保持一致地忽略，不做移动端独有的缺口。
- `capabilities.mobile` 是**描述性元数据**（供设计器/物料展示），运行时**不参与**平台回退判断；回退只看 `implementations`。七个基础组件在两个入口的协议里都声明 `mobile: true`，避免同名协议因入口不同而产生语义分叉。
- 组件的 `x-component-props` 能透传的尽量透传（`placeholder`、`disabled` 等）；移动端不支持的 PC 专属 props 静默忽略，不报错。

### 5.4 只读

- `ReadonlyRenderer` 已按 `平台 → default` 解析，`ReadonlyText` 可作 mobile 的 `default`。
- 移动物料的每个 binding 提供 `readonly: { mobile: ReadonlyText, default: ReadonlyText }`。
- 不新增移动只读组件；`apps/mobile-demo` 覆盖手机视口下的只读展示与快照优先展示。

### 5.5 依赖与样式

- 新增精确版本依赖 `antd-mobile@5.43.0`（2026-09-14 发布，peer 支持 React 16.8/17/18/19）。
- 仅在 `@x-form-engine/components/mobile` 入口及其子模块引入 antd-mobile，PC 入口不得 import。
- 样式引入方式（`antd-mobile` 的全局 CSS 或按组件 CSS）在实施前用最小 spike 验证，并记录到 `verification` 风格的前置结论中；demo 负责提供标准写法。
- 不引入 `babel-plugin-import` 之类额外构建件；依赖 antd-mobile v5 的 ESM tree-shaking。

## 6. 交付物

| 交付物 | 内容 |
|---|---|
| `packages/types` | `PlatformFallbackDiagnostic`；如需要，补充 Renderer 诊断相关类型 |
| `packages/formily` | mobile 回退解析 + 诊断输出；PC 严格语义不变 |
| `packages/renderer` | `onDiagnostic` prop；事件派发；Schema 组件名收集与诊断过滤 |
| `packages/components` | `src/shared/` 协议与只读实现；`src/mobile/` 七类组件 + `FormItem`；package subpath export |
| `apps/mobile-demo` | 手机视口 demo：七类组件、校验、提交、只读还原、回退诊断展示 |
| 测试 | 包装组件的 value/onChange 映射、回退与诊断、移动端集成渲染、提交闭环 |
| 文档 | 路线图 M4/FUT-01/FUT-02、`02-component-spec.md`、`05-renderer-sdk.md`、README/AGENTS 状态 |
| 构建验收 | mobile-demo 产物不包含 `@formily/antd` / 桌面 antd / less |

## 7. 验收标准

1. `apps/mobile-demo` 在手机视口渲染七类组件，编辑、必填校验、提交均正常。
2. `submit()` 返回的 Value 与同 Schema 在 PC 端的结构一致（日期为 `'YYYY-MM-DD'` 字符串，数值为 number）。
3. 提交后生成的 Candidate Snapshot 能在 `ReadonlyRenderer platform="mobile"` 下正确还原展示值。
4. 注册一个只实现 `pc` 的业务组件并在移动端渲染：字段回退为 PC 实现，表单其余字段正常，产生一条诊断（事件 + `onDiagnostic`）。该演示组件使用 demo 内的本地实现（普通 HTML 控件），**不得**从 `@formily/antd` 引入，避免破坏验收 #6；更完整的回退断言同时落在 `packages/renderer` 的测试里。
5. PC 端缺少实现仍抛 `COMPONENT_CAPABILITY_MISMATCH`（回归测试）。
6. `pnpm --filter mobile-demo build` 产物中检索不到 `@formily/antd`、桌面 `antd` 组件代码或 `.less`。
7. `pnpm test:run`、`pnpm -r typecheck` 全绿。

## 8. 风险与前置验证

| 风险 | 处置 |
|---|---|
| antd-mobile 组件与 Formily `connect`/`mapProps` 的受控值适配（Picker、DatePicker、Radio.Group、Checkbox.Group） | 实施第一步做最小 spike，先跑通 Input + DatePicker + Picker，再铺开 |
| antd-mobile v5 样式引入方式与 Vite 构建 | spike 中确定；demo 固化标准写法 |
| 弹层类组件（Picker/DatePicker）在 jsdom 下的测试行为 | 测试优先断言 value/onChange 映射与提交结果；必要时 mock 弹层确认 |
| React 17 与 antd-mobile 5 的运行时差异 | spike 覆盖；peer 声明支持 17 |
| 包入口拆分后 vitest/TS 对 subpath export 的解析 | 在 components 包增加一个解析测试，确认 `@x-form-engine/components/mobile` 可被 workspace 正常解析 |
| 双平台应用体积翻倍 | 已接受；文档明确说明 |

## 9. 文档与里程碑

- 在 `docs/tech-design/mvp-roadmap.md` 新增 **M4：Mobile 渲染器**，原「M4：工程化与发布」顺延为 **M5**（已确认）。
- 同步调整 `02-specs/10-testing-and-roadmap.md`、`README.md`、`AGENTS.md` 中涉及里程碑编号与状态描述的段落。
- FUT-01「完整 Mobile Renderer」与 FUT-02「Mobile 专用组件库」标记为已落地，并写明范围（七类 P0）。
- `02-specs/02-component-spec.md` 更新平台实现与 capabilities 说明、落点指向 `packages/components/src/mobile`。
- `02-specs/05-renderer-sdk.md` 状态补充 mobile，说明平台选择与包入口拆分。
- `README.md` / `AGENTS.md` 的仓库状态补充 Mobile 渲染器完成项。
- 所有文档保持简体中文 + Mermaid（如需图示）。

## 10. 留给实施者的取舍

- Number 用 `Input type="number"` 还是 `Stepper`，以 spike 的可输入性与 Value 稳定性为准。
- 移动 `Select` 触发器的具体形态（Cell + Picker 弹层 vs 其他），以 antd-mobile v5 推荐用法为准。
- 诊断事件的精确名称若与后续 Devtools 规划冲突，可在实施时调整，但需同步类型与文档。
- 是否需要为移动包装组件补充组件级文档页；默认先在 README/demo 中说明，不单独建文档站。
