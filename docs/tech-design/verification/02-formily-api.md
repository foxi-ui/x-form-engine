# 02. Formily API 导出位置、类型与 Scope 传递验证

> 对应第 19 节第 2 项：核对 Formily API 的实际导出位置、参数类型和 SchemaField Scope 传递方式。

## 1. 验证目标

确认原方案第 7 章列出的 Formily 能力在当前锁定版本（`@formily/react@2.3.7`、`@formily/core@2.3.7`、`@formily/json-schema@2.3.7`）中的真实导出位置、类型签名和 Scope 行为，避免把引擎自定义 API 误称为 Formily 原生 API。

## 2. 验证过程

1. 安装锁定依赖。
2. 在 `src/02-formily-api.test.tsx` 中同时做三件事：
   - 运行时断言 API 存在且类型正确；
   - 用 TypeScript 严格模式对 `Form`、`ISchema`、`createSchemaField({ components, scope })` 做类型检查；
   - 用 React Testing Library + jsdom 渲染 SchemaField，验证 scope 注入与实例级覆盖。
3. 直接阅读第三方类型声明和运行时代码，确认签名与实现：

```text
node_modules/@formily/react/lib/types.d.ts
node_modules/@formily/react/lib/components/SchemaField.js
node_modules/@formily/react/lib/components/ExpressionScope.js
node_modules/@formily/react/lib/components/ReactiveField.js
node_modules/@formily/json-schema/lib/compiler.js
node_modules/@formily/json-schema/lib/transformer.js
node_modules/@formily/core/lib/shared/internals.js
```

## 3. 验证结果

### 3.1 导出位置

| 能力 | 实际来源 | 运行时验证 |
|---|---|---|
| `createForm` | `@formily/core` | 函数存在 |
| `onFieldInit` | `@formily/core` | 函数存在，生命周期可用 |
| `onFieldValueChange` | `@formily/core` | 函数存在，生命周期可用 |
| `onFieldReact` | `@formily/core` | 函数存在，反应式更新可用 |
| `onFormValuesChange` | `@formily/core` | 函数存在，回调可触发 |
| `onFormInit` / `onFormMount` / `onFormReact` | `@formily/core` | 函数存在 |
| `createSchemaField` | `@formily/react` | 函数存在，返回 React 组件 |
| `FormProvider` | `@formily/react` | 组件存在 |
| `FormConsumer` | `@formily/react` | 组件存在 |
| `Field` / `ObjectField` / `ArrayField` / `VoidField` | `@formily/react` | 组件存在 |
| `RecursionField` | `@formily/react` | 组件存在 |
| `useForm` / `useField` / `useFieldSchema` / `useFormEffects` | `@formily/react` | Hook 存在 |
| `connect` / `mapProps` / `mapReadPretty` / `observer` | `@formily/react` | 函数存在 |
| `Schema` | `@formily/json-schema` | 类存在 |

结论：原方案第 7.2 节列出的 API 都真实存在，但**来源包不同**，文档应标注导入位置，避免业务方从错误包导入。

### 3.2 `createSchemaField` 的类型签名

实际类型声明：

```ts
export interface ISchemaFieldReactFactoryOptions<
  Components extends SchemaReactComponents = any
> {
  components?: Components;
  scope?: any;
}

export declare function createSchemaField<
  Components extends SchemaReactComponents
>(
  options?: ISchemaFieldReactFactoryOptions<Components>
): {
  // 返回可直接渲染的 React 组件
  (props: ISchemaFieldProps<...>): JSX.Element;
  displayName: string;
  Markup: {...};
  String: {...};
  Object: {...};
  Array: {...};
  Boolean: {...};
  Date: {...};
  DateTime: {...};
  Void: {...};
  Number: {...};
};
```

同时 `ISchemaFieldProps` 也包含 `scope?: any`，因此 scope 有两条传递路径：

1. 工厂级：`createSchemaField({ scope })`
2. 实例级：`<SchemaField schema={...} scope={...} />`

### 3.3 Scope 的合并与表达式编译机制

运行时实现：

```js
// SchemaField.js
<ExpressionScope value={lazyMerge(options.scope, props.scope)}>
  ...
</ExpressionScope>
```

