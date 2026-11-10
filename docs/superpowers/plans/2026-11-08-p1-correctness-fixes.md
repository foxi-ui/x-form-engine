# P1 正确性六项修复 实施方案

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:executing-plans（Native）逐任务实现本计划。步骤用 `- [ ]` 勾选跟踪。

**目标（Goal）：** 修复 backlog「🔴 P1 正确性 / 一致性」的 6 项缺口——渲染器 platform/首帧权限语义、引擎 disposed 守卫、事件隔离、插件依赖失败事件、候选快照可变叶子深拷贝。

**架构（Architecture）：** 六项修复互相独立，落在三个包：`renderer`（R3/R4）、`core`（P1/P2/P3）、`adapters`（P5）。全部为「补测试 → 改实现 → 跑绿」的局部修复，不引入新依赖、不改动包依赖方向、不触碰 Formily 内核。

**技术栈（Tech Stack）：** pnpm monorepo，React 17，Formily 2.3.7，Vitest 3，TypeScript 5.9。

**规格（Spec）：** `docs/tech-design/backlog.md`（🔴 P1 六项表 + §1.3/§1.4 明细）、`docs/tech-design/02-specs/03-registry-plugin.md`（§5.8 安装失败事件、§9 事件语义）、`docs/tech-design/02-specs/01-types.md`（§10 错误协议）。代码为权威。

## 全局约束（Global Constraints）

- 不重实现 Formily：只扩展，`x-engine` 是唯一扩展命名空间。
- `packages/types` 不得引入 React/Formily/Designable/UI 依赖；`unknown` 优先于 `any`。
- 事件是通知、不是服务调用；错误走 `FormEngineError`，不走 EventBus 传播。
- Registry 冲突严格（无隐式 last-write-wins）。
- 文档不得与代码漂移：协议改动需回写 backlog / 对应 spec。
- 测试命令：`pnpm test:run`（全量）、`pnpm typecheck`（全包）、`pnpm vitest run <文件>`（单测）。
- 文档/注释使用简体中文。

## 审查重点（Review Focus）

这些是规格隐含、但单一任务测试未覆盖、最可能咬到使用者的输入/失败模式：

1. **platform 优先级**：`props.platform` 显式传值应覆盖 `engine.options.platform`（R3 任务内补测）。
2. **disabled 与 readOnly 同时为真**：`disabled` 应胜出（R4 任务内补测）。
3. **once 监听器抛错**：仍应被退订、不二次触发（P2 任务内补测）。
4. **依赖失败的资源侧效应**：`installPlugin` 依赖缺失不得遗留资源，且 `plugin:failed` 载荷携带原始错误（P3 任务内补测）。
5. **嵌套对象数组行内的 Date**：深拷贝需递归到行内叶字段（P5 任务内补测）。

---

### Task 1: FormRenderer platform 回退合并（R3）

**文件（Files）：**
- 修改：`packages/renderer/src/FormRenderer.tsx:15`
- 测试：`packages/renderer/src/FormRenderer.test.tsx`

**接口（Interfaces）：**
- 消费：无（独立任务）。
- 产出：无（后续任务不依赖）。

- [ ] **步骤 1：写失败测试** —— 在 `FormRenderer.test.tsx` 顶部复用现有 `inputBinding`（仅 `implementations: { pc: TextInput }`），追加两个用例：

```tsx
test('platform 未传时回退到 engine.options.platform', () => {
  const engine = createFormEngine({ platform: 'mobile', components: [inputBinding] });
  expect(() =>
    render(
      <FormEngineProvider engine={engine}>
        <FormRenderer
          schema={{ type: 'object', properties: { name: { type: 'string', 'x-component': 'Input' } } }}
        />
      </FormEngineProvider>
    )
  ).toThrowError(
    expect.objectContaining({
      code: 'COMPONENT_CAPABILITY_MISMATCH',
      details: expect.objectContaining({ platform: 'mobile' }),
    })
  );
});

test('props.platform 优先于 engine.options.platform', () => {
  const engine = createFormEngine({ platform: 'mobile', components: [inputBinding] });
  expect(() =>
    render(
      <FormEngineProvider engine={engine}>
        <FormRenderer
          platform="pc"
          schema={{ type: 'object', properties: { name: { type: 'string', 'x-component': 'Input' } } }}
        />
      </FormEngineProvider>
    )
  ).not.toThrow();
});
```

