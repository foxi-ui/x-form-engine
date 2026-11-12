# 06. 移动端渲染

> 状态：draft ｜ 最后更新：2026-11-10

**本章目标**：用同一个 Schema 渲染移动端表单，了解移动端物料入口、七类 P0 组件的行为差异，以及 PC 专用组件在移动端的回退诊断机制。

## 1. 移动端物料入口

移动端组件通过独立子路径引入，与 PC 端互不混入：

```ts
import {
  basicComponents as mobileBasicComponents,
  basicDecorators as mobileBasicDecorators,
} from '@x-form-engine/components/mobile';
```

- PC 入口 `@x-form-engine/components` 提供桌面 `antd` 实现；
- 移动端入口 `@x-form-engine/components/mobile` 提供 `antd-mobile` 实现；
- 两个入口**共享同一份组件协议**（`ComponentProtocolDefinition`），因此业务 Value 协议完全一致。

移动端依赖 `antd-mobile@5.43.0`，已作为 `@x-form-engine/components` 的依赖带入。如果你的业务代码会直接使用 `antd-mobile` 的组件（如示例里的 `Button`），建议显式安装：

```bash
pnpm add antd-mobile@5.43.0
```

## 2. 创建移动端 Engine

```ts
import {
  basicComponents as mobileBasicComponents,
  basicDecorators as mobileBasicDecorators,
} from '@x-form-engine/components/mobile';
import { createFormEngine, defaultFormattersPlugin } from '@x-form-engine/sdk';

const engine = createFormEngine({
  platform: 'mobile',            // 设定默认平台
  locale: 'zh-CN',
  components: mobileBasicComponents,
  decorators: mobileBasicDecorators,
  plugins: [defaultFormattersPlugin],
});
```

与 PC 端唯一不同的是 `platform: 'mobile'` 以及传入的物料是移动端入口。`FormRenderer` 会优先使用 Engine 的默认平台，也可按表单覆盖：

```tsx
<FormRenderer platform="mobile" ... />   // 单张表单覆盖为 mobile
<FormRenderer platform="pc" ... />       // 单张表单覆盖为 pc
```

> `platform` 的解析顺序：`FormRenderer` 的 `platform` prop → Engine 的 `options.platform` → `'pc'`。

## 3. 七类 P0 移动组件

| `x-component` | 值类型 | 底层实现 | 说明 |
|---|---|---|---|
| `Input` | `string` | antd-mobile Input | 单行文本 |
| `Textarea` | `string` | antd-mobile TextArea | 多行文本 |
| `Number` | `number \| null` | antd-mobile Input `type="number"` | 组件内做字符串 ↔ 数字映射；**不强制 `min` / `max`** |
| `Select` | 单选标量 / 多选数组 | Picker（单选） / Selector（多选） | `x-component-props.multiple: true` 切换多选 |
| `Radio` | `string \| number` | antd-mobile Radio.Group | 单选 |
| `Checkbox` | `(string \| number)[]` | antd-mobile Checkbox.Group | 多选 |
| `DatePicker` | `'YYYY-MM-DD'` 字符串 | antd-mobile DatePicker + List.Item | Date ↔ 字符串映射；按本地日期格式化 |

装饰器提供 `FormItem`（来自 `mobileBasicDecorators`），负责标签、必填标记与校验提示。

### 3.1 Value 协议与 PC 端一致

移动端与 PC 端的 `values` 结构完全一致——同一份 Schema 在两个平台提交出的业务值相同。以员工登记表为例，移动端提交的 `values` 同样形如：

```json
{
  "name": "张三",
  "department": "rd",
  "joinDate": "2026-11-01",
  "probationMonths": 3,
  "regularDate": "2027-02-01"
}
```

这是移动端组件在接入时做「类型收窄/映射」的结果，业务层不需要感知平台差异。

### 3.2 值得注意的实现细节

- **Number**：Formily 侧值为 `number | null`，antd-mobile Input 只接受字符串；组件在 `connect` 的 `mapProps` 里双向映射。空串/非法输入解析为 `null`。
- **DatePicker**：Formily 侧值为 `'YYYY-MM-DD'` 字符串；组件把 `Date` 对象写回字符串时按**本地年月日**格式化，避免 `toISOString()` 的时区偏移。
- **Select**：单选复用 Picker（单列滚动），多选复用 Selector；选项来源统一为 Formily 的 `enum`（`field.dataSource`），与 `x-component-props.options` 二选一。
- **PC 专属 props**：`style: { width: 320 }`、`rows` 等 PC 专属 props 会被 antd-mobile 静默忽略，不抛错；需要移动端样式时用移动端支持的 props 或外层样式。

## 4. 平台回退与诊断

如果 Schema 引用了某个**只有 PC 实现**的组件（或装饰器），移动端会按字段回退到 PC 实现，并发出一个诊断：

```ts
interface PlatformFallbackDiagnostic {
  kind: 'component' | 'decorator';
  name: string;                       // 组件/装饰器名
  requestedPlatform: Platform;        // 请求的平台，如 'mobile'
  fallbackPlatform: Platform;         // 实际回退到的平台，如 'pc'
}
```

诊断有三个出口：

1. **`onDiagnostic` 回调**（推荐）：

   ```tsx
   <FormRenderer
     platform="mobile"
     schema={schema}
     onDiagnostic={(diagnostic) => {
       console.warn(`${diagnostic.name} 缺少 mobile 实现，回退到 ${diagnostic.fallbackPlatform}`);
     }}
   />
   ```

