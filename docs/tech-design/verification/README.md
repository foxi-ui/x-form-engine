# Form Engine 落地前技术验证

> 验证日期：2026-11-07  
> 验证对象：《Form Engine 企业级前端渲染引擎设计方案》第 19 节「落地前需要锁定和验证的事项」  
> 验证方式：真实依赖安装 + TypeScript 严格类型检查 + Vitest/jsdom 运行用例 + 依赖源码/类型声明核对 + 协议级可执行用例  
> 验证工程：`verification/`（一次性 spike，不属于正式包结构）

---

## 1. 结论总览

| # | 第 19 节事项 | 结论 | 证据 |
|---|---|---|---|
| 1 | 锁定 React、TypeScript、Formily 2.x、Designable 2.x 版本 | **部分通过，需修订文档**：Designable 不存在 2.x，实际最新为 `1.0.0-beta.45` | `01-version-lock.md`、`appendix/resolved-versions.txt`、`appendix/peer-deps-*.txt` |
| 2 | 核对 Formily API 导出位置、参数类型、SchemaField Scope 传递 | **通过**，并发现 3 处文档表述需修正 | `02-formily-api.md`，4 个用例通过 |
| 3 | 最小 Demo 验证 `x-reactions`、自定义组件、Effects、动态校验 | **通过** | `03-formily-behavior.md`，4 个用例通过 |
| 4 | 验证 Designable 物料、Setter 与 Schema 回写 | **核心 API 通过**；完整拖拽 UI 与真实浏览器 E2E 未覆盖 | `04-designable.md`，5 个用例通过 |
| 5 | 明确 Schema / Value / Snapshot 后端持久化边界 | **协议已明确**，后端实现与业务确认待完成 | `05-persistence-boundary.md` |
| 6 | 明确人员、部门、字典组件的 Value / Snapshot 标准 | **通过（协议级）** | `06-value-snapshot-standard.md`，6 个用例通过 |
| 7 | 明确权限由前端控制还是后端强制执行 | **通过（协议级）**：前端只做 UX 收敛，后端强制校验 | `07-permission-enforcement.md`，8 个用例通过 |
| 8 | 明确 Schema / Snapshot 的版本升级、迁移与兼容窗口 | **通过（协议级）**：多版本轴 + 有序迁移链 + 原始数据不可变 | `08-version-migration.md`，8 个用例通过 |

完整用例结果：**6 个测试文件、35 个用例全部通过**，TypeScript 严格模式类型检查通过。原始输出见 `appendix/test-run.txt` 与 `appendix/typecheck.txt`。

---

## 2. 最重要的四个发现

### 2.1 「Designable 2.x」不存在，这是当前方案最大的版本风险

- npm 上 `@designable/*` 的 `latest` 是 `1.0.0-beta.45`，发布时间 **2022-02-28**，此后无新版本。
- `@designable/react@1.0.0-beta.45` 的 peer 约束是 **React 16.x || 17.x**、**antd ^4.15.4**。
- `@designable/formily-antd@1.0.0-beta.45` 的 peer 约束是 **antd ^4.0.0**、Formily ^2.0.2。

因此，原方案中多处「Designable 2.x」的表述无法按字面落地。需要二选一：

1. **按实际 1.x 锁定**：React 17 + antd 4 + Designable `1.0.0-beta.45`，把设计器作为隔离应用/懒加载模块。
2. **不直接依赖上游 Designable**：保留 Designer Adapter 抽象，内部采用自研或维护 fork，以换取 React 18/19 与 antd 5 的技术栈。

本次验证按方案 1 完成了真实安装与运行。

### 2.2 可锁定的版本组合

```text
Node            22.23.2
pnpm            10.34.5
TypeScript      5.9.3
React           17.0.2
react-dom       17.0.2
antd            4.22.8
@formily/*      2.3.7
@designable/*   1.0.0-beta.45
Vitest          3.2.7
jsdom           26.1.0
```

关键约束：

- `@formily/antd@2.3.7` 的 peer 要求 `antd <= 4.22.8`，因此不能简单升级到 antd 4 的最新版 `4.24.x`。
- `@designable/react` 的 peer 只声明 React 16/17，未声明 React 18；本次未把 React 18 作为可承诺组合。
- 必须开启 `skipLibCheck: true`。关闭后会出现 `@formily/antd` 与 antd 类型冲突、`rc-tree`、`resize-observer-polyfill` 等第三方声明错误，证据见 `appendix/typecheck-without-skip-lib-check.txt`。
- `@formily/antd` 的传递依赖 `react-sticky-box@0.9.3` 仍声明 React `^0.14 || ^15 || ^16`，在 React 17 下会产生 peer warning。本次最小用例未触发其运行时问题，但应列入兼容性风险。