- [ ] **步骤 2：跑测试确认失败**

运行：`pnpm vitest run packages/renderer/src/FormRenderer.test.tsx`
期望：`platform 未传时回退…` 用例 FAIL（当前默认 `'pc'`，不抛错）。

- [ ] **步骤 3：改 `FormRenderer.tsx:15`**

将 `const platform = props.platform ?? 'pc';` 改为 `const platform = props.platform ?? engine.options.platform ?? 'pc';`

- [ ] **步骤 4：跑测试确认通过**

运行：`pnpm vitest run packages/renderer/src/FormRenderer.test.tsx`
期望：两个用例 PASS，其余 renderer 测试不回归。

- [ ] **步骤 5：提交**

```bash
git add packages/renderer/src/FormRenderer.tsx packages/renderer/src/FormRenderer.test.tsx
git commit -m "fix(renderer): platform 回退到 engine.options.platform"
```

---

### Task 2: disabled/readOnly 首帧生效（R4）

**文件（Files）：**
- 修改：`packages/renderer/src/FormRenderer.tsx:28-52`
- 测试：`packages/renderer/src/FormRenderer.test.tsx`

**接口（Interfaces）：**
- 消费：无。
- 产出：模块级辅助函数 `resolvePattern(disabled?: boolean, readOnly?: boolean): 'editable' | 'disabled' | 'readOnly'`（仅本文件内使用）。

- [ ] **步骤 1：写失败测试** —— 在 `FormRenderer.test.tsx` 追加一个首帧模式探针组件与绑定：

```tsx
const renderedPatterns: string[] = [];
function PatternProbe() {
  const field = useField<Field>();
  renderedPatterns.push(field.pattern);
  return <span>{field.pattern}</span>;
}
const patternProbeBinding = {
  protocol: { name: 'Probe', version: '1', meta: { title: 'P' },
    capabilities: { editable: true, readonly: true, mobile: false },
    schema: { type: 'object' as const } },
  implementations: { pc: PatternProbe },
};

test('readOnly 首帧即生效，不依赖 effect 后置', () => {
  renderedPatterns.length = 0;
  const engine = createFormEngine({ components: [patternProbeBinding] });
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer readOnly
        schema={{ type: 'object', properties: { f: { type: 'string', 'x-component': 'Probe' } } }} />
    </FormEngineProvider>
  );
  expect(renderedPatterns[0]).toBe('readOnly');
});

test('disabled 优先于 readOnly', () => {
  renderedPatterns.length = 0;
  const engine = createFormEngine({ components: [patternProbeBinding] });
  render(
    <FormEngineProvider engine={engine}>
      <FormRenderer disabled readOnly
        schema={{ type: 'object', properties: { f: { type: 'string', 'x-component': 'Probe' } } }} />
    </FormEngineProvider>
  );
  expect(renderedPatterns[0]).toBe('disabled');
});
```

- [ ] **步骤 2：跑测试确认失败**

运行：`pnpm vitest run packages/renderer/src/FormRenderer.test.tsx`
期望：`readOnly 首帧即生效…` FAIL（当前 `renderedPatterns[0]` 为 `'editable'`）。

- [ ] **步骤 3：改 `FormRenderer.tsx`** —— 在组件外新增辅助函数，并在 `createForm` 与 effect 两处复用：

```ts
function resolvePattern(disabled?: boolean, readOnly?: boolean): 'editable' | 'disabled' | 'readOnly' {
  return disabled ? 'disabled' : readOnly ? 'readOnly' : 'editable';
}
```

在 `createForm` 的 options 中追加 `pattern: resolvePattern(props.disabled, props.readOnly)`；把 effect 内 `form.setPattern(...)` 改为 `form.setPattern(resolvePattern(disabled, readOnly))`。`useMemo` 依赖保持 `[]`（首帧 props 即初始值，后续由 effect 同步）。

- [ ] **步骤 4：跑测试确认通过**

运行：`pnpm vitest run packages/renderer/src/FormRenderer.test.tsx`
期望：两个用例 PASS，其余 renderer 测试不回归。

- [ ] **步骤 5：提交**

```bash
git add packages/renderer/src/FormRenderer.tsx packages/renderer/src/FormRenderer.test.tsx
git commit -m "fix(renderer): disabled/readOnly 首帧生效，消除可编辑闪烁"
```