`lazyMerge(target, source)` 的读取规则是「source 中存在则取 source」，因此：

- 实例级 `scope` 覆盖工厂级同名 key；
- 未覆盖的 key 继续从工厂级 scope 读取。

表达式编译器：

```js
new Function('$root', `with($root) { return (${expression}); }`)(scope)
```

因此 scope 中的字段可以直接以变量形式出现在 `{{ ... }}` 中。Reactions 的作用域还会注入：

| 变量 | 含义 |
|---|---|
| `$self` | 当前字段模型 |
| `$form` | 当前表单模型 |
| `$values` | 当前表单值 |
| `$deps` | `x-reactions.dependencies` 对应的依赖值 |
| `$lookup` / `$record` / `$records` / `$index` | 数组/记录上下文 |
| `$observable` / `$memo` / `$effect` / `$props` | 响应式与副作用辅助函数 |

验证用例：

```text
✓ createSchemaField({ scope }) 可向 Schema 表达式注入作用域
✓ SchemaField 实例级 scope 可覆盖工厂级 scope
```

### 3.4 发现的三处文档偏差

#### 偏差一：`onFormValuesChange` 回调签名

实际类型是：

```ts
onFormValuesChange((form: Form) => void)
```

不是 `(form, values) => void`。核心实现触发事件时也只传 form：

```js
form.notify(LifeCycleTypes.ON_FORM_VALUES_CHANGE)
```

正确写法：

```ts
onFormValuesChange((form) => {
  console.log(form.values)
})
```

#### 偏差二：`useField` / `useFieldSchema` 的上下文要求

验证中发现：仅把组件放在 `<FormProvider>` 下，`useField()` 和 `useFieldSchema()` 都拿到空值：

```text
form:ok,field:missing,schema:missing
```

它们必须位于**字段渲染上下文**中，例如：

- 作为 SchemaField 的自定义字段组件；
- 作为 `<Field>` / `<ObjectField>` / `<ArrayField>` 的子树。

修正后用例通过：

```text
✓ useForm / useField / useFieldSchema 在字段渲染上下文内可用
```

#### 偏差三：SchemaField 的调用形式

`createSchemaField(...)` 返回的是 React 组件，推荐使用 JSX：

```tsx
const SchemaField = createSchemaField({ components, scope })

<FormProvider form={form}>
  <SchemaField schema={schema} />
</FormProvider>
```

原方案第 7.3 节示例中的 `schemaField({ schema })` 属于函数式调用组件，不应作为正式用法。虽然结构示意可能在某些情况下能渲染，但它绕过了 React 的组件边界，也无法保证 Hooks/Context 语义，建议改为 JSX。

## 4. 验证证据

```text
✓ 核心 API 的导出位置与类型可见
✓ createSchemaField({ scope }) 可向 Schema 表达式注入作用域
✓ SchemaField 实例级 scope 可覆盖工厂级 scope
✓ useForm / useField / useFieldSchema 在字段渲染上下文内可用
```

- `pnpm typecheck` 通过；
- 4 个用例全部通过；
- 原始输出：`appendix/typecheck.txt`、`appendix/test-run.txt`。

## 5. 对引擎设计的直接影响

1. **Formily Adapter 不需要重写这些能力**，只需把 Registry 映射为 `components`，把引擎 Scope 映射为 `scope`。
2. **Scope 命名空间可以保留**：建议在传给 `createSchemaField` 前把 `engine` / `app` / `custom` 合并为一个受控对象，避免直接暴露敏感服务。
3. **引擎 Effects 应统一从 `@formily/core` 导入**，Hooks 从 `@formily/react` 导入，并在 Adapter 包内集中 re-export，业务侧不直接依赖 Formily 子包。
4. **类型隔离**：公共 `types` 包不导出 Formily 类型；React Adapter 包可以提供受控类型别名。

## 6. 未覆盖项

- 本次只验证了 `Field` 的字段上下文，未逐一覆盖 `ObjectField` / `ArrayField` / `VoidField` 的复杂渲染路径。
- 未验证异步 validator、跨字段依赖、嵌套数组等高级场景。
- 未验证 React 18 的 StrictMode 双调用行为。
