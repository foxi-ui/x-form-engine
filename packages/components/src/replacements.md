# @formily/antd 借入组件替换清单

P0 基础组件（`src/definitions/basic.ts`）的 PC 实现直接借用 `@formily/antd@2.3.7`
已连接组件。`@formily/antd` 当前 peer 上限为 antd 4.22.8；升级 antd 5 时需逐项替换为
自有实现（或升级后的等价组件），本文件是替换追踪清单。

| 组件名 | 上游来源 |
|---|---|
| Input | `@formily/antd` 的 `Input` |
| Textarea | `@formily/antd` 的 `Input.TextArea` |
| Number | `@formily/antd` 的 `NumberPicker` |
| Select | `@formily/antd` 的 `Select` |
| Radio | `@formily/antd` 的 `Radio.Group` |
| Checkbox | `@formily/antd` 的 `Checkbox.Group` |
| DatePicker | `@formily/antd` 的 `DatePicker` |
