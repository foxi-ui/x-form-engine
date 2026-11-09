# Mobile 渲染器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `platform="mobile"` 用 antd-mobile v5 真正渲染七类 P0 组件与 `FormItem`，缺移动实现时按字段回退到 `pc` 并记诊断，移动应用产物不夹带桌面 antd。

**Architecture:** 物料按平台拆成 `@x-form-engine/components`（PC）与 `@x-form-engine/components/mobile`（移动）两个互不 import 的入口，协议定义抽到无 UI 依赖的共享模块。Formily 适配器在 `mobile` 平台按 `implementations.mobile ?? implementations.pc` 解析并返回诊断，Renderer 只对当前 Schema 实际引用的组件派发事件和回调。

**Tech Stack:** React 17.0.2、TypeScript 5.9.3、Formily 2.3.7、antd-mobile 5.43.0（自建 `@formily/react` 包装）、Vitest 3.2.7、pnpm workspace、Vite 5。

**Spec:** `docs/superpowers/specs/2026-11-08-mobile-renderer-design.md`

## Global Constraints

- `antd-mobile` 版本精确锁定为 `5.43.0`，不得使用 `^`/`~`，不得升级。
- React 固定 17.0.2；不得使用 React 18 API（`useSyncExternalStore` 等由库内部处理）。
- PC 平台保持现状：缺实现仍抛 `COMPONENT_CAPABILITY_MISMATCH`；只有 mobile 回退。
- `@x-form-engine/components` 根入口与 `src/index.ts` 及其传递依赖**不得** import `antd-mobile` 或 `src/mobile`。
- `@x-form-engine/components/mobile` 及其传递依赖**不得** import `@formily/antd` 或 `antd`。
- 日期 Value 必须是 `'YYYY-MM-DD'` 字符串（按本地时区取年月日，禁止 `toISOString()`）；数字 Value 必须是 `number | null`。
- 公共类型只使用 `unknown`，不出现 `any`；`types`/`sdk` 不泄漏 Formily / antd 内部类型。
- 所有文档用简体中文，与仓库现有风格一致。
- 每个 Task 一次提交，提交信息用 `feat:` / `fix:` / `docs:` / `test:` 前缀；提交只 `git add` 本 Task 列出的文件。
- 工作区可能存在未提交的 M5 构建/发布配置改动；不要回滚或提交与 Task 无关的文件。

## Review Focus

- 移动端 Schema 引用只实现 `pc` 的业务组件时：该字段回退为 PC 实现，表单其余字段正常，且只产生一条诊断，不整表崩溃。
- PC 平台注册了只实现 `mobile` 的 binding 时：仍抛 `COMPONENT_CAPABILITY_MISMATCH`，不能被回退逻辑静默吃掉。
- 移动 DatePicker 选中日期后 Value 是 `'YYYY-MM-DD'` 字符串；跨时区不偏移一天。
- 移动 Select：单选往返为标量，`multiple: true` 往返为数组；不得静默把数组降为标量。
- `apps/mobile-demo` 构建产物不含桌面 `antd` / `@formily/antd` 代码。

---

### Task 1: 平台回退诊断类型

**Files:**
- Modify: `packages/types/src/component.ts`
- Test: `packages/types/src/__tests__/platform-fallback.test.ts`

**Interfaces:**
- Consumes: `Platform`（`packages/types/src/base.ts`）
- Produces: `PlatformFallbackDiagnostic`

- [ ] **Step 1: Write the failing test**

```ts
import { expectTypeOf } from 'vitest';
import type { PlatformFallbackDiagnostic } from '../index';

test('PlatformFallbackDiagnostic 契约形状', () => {
  expectTypeOf<PlatformFallbackDiagnostic>().toEqualTypeOf<{
    kind: 'component' | 'decorator';
    name: string;
    requestedPlatform: 'pc' | 'mobile';
    fallbackPlatform: 'pc' | 'mobile';
  }>();

  const diagnostic: PlatformFallbackDiagnostic = {
    kind: 'component',
    name: 'LegacyNote',
    requestedPlatform: 'mobile',
    fallbackPlatform: 'pc',
  };
  expect(diagnostic.fallbackPlatform).toBe('pc');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/types/src/__tests__/platform-fallback.test.ts`
Expected: FAIL，`PlatformFallbackDiagnostic` 未导出。

- [ ] **Step 3: Implement the type**

在 `packages/types/src/component.ts` 增加（`Platform` 从 `./base` import type）：

```ts
/** mobile 平台缺失实现时，字段/装饰器回退到 pc 产生的一次诊断。 */
export interface PlatformFallbackDiagnostic {
  kind: 'component' | 'decorator';
  name: string;
  requestedPlatform: Platform;
  fallbackPlatform: Platform;
}
```

`packages/types/src/index.ts` 已 `export * from './component'`，无需改动。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/types/src/__tests__/platform-fallback.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/component.ts packages/types/src/__tests__/platform-fallback.test.ts
git commit -m "feat(types): add PlatformFallbackDiagnostic"
```

---

### Task 2: Formily 适配器 mobile 回退与诊断

**Files:**
- Modify: `packages/formily/src/component-map.ts`
- Modify: `packages/formily/src/create-schema-field.ts`
- Modify: `packages/formily/src/adapter.test.tsx`
- Modify: `packages/formily/src/__tests__/decorator.test.tsx`
- Modify: `packages/designer/src/preview.tsx`
- Test: `packages/formily/src/__tests__/component-map.test.ts`

**Interfaces:**
- Consumes: `PlatformFallbackDiagnostic`
- Produces:
  - `interface FormilyComponentMapResolution { components: Record<string, ComponentType<unknown>>; decorators: Record<string, ComponentType<unknown>>; diagnostics: PlatformFallbackDiagnostic[] }`
  - `resolveFormilyComponentMap(engine: FormEngine, platform: Platform): FormilyComponentMapResolution`
  - `interface EngineSchemaFieldResult { SchemaField: ComponentType<{ schema: unknown; scope?: Record<string, unknown> }>; diagnostics: PlatformFallbackDiagnostic[] }`
  - `createEngineSchemaField(engine: FormEngine, platform: Platform, scope?: Record<string, unknown>): EngineSchemaFieldResult`

- [ ] **Step 1: Write the failing test**

新建 `packages/formily/src/__tests__/component-map.test.ts`：

```ts
import { createFormEngine } from '@x-form-engine/core';
import type { ComponentBinding } from '@x-form-engine/types';
import { resolveFormilyComponentMap } from '../index';

