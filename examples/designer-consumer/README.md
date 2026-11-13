# designer-consumer — 外部项目消费验证（Task 9.4）

独立于主仓库 pnpm workspace 的消费项目：**不引用仓库源码路径**，仅通过 `pnpm pack`
产物（`.packs/*.tgz`）消费 `@x-form-engine/*` 公开 API，验证发布出口与第三方扩展模式。

## 重新生成 tarballs（首次 / 包版本变更后）

在主仓库根目录执行，把 10 个 publishable 包打进本目录：

```bash
cd ../../   # 回到仓库根
mkdir -p examples/designer-consumer/.packs
for p in types core components designer-core designer-designable \
         materials-basic setters-basic plugins-basic setters-advanced plugins-advanced; do
  pnpm --filter "@x-form-engine/$p" pack --pack-destination "$(pwd)/examples/designer-consumer/.packs"
done
```

> 前置：先在仓库根 `pnpm build`，确保 `dist` 产物与 `exports` 指向一致（Task 9.3）。

## 安装与验证

```bash
cd examples/designer-consumer
pnpm install
pnpm test          # vitest：6 用例（createDesigner + Adapter + 基础/高级扩展 + 第三方自定义）
pnpm typecheck     # tsc --noEmit，moduleResolution: bundler 解析 dist/*.d.ts
```

## 验证内容

- `createDesigner` 独立实例化并注册 `basicMaterials` / `basicSetters` / `basicPlugins`。
- 第三方自定义 Material（`business-user-select`）、Setter、Plugin 经公开 API 注册与卸载。
- 高级扩展包（`advancedSetters` / `advancedPlugins`）独立安装，不依赖基础包。
- `createDesignableAdapter` 创建 workspace 并返回生命周期协议。

## 关键配置

- `pnpm.overrides`：把传递依赖 `@x-form-engine/*` 固定到本地 tarball（否则 pnpm 走 registry）。
- vitest `server.deps.inline`：让 `react/jsx-runtime`（react@17 无 exports map）走 bundler 解析。
