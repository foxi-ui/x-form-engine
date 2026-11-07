# 03. 最小 Demo：x-reactions、自定义组件、Effects 与动态校验

> 对应第 19 节第 3 项：用最小 Demo 验证 `x-reactions`、自定义组件、Effects 和动态校验。

## 1. 验证目标

在锁定版本下，用最小 React + Formily 用例验证以下能力真实可用，并确认它们不需要引擎重写 Formily 内核：

1. 自定义组件注册与双向绑定；
2. `x-reactions` 依赖追踪与显隐控制；
3. 动态 `required` 与自定义校验器；
4. `createForm` Effects、`useFormEffects`、`onFieldReact` 生命周期。

## 2. 验证过程

验证文件：`verification/src/03-formily-behavior.test.tsx`。

使用最小自定义组件，不引入 antd，避免 UI 库噪声：

```tsx
const Input = (props: any) => {
  const { value, onChange, ...rest } = props
  return (
    <input
      {...rest}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  )
}
```

通过 `createSchemaField({ components: { Input, Checkbox } })` 注册，然后分别构造 Schema 场景。

### 2.1 自定义组件与双向绑定

```tsx
const schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      'x-component': 'Input',
      'x-component-props': { 'data-testid': 'custom-input' },
    },
  },
}
```

步骤：渲染 → 触发 `change` → 断言 `form.values.name` 与输入框值。

### 2.2 x-reactions 依赖与显隐

```json
{
  "detail": {
    "type": "string",
    "x-component": "Input",
    "x-reactions": {
      "dependencies": ["enabled"],
      "fulfill": {
        "state": {
          "display": "{{ $deps[0] ? 'visible' : 'none' }}"
        }
      }
    }
  }
}
```

步骤：初始 `enabled=false` 时不渲染 detail；点击 checkbox 后 detail 出现。

### 2.3 动态 required 与自定义校验

```json
{
  "kind": { "type": "string", "x-component": "Input" },
  "amount": {
    "type": "number",
    "x-component": "Input",
    "x-validator": "{{ evenOnly }}",
    "x-reactions": {
      "dependencies": ["kind"],
      "fulfill": {
        "state": {
          "required": "{{ $deps[0] === 'invoice' }}"
        }
      }
    }
  }
}
```

scope：

```ts
scope: {
  evenOnly: (value) => {
    if (value == null || value === '') return true
    return Number(value) % 2 === 0 || '金额必须为偶数'
  },
}
```

断言顺序：

1. `kind=normal` 时 `amount.required === false`，空值可通过校验；
2. `kind=invoice` 后 `amount.required === true`，空值校验失败；
3. 输入奇数 `3`，自定义 validator 失败；
4. 输入偶数 `4`，校验通过。

### 2.4 Effects

同时验证三种注册方式：

```ts
const form = createForm({
  effects() {
    onFieldInit('name', ...)
    onFieldValueChange('name', ...)
    onFormValuesChange((form) => ...)
    onFieldReact('name', (field) => {
      if (field.value === 'react') field.setState({ title: 'React 标题' })
    })
  },
})

function EffectsProbe() {
  useFormEffects(() => {
    onFieldValueChange('name', ...)
  })
  return null
}
```

步骤：渲染后等待字段初始化事件；输入 `react`；断言字段值变化、表单值变化、Hook 注册的事件、`onFieldReact` 修改标题都生效。

## 3. 验证结果

```text
✓ 自定义组件可通过 createSchemaField components 注册并双向绑定
✓ x-reactions dependencies + display 可驱动字段显隐
✓ x-reactions 可动态设置 required，并配合 x-validator 自定义校验
✓ createForm effects 与 useFormEffects 均可注册生命周期
```

4 个用例全部通过。原始输出：`appendix/test-run.txt`。

## 4. 关键发现

### 4.1 `display` 直接决定是否渲染

`ReactiveField` 的运行时逻辑：

```js
if (field.display !== 'visible') return null
```

因此 `x-reactions.fulfill.state.display = 'none'` 会让字段组件完全不渲染，而不是仅加 CSS 隐藏。引擎的只读/设计器预览如果复用编辑态组件，应明确区分 `display`、`visible`、`hidden` 与 `disabled` 的语义。

### 4.2 动态 `required` 与 validator 可组合

- `state.required` 会进入 Formily 的校验规则计算；
- `x-validator` 既可以是对象/数组，也可以是 `{{ scopeFn }}` 表达式返回的函数；
- 自定义函数返回 `true`/`undefined` 表示通过，返回字符串表示错误消息。

这意味着引擎不需要自定义一套校验协议，直接把业务校验器注入 Scope 即可。

### 4.3 `onFormValuesChange` 只接收 form

与第 02 项一致：回调签名是 `(form) => void`，值从 `form.values` 获取。业务 Effects 不应依赖第二个参数。

### 4.4 `onFieldReact` 是响应式 Effect

`onFieldReact` 在读取 `field.value` 时会建立依赖，值变化后重新执行。它适合做轻量派生状态，但不应在内部执行不可控的副作用或网络请求。

### 4.5 组件受控协议明确

`ReactiveField` 会向组件注入：

```text
value
onChange
onFocus
onBlur
disabled
readOnly
...field.componentProps
```

其中 `value` / `onChange` 等由字段模型覆盖，组件必须按受控组件方式实现，不能自行持有唯一状态。

## 5. 对引擎设计的直接影响

1. **SchemaCompiler 不应改写 `x-reactions` / `x-validator`**：这些是 Formily 原生能力，引擎只做平台合并和注册表映射。
2. **自定义组件必须遵循受控协议**：Registry 中的 React 实现应接收 `value/onChange`，必要时用 `connect` / `mapProps` 适配第三方组件。
3. **Effects 必须是 Renderer 实例级**：每个 Renderer 创建自己的 Form，Effects 随 Form 销毁，避免跨表单串扰。
4. **动态规则优先用 reactions 表达**：不要在编译期把动态 required 展开成静态 schema，否则会丢失 Formily 的依赖追踪能力。
5. **只读渲染器不要复用编辑态 Effects**：独立只读渲染器应跳过 reactions/effects，避免远程请求和历史数据漂移。

## 6. 未覆盖项

- 本次使用原生 `<input>`，未验证 antd 4 组件的 `mapProps` / `connect` 适配。
- 未覆盖异步 validator、跨字段 validator、数组字段 reactions。
- 未覆盖 React StrictMode 下的 Effects 双执行行为。