---

### Task 3: installPlugin disposed 守卫（P1）

**文件（Files）：**
- 修改：`packages/types/src/errors.ts`（新增错误码）、`packages/core/src/engine.ts:76-78`
- 测试：`packages/core/src/engine.test.ts`

**接口（Interfaces）：**
- 消费：无。
- 产出：`FormEngineErrorCode` 新增字面量 `'ENGINE_DISPOSED'`（公开错误码，后续无任务依赖）。

- [ ] **步骤 1：写失败测试** —— 在 `engine.test.ts` 追加：

```ts
test('dispose 后 installPlugin 抛 ENGINE_DISPOSED', () => {
  const engine = createFormEngine();
  engine.dispose();
  expect(() =>
    engine.installPlugin({ name: 'late', version: '1.0.0', install: () => {} })
  ).toThrowError(expect.objectContaining({ code: 'ENGINE_DISPOSED' }));
});
```

- [ ] **步骤 2：跑测试确认失败**

运行：`pnpm vitest run packages/core/src/engine.test.ts`
期望：FAIL（当前 dispose 后仍能安装，不抛错）。

- [ ] **步骤 3：改实现** —— 在 `errors.ts` 的 `FormEngineErrorCode` 联合类型末尾追加 `| 'ENGINE_DISPOSED'`；在 `engine.ts` 顶部新增 `import { FormEngineError } from '@x-form-engine/types';`（值导入，与现有 `import type` 分开），并把 `installPlugin` 改为：

```ts
installPlugin(plugin: FormEnginePlugin): void {
  if (this.status === 'disposed') {
    throw new FormEngineError(
      'ENGINE_DISPOSED',
      'Cannot install plugin after engine is disposed',
      { plugin: plugin.name }
    );
  }
  this.pluginManager.install(plugin);
}
```

- [ ] **步骤 4：跑测试确认通过**

运行：`pnpm vitest run packages/core/src/engine.test.ts`
期望：PASS，其余 core 测试不回归。

- [ ] **步骤 5：提交**

```bash
git add packages/types/src/errors.ts packages/core/src/engine.ts packages/core/src/engine.test.ts
git commit -m "fix(core): installPlugin 在 disposed 后抛 ENGINE_DISPOSED"
```

---

### Task 4: EventBus emit 异常隔离（P2）

**文件（Files）：**
- 修改：`packages/core/src/events/event-bus.ts:69-78`（含顶部 JSDoc）
- 测试：`packages/core/src/events/event-bus.test.ts`

**接口（Interfaces）：**
- 消费：无。
- 产出：`emit` 语义收敛为「监听器异常被隔离、不影响其余监听器、不向 emit 抛出」，仅本文件内生效。

- [ ] **步骤 1：写失败测试** —— 在 `event-bus.test.ts` 追加（`vi` 为 Vitest 全局）：

```ts
test('监听器抛错不中断派发，也不向 emit 抛出', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const bus = createEventBus();
  const calls: number[] = [];
  bus.on<number>('submit', () => { calls.push(1); throw new Error('boom'); });
  bus.on<number>('submit', (p) => calls.push(p));
  expect(() => bus.emit('submit', 2)).not.toThrow();
  expect(calls).toEqual([1, 2]);
  expect(spy).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});

test('once 监听器抛错后仍被退订', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const bus = createEventBus();
  const calls: number[] = [];
  bus.once<number>('submit', () => { calls.push(1); throw new Error('boom'); });
  expect(() => bus.emit('submit', 1)).not.toThrow();
  bus.emit('submit', 2);
  expect(calls).toEqual([1]);
  spy.mockRestore();
});
```

- [ ] **步骤 2：跑测试确认失败**

运行：`pnpm vitest run packages/core/src/events/event-bus.test.ts`
期望：两个用例 FAIL（当前监听器抛错会向上传播，`emit` 抛出）。

- [ ] **步骤 3：改 `event-bus.ts`** —— `emit` 逐监听器 try/catch，捕获后 `console.error` 并继续；更新顶部 JSDoc 注明「监听器异常被隔离，不影响其余监听器，也不向 emit 抛出」：