function binding(
  name: string,
  implementations: ComponentBinding['implementations']
): ComponentBinding {
  return {
    protocol: {
      name,
      version: '1.0.0',
      meta: { title: name },
      capabilities: { editable: true, readonly: true, mobile: name !== 'PcOnly' },
      schema: { type: 'object' },
    },
    implementations,
  };
}

const PcOnly = () => null;
const MobileOnly = () => null;
const BothPc = () => null;
const BothMobile = () => null;

test('mobile 缺实现回退 pc 并产生一条诊断', () => {
  const engine = createFormEngine({
    components: [binding('PcOnly', { pc: PcOnly })],
  });

  const result = resolveFormilyComponentMap(engine, 'mobile');
  expect(result.components.PcOnly).toBe(PcOnly);
  expect(result.diagnostics).toEqual([
    {
      kind: 'component',
      name: 'PcOnly',
      requestedPlatform: 'mobile',
      fallbackPlatform: 'pc',
    },
  ]);
});

test('mobile 有实现时优先用 mobile，不产生诊断', () => {
  const engine = createFormEngine({
    components: [binding('Both', { pc: BothPc, mobile: BothMobile })],
  });

  const result = resolveFormilyComponentMap(engine, 'mobile');
  expect(result.components.Both).toBe(BothMobile);
  expect(result.diagnostics).toEqual([]);
});

test('pc 缺实现仍抛 COMPONENT_CAPABILITY_MISMATCH', () => {
  const engine = createFormEngine({
    components: [binding('MobileOnly', { mobile: MobileOnly })],
  });

  expect(() => resolveFormilyComponentMap(engine, 'pc')).toThrowError(
    expect.objectContaining({ code: 'COMPONENT_CAPABILITY_MISMATCH' })
  );
});

test('装饰器在 mobile 缺实现时同样回退并记诊断', () => {
  const engine = createFormEngine({
    decorators: [binding('Deco', { pc: PcOnly })],
  });

  const result = resolveFormilyComponentMap(engine, 'mobile');
  expect(result.decorators.Deco).toBe(PcOnly);
  expect(result.diagnostics).toEqual([
    {
      kind: 'decorator',
      name: 'Deco',
      requestedPlatform: 'mobile',
      fallbackPlatform: 'pc',
    },
  ]);
});
```

同时更新所有 `createEngineSchemaField` 调用方：

- `packages/formily/src/adapter.test.tsx` 与 `packages/formily/src/__tests__/decorator.test.tsx`：`const SchemaField = createEngineSchemaField(...)` 改为 `const { SchemaField } = createEngineSchemaField(...)`。
- `packages/designer/src/preview.tsx`：`useMemo(() => createEngineSchemaField(engine, platform), ...)` 改为返回 `EngineSchemaFieldResult`，渲染处使用其中的 `SchemaField`（designer 只关心组件，忽略 `diagnostics`）。
- 原「mobile 缺实现抛错」的断言改为断言回退与诊断：

```ts
const mobile = resolveFormilyComponentMap(engine, 'mobile');
expect(mobile.components.Input).toBe(TextInput);
expect(mobile.diagnostics).toHaveLength(1);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/formily/src/__tests__/component-map.test.ts packages/formily/src/adapter.test.tsx`
Expected: FAIL，`diagnostics` 不存在 / `createEngineSchemaField` 返回类型不符。

- [ ] **Step 3: Implement fallback resolution**

`component-map.ts`：

- 把 `platform: 'pc' | 'mobile'` 改为 `Platform`。
- 返回值增加 `diagnostics: PlatformFallbackDiagnostic[]`。
- 解析规则：
  - `pc`：`implementations[platform]` 缺失 → 继续抛 `COMPONENT_CAPABILITY_MISMATCH`（消息保持现状）。
  - `mobile`：取 `implementations.mobile`；缺失且存在 `implementations.pc` → 用 pc 并 push 诊断；两者都没有 → 抛 `COMPONENT_CAPABILITY_MISMATCH`。
  - 组件与装饰器共用同一段解析逻辑（抽一个私有函数，参数含 `kind`）。
- 同一组件名在一次解析里只产生一条诊断。

`create-schema-field.ts`：

- 返回 `EngineSchemaFieldResult`，内部调用一次 `resolveFormilyComponentMap`，把 `diagnostics` 原样带出。
- `createSchemaField({ components })` 的 `scope` 参数保持现有语义。

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/formily/src/__tests__/component-map.test.ts packages/formily/src/adapter.test.tsx packages/formily/src/__tests__/decorator.test.tsx`
Expected: PASS。

Run: `pnpm --filter @x-form-engine/formily typecheck && pnpm --filter @x-form-engine/designer typecheck`
Expected: PASS（Renderer 对旧返回值的解构错误留到 Task 3；本 Task 结束时 `packages/renderer` 的 typecheck 报错属预期）。

- [ ] **Step 5: Commit**

```bash
git add packages/formily/src/component-map.ts packages/formily/src/create-schema-field.ts packages/formily/src/adapter.test.tsx packages/formily/src/__tests__/decorator.test.tsx packages/formily/src/__tests__/component-map.test.ts packages/designer/src/preview.tsx
git commit -m "feat(formily): fall back to pc implementation on mobile with diagnostics"
```

---

### Task 3: Renderer 诊断通道

**Files:**
- Create: `packages/renderer/src/diagnostics.ts`
- Modify: `packages/renderer/src/types.ts`
- Modify: `packages/renderer/src/FormRenderer.tsx`
- Test: `packages/renderer/src/__tests__/diagnostics.test.ts`
- Test: `packages/renderer/src/__tests__/platform-fallback.test.tsx`

**Interfaces:**
- Consumes: `createEngineSchemaField` 的 `{ SchemaField, diagnostics }`、`PlatformFallbackDiagnostic`
- Produces:
  - `collectSchemaComponentRefs(schema: unknown): { components: Set<string>; decorators: Set<string> }`
  - `filterDiagnosticsBySchema(diagnostics: PlatformFallbackDiagnostic[], schema: unknown): PlatformFallbackDiagnostic[]`
  - `FormRendererProps.onDiagnostic?: (diagnostic: PlatformFallbackDiagnostic) => void`
  - 事件名 `'component:platform-fallback'`，payload 为 `PlatformFallbackDiagnostic`
  - `engine.options.debug === true` 时额外 `console.warn` 一条可读诊断

- [ ] **Step 1: Write the failing tests**

`packages/renderer/src/__tests__/diagnostics.test.ts`：