### 2.3 Formily 原生能力可以保留，但文档中的 API 位置和签名需要修正

- `createForm`、`onFieldInit`、`onFieldValueChange`、`onFieldReact`、`onFormValuesChange` 等来自 **`@formily/core`**。
- `createSchemaField`、`FormProvider`、`Field`、`ObjectField`、`ArrayField`、`VoidField`、`useForm`、`useField`、`useFieldSchema`、`useFormEffects` 等来自 **`@formily/react`**。
- `onFormValuesChange` 的实际回调签名是 `(form) => void`，不是 `(form, values) => void`；值通过 `form.values` 读取。
- `createSchemaField({ scope })` 与 SchemaField 实例的 `scope` prop 都会进入表达式作用域，实例级覆盖工厂级；表达式通过 `with($root)` 编译。
- `useField` / `useFieldSchema` 必须位于**字段渲染上下文**内，仅放在 `FormProvider` 下会拿到空值。

### 2.4 Designable 只能作为设计器侧依赖，不能进入运行时渲染链路

- Designable 的 CJS 产物直接 `require('./theme.less')`，Node 无法解析；验证环境必须使用 ESM 产物并配置 less 处理。
- Designable Engine 的 `setCurrentTree()` 在未创建 workspace 时是空操作，必须先 `workbench.ensureWorkspace(...)`。
- `ValidatorSetter` 依赖 Formily `useField()` 读取 `field.title`，必须挂载在 Field 上下文内；`ReactionsSetter` / `DataSourceSetter` 还依赖 Designable 的 Designer/Theme 上下文。
- 因此 Designer Adapter 应隔离在 `packages/designer`，运行时 Renderer 不依赖 Designable；设计器应用独立构建、独立升级。

---

## 3. 验证工程与复现方式

```text
verification/
├── package.json          # 锁定依赖与脚本
├── pnpm-lock.yaml        # 实际安装结果
├── tsconfig.json         # 严格模式，skipLibCheck=true
├── vitest.config.ts      # jsdom + ESM alias + less
└── src/
    ├── 02-formily-api.test.tsx
    ├── 03-formily-behavior.test.tsx
    ├── 04-designable.test.tsx
    ├── 06-value-snapshot-contract.test.ts
    ├── 07-permission-contract.test.ts
    └── 08-migration-protocol.test.ts
```

复现：

```bash
cd verification
pnpm install
pnpm typecheck
pnpm test
```

---

## 4. 验证边界与未覆盖项

本次验证是「技术可行性 spike」，不是生产实现，以下内容**未覆盖**：

- 未在真实浏览器中执行 Designable 拖拽、画布、Setter 面板的端到端交互（仅验证引擎、物料、回写和 Setter 挂载）。
- 未接入真实后端，因此第 5 项的数据库、事务、鉴权、幂等只做协议推演，不做运行时验证。
- 未验证 React 18/19 与 Designable 的组合；上游 peer 不支持，不能据此宣称可用。
- 未覆盖异步校验、远程数据源取消/缓存、大量字段性能、移动端渲染。
- jsdom 与真实浏览器在布局、事件、ResizeObserver 等行为上存在差异。

---

## 5. 对原设计文档的建议修订

建议在正式评审前修订以下表述：

1. 将所有「Designable 2.x」改为「Designable 1.0.0-beta.45（1.x）」或明确标注「上游无 2.x，待选型确认」。
2. 在版本基线中写明 React 17.0.2、antd 4.22.8 的硬约束，以及 React 18/19 需要额外验证或 fork。
3. 修正 Formily API 章节：补充导入来源，修正 `onFormValuesChange` 回调签名，补充 `useField` / `useFieldSchema` 的上下文要求。
4. 在 Designer Adapter 章节补充：ESM/CJS 与 less 构建约束、workspace 初始化顺序、Setter 的上下文依赖。
5. 在第 19 节增加「Designable 维护状态与 fork 策略」作为独立风险项。

> 本文档只记录验证结果与建议，不直接改写架构基线；是否修订基线由方案负责人确认。
