# 05. Renderer 与 React SDK

> 状态：implemented（PC + Readonly）｜ 落地对照：`packages/renderer`、`packages/sdk` ｜ 最后更新：2026-11-08

## 1. 目标

提供业务项目易于接入的统一 React API，同时保留必要的高级扩展入口。SDK 应隐藏内部包组合和初始化细节，但不屏蔽 Formily 原生能力。

## 2. 渲染模式

| 模式 | 用途 | Formily Form |
|---|---|---|
| edit | 正式填写 | 创建 |
| preview | 设计器预览 | 通常创建 |
| readonly | 历史详情和审批详情 | 不创建编辑态 Form |

`readonly` 应使用独立只读渲染器，详细规则见 `08-readonly-renderer.md`。

## 3. 主要 Props

```ts
export interface FormRendererProps {
  schema: Record<string, unknown>;
  mode?: 'edit' | 'preview';
  platform?: 'pc' | 'mobile';
  initialValues?: Record<string, unknown>;
  disabled?: boolean;
  readOnly?: boolean;
  scope?: Record<string, unknown>;
  onValuesChange?: (values: Record<string, unknown>) => void;
}
```

不要把只读模式仅实现为 `disabled`。只读模式的数据来源、组件实现和副作用策略都不同。

## 4. 实例 API

```ts
export interface FormRendererInstance {
  getValues(): Record<string, unknown>;
  setValues(values: Record<string, unknown>): void;
  validate(): Promise<void>;
  reset(): void;
  submit(): Promise<FormSubmitResult>;
  destroy(): void;
}
```

可选的 `getFormilyFormUnsafe()` 是版本耦合的高级逃生口，返回值与 Formily 版本绑定、不承诺稳定性，生产代码应避免依赖。

## 5. submit 语义

`submit()` 负责：

1. 执行字段和表单校验。
2. 获取当前 Value。
3. 调用组件 Adapter 生成 Snapshot。
4. 组装 `FormSubmitResult`。
5. 返回给业务层。

它不直接请求业务后端。业务层决定何时保存、提交审批或执行其他业务动作。

## 6. Engine Provider 与 Form 实例

- `FormEngineProvider` 提供 Engine 级上下文。
- 每个 Renderer 独立创建 Formily Form。
- 多个表单可以共享同一个 Engine Registry 和 Services。
- Renderer 销毁时清理 Form、Effects、事件订阅和请求。

## 7. SDK 接口

```ts
export interface FormEngineOptions {
  platform?: 'pc' | 'mobile';
  locale?: string;
  components?: ComponentBinding[];
  plugins?: FormEnginePlugin[];
  services?: Partial<EngineServices>;
}

export function createFormEngine(
  options: FormEngineOptions
): FormEngine;
```

建议 SDK 导出：

- `createFormEngine`
- `FormEngineProvider`
- `FormRenderer`
- `ReadonlyRenderer`
- `Designer`
- 公共类型和组件开发工具
- 受控 Hooks

## 8. 接入示例

```tsx
const engine = createFormEngine({
  platform: 'pc',
  locale: 'zh-CN',
  components: [UserSelectBinding],
  services: {
    datasource: appDatasourceService,
  },
});

function Application() {
  return (
    <FormEngineProvider engine={engine}>
      <FormRenderer
        schema={schema}
        mode="edit"
        initialValues={initialValues}
      />
    </FormEngineProvider>
  );
}
```

提交：

```ts
const result = await rendererRef.current?.submit();

await api.saveForm({
  values: result.values,
  snapshot: result.snapshot,
});
```

## 9. 生命周期

- Engine：应用级创建和销毁。
- Renderer：表单实例级创建和销毁。
- Formily Form：Renderer 内部管理。
- Schema：由业务或设计器提供，结构变化需执行明确更新策略。
- Services：由应用注入，Engine 不擅自接管业务 HTTP 客户端。

## 10. 验收标准

- 业务项目只依赖 SDK 即可完成基本渲染。
- 同一个 Engine 可以创建多个独立 Renderer。
- submit 不发起业务 HTTP。
- Renderer 销毁后不残留订阅和请求。
- TypeScript 类型可用于业务项目。
- PC 与 Mobile 的业务 Value 协议一致。
