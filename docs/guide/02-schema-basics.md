# 02. Schema 基础：字段、组件与 Schema 文档

> 状态：draft ｜ 最后更新：2026-11-09

**本章目标**：看懂一张 Schema，补齐员工登记表的入职日期与备注字段，并分清「渲染用的 Schema」和「后端保存的 Schema 文档」。

## 1. Schema 是一棵字段树

最小结构如下：

```ts
const schema = {
  type: 'object',
  properties: {
    // 每个 key 是一个字段，key 名就是提交后 values 的 key
    name: {
      type: 'string',
      title: '姓名',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
    },
  },
};
```

| 键 | 作用 | 备注 |
|---|---|---|
| `type` | 字段值类型：`string` / `number` / `boolean` / `array` / `object` | 影响校验与提交值类型 |
| `title` | 字段展示名 | 中文放这里，字段 key 保持英文 |
| `properties` | `object` 类型的子字段 | 嵌套对象也用它 |
| `x-component` | 编辑态组件名 | 必须是 Engine 已注册的组件 |
| `x-decorator` | 装饰器名 | 通常为 `FormItem`，负责标签与校验提示 |
| `x-component-props` | 透传给编辑组件的 props | 如 `placeholder`、`rows`、`style` |
| `enum` | 选项列表 `{ label, value }[]` | Select / Radio / Checkbox 常用 |
| `x-validator` | 校验规则 | 第 03 章展开 |
| `x-reactions` | 联动规则 | 第 03 章展开 |

`x-*` 是 Schema 的配置键，不是额外的 SDK 接口。引擎保留 Formily 原生键，只把 `x-engine` 当作自己的扩展命名空间。

## 2. PC 基础组件目录

`basicComponents` 目前提供七类 P0 编辑组件：

| `x-component` | 值类型 | 底层实现 | 说明 |
|---|---|---|---|
| `Input` | `string` | `@formily/antd` Input | 单行文本 |
| `Textarea` | `string` | `Input.TextArea` | 多行文本，可配 `rows` |
| `Number` | `number` | `NumberPicker` | 数字输入，可配 `min` / `max` |
| `Select` | `string` / `number` | Select | 选项来自 `enum` |
| `Radio` | `string` / `number` | `Radio.Group` | 单选 |
| `Checkbox` | `(string \| number)[]` | `Checkbox.Group` | 多选，值为数组 |
| `DatePicker` | `string` | DatePicker | 默认字符串日期（如 `2026-11-01`） |

装饰器目前提供 `FormItem`，来自 `basicDecorators`。

选项有两种写法，效果一致：

```ts
// 推荐：Formily 标准写法，快照会据此生成 displayValue
{ type: 'string', enum: [{ label: '研发部', value: 'rd' }] }

// 设计器常见写法：选项透传给组件
{ type: 'string', 'x-component-props': { options: [{ label: '研发部', value: 'rd' }] } }
```

## 3. 员工登记表：补齐字段

把第 01 章的 `schema` 替换成下面这一版：

```ts
const schema = {
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
      ],
      'x-component-props': {
        placeholder: '请选择部门',
        style: { width: 320 },
      },
      'x-validator': [{ required: true, message: '请选择部门' }],
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
```

渲染与提交代码无需改动。提交后的 `values` 形如：

```json
{
  "name": "张三",
  "department": "rd",
  "joinDate": "2026-11-01",
  "remark": "希望自备显示器"
}
```

## 4. 字段命名：key 是业务值的一部分

- **字段 key 就是 `values` 的 key，也是 `x-reactions.dependencies` 里使用的路径。**
- 推荐用英文标识符作为 key，中文放 `title`；这样后端字段、埋点、日志都稳定，设计器重命名展示名也不会影响值。
- 嵌套对象用 `properties`，提交值是嵌套对象：

  ```ts
  {
    type: 'object',
    properties: {
      contact: {
        type: 'object',
        title: '联系方式',
        properties: {
          phone: { type: 'string', title: '手机号', 'x-component': 'Input' },
        },
      },
    },
  }
  // values: { contact: { phone: '138...' } }
  ```

- 嵌套字段在快照中的路径用点号表示，如 `contact.phone`。

## 5. 两种 Schema：渲染用 vs 后端保存用

`FormRenderer` 接收的是**裸 Schema**（`type` + `properties` 那一层）。后端通常保存一个**文档信封**，把 Schema 与身份、版本一起存：

```ts
const schemaDocument = {
  schemaId: 'employee-onboarding',
  version: 2,                      // 业务 schemaVersion
  engineSchemaVersion: '1.0.0',    // 引擎协议版本
  schema: { type: 'object', properties: { /* ... */ } },
};
```

渲染时把信封拆开传：

```tsx
<FormRenderer
  schema={schemaDocument.schema}
  schemaId={schemaDocument.schemaId}
  schemaVersion={schemaDocument.version}
/>
```

SDK 提供两个校验函数，适合在「从后端加载 Schema」时使用：

```ts
import {
  parseSchemaDocument,
  validateEngineSchema,
} from '@x-form-engine/sdk';

// 1. 校验 x-engine 扩展与引擎版本；未知 x-engine 键只告警
const result = validateEngineSchema(schemaDocument.schema);
if (!result.valid) {
  throw new Error(result.errors.join('; '));
}
if (result.warnings.length > 0) {
  console.warn('[schema warnings]', result.warnings);
}

// 2. 解析并校验文档信封；不满足契约会抛 SCHEMA_INVALID
const doc = parseSchemaDocument(schemaDocument);
```

要点：

- `parseSchemaDocument` 只校验信封字段的类型（`schemaId` 字符串、`version` 有限数字、`engineSchemaVersion` 字符串、`schema` 对象），不解释 `schema` 内部结构。
- `engineSchemaVersion` 缺失时 `parseSchemaDocument` 会抛错。如果后端只存裸 Schema，则不要调用它，直接把 `schema` 传给 `FormRenderer` 即可。
- `validateEngineSchema` 会检查 `x-engine` 下的未知一级键；未知键进入 `warnings`，不会静默丢弃。

## 6. 常见坑

| 现象 | 原因 | 处理 |
|---|---|---|
| 字段渲染成「未知组件」或空白 | `x-component` 写错 / 未注册 | 对照组件目录；自定义组件见第 08 章 |
| 选项不显示 | `enum` 的 `value` 类型与 `type` 不一致 | `type: 'string'` 时 value 用字符串 |
| 提交值里 key 不是预期 | 字段 key 用了中文或改了名 | `values` 的 key 就是 `properties` 的 key |
| `parseSchemaDocument` 抛 `SCHEMA_INVALID` | 后端文档缺 `engineSchemaVersion` 等字段 | 补齐信封，或改用裸 Schema |
| `validateEngineSchema` 返回 warnings | `x-engine` 下有未知一级键 | 确认是否为拼写错误；未实现的扩展先移除 |

## 7. 下一章

下一章给这张表加上必填校验、条件显隐和自动计算的「预计转正日期」，并讲解 `initialValues` 与实例 API。

→ [`03-validation-and-linkage.md`](03-validation-and-linkage.md)
