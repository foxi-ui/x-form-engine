# 兼容性基线报告（Phase 0 / Task 0.1）

> 依据：`docs/architecture/02-form-engine-v2-task.md` Task 0.1
> 审计日期：2026-11-12
> 原则：以下均为仓库 lockfile / 实际安装 / 源码实测结果，不做无授权的大版本升级。

---

## 1. 实际依赖版本

### React / React DOM

| 依赖 | 声明版本 | 实际安装版本 |
|---|---|---|
| `react` | `17.0.2` | `17.0.2`（单一实例，`node_modules/.pnpm/react@17.0.2`） |
| `react-dom` | `17.0.2` | `17.0.2`（单一实例，`react-dom@17.0.2_react@17.0.2`） |
| `@types/react` | `17.0.0` | `17.0.0` |
| `@types/react-dom` | `17.0.0` | `17.0.0` |

结论：**React / React DOM 无重复实例**；类型定义与运行时主版本一致（17）。

### antd / antd-mobile / 图标

| 依赖 | 版本 |
|---|---|
| `antd` | `4.22.8` |
| `antd-mobile` | `5.43.0` |
| `@ant-design/icons` | `4.8.3` |

### Formily 全家桶

所有 Formily 包均为 **`2.3.7`**（单一版本，无跨版本混用）：

- `@formily/core`
- `@formily/react`
- `@formily/json-schema`
- `@formily/path`
- `@formily/reactive`
- `@formily/reactive-react`
- `@formily/shared`
- `@formily/antd`

注意：`@formily/react`、`@formily/antd` 在 `node_modules/.pnpm` 内存在 **两个 peer 变体目录**（`pnpm list` 显示 `(2 variations)`），原因是 `react-is` peer 解析不同；`@formily/core` 等无 React peer 的包是单目录。应用层通过 vite `resolve.dedupe` 保证运行时单实例（见 §5）。

### Designable 全家桶

所有 Designable 包均为 **`1.0.0-beta.45`**：

- `@designable/core`
- `@designable/react`
- `@designable/react-settings-form`
- `@designable/formily-antd`
- `@designable/formily-setters`
- `@designable/formily-transformer`
- `@designable/shared`

`@designable/react`、`@designable/react-settings-form` 同样存在两个 peer 变体目录，`@designable/core` 是单目录。

### `react-is` 的多个实例（需要关注）

`node_modules/.pnpm` 实际存在：

| react-is 版本 | 来源（推断） |
|---|---|
| `16.13.1` | antd4 依赖链 |
| `17.0.2` | 仓库显式声明（components/designer/formily/renderer/mobile-demo） |
| `18.3.1` | 部分测试/工具链 peer |
| `19.3.1` | `designer-demo` 未显式声明 `react-is`，pnpm `autoInstallPeers` 给 `@formily/reactive-react` 解析到最新 |

`react-is@19.3.1` 与 React 17 不一致，是潜在风险点；目前靠 vite `resolve.dedupe` 把 React/Formily/Designable 关键上下文收敛为单实例，未发现功能回归，但拆包/发布后必须重新验证。

---

## 2. 工具链与脚本

| 项 | 值 |
|---|---|
| 包管理器 | `pnpm@10.34.5`（`package.json.packageManager`） |
| TypeScript | `5.9.3` |
| Vitest | `3.2.7` |
| tsup | `^9.0.0` |
| jsdom | `26.1.0` |
| Vite | `^5`（demo） |
| changesets | `^3.0.3` |

根脚本：

```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "typecheck": "pnpm -r typecheck",
  "build": "pnpm --filter './packages/*' build"
}
```

---

## 3. peerDependencies 策略现状

**现状：所有包均未声明 `peerDependencies`。** 各包把 React / Formily / Designable / antd 直接放在 `dependencies` 中（例如 `components` 依赖 `react`、`antd`、`antd-mobile`；`designer` 依赖 Designable 全家桶；`formily/renderer` 依赖 `react`、`@formily/*`）。

这带来两个问题：

1. 宿主项目可能因 pnpm peer 差异产生多实例（Demo 靠 `resolve.dedupe` 兜底）。
2. 公共包对外发布时会把宿主依赖写进 `dependencies`，不利于外部项目统一 React/antd 实例。

