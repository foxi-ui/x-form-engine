# verification

一次性技术验证工程，用于验证《Form Engine 企业级前端渲染引擎设计方案》第 19 节的落地前置事项。

> 这是 spike，不是正式包结构。验证结论与过程见 `docs/tech-design/verification/`。

## 运行

```bash
pnpm install
pnpm typecheck
pnpm test
```

## 目录

| 文件 | 对应项 |
|---|---|
| `src/02-formily-api.test.tsx` | Formily API 导出位置、类型、Scope |
| `src/03-formily-behavior.test.tsx` | x-reactions、自定义组件、Effects、动态校验 |
| `src/04-designable.test.tsx` | Designable 物料、Setter、Schema 回写 |
| `src/06-value-snapshot-contract.test.ts` | 人员 / 部门 / 字典 Value 与 Snapshot 协议 |
| `src/07-permission-contract.test.ts` | 前端权限收敛与 fail-closed 语义 |
| `src/08-migration-protocol.test.ts` | 版本识别与有序迁移链协议 |

## 环境约束

- React 17.0.2 + antd 4.22.8：满足 Designable 1.x 的 peer 约束。
- `skipLibCheck: true`：Formily / antd / rc-tree 的第三方声明存在冲突。
- Designable 与 `@formily/antd` 的 CJS 产物直接 `require('.less')`，因此 Vitest 配置将相关包指向 ESM 产物，并安装 `less`。
- 仅验证 API 与协议，不包含真实浏览器拖拽 E2E 和真实后端联调。