```ts
import { collectSchemaComponentRefs, filterDiagnosticsBySchema } from '../diagnostics';

test('递归收集 properties / items 中的组件与装饰器引用', () => {
  const refs = collectSchemaComponentRefs({
    type: 'object',
    properties: {
      a: { 'x-component': 'Input', 'x-decorator': 'FormItem' },
      list: {
        type: 'array',
        items: {
          type: 'object',
          properties: { b: { 'x-component': 'Select' } },
        },
      },
    },
  });

  expect([...refs.components].sort()).toEqual(['Input', 'Select']);
  expect([...refs.decorators]).toEqual(['FormItem']);
});

test('只保留当前 Schema 引用的诊断', () => {
  const diagnostics = [
    { kind: 'component' as const, name: 'Used', requestedPlatform: 'mobile' as const, fallbackPlatform: 'pc' as const },
    { kind: 'component' as const, name: 'Unused', requestedPlatform: 'mobile' as const, fallbackPlatform: 'pc' as const },
  ];
  const filtered = filterDiagnosticsBySchema(diagnostics, {
    type: 'object',
    properties: { a: { 'x-component': 'Used' } },
  });
  expect(filtered.map((d) => d.name)).toEqual(['Used']);
});
```

`packages/renderer/src/__tests__/platform-fallback.test.tsx`：

```tsx
import { render, waitFor } from '@testing-library/react';
import { createFormEngine } from '@x-form-engine/core';
import type { Field } from '@formily/core';
import { useField } from '@formily/react';
import type { ComponentBinding, PlatformFallbackDiagnostic } from '@x-form-engine/types';
import { vi } from 'vitest';
import { FormEngineProvider } from '../context';
import { FormRenderer } from '../FormRenderer';

function Probe() {
  const field = useField<Field>();
  return <input aria-label="probe" value={String(field.value ?? '')} onChange={(e) => field.onInput(e.target.value)} />;
}

const probeBinding: ComponentBinding = {
  protocol: {
    name: 'Probe',
    version: '1.0.0',
    meta: { title: 'Probe' },
    capabilities: { editable: true, readonly: true, mobile: false },
    schema: { type: 'object' },
  },
  implementations: { pc: Probe },
};

const unusedBinding: ComponentBinding = {
  ...probeBinding,
  protocol: { ...probeBinding.protocol, name: 'UnusedProbe' },
};

test('mobile 回退派发事件与 onDiagnostic，只报 Schema 引用的组件，且不重复', async () => {
  const engine = createFormEngine({ components: [probeBinding, unusedBinding] });
  const events: PlatformFallbackDiagnostic[] = [];
  const onDiagnostic = vi.fn();
  engine.events.on<PlatformFallbackDiagnostic>('component:platform-fallback', (d) => events.push(d));

  const schema = {
    type: 'object',
    properties: { p: { type: 'string', 'x-component': 'Probe' } },
  };
  const { rerender } = render(
    <FormEngineProvider engine={engine}>
      <FormRenderer platform="mobile" schema={schema} onDiagnostic={onDiagnostic} />
    </FormEngineProvider>
  );

  await waitFor(() => {
    expect(events).toEqual([
      { kind: 'component', name: 'Probe', requestedPlatform: 'mobile', fallbackPlatform: 'pc' },
    ]);
    expect(onDiagnostic).toHaveBeenCalledTimes(1);
  });

  rerender(
    <FormEngineProvider engine={engine}>
      <FormRenderer platform="mobile" schema={{ ...schema }} onDiagnostic={onDiagnostic} />
    </FormEngineProvider>
  );
  expect(onDiagnostic).toHaveBeenCalledTimes(1);
  expect(events).toHaveLength(1);
});

test('debug 模式下回退诊断同时写 console.warn', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const engine = createFormEngine({ debug: true, components: [probeBinding] });
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer platform="mobile" schema={{ type: 'object', properties: { p: { type: 'string', 'x-component': 'Probe' } } }} />
    </FormEngineProvider>
  );
  await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
  warn.mockRestore();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/renderer/src/__tests__/diagnostics.test.ts packages/renderer/src/__tests__/platform-fallback.test.tsx`
Expected: FAIL，模块/属性不存在。

- [ ] **Step 3: Implement diagnostics**

- `diagnostics.ts`：递归遍历 `properties` 的每个子 schema 与 `items`（对象或数组），收集字符串型 `x-component` / `x-decorator`；忽略非对象节点。
- `filterDiagnosticsBySchema`：调用 `collectSchemaComponentRefs`，按 `kind` 查对应 Set；同 kind 同名只保留第一条。
- `types.ts`：增加 `onDiagnostic`。
- `FormRenderer.tsx`：
  - `const { SchemaField, diagnostics } = useMemo(() => createEngineSchemaField(engine, platform), [engine, platform]);`
  - `const visibleDiagnostics = useMemo(() => filterDiagnosticsBySchema(diagnostics, props.schema), [diagnostics, props.schema]);`
  - 用一个 `useRef<Set<string>>` 记录已派发的 `kind:name`；`useEffect` 依赖 `[engine, platform]` 时清空。
  - `useEffect` 遍历 `visibleDiagnostics`：未派发过则调用 `propsRef.current.onDiagnostic?.(d)`；`engine.events.emit('component:platform-fallback', d)`；`engine.options.debug === true` 时 `console.warn(...)`。
  - 所有 Effect 放在现有 hooks 之后，保持 hooks 顺序稳定。

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/renderer/src/__tests__/diagnostics.test.ts packages/renderer/src/__tests__/platform-fallback.test.tsx`
Expected: PASS。

Run: `pnpm --filter @x-form-engine/renderer typecheck`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/diagnostics.ts packages/renderer/src/types.ts packages/renderer/src/FormRenderer.tsx packages/renderer/src/__tests__/diagnostics.test.ts packages/renderer/src/__tests__/platform-fallback.test.tsx
git commit -m "feat(renderer): expose platform fallback diagnostics"
```

---

### Task 4: 抽出无 UI 依赖的协议定义

**Files:**
- Create: `packages/components/src/shared/protocols.ts`
- Modify: `packages/components/src/definitions/basic.ts`
- Modify: `packages/components/src/definitions/decorators.ts`
- Test: `packages/components/src/basic.test.tsx`

**Interfaces:**
- Produces:
  - `createBasicProtocol(name: string, options?: { mobile?: boolean }): ComponentProtocolDefinition`（默认 `mobile: true`）
  - `createFormItemProtocol(options?: { mobile?: boolean }): ComponentProtocolDefinition`（默认 `mobile: true`）
  - `BASIC_COMPONENT_SPECS: ReadonlyArray<{ name: string; title: string; properties?: Record<string, unknown> }>`

- [ ] **Step 1: Write the failing test**

在 `packages/components/src/basic.test.tsx` 末尾追加：

