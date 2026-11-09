# 员工入职登记示例

本目录是《业务接入指南》的完整示例，包含：

| 文件 | 作用 |
|---|---|
| `schema.ts` | 表单 Schema、业务值类型、scope 计算函数、Schema 文档信封 |
| `engine.ts` | 创建并配置 `FormEngine` |
| `EmployeeOnboardingForm.tsx` | 完整表单组件：渲染 → 校验 → 提交 → 保存 |

## 放进已有工程

1. 确认工程满足运行环境：React 17.0.2、antd 4.22.8（见指南 `01-quickstart.md`）。
2. 应用入口引入一次 antd 样式：

   ```ts
   import 'antd/dist/antd.css';
   ```

3. 把本目录三个 `.ts/.tsx` 文件复制进业务工程（保持相对导入路径，或改成你的目录结构）。
4. 渲染组件，并传入真实保存函数：

   ```tsx
   import { EmployeeOnboardingForm } from './employee-onboarding/EmployeeOnboardingForm';

   function Page() {
     return (
       <EmployeeOnboardingForm
         save={async (result) => {
           await fetch('/api/employee-onboarding', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               schemaId: result.schemaId,
               schemaVersion: result.schemaVersion,
               values: result.values,
               snapshot: result.snapshot,
             }),
           });
         }}
         onSaved={() => {
           // 关闭弹窗 / 刷新列表 / 跳转详情
         }}
       />
     );
   }
   ```

## 想看真实运行效果

仓库内的 `apps/playground` 渲染了同一张员工登记表（姓名 / 部门 / 入职日期 / 备注），
并演示提交后生成 Value + 候选 Snapshot：

```bash
pnpm --filter playground dev
```