建议策略（进入 Phase 1/9 时落地，不擅自升级版本）：

- `react` / `react-dom`：公共 UI 包改为 `peerDependencies`（`^17.0.0`）。
- `@formily/*`：`formily`、`renderer`、`components`、`designer` 的宿主 Formily 依赖改为 peer 或外部化。
- `antd` / `antd-mobile`：`components`、`designer` 的 UI 宿主依赖改为 peer（`antd` `^4.22.8`、`antd-mobile` `^5.43.0`）。
- `@designable/*`：Designable 相关依赖只允许出现在未来的 `designer-designable` Adapter 包中，且作为 peer/外部依赖，不允许进入 `designer-core`。
- `react-is`：在 workspace 内显式钉住 `17.0.2`，避免 `autoInstallPeers` 解析到 19。

---

## 4. 构建产物与导出格式

每个公共包 `build` 脚本统一为：

```bash
tsup src/index.ts --format esm,cjs --dts --sourcemap --clean --out-dir dist
```

（`components` 额外构建 `mobile.ts` 子入口。）

实测 `packages/renderer/dist/index.js`：宿主依赖（`react`、`react-dom`、`@formily/*`、`@x-form-engine/*`）保持为 `import` 语句，**没有被打包进产物**。即 tsup 对 dependencies 默认外部化，构建产物不包含宿主依赖。

产物文件（以 `renderer` 为例）：

- `index.js`（ESM）
- `index.cjs`（CJS）
- `index.d.ts` / `index.d.cts`（类型声明）
- `index.js.map` / `index.cjs.map`

`publishConfig` 已为各包提供发布态 `main` / `types` / `exports`（ESM + CJS + DTS）。

---

## 5. Designable 与 React17 / antd4 的兼容验证方式

- **锁版本**：Designable 固定 `1.0.0-beta.45`，antd 固定 `4.22.8`，React 固定 `17.0.2`。
- **运行时单实例**：`apps/designer-demo/vite.config.ts` 通过 `resolve.dedupe` 收敛 `react`、`react-dom`、`@formily/{antd,core,json-schema,react}`、`@designable/{core,react,react-settings-form}`。
- **smoke 测试**：`packages/designer/src/__tests__/designable-smoke.test.tsx`（`Designable 依赖链在 designer 包内可运行`）。
- **引导顺序测试**：`packages/designer/src/__tests__/designer.test.ts`（`启动顺序正确：当前树非空且物料可被匹配`）。
- **画布/schema 往返**：`packages/designer/src/__tests__/schema-io.test.ts`、`materials.test.tsx`、`preview.test.tsx`、`setters.test.tsx`。
- **完整 Workbench**：`apps/designer-demo`（`pnpm --filter designer-demo dev|build`）。

当前验证结果：`pnpm -r typecheck` 全绿；`pnpm test:run` 49 文件 / 201 用例全绿。

---

## 6. 依赖边界现状小结

- React / React DOM：单一 17.0.2，无重复。
- Formily：单一 2.3.7 版本，但存在 peer 变体目录。
- Designable：单一 1.0.0-beta.45 版本，但存在 peer 变体目录。
- `react-is`：存在 16/17/18/19 四个实例，其中 19 由 `designer-demo` 的 `autoInstallPeers` 引入，需在发布前治理。
- 构建产物：宿主依赖外部化，不打包进 dist。
- peerDependencies：当前全部缺失，是 Phase 1/9 需要补齐的发布边界。

---

## 7. 风险与暂停条件对照

- 无“找不到目标文档/多个候选版本”问题（`docs/architecture/01~03` 唯一）。
- 无“源码与架构决策重大冲突”需暂停：`FormSchemaDocument` 与任务书 C1 描述一致（`schema: Record<string, unknown>`，无 `designerMetadata`，待 Phase 1 兼容扩展）。
- Plugin Manager 行为与任务书描述一致，抽取泛型核心可行。
- 唯一需提前治理的依赖风险是 `react-is` 多实例与 peerDependencies 缺失，属可解问题，不触发暂停条件。