```ts
test('七个基础组件族的协议声明 mobile 能力（描述性，不参与运行时回退）', () => {
  for (const binding of basicComponents) {
    expect(binding.protocol.capabilities.mobile).toBe(true);
  }
});

test('PC 物料入口仍然只提供 pc 实现', () => {
  for (const binding of basicComponents) {
    expect(binding.implementations.pc).toBeTruthy();
    expect(binding.implementations.mobile).toBeUndefined();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/components/src/basic.test.tsx`
Expected: FAIL，`capabilities.mobile` 为 `false`。

- [ ] **Step 3: Implement shared protocols**

- 新建 `shared/protocols.ts`：把现有 `createProtocol` 迁入，增加 `options.mobile`（默认 `false`），并导出 `basic` 规格查找函数：

```ts
export function createBasicProtocol(
  name: string,
  options: { mobile?: boolean } = {}
): ComponentProtocolDefinition
export function createFormItemProtocol(
  options: { mobile?: boolean } = {}
): ComponentProtocolDefinition
```

`createBasicProtocol` 内部按 `BASIC_COMPONENT_SPECS` 取 title 与 properties，`capabilities.mobile` 默认 `true`。共享模块**不得** import 任何 UI 库或 Formily。

- `definitions/basic.ts`：删除本地 `createProtocol` 与手写 protocol，改为 `protocol: createBasicProtocol('Input')` 等；实现仍来自 `@formily/antd`。
- `definitions/decorators.ts`：改为 `protocol: createFormItemProtocol()`，注释说明移动端实现在 `src/mobile`。

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/components/src/basic.test.tsx packages/components/src/readonly/readonly.test.tsx`
Expected: PASS。

Run: `pnpm --filter @x-form-engine/components typecheck`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/shared/protocols.ts packages/components/src/definitions/basic.ts packages/components/src/definitions/decorators.ts packages/components/src/basic.test.tsx
git commit -m "refactor(components): extract ui-free protocol definitions"
```

---

### Task 5: 移动 Input / Textarea 包装

**Files:**
- Modify: `packages/components/package.json`（新增 `antd-mobile: "5.43.0"` 依赖）
- Modify: `packages/components/vitest.setup.ts`（补浏览器 API mock）
- Create: `packages/components/src/mobile/input.tsx`
- Create: `packages/components/src/mobile/textarea.tsx`
- Test: `packages/components/src/mobile/__tests__/input.test.tsx`

**Interfaces:**
- Produces: `Input`、`Textarea`（均为 `@formily/react` 的 connect 组件，Value 为 `string`）

- [ ] **Step 1: Write the failing test**

```tsx
import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Input } from '../input';
import { Textarea } from '../textarea';

const SchemaField = createSchemaField({ components: { Input, Textarea } });

function renderSchema(form = createForm()) {
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            name: { type: 'string', 'x-component': 'Input', 'x-component-props': { placeholder: '姓名' } },
            note: { type: 'string', 'x-component': 'Textarea', 'x-component-props': { placeholder: '备注' } },
          },
        }}
      />
    </FormProvider>
  );
  return form;
}

test('Input 把输入写回 string 值', () => {
  const form = renderSchema();
  fireEvent.change(screen.getByPlaceholderText('姓名'), { target: { value: 'hello' } });
  expect(form.values.name).toBe('hello');
});

test('Textarea 把输入写回 string 值', () => {
  const form = renderSchema();
  fireEvent.change(screen.getByPlaceholderText('备注'), { target: { value: '多行' } });
  expect(form.values.note).toBe('多行');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm install`
Run: `pnpm vitest run packages/components/src/mobile/__tests__/input.test.tsx`
Expected: FAIL，`antd-mobile` 未安装 / 模块不存在。

- [ ] **Step 3: Implement**

- `package.json` dependencies 增加 `"antd-mobile": "5.43.0"`。
- `input.tsx`：`export const Input = connect(AntdMobileInput);`
- `textarea.tsx`：`export const Textarea = connect(AntdMobileTextArea);`
- 所有移动包装组件都展开 `...props`，让 `placeholder` / `disabled` / `style` 等 `x-component-props` 透传；移动端不认识的 PC 专属 props 静默忽略，不抛错。
- `vitest.setup.ts`：若测试因 `window.matchMedia` / `ResizeObserver` 缺失报错，补最小 mock（`matchMedia` 返回 `matches: false`、`addListener/removeListener` 空函数；`ResizeObserver` 提供空实现的 `observe/unobserve/disconnect`）。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/components/src/mobile/__tests__/input.test.tsx`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/components/package.json pnpm-lock.yaml packages/components/vitest.setup.ts packages/components/src/mobile/input.tsx packages/components/src/mobile/textarea.tsx packages/components/src/mobile/__tests__/input.test.tsx
git commit -m "feat(components): add mobile input and textarea wrappers"
```

---

### Task 6: 移动 Number / DatePicker 包装

**Files:**
- Create: `packages/components/src/mobile/number.tsx`
- Create: `packages/components/src/mobile/date-picker.tsx`
- Test: `packages/components/src/mobile/__tests__/number.test.tsx`
- Test: `packages/components/src/mobile/__tests__/date-picker.test.tsx`

**Interfaces:**
- Produces:
  - `parseNumberInput(raw: string): number | null`
  - `formatNumberInput(value: unknown): string`
  - `NumberInput`（Value `number | null`）
  - `formatDateValue(value: Date): string`
  - `parseDateValue(value: unknown): Date | null`
  - `DatePicker`（Value `'YYYY-MM-DD'` 字符串）

- [ ] **Step 1: Write the failing tests**

`number.test.tsx`：

```tsx
import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NumberInput, parseNumberInput } from '../number';

test('parseNumberInput 解析数字与空值', () => {
  expect(parseNumberInput('42')).toBe(42);
  expect(parseNumberInput(' 3.5 ')).toBe(3.5);
  expect(parseNumberInput('')).toBeNull();
  expect(parseNumberInput('abc')).toBeNull();
});

test('NumberInput 写回 number', () => {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { Number: NumberInput } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            days: { type: 'number', 'x-component': 'Number', 'x-component-props': { placeholder: '天数' } },
          },
        }}
      />
    </FormProvider>
  );
  fireEvent.change(screen.getByPlaceholderText('天数'), { target: { value: '42' } });
  expect(form.values.days).toBe(42);
});
```

`date-picker.test.tsx`：