```ts
emit<T>(event: string, payload: T): void {
  const handlers = listeners.get(event);
  if (!handlers) return;
  for (const handler of [...handlers]) {
    try {
      handler(payload);
    } catch (error) {
      console.error(`[x-form-engine] 事件 "${event}" 监听器抛错:`, error);
    }
  }
}
```

- [ ] **步骤 4：跑测试确认通过**

运行：`pnpm vitest run packages/core/src/events/event-bus.test.ts`
期望：两个用例 PASS，其余 core 测试不回归。

- [ ] **步骤 5：提交**

```bash
git add packages/core/src/events/event-bus.ts packages/core/src/events/event-bus.test.ts
git commit -m "fix(core): EventBus emit 隔离监听器异常"
```

---

### Task 5: 依赖校验失败派发 plugin:failed（P3）

**文件（Files）：**
- 修改：`packages/core/src/plugin/plugin-manager.ts:162-163`
- 测试：`packages/core/src/plugin/plugin.test.ts`

**接口（Interfaces）：**
- 消费：无。
- 产出：`install` 的依赖校验（`resolvePluginOrder`）纳入事务 try 块，失败时回滚（无新增资源）+ 派发 `plugin:failed`。

- [ ] **步骤 1：写失败测试** —— 在 `plugin.test.ts` 追加：

```ts
test('installPlugin 依赖缺失派发 plugin:failed 并抛 PLUGIN_DEPENDENCY_MISSING', () => {
  const engine = createFormEngine();
  const failed: Array<{ plugin: string; error?: unknown }> = [];
  engine.events.on('plugin:failed', (payload: { plugin: string; error?: unknown }) => failed.push(payload));

  expect(() =>
    engine.installPlugin({
      name: 'lonely', version: '1.0.0', dependencies: ['missing'], install: () => {},
    })
  ).toThrowError(expect.objectContaining({ code: 'PLUGIN_DEPENDENCY_MISSING' }));

  expect(failed).toHaveLength(1);
  expect(failed[0].plugin).toBe('lonely');
  expect(failed[0].error).toBeInstanceOf(Error);
});
```

- [ ] **步骤 2：跑测试确认失败**

运行：`pnpm vitest run packages/core/src/plugin/plugin.test.ts`
期望：FAIL（当前依赖校验在 try 外，不派发 `plugin:failed`，`failed` 为空）。

- [ ] **步骤 3：改 `plugin-manager.ts`** —— 把 `resolvePluginOrder([...installed, plugin])` 移入 try 块、紧贴 `plugin.install(context)` 之前；`snapshots` 保持在 try 之前采集（依赖失败时无新增资源，`collectNewRegistrations` 为空、回滚为空操作）。`catch` 内已有「回滚 + 派发 `plugin:failed` + 重抛」逻辑不变。

- [ ] **步骤 4：跑测试确认通过**

运行：`pnpm vitest run packages/core/src/plugin/plugin.test.ts`
期望：PASS，其余 core 测试不回归。

- [ ] **步骤 5：提交**

```bash
git add packages/core/src/plugin/plugin-manager.ts packages/core/src/plugin/plugin.test.ts
git commit -m "fix(core): 依赖校验失败派发 plugin:failed"
```

---

### Task 6: 候选快照深拷贝 Date/File/Blob（P5）

**文件（Files）：**
- 修改：`packages/adapters/src/internal.ts`（新增 `cloneValue`）、`packages/adapters/src/snapshot.ts:46`（入口克隆）
- 测试：`packages/adapters/src/__tests__/snapshot.test.ts`

**接口（Interfaces）：**
- 消费：`isPlainObject`（同文件内部）。
- 产出：`cloneValue(value: unknown): unknown`（内部工具，不对外导出，经 `internal.ts` 供 `snapshot.ts` 使用）。

- [ ] **步骤 1：写失败测试** —— 在 `snapshot.test.ts` 追加（复用已有 `engine`）：

