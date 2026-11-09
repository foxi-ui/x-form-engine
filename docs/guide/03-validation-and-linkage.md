# 03. 校验、联动与实例 API

> 状态：draft ｜ 最后更新：2026-11-09

**本章目标**：给员工登记表加上必填校验、条件显隐（部门选「其他」时填写部门说明）、自动计算的「预计转正日期」，并学会用实例 API 读写、校验和重置表单。

## 1. 校验：`x-validator`

`x-validator` 直接复用 Formily 的校验能力，数组里可以放多条规则：

```ts
{
  type: 'string',
  title: '姓名',
  'x-decorator': 'FormItem',
  'x-component': 'Input',
  'x-validator': [{ required: true, message: '请输入姓名' }],
}
```

多条规则按顺序执行：

```ts
'x-validator': [
  { required: true, message: '请输入姓名' },
  { max: 20, message: '姓名不能超过 20 个字符' },
]
```

需要更复杂的判断时，可以传函数校验器：

```ts
'x-validator': [
  { required: true, message: '请输入姓名' },
  (value: unknown) =>
    typeof value === 'string' && value.length <= 20
      ? ''
      : '姓名不能超过 20 个字符',
]
```

> 函数校验器无法序列化为 JSON，只适合写在代码里的 Schema，或从模块导入后组装。
> 设计器导出的 JSON 请使用可序列化的规则（如 `required`）。

校验失败时：

- 字段下方显示对应 `message`；
- `formRef.current.validate()` 与 `formRef.current.submit()` 都会 **reject**；
- reject 出来的值不是 `Error` 实例，不要依赖 `error.message` 展示信息。

```ts
try {
  await formRef.current!.validate();
} catch {
  // 统一提示即可；具体字段错误已由 FormItem 展示
  message.error('请先补全必填项');
}
```

## 2. 联动：`x-reactions`

员工登记表需要两处联动：

1. 部门选择「其他」时，显示并必填「部门说明」；
2. 填写入职日期和试用期后，自动算出「预计转正日期」。

### 2.1 条件显隐

在字段上声明 `x-reactions.dependencies` 与 `fulfill.state.visible`：

```ts
departmentOther: {
  type: 'string',
  title: '部门说明',
  'x-decorator': 'FormItem',
  'x-component': 'Input',
  'x-reactions': {
    dependencies: ['department'],
    fulfill: {
      state: {
        visible: '{{ $deps[0] === "other" }}',
      },
    },
  },
  'x-validator': [{ required: true, message: '请填写部门名称' }],
},
```

- `dependencies` 里写**字段 key**，不是 `title`；
- `$deps[0]` 对应第一个依赖的当前值；
- 表达式必须包在 `{{ }}` 里，引擎会按 Formily 表达式求值。

> 当前版本（Formily 2.3.7）中，字段变为不可见后，其值会变为 `undefined`
>（`getValues()` 里取不到实际值，JSON 序列化时该 key 通常不出现）。
> 因此部门从「其他」切回「研发部」时，不需要手工清理 `departmentOther`。
> 注意快照仍可能保留该字段的元信息（没有 `value`），见第 04 章。

### 2.2 派生值 + `scope` 函数

「预计转正日期」由入职日期 + 试用期月数计算。把计算函数通过 `scope` 注入，Schema 表达式里按名字调用：

```ts
export function addMonths(date: unknown, months: unknown): string {
  if (typeof date !== 'string' || date === '') {
    return '';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  parsed.setMonth(parsed.getMonth() + Number(months ?? 0));
  return parsed.toISOString().slice(0, 10);
}

// 模块级常量，保持稳定引用
export const employeeOnboardingScope = { addMonths };
```

Schema 中：

```ts
regularDate: {
  type: 'string',
  title: '预计转正日期',
  'x-decorator': 'FormItem',
  'x-component': 'DatePicker',
  'x-component-props': {
    style: { width: 320 },
    disabled: true,
  },
  'x-reactions': {
    dependencies: ['joinDate', 'probationMonths'],
    fulfill: {
      state: {
        value: '{{ addMonths($deps[0], $deps[1]) }}',
      },
    },
  },
},
```

渲染时把 scope 传给 `FormRenderer`：

```tsx
<FormRenderer
  ref={formRef}
  schema={schema}
  scope={employeeOnboardingScope}
  schemaId="employee-onboarding"
  schemaVersion={1}
/>
```

`scope` 里的函数会出现在 `{{ }}` 表达式的求值作用域中，适合放日期计算、金额计算、字典转换等纯函数。
不要把有副作用或依赖组件内部状态的逻辑放进 scope。

## 3. 完整 Schema（本章版本）

把 `schema.ts` 更新为下面的完整内容；它同时包含条件显隐与派生值：