```tsx
import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { render, screen } from '@testing-library/react';
import { DatePicker, formatDateValue, parseDateValue } from '../date-picker';

test('formatDateValue 按本地年月日输出，跨时区不偏移', () => {
  expect(formatDateValue(new Date(2026, 10, 8))).toBe('2026-11-08');
});

test('parseDateValue 只接受 Date 与 YYYY-MM-DD', () => {
  expect(parseDateValue('2026-11-08')?.getFullYear()).toBe(2026);
  expect(parseDateValue('2026-11-08')?.getMonth()).toBe(10);
  expect(parseDateValue('2026-11-08')?.getDate()).toBe(8);
  expect(parseDateValue('not-a-date')).toBeNull();
});

test('DatePicker 用已有字符串值渲染触发区', () => {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { DatePicker } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            when: { type: 'string', 'x-component': 'DatePicker', default: '2026-11-08' },
          },
        }}
      />
    </FormProvider>
  );
  expect(screen.getByText('2026-11-08')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/components/src/mobile/__tests__/number.test.tsx packages/components/src/mobile/__tests__/date-picker.test.tsx`
Expected: FAIL，模块不存在。

- [ ] **Step 3: Implement**

- `number.tsx`：
  - `parseNumberInput`：`trim()` 后空串返回 `null`，否则 `Number()`，`Number.isFinite` 失败返回 `null`。
  - `formatNumberInput`：有限 number 转字符串，其余空串。
  - 组件用 `connect(AntdMobileInput, mapProps(...))`：`type: 'number'`、`value: formatNumberInput(props.value)`、`onChange: (raw: string) => props.onChange?.(parseNumberInput(raw))`。
- `date-picker.tsx`：
  - `formatDateValue` 用 `getFullYear/getMonth/getDate` + `padStart(2,'0')` 拼接，禁止 `toISOString()`。
  - `parseDateValue`：`Date` 原样返回；严格匹配 `/^\d{4}-\d{2}-\d{2}$/` 后按 `new Date(y, m-1, d)` 构造并校验 `getTime()` 非 NaN；其余返回 `null`。
  - 组件用 `connect(AntdMobileDatePicker, mapProps(...))`：`value: parseDateValue(props.value)`、`onConfirm: (date: Date) => props.onChange?.(formatDateValue(date))`、`children: (date, actions) => <Cell onClick={() => actions.open()}>{date ? formatDateValue(date) : (props.placeholder ?? '请选择日期')}</Cell>`。

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/components/src/mobile/__tests__/number.test.tsx packages/components/src/mobile/__tests__/date-picker.test.tsx`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/mobile/number.tsx packages/components/src/mobile/date-picker.tsx packages/components/src/mobile/__tests__/number.test.tsx packages/components/src/mobile/__tests__/date-picker.test.tsx
git commit -m "feat(components): add mobile number and date picker wrappers"
```

---

### Task 7: 移动 Select（单选 / 多选）

**Files:**
- Create: `packages/components/src/mobile/select.tsx`
- Test: `packages/components/src/mobile/__tests__/select.test.tsx`

**Interfaces:**
- Produces:
  - `interface MobileSelectOption { label: string; value: string | number }`
  - `normalizeSelectOptions(props: { dataSource?: unknown; options?: unknown }): MobileSelectOption[]`
  - `toPickerValue(value: unknown): string[]`
  - `optionValueFromPicker(values: string[], options: MobileSelectOption[]): unknown`
  - `toSelectorValue(value: unknown): Array<string | number>`
  - `fromSelectorValue(values: Array<string | number>, multiple: boolean): unknown`
  - `Select`（单选 Value 标量；`multiple: true` 时 Value 数组）

- [ ] **Step 1: Write the failing test**

```tsx
import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  Select,
  fromSelectorValue,
  normalizeSelectOptions,
  optionValueFromPicker,
  toPickerValue,
} from '../select';

const options = [
  { label: '研发部', value: 'rd' },
  { label: '产品部', value: 'pm' },
];

test('normalizeSelectOptions 支持 dataSource / options 与原始值数组', () => {
  expect(normalizeSelectOptions({ dataSource: options })).toEqual(options);
  expect(normalizeSelectOptions({ options: ['A', 'B'] })).toEqual([
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
  ]);
});

test('单选值与 Picker 数组互转', () => {
  expect(toPickerValue('rd')).toEqual(['rd']);
  expect(toPickerValue(null)).toEqual([]);
  expect(optionValueFromPicker(['rd'], options)).toBe('rd');
  expect(fromSelectorValue(['rd'], false)).toBe('rd');
});

test('多选值保持数组', () => {
  expect(fromSelectorValue(['rd', 'pm'], true)).toEqual(['rd', 'pm']);
});

test('单选 Select 用已有值展示 label', () => {
  const form = createForm({ initialValues: { dept: 'rd' } });
  const SchemaField = createSchemaField({ components: { Select } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            dept: { type: 'string', 'x-component': 'Select', enum: options },
          },
        }}
      />
    </FormProvider>
  );
  expect(screen.getByText('研发部')).toBeInTheDocument();
});

test('多选 Select 点击选项写回数组', () => {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { Select } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            depts: {
              type: 'array',
              'x-component': 'Select',
              'x-component-props': { multiple: true },
              enum: options,
            },
          },
        }}
      />
    </FormProvider>
  );
  fireEvent.click(screen.getByText('研发部'));
  expect(form.values.depts).toEqual(['rd']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/components/src/mobile/__tests__/select.test.tsx`
Expected: FAIL，模块不存在。

- [ ] **Step 3: Implement**

- `normalizeSelectOptions`：优先 `props.dataSource`，其次 `props.options`；数组元素为对象时取 `label`/`value`（缺省互相兜底），为原始值时 label=value=`String(item)`；`value` 统一收窄为 `string | number`（其他类型 `String()`）。
- 单选：内部 `SelectWidget` 维护 `visible` state，渲染 `Cell` 触发区 + `Picker columns={[options]}`；`onConfirm` 用 `optionValueFromPicker` 转回原值，然后 `onChange`。
- 多选：`multiple: true` 时渲染 antd-mobile `Selector multiple`，`value={toSelectorValue(props.value)}`，`onChange={(vals) => props.onChange?.(fromSelectorValue(vals, true))}`。
- 两个分支都用 `connect(...)` 接入 Formily，组件名导出为 `Select`。
- 选项标签展示：单选触发区显示当前值对应 label；空值显示 `props.placeholder ?? '请选择'`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/components/src/mobile/__tests__/select.test.tsx`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/mobile/select.tsx packages/components/src/mobile/__tests__/select.test.tsx
git commit -m "feat(components): add mobile select with single and multiple value handling"
```

---

### Task 8: 移动 Radio / Checkbox 包装

**Files:**
- Create: `packages/components/src/mobile/radio.tsx`
- Create: `packages/components/src/mobile/checkbox.tsx`
- Test: `packages/components/src/mobile/__tests__/radio-checkbox.test.tsx`