```ts
it('快照深拷贝 Date/File/Blob，不被后续修改污染', () => {
  const date = new Date('2026-11-08T00:00:00.000Z');
  const file = new File(['hello'], 'a.txt', { type: 'text/plain' });
  const blob = new Blob(['world'], { type: 'text/plain' });

  const { snapshot } = createCandidateSnapshot(
    engine,
    {
      type: 'object',
      properties: {
        when: { type: 'string', 'x-component': 'DatePicker' },
        attach: { type: 'string', 'x-component': 'Upload' },
        blob: { type: 'string', 'x-component': 'Upload' },
      },
    },
    { when: date, attach: file, blob }
  );

  expect(snapshot.fields.when.value).not.toBe(date);
  expect(snapshot.fields.attach.value).not.toBe(file);
  expect(snapshot.fields.blob.value).not.toBe(blob);
  expect((snapshot.fields.when.value as Date).getTime()).toBe(date.getTime());

  date.setFullYear(2030);
  expect((snapshot.fields.when.value as Date).getFullYear()).toBe(2026);
});

it('对象数组行内 Date 也深拷贝', () => {
  const rowDate = new Date('2026-01-01T00:00:00.000Z');
  const { snapshot } = createCandidateSnapshot(
    engine,
    {
      type: 'object',
      properties: {
        rows: {
          type: 'array', 'x-component': 'ArrayTable',
          items: { type: 'object', properties: { at: { type: 'string', 'x-component': 'DatePicker' } } },
        },
      },
    },
    { rows: [{ id: 'r1', at: rowDate }] }
  );

  const rowField = snapshot.fields.rows.items?.[0].fields['rows.0.at'];
  expect(rowField?.value).not.toBe(rowDate);
  rowDate.setFullYear(2030);
  expect((rowField?.value as Date).getFullYear()).toBe(2026);
});
```

- [ ] **步骤 2：跑测试确认失败**

运行：`pnpm vitest run packages/adapters/src/__tests__/snapshot.test.ts`
期望：两个用例 FAIL（当前 `value` 与原 Date/File/Blob 同引用）。

- [ ] **步骤 3：改实现** —— 在 `internal.ts` 末尾新增 `cloneValue`：

```ts
export function cloneValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof File !== 'undefined' && value instanceof File) {
    return new File([value], value.name, { type: value.type, lastModified: value.lastModified });
  }
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return value.slice(0, value.size, value.type);
  }
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) result[key] = cloneValue(value[key]);
    return result;
  }
  return value;
}
```

在 `snapshot.ts` 顶部 import 加 `cloneValue`，并把 `buildFields(engine, schema, values, …)` 改为 `buildFields(engine, schema, cloneValue(values), …)`。

- [ ] **步骤 4：跑测试确认通过**

运行：`pnpm vitest run packages/adapters/src/__tests__/snapshot.test.ts`
期望：两个用例 PASS，其余 adapters 测试不回归。

- [ ] **步骤 5：提交**

```bash
git add packages/adapters/src/internal.ts packages/adapters/src/snapshot.ts packages/adapters/src/__tests__/snapshot.test.ts
git commit -m "fix(adapters): 候选快照深拷贝 Date/File/Blob"
```

---

### Task 7: 全量验证 + 文档回写

**文件（Files）：**
- 修改：`docs/tech-design/backlog.md`（P1 六项移入「已解决」并更新计数）、`docs/tech-design/02-specs/03-registry-plugin.md`（§9 补一句 emit 隔离语义）、`docs/tech-design/02-specs/01-types.md`（§10 错误码补 `ENGINE_DISPOSED` 并指向代码权威）

- [ ] **步骤 1：跑全量测试与类型检查**

运行：`pnpm test:run` 与 `pnpm typecheck`
期望：全部 PASS。

- [ ] **步骤 2：回写 backlog** —— 把 R3/R4/P1/P2/P3/P5 六项从「🔴 P1」表移入「✅ 已解决」表（每条标注结论），并把头部计数从「30 待处理（P1 ×6 / P2 ×20 / P3 ×3 / Future ×1）」改为「24 待处理（P1 ×0 / P2 ×20 / P3 ×3 / Future ×1）」，已解决 3 → 9。

- [ ] **步骤 3：回写 spec 语义** —— spec 03 §9 事件系统补一句「`emit` 隔离监听器异常：单个监听器抛错不影响其余监听器、也不向 emit 抛出，仅记录日志」；spec 01 §10 错误码清单追加 `ENGINE_DISPOSED` 并加一行「完整错误码以 `packages/types/src/errors.ts` 为准」。

- [ ] **步骤 4：提交**

```bash
git add docs/tech-design/backlog.md docs/tech-design/02-specs/03-registry-plugin.md docs/tech-design/02-specs/01-types.md
git commit -m "docs: P1 六项已解决回写 backlog 与 spec 语义"
```