```ts
export const employeeOnboardingSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: '姓名',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
      'x-component-props': {
        placeholder: '请输入姓名',
        style: { width: 320 },
      },
      'x-validator': [{ required: true, message: '请输入姓名' }],
    },
    department: {
      type: 'string',
      title: '部门',
      'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: [
        { label: '研发部', value: 'rd' },
        { label: '产品部', value: 'product' },
        { label: '运营部', value: 'operation' },
        { label: '其他', value: 'other' },
      ],
      'x-component-props': {
        placeholder: '请选择部门',
        style: { width: 320 },
      },
      'x-validator': [{ required: true, message: '请选择部门' }],
    },
    departmentOther: {
      type: 'string',
      title: '部门说明',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
      'x-component-props': {
        placeholder: '请填写部门名称',
        style: { width: 320 },
      },
      'x-reactions': {
        dependencies: ['department'],
        fulfill: {
          state: {
            visible: '{{ $deps[0] === "other" }}',
          },
        },
      },
      'x-validator': [{ required: true, message: '请填写部门名称' }],
    },
    joinDate: {
      type: 'string',
      title: '入职日期',
      'x-decorator': 'FormItem',
      'x-component': 'DatePicker',
      'x-component-props': {
        placeholder: '请选择入职日期',
        style: { width: 320 },
      },
      'x-validator': [{ required: true, message: '请选择入职日期' }],
    },
    probationMonths: {
      type: 'number',
      title: '试用期（月）',
      'x-decorator': 'FormItem',
      'x-component': 'Number',
      'x-component-props': {
        min: 0,
        max: 6,
        style: { width: 320 },
      },
    },
    regularDate: {
      type: 'string',
      title: '预计转正日期',
      'x-decorator': 'FormItem',
      'x-component': 'DatePicker',
      'x-component-props': {
        style: { width: 320 },
        disabled: true,
      },
      'x-reactions': {
        dependencies: ['joinDate', 'probationMonths'],
        fulfill: {
          state: {
            value: '{{ addMonths($deps[0], $deps[1]) }}',
          },
        },
      },
    },
    remark: {
      type: 'string',
      title: '备注',
      'x-decorator': 'FormItem',
      'x-component': 'Textarea',
      'x-component-props': {
        placeholder: '选填：补充说明',
        rows: 3,
        style: { width: 480 },
      },
    },
  },
};

export function addMonths(date: unknown, months: unknown): string {
  if (typeof date !== 'string' || date === '') {
    return '';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  parsed.setMonth(parsed.getMonth() + Number(months ?? 0));
  return parsed.toISOString().slice(0, 10);
}

export const employeeOnboardingScope = { addMonths };
```

## 4. 初始值与实例 API

### 4.1 `initialValues`：只在挂载时生效

```tsx
<FormRenderer
  ref={formRef}
  schema={employeeOnboardingSchema}
  scope={employeeOnboardingScope}
  initialValues={{
    name: '张三',
    department: 'rd',
    joinDate: '2026-11-01',
    probationMonths: 3,
  }}
/>
```

`FormRenderer` 在挂载时创建一次 Formily Form，之后修改 `initialValues` prop **不会**重置表单。
需要在运行时更新值，用实例 API 的 `setValues()`；需要回到初始值，用 `reset()`。

### 4.2 实例 API

```ts
// formRef: React.useRef<FormRendererInstance>(null)
const form = formRef.current!;

form.getValues();                        // 当前值（普通对象，不是 Formily 代理）
form.setValues({ department: 'other' }); // 合并写值，会触发联动
await form.validate();                   // 校验；失败 reject
form.reset();                            // 回到 initialValues
await form.submit();                     // 校验 + 生成 values / snapshot（下一章）
```

| 方法 | 说明 |
|---|---|
| `getValues()` | 返回当前值的普通对象快照，可安全存 state 或打印 |
| `setValues(values)` | 合并写入；会触发 `x-reactions` |
| `validate()` | 校验整张表单；失败 reject，错误已展示在字段上 |
| `reset()` | 恢复挂载时的 `initialValues` |
| `submit()` | 校验通过后返回 `FormSubmitResult`；详见第 04 章 |

编辑场景的常见写法：

```tsx
// 进入编辑页后，把后端数据填进表单
useEffect(() => {
  if (detail) {
    formRef.current?.setValues(detail);
  }
}, [detail]);
```

> 如果数据在首次渲染前就已知，优先用 `initialValues`；`setValues` 适合异步加载完成后的回填。

## 5. 常见坑

| 现象 | 原因 | 处理 |
|---|---|---|
| 联动不触发 | `dependencies` 写成了 `title` 或拼错 key | 用字段 key，数组顺序与 `$deps` 下标一致 |
| 表达式不生效 | 忘记 `{{ }}`，或写成函数字面量 | JSON 里只能放字符串表达式 |
| `scope` 函数找不到 | 没传 `scope` / 传了内联新对象导致引用变化 | 用模块级常量或 `useMemo` 固定引用 |
| 条件字段隐藏后仍提交旧值 | 字段值变为 `undefined`，JSON 中通常不出现 | 当前 2.3.7 行为如此；升级时回归验证 |
| `initialValues` 改了但表单不变 | 只在挂载时生效 | 用 `setValues()` 或重新挂载 |
| 校验错误拿不到 message | reject 值不是 `Error` | 统一提示；字段级错误由 FormItem 展示 |

## 6. 下一章

下一章解释 `submit()` 到底做了什么，`values` 与 `snapshot` 的区别，以及业务层应该如何保存它们。

→ [`04-submit-and-snapshot.md`](04-submit-and-snapshot.md)