**Interfaces:**
- Produces: `Radio`（Value 标量）、`Checkbox`（Value 数组）；选项复用 `normalizeSelectOptions`

- [ ] **Step 1: Write the failing test**

```tsx
import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Checkbox } from '../checkbox';
import { Radio } from '../radio';

const options = [
  { label: '是', value: 'yes' },
  { label: '否', value: 'no' },
];

test('Radio 点击后写回标量', () => {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { Radio } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            urgent: { type: 'string', 'x-component': 'Radio', enum: options },
          },
        }}
      />
    </FormProvider>
  );
  fireEvent.click(screen.getByText('是'));
  expect(form.values.urgent).toBe('yes');
});

test('Checkbox 点击多个后写回数组', () => {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { Checkbox } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            tags: { type: 'array', 'x-component': 'Checkbox', enum: options },
          },
        }}
      />
    </FormProvider>
  );
  fireEvent.click(screen.getByText('是'));
  fireEvent.click(screen.getByText('否'));
  expect(form.values.tags).toEqual(['yes', 'no']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/components/src/mobile/__tests__/radio-checkbox.test.tsx`
Expected: FAIL，模块不存在。

- [ ] **Step 3: Implement**

- `radio.tsx`：`connect(RadioWidget)`；渲染 `Radio.Group value={props.value} onChange={props.onChange}`，`options.map` 生成 `<Radio value={option.value}>{option.label}</Radio>`。
- `checkbox.tsx`：`connect(CheckboxWidget)`；渲染 `Checkbox.Group value={Array.isArray(props.value) ? props.value : []} onChange={props.onChange}`，`options.map` 生成 `<Checkbox value={option.value}>`。
- 选项来源统一用 `normalizeSelectOptions`（从 `./select` import）。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/components/src/mobile/__tests__/radio-checkbox.test.tsx`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/mobile/radio.tsx packages/components/src/mobile/checkbox.tsx packages/components/src/mobile/__tests__/radio-checkbox.test.tsx
git commit -m "feat(components): add mobile radio and checkbox wrappers"
```

---

### Task 9: 移动 FormItem 装饰器

**Files:**
- Create: `packages/components/src/mobile/form-item.tsx`
- Test: `packages/components/src/mobile/__tests__/form-item.test.tsx`

**Interfaces:**
- Produces: `FormItem`（`@formily/react` decorator connect 组件）

- [ ] **Step 1: Write the failing test**

```tsx
import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { render, screen, waitFor } from '@testing-library/react';
import { FormItem } from '../form-item';

function renderForm() {
  const form = createForm();
  const SchemaField = createSchemaField({ components: { FormItem, Input: () => <input aria-label="input" /> } });
  render(
    <FormProvider form={form}>
      <SchemaField
        schema={{
          type: 'object',
          properties: {
            name: {
              type: 'string',
              title: '姓名',
              description: '请填写真实姓名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-validator': [{ required: true, message: '请输入姓名' }],
            },
          },
        }}
      />
    </FormProvider>
  );
  return form;
}

test('FormItem 渲染标题与描述', () => {
  renderForm();
  expect(screen.getByText('姓名')).toBeInTheDocument();
  expect(screen.getByText('请填写真实姓名')).toBeInTheDocument();
});

test('校验失败时 FormItem 展示错误文案', async () => {
  const form = renderForm();
  await expect(form.validate()).rejects.toBeTruthy();
  await waitFor(() => expect(screen.getByText('请输入姓名')).toBeInTheDocument());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/components/src/mobile/__tests__/form-item.test.tsx`
Expected: FAIL，模块不存在 / 装饰器未注册。

- [ ] **Step 3: Implement**

`form-item.tsx`：

```tsx
const BaseFormItem = (props) => <AntdMobileFormItem {...props}>{props.children}</AntdMobileFormItem>;

export const FormItem = connect(
  BaseFormItem,
  mapProps((props, field) => ({
    label: props.label ?? field?.title,
    required: field?.required ?? false,
    help:
      props.help ??
      (field?.selfErrors?.length ? field.selfErrors.join(', ') : undefined),
    extra: props.extra ?? field?.description,
  }))
);
```

- 找不到 field / void field 时安全降级，不访问未定义属性。
- 不引入 antd-mobile 的 `rc-field-form` 校验，校验仍由 Formily 负责。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/components/src/mobile/__tests__/form-item.test.tsx`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/mobile/form-item.tsx packages/components/src/mobile/__tests__/form-item.test.tsx
git commit -m "feat(components): add mobile form item decorator"
```

---

### Task 10: 移动物料入口与子路径发布

**Files:**
- Create: `packages/components/src/mobile/index.ts`
- Create: `packages/components/mobile.ts`
- Modify: `packages/components/package.json`
- Modify: `packages/components/tsconfig.json`
- Test: `packages/components/src/mobile/__tests__/materials.test.tsx`

**Interfaces:**
- Consumes: 七类移动组件、`FormItem`、`createBasicProtocol`、`createFormItemProtocol`、`ReadonlyText`
- Produces:
  - `@x-form-engine/components/mobile` 导出 `basicComponents`（7 个）与 `basicDecorators`（1 个）
  - 每个 binding：`implementations.mobile` 存在、`implementations.pc` 不存在、`readonly: { mobile: ReadonlyText, default: ReadonlyText }`、`protocol.capabilities.mobile === true`
  - 协议名 → 实现映射：`Input → Input`、`Textarea → Textarea`、`Number → NumberInput`、`Select → Select`、`Radio → Radio`、`Checkbox → Checkbox`、`DatePicker → DatePicker`、装饰器 `FormItem → FormItem`

- [ ] **Step 1: Write the failing test**

```tsx
import { basicComponents } from '../../index';
import { basicComponents as mobileComponents, basicDecorators } from '../index';

const P0 = ['Input', 'Textarea', 'Number', 'Select', 'Radio', 'Checkbox', 'DatePicker'];

test('移动物料包含七类 P0 与 FormItem，且只提供 mobile 实现', () => {
  expect(mobileComponents.map((b) => b.protocol.name)).toEqual(P0);
  for (const binding of mobileComponents) {
    expect(binding.implementations.mobile).toBeTruthy();
    expect(binding.implementations.pc).toBeUndefined();
    expect(binding.readonly?.mobile).toBeTruthy();
    expect(binding.readonly?.default).toBeTruthy();
    expect(binding.protocol.capabilities.mobile).toBe(true);
  }
  expect(basicDecorators.map((b) => b.protocol.name)).toEqual(['FormItem']);
  expect(basicDecorators[0].implementations.mobile).toBeTruthy();
});

test('PC 物料入口不混入 mobile 实现（包拆分基线）', () => {
  for (const binding of basicComponents) {
    expect(binding.implementations.mobile).toBeUndefined();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/components/src/mobile/__tests__/materials.test.tsx`
