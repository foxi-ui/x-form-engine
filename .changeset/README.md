# Changesets

本目录用于记录变更集。流程：

1. `pnpm changeset` 选择变更的包与 bump 类型，生成变更记录；
2. `pnpm version-packages` 更新版本号与各包 `CHANGELOG.md`；
3. `pnpm build` 后执行 `pnpm publish:beta` 发布到私有 registry。

详见 [Changesets 文档](https://github.com/changesets/changesets)。
