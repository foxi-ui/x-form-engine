# Phase 8 高级扩展示例 — 完成报告

> 依据：`docs/architecture/02-form-engine-v2-task.md` Phase 8（Task 8.1–8.2）
> 分支：`feat/form-engine-v2`
> 完成日期：2026-11-13
> 结论：Phase 8 验收达成 —— 新增 `@x-form-engine/setters-advanced`（ExpressionSetter 高级 Setter）与 `@x-form-engine/plugins-advanced`（表达式配置示例插件），验证第三方通过公开 `SetterRegistry` / `DesignerPlugin` / `SchemaEditor` 扩展，不访问 Core 私有字段、不复制基础能力。

---

## 1. 交付物清单

| 文件 | 动作 | 内容 |
|---|---|---|
| `packages/setters-advanced/{package.json,tsconfig.json,vitest.config.ts,vitest.setup.ts}` | 新增 | 高级 Setter 包（deps：types + antd + react，无 Designable / 基础包） |
| `packages/setters-advanced/src/expression-setter.tsx` | 新增 | `ExpressionSetter`（受控 TextArea + `validateExpression` 校验 `{{ }}` 平衡） |
| `packages/setters-advanced/src/index.ts` | 新增 | `advancedSetters: SetterDefinition[]` |
| `packages/plugins-advanced/{package.json,tsconfig.json,vitest.config.ts}` | 新增 | 高级插件包（deps：designer-core + types + setters-advanced） |
| `packages/plugins-advanced/src/plugins.ts` | 新增 | `expressionConfigPlugin`（注册 Setter + `apply-expression` 命令） |
| `packages/plugins-advanced/src/index.ts` | 新增 | `advancedPlugins: DesignerPlugin[]` |

测试：setters-advanced 1 文件 / 3 用例、plugins-advanced 1 文件 / 4 用例。

---

## 2. 各 Task 完成情况

- **Task 8.1 setters-advanced** ✅：`ExpressionSetter` 受控、支持 disabled/readonly、`validateExpression` 校验表达式（非字符串/`{{ }}` 不平衡返回 `valid:false`）；基于 `SetterDefinition`，UI 无关 Designable，不依赖基础包。
- **Task 8.2 plugins-advanced** ✅：`expressionConfigPlugin` 经公开 `SetterRegistry.registerMany` 注册高级 Setter；经 `SchemaEditor.update` 提供 `apply-expression` 命令，把表达式写入 Formily 原生 `x-reactions` 扩展数据并保留原生字段；卸载清理资源、重复安装抛 `PLUGIN_CONFLICT`。

---

## 3. 关键裁定

1. **表达式写入 Formily 原生 `x-reactions` 而非 `x-engine`**：`x-engine` 有已知键白名单（`validator.ts` 的 `KNOWN_X_ENGINE_KEYS`），未知键（如 `expression`）会告警；表达式本质是 Formily 原生能力（`x-reactions`），故放原生字段，符合「保留 Formily 原生属性」。
2. **高级包不依赖基础包**：`setters-advanced` 仅依赖 types + antd + react；`plugins-advanced` 依赖 designer-core + types + setters-advanced，均不依赖 materials-basic / setters-basic / plugins-basic。
3. **ExpressionSetter 的「高级」体现在校验**（`validate` 挂在 `SetterDefinition`），组件本身仍是受控 TextArea，与基础 StringSetter 同构但不重复（语义不同：表达式 + 校验）。

---

## 4. 验证结果

```text
setters-advanced  vitest → 1 文件 / 3 用例全绿
plugins-advanced  vitest → 1 文件 / 4 用例全绿
两包 typecheck          → 0 错误
两包 build              → ESM + CJS + DTS 成功
pnpm -r typecheck       → 18 包 + 3 app 全部 Done
pnpm test:run           → 76 文件 / 370 用例全绿
```

---

## 5. 遗留与下一阶段

- **其余高级 Setter**（ConditionSetter / DataSourceSetter / PermissionSetter / I18nSetter / ReactionsSetter / RemoteOptionsSetter）与 **其余高级插件**（条件/数据源/权限/国际化/Reactions）按任务书「不要求一次性全部完成」，留待后续按需扩展。
- **ExpressionSetter 的表达式编译/执行**：目前只编辑与校验字符串，不编译为 Formily reaction 函数；真实编译属后续能力。

下一步进入 **Phase 9（统一切换、文档与发布验证）**：更新所有公开入口 / Demo / 测试 / 文档 / Package 依赖导出，清理或兼容旧入口，完整构建、类型检查、测试与发布验证；更新 `AGENTS.md` 与文档地图，写入 C1–C13 约束，消除长期双轨 Designer。