Expected: FAIL，`src/mobile/index.ts` 不存在。

- [ ] **Step 3: Implement entry and exports**

- `src/mobile/index.ts`：用共享协议工厂与 `ReadonlyText` 组装七个 binding，顺序与 PC 一致；`readonly` 统一为 `{ mobile: ReadonlyText, default: ReadonlyText }`。`ReadonlyText` 从 `../readonly/readonly-components` import。
- `packages/components/mobile.ts`：`export * from './src/mobile';`
- `packages/components/package.json`：
  - 顶层 `exports` 增加 `"./mobile": { "types": "./mobile.ts", "default": "./mobile.ts" }`
  - `publishConfig.exports` 增加 `"./mobile": { "types": "./dist/mobile.d.ts", "import": "./dist/mobile.js", "require": "./dist/mobile.cjs" }`
  - `build` 改为 `tsup src/index.ts mobile.ts --format esm,cjs --dts --sourcemap --clean --out-dir dist`
- `packages/components/tsconfig.json`：`include` 改为 `["src", "mobile.ts"]`。

- [ ] **Step 4: Run tests and build to verify**

Run: `pnpm vitest run packages/components/src/mobile/__tests__/materials.test.tsx packages/components/src/basic.test.tsx`
Expected: PASS。

Run: `pnpm --filter @x-form-engine/components typecheck`
Expected: PASS。

Run: `pnpm --filter @x-form-engine/components build`
Expected: PASS，且 `ls packages/components/dist/mobile.js packages/components/dist/mobile.d.ts` 两个文件都存在。

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/mobile/index.ts packages/components/mobile.ts packages/components/package.json packages/components/tsconfig.json packages/components/src/mobile/__tests__/materials.test.tsx
git commit -m "feat(components): add mobile material entry and subpath export"
```

---

### Task 11: apps/mobile-demo 验收应用

**Files:**
- Create: `apps/mobile-demo/package.json`
- Create: `apps/mobile-demo/tsconfig.json`
- Create: `apps/mobile-demo/vite.config.ts`
- Create: `apps/mobile-demo/index.html`
- Create: `apps/mobile-demo/src/main.tsx`
- Create: `apps/mobile-demo/src/App.tsx`

**Interfaces:**
- Consumes: `@x-form-engine/components/mobile`、`@x-form-engine/sdk`、`antd-mobile`、`@formily/react`
- Produces: 可构建的手机端 demo，覆盖七类组件、提交、只读还原、pc-only 组件回退演示

- [ ] **Step 1: Create the app skeleton**

`package.json` 关键字段（其余照 `apps/playground` 补全）：

```json
{
  "name": "mobile-demo",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@formily/react": "2.3.7",
    "@x-form-engine/components": "workspace:*",
    "@x-form-engine/sdk": "workspace:*",
    "antd-mobile": "5.43.0",
    "react": "17.0.2",
    "react-dom": "17.0.2"
  },
  "devDependencies": {
    "@types/react": "17.0.0",
    "@types/react-dom": "17.0.0",
    "@vitejs/plugin-react": "^4",
    "typescript": "5.9.3",
    "vite": "^5"
  }
}
```

- `index.html` 必须包含 `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`。
- `vite.config.ts`：仅 `plugins: [react()]`（antd-mobile 的 `es` 入口自带 CSS import，不需要 less 配置）。
- `tsconfig.json`：`extends: "../../tsconfig.base.json"`，`jsx: "react-jsx"`，`noEmit: true`，`include: ["src"]`。
- `main.tsx`：`createRoot(document.getElementById('root')!).render(<App />)`。

- [ ] **Step 2: Implement App.tsx**

必须包含：

- 手机容器样式（`maxWidth: 480, margin: '0 auto'`）。
- Engine：`createFormEngine({ platform: 'mobile', locale: 'zh-CN', components: [...mobileBasicComponents, legacyNoteBinding], decorators: mobileBasicDecorators, plugins: [defaultFormattersPlugin] })`。
- Schema 覆盖七类组件：`Input`（姓名）、`Select`（部门）、`Textarea`（出差事由）、`DatePicker`（出发日期）、`DatePicker`（返回日期）、`Number`（出差天数）、`Radio`（是否紧急）、`Checkbox`（随行人员）。`姓名`/`部门`/`出发日期` 加必填 `x-validator`；`出差天数` 复用 `packages/renderer/src/__tests__/m1-integration.test.tsx` 的 `x-reactions` 日期差表达式，证明移动端 effects/reactions 仍工作。
- `FormRenderer ref platform="mobile" onDiagnostic={(d) => setDiagnostics((prev) => [...prev, d])} />`。
- 提交按钮：调用 `ref.current.submit()`，展示 `values` 与 `snapshot` JSON；用 `ReadonlyRenderer platform="mobile" schema={schema} snapshot={result.snapshot} values={result.values}` 展示还原结果。
- `legacyNoteBinding`：本地定义、只实现 `pc` 的组件，内部用 `useField()` 绑定一个普通 `<input>`，**不得** import `antd` 或 `@formily/antd`。Schema 中放一个 `LegacyNote` 字段，用于展示回退诊断列表。

- [ ] **Step 3: Install and verify build**

Run: `pnpm install`
Run: `pnpm --filter mobile-demo typecheck`
Expected: PASS。
Run: `pnpm --filter mobile-demo build`
Expected: PASS，`apps/mobile-demo/dist/index.html` 生成。

- [ ] **Step 4: Commit**

```bash
git add apps/mobile-demo pnpm-lock.yaml
git commit -m "feat(mobile-demo): add mobile renderer acceptance app"
```

---

### Task 12: 移动产物纯净度检查

**Files:**
- Create: `apps/mobile-demo/scripts/check-bundle.mjs`
- Modify: `apps/mobile-demo/package.json`

**Interfaces:**
- Produces: `pnpm --filter mobile-demo build` 在构建后自动校验产物

- [ ] **Step 1: Write the failing check**

`scripts/check-bundle.mjs`：

```js
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const assetsDir = fileURLToPath(new URL('../dist/assets/', import.meta.url));
const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
const forbidden = ['ant-formily-item', 'ant-picker', 'ant-select', 'ant-form', '@formily/antd', 'rc-picker'];
const required = ['adm-'];

