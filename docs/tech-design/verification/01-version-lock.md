# 01. 依赖版本锁定验证

> 对应第 19 节第 1 项：锁定 React、TypeScript、Formily 2.x、Designable 2.x 的具体版本。

## 1. 验证目标

确定一组**可安装、可通过严格 TypeScript 检查、可通过运行用例**的版本组合，并识别原方案中无法按字面落地的版本表述。

## 2. 验证过程

### 2.1 查询上游实际版本

使用 npm 镜像 `https://registry.npmmirror.com/` 查询：

```bash
npm view @formily/core version
npm view @formily/react version
npm view @formily/antd version
npm view @designable/core version
npm view @designable/react version
npm view @designable/formily-antd version
```

结果：

| 包 | `latest` | 说明 |
|---|---|---|
| `@formily/core` / `@formily/react` / `@formily/antd` | `2.3.7` | 2.x 最新稳定版 |
| `@designable/core` / `@designable/react` | `1.0.0-beta.45` | **没有 2.x** |
| `@designable/formily-antd` / `@designable/formily-setters` | `1.0.0-beta.45` | 同上 |

`@designable/core` 全部发布时间中，最后一个版本为：

```text
"1.0.0-beta.45": "2022-02-28T04:00:55.725Z"
```

证据：`appendix/designable-publish-time.txt`。

### 2.2 核对 peerDependencies

| 包 | 关键 peer 约束 |
|---|---|
| `@formily/react@2.3.7` | `react >=16.8.0`、`react-dom >=16.8.0`、`react-is >=16.8.0` |
| `@formily/antd@2.3.7` | `antd <=4.22.8`、`@ant-design/icons 4.x`、`react >=16.8.0` |
| `@designable/react@1.0.0-beta.45` | **`react: 16.x \|\| 17.x`**、`antd ^4.15.4` |
| `@designable/formily-antd@1.0.0-beta.45` | `antd ^4.0.0`、`@formily/antd ^2.0.2`、`react >=16.8.0 \|\| >=17.0.0` |

证据：`appendix/peer-deps-formily.txt`、`appendix/peer-deps-designable.txt`。

### 2.3 确定候选组合

为同时满足 Formily 与 Designable 的 peer 约束，选择：

```text
React 17.0.2 + antd 4.22.8 + @formily/* 2.3.7 + @designable/* 1.0.0-beta.45
```

没有选择 React 18/19 的原因：

- `@designable/react` 的 peer 明确只声明 16.x 和 17.x；
- 本次目标是为原方案找到可复现的基线，而不是验证上游未声明的兼容性；
- 如需 React 18/19，应先做独立 spike 或维护 fork，不能直接写入架构基线。

没有选择 antd 4.24.x 的原因：

- `@formily/antd@2.3.7` 的 peer 明确限制 `antd <=4.22.8`。

### 2.4 实际安装与检查

在 `verification/` 中按上述版本安装，并执行：

```bash
pnpm install
pnpm typecheck
pnpm test
```

解析后的实际版本见 `appendix/resolved-versions.txt`。

## 3. 验证结果

### 3.1 锁定组合

| 依赖 | 锁定版本 |
|---|---|
| Node | 22.23.2 |
| pnpm | 10.34.5 |
| TypeScript | 5.9.3 |
| React / React DOM / react-is | 17.0.2 |
| antd | 4.22.8 |
| @ant-design/icons | 4.8.3 |
| @formily/core / react / json-schema / reactive / reactive-react / shared / validator | 2.3.7 |
| @formily/antd | 2.3.7 |
| @designable/core / react / shared | 1.0.0-beta.45 |
| @designable/formily-antd / formily-setters / formily-transformer | 1.0.0-beta.45 |
| Vitest | 3.2.7 |
| jsdom | 26.1.0 |
| less | 4.9.1 |

### 3.2 安装与编译结论

- 安装成功。
- `pnpm typecheck` 通过（`strict: true`，`skipLibCheck: true`）。
- `pnpm test`：6 个测试文件、35 个用例全部通过，退出码 0。

原始输出：`appendix/typecheck.txt`、`appendix/test-run.txt`。

### 3.3 必须开启 `skipLibCheck`

关闭 `skipLibCheck` 后类型检查失败（退出码 2），错误来自第三方声明而非本仓库代码：

```text
@formily/antd/esm/form-drawer/index.d.ts: IDrawerProps 与 antd DrawerProps 的 onClose 不兼容
rc-tree/lib/NodeList.d.ts: TreeDataType 不满足 BasicDataNode
resize-observer-polyfill: contentRect 重复声明类型不一致
```

证据：`appendix/typecheck-without-skip-lib-check.txt`。

**结论**：正式工程需要 `skipLibCheck: true`，或针对上述第三方声明做定向 `paths`/类型补丁。不能假设 Formily + antd 的类型声明在当前组合下完全自洽。

## 4. 风险与建议

| 风险 | 影响 | 建议 |
|---|---|---|
| Designable 无 2.x，最后发布于 2022 年 | 方案文档版本表述失真；长期维护风险 | 修订文档为 1.x；在 M0 决策是否 fork/自研 |
| React 17 已非新项目主流版本 | 无法直接使用 React 18/19 生态能力 | 设计器隔离；运行时 Renderer 与设计器解耦，分别评估 React 版本 |
| antd 4 受 Formily 约束 | 无法升级 antd 5 | PC 组件层保持可替换；如必须 antd 5，改用 `@formily/antd-v5` 并重新验证 Designable |
| `react-sticky-box` peer 声明到 React 16 | 潜在运行时兼容问题 | 在真实组件回归中重点覆盖 Formily Array 类组件 |
| 关闭 `skipLibCheck` 后第三方类型报错 | 严格类型治理受限 | 记录豁免清单；升级依赖时复查 |
| Designable CJS 直接 `require('.less')` | Node/SSR 场景无法直接加载 | 设计器只走浏览器构建；使用 ESM + 明确 CSS 构建链路 |

## 5. 结论

**第 1 项结论：部分通过。**

- 已锁定一组真实可安装、可编译、可运行的版本组合。
- 原方案中的「Designable 2.x」无法按字面成立，必须修订为 1.x 或重新选型。
- 该组合可以作为 M0 的验证基线，但不建议在未完成维护性评估前直接作为长期生产基线。