2. **Engine 事件 `component:platform-fallback`**：

   ```ts
   engine.events.on('component:platform-fallback', (diagnostic) => {
     // 统一埋点或上报
   });
   ```

3. **`debug: true` 时的控制台告警**：创建 Engine 时传 `debug: true`，回退会额外 `console.warn`。

诊断只针对**当前 Schema 实际引用**的组件，且同一个 `kind:name` 每次挂载只报一次，不会因为字段重复引用而刷屏。

> 回退是「保证表单可用」的兜底，不是「两端体验一致」的承诺。PC 组件在移动端可能样式错乱或交互不友好，应及时补充移动端实现。

## 5. 移动端只读渲染

只读渲染器同样支持移动端平台，通过 `platform` 指定：

```tsx
import { ReadonlyRenderer } from '@x-form-engine/sdk';

<ReadonlyRenderer
  platform="mobile"
  schema={schema}
  snapshot={submitted.snapshot}
  values={submitted.values}
/>
```

只读组件的移动端实现来自 `binding.readonly.mobile`（缺失时回退 `default`）。只读渲染器不创建编辑态 Form，行为与 PC 一致，详见第 05 章。

## 6. 完整示例：移动端员工登记

移动端示例复用第 02/03 章的同一份 Schema 与 scope，只换 Engine 物料和平台：

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'antd-mobile';
import {
  basicComponents as mobileBasicComponents,
  basicDecorators as mobileBasicDecorators,
} from '@x-form-engine/components/mobile';
import {
  createFormEngine,
  defaultFormattersPlugin,
  FormEngineProvider,
  FormRenderer,
} from '@x-form-engine/sdk';
import type {
  FormRendererInstance,
  FormSubmitResult,
  PlatformFallbackDiagnostic,
} from '@x-form-engine/sdk';
import {
  employeeOnboardingSchema,
  employeeOnboardingScope,
} from './schema';

export default function EmployeeOnboardingMobile(): JSX.Element {
  const engine = useMemo(
    () =>
      createFormEngine({
        platform: 'mobile',
        locale: 'zh-CN',
        components: mobileBasicComponents,
        decorators: mobileBasicDecorators,
        plugins: [defaultFormattersPlugin],
      }),
    []
  );

  useEffect(() => () => engine.dispose(), [engine]);

  const formRef = useRef<FormRendererInstance>(null);
  const [diagnostics, setDiagnostics] = useState<PlatformFallbackDiagnostic[]>([]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const result: FormSubmitResult = await formRef.current!.submit();
      console.info('values =', result.values);
      console.info('snapshot =', result.snapshot);
      // 交给业务保存，同第 04 章
    } catch {
      // 校验失败
    }
  };

  return (
    <FormEngineProvider engine={engine}>
      <FormRenderer
        ref={formRef}
        platform="mobile"
        schema={employeeOnboardingSchema}
        scope={employeeOnboardingScope}
        schemaId="employee-onboarding"
        schemaVersion={1}
        onDiagnostic={(d) => setDiagnostics((prev) => [...prev, d])}
      />

      <Button block color="primary" onClick={handleSubmit} style={{ marginTop: 16 }}>
        提交
      </Button>

      {diagnostics.length > 0 ? (
        <ul>
          {diagnostics.map((d) => (
            <li key={`${d.kind}:${d.name}`}>
              {d.name} 缺少 {d.requestedPlatform} 实现，回退到 {d.fallbackPlatform}
            </li>
          ))}
        </ul>
      ) : null}
    </FormEngineProvider>
  );
}
```

完整可复制的移动端示例（含一个 PC 专用组件以演示回退诊断）见
[`examples/employee-onboarding/EmployeeOnboardingMobileForm.tsx`](examples/employee-onboarding/EmployeeOnboardingMobileForm.tsx)。

## 7. 移动端 bundle 纯度

移动端入口不引入桌面 `antd` 或 `@formily/antd`，避免桌面产物混入移动端包。仓库的 `apps/mobile-demo` 在 `build` 后运行 `scripts/check-bundle.mjs`，断言产物里不出现桌面标记（`ant-formily-item`、`ant-picker`、`@formily/antd` 等）。业务侧如需同样保障，可在打包产物上做类似检查。

## 8. 常见坑

| 现象 | 原因 | 处理 |
|---|---|---|
| 移动端渲染成 PC 组件 | 忘了用 `@x-form-engine/components/mobile` 的物料 | 移动端 Engine 传移动端 `basicComponents` |
| 某些 props 不生效 | `width` / `rows` 等是 PC 专属 props，antd-mobile 静默忽略 | 用移动端支持的 props 或外层样式 |
| `Number` 的 `min` / `max` 不限制输入 | 移动端 Number 是普通 `type="number"` 输入框 | 用 `x-validator` 校验范围 |
| 日期少一天 | 用了 `toISOString()` 做格式化 | 组件内部已按本地日期处理；自定义格式化时避免 UTC 偏移 |
| 回退诊断刷屏 | 同一组件被多个字段引用 | 引擎已按 `kind:name` 去重，每次挂载只报一次 |
| 想读回退诊断但拿不到 | 没传 `onDiagnostic` 或没订阅事件 | 二选一；`debug: true` 也能看到控制台告警 |

## 9. 下一章

下一章（待编写）会介绍设计器产出的 Schema 如何在业务侧渲染，以及设计器物料与业务渲染组件如何共用同一份组件定义。

→ [`07-designer.md`](07-designer.md)（占位）