let failed = false;
for (const file of jsFiles) {
  const text = readFileSync(join(assetsDir, file), 'utf8');
  for (const marker of forbidden) {
    if (text.includes(marker)) {
      console.error(`[bundle-check] ${file} contains desktop marker: ${marker}`);
      failed = true;
    }
  }
}
const allJs = jsFiles.map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n');
for (const marker of required) {
  if (!allJs.includes(marker)) {
    console.error(`[bundle-check] mobile marker missing: ${marker}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`[bundle-check] ok (${jsFiles.length} js files)`);
```

`package.json`：`build` 改为 `"vite build && node scripts/check-bundle.mjs"`。

- [ ] **Step 2: Run it**

Run: `pnpm --filter mobile-demo build`
Expected: PASS，输出 `[bundle-check] ok`。

若失败，检查 `apps/mobile-demo` 是否误 import 了根 `@x-form-engine/components` 或 `antd`；修掉 import 而不是放宽检查。

- [ ] **Step 3: Commit**

```bash
git add apps/mobile-demo/scripts/check-bundle.mjs apps/mobile-demo/package.json
git commit -m "test(mobile-demo): verify mobile bundle excludes desktop antd"
```

---

### Task 13: 文档与里程碑编号

**Files:**
- Modify: `docs/tech-design/mvp-roadmap.md`
- Modify: `docs/tech-design/form-engine-architecture-design.md`
- Modify: `docs/tech-design/backlog.md`
- Modify: `docs/tech-design/02-specs/02-component-spec.md`
- Modify: `docs/tech-design/02-specs/05-renderer-sdk.md`
- Modify: `docs/tech-design/02-specs/10-testing-and-roadmap.md`
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: 已落地的代码与测试
- Produces: 文档与代码一致；M4 = Mobile 渲染器，M5 = 工程化与发布

- [ ] **Step 1: Update roadmap**

`docs/tech-design/mvp-roadmap.md`：

- §3.1 表格 `Mobile Renderer` 行改为：`Core | 编辑、预览、只读；七类 P0 移动组件 + FormItem；缺实现按字段回退并记诊断（M4 已落地）`。
- FUT-01/FUT-02 的「后续迭代」列改为 `M4（已落地：七类 P0）`。
- 在 `## M4：工程化与发布` 之前插入新章节：

```markdown
## M4：Mobile 渲染器

目标：同一份 Schema 在移动端完成编辑、校验、提交和只读还原，业务 Value 与 PC 一致。

- [x] M4-01：移动物料入口 `@x-form-engine/components/mobile`。
- [x] M4-02：Input / Textarea / Number / Select / Radio / Checkbox / DatePicker 的 antd-mobile 实现。
- [x] M4-03：FormItem 移动装饰器。
- [x] M4-04：mobile 缺实现按字段回退 pc 并产生诊断。
- [x] M4-05：移动端只读还原。
- [x] M4-06：`apps/mobile-demo` 端到端验收。
- [x] M4-07：移动产物不夹带桌面 antd 的构建校验。
```

- 原 `## M4：工程化与发布` 改为 `## M5：工程化与发布`，任务编号 `M4-01`…`M4-10` 改为 `M5-01`…`M5-10`。
- BLOCK-02「MVP 实现」中 `Mobile 保留独立入口，使用基础响应式布局兜底。` 改为 `Mobile 使用 antd-mobile 独立实现，缺实现按字段回退并记诊断。`
- `form-engine-architecture-design.md` 里程碑表：新增 `| M4 | Mobile 渲染器 | 已完成 |`，原 `M4 | 工程化与发布 | 未开始` 改为 `M5`。

- [ ] **Step 2: Update specs**

- `02-component-spec.md`：状态行落地对照补充 `packages/components/src/mobile`；在「组件分层」或平台实现段落说明：PC/移动物料分入口、移动缺失按字段回退并记诊断、`capabilities.mobile` 为描述性元数据。
- `05-renderer-sdk.md`：状态改为 `implemented（PC + Mobile + Readonly）`；在 §2 或 §10 增加：平台按应用/engine 选定，`@x-form-engine/components/mobile` 为独立入口，`FormRenderer platform="mobile"` 为唯一 API 入口，`onDiagnostic` / `component:platform-fallback` 诊断通道。
- `10-testing-and-roadmap.md` 第 72 行里程碑列表改为：`M1 Engine 内核 / M2 Designer 闭环 / M3 Value-Snapshot-Readonly 闭环 / M4 Mobile 渲染器 / M5 工程化与发布`。

- [ ] **Step 3: Update README / AGENTS / backlog**

- `README.md` 第 59 行附近：新增 `✅ **M4** Mobile 渲染器（七类 P0 / 回退诊断 / mobile-demo）`，原 M4 工程化改为 `⬜ **M5** 工程化与发布`。
- `docs/README.md` 的 `M1~M4 里程碑` 改为 `M1~M5 里程碑`。
- `AGENTS.md`：`M1–M4 milestones` 改为 `M1–M5`；仓库状态段落补充「M4 Mobile 渲染器已完成：移动物料入口、七类 P0 组件、pc 回退诊断、mobile-demo」。
- `backlog.md` 第 145 行 `M4（工程化与发布）` 改为 `M5（工程化与发布）`。

- [ ] **Step 4: Verify docs consistency**

Run: `grep -rn "M4：工程化与发布" README.md AGENTS.md docs`
Expected: 无输出。
Run: `grep -rn "M4-0" docs/tech-design/mvp-roadmap.md`
Expected: 只命中 Mobile 渲染器的 M4-01…M4-07。
Run: `grep -rn "M5：工程化与发布" docs/tech-design/mvp-roadmap.md`
Expected: 命中 1 处。

- [ ] **Step 5: Commit**

```bash
git add docs/tech-design/mvp-roadmap.md docs/tech-design/form-engine-architecture-design.md docs/tech-design/backlog.md docs/tech-design/02-specs/02-component-spec.md docs/tech-design/02-specs/05-renderer-sdk.md docs/tech-design/02-specs/10-testing-and-roadmap.md README.md docs/README.md AGENTS.md
git commit -m "docs: record mobile renderer milestone and renumber engineering to M5"
```

---

## Final Verification

- [ ] Run `pnpm test:run` — all tests pass.
- [ ] Run `pnpm -r typecheck` — all packages pass.
- [ ] Run `pnpm --filter mobile-demo build` — build passes and bundle check prints ok.
- [ ] Run `pnpm --filter @x-form-engine/components build` — `dist/index.*` 与 `dist/mobile.*` 均生成。
- [ ] Manually verify in `apps/mobile-demo` (dev server): seven components render, required validation shows on submit, submit produces values + snapshot, readonly section restores display, LegacyNote fallback diagnostic appears.
