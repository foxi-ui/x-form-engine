# M2「Designer 闭环」实施计划

> **面向 agentic worker：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施本计划。步骤使用 `- [ ]` 复选框语法跟踪。

**目标（Goal）：** 新建 `packages/designer`（Designable 1.x 适配层）与 `apps/designer-demo`（完整 Workbench），打通「拖拽建表单 → 配属性 → 保存重开 → 导出 Schema → 独立 Runtime 渲染」并锁定 WYSIWYG。

**架构（Architecture）：** 设计器隔离为独立包 + 独立应用，不反向依赖 `renderer`，运行时也不依赖 Designable。物料由 `packages/components` 的 `ReactComponentBinding` 单一来源派生；Schema 双向回写用 `@designable/formily-transformer`，信封校验复用 `@x-form-engine/core`；预览复用 `@x-form-engine/formily` 的 `createEngineSchemaField` 编译路径（与 Renderer 同一份编译产物，不依赖 Renderer 入口）。设计器画布由 `@designable/react` 的 Workbench 组装。

**技术栈（Tech Stack）：** 沿用 M1 锁定基线 React 17.0.2 + antd 4.22.8 + `@formily/*` 2.3.7，新增 `@designable/*` 1.0.0-beta.45（core/react/shared/formily-antd/formily-setters/formily-transformer/react-settings-form）。测试栈 Vitest 3.2 + jsdom（designer 包 vitest 走 ESM alias + `css:false`）。

**规格（Spec）：**
- `docs/superpowers/specs/2026-11-08-m2-designer-closed-loop-design.md`（本计划据此论证，随计划一起阅读）
- `docs/tech-design/mvp-roadmap.md`（§6 M2 任务 + §2.1 包拆分 + §10 范围控制）
- `docs/tech-design/02-specs/07-designer-adapter.md`
- `docs/tech-design/verification/04-designable.md`、`01-version-lock.md`
- `verification/src/04-designable.test.tsx`（已验证的 Designable API 真值）

任务编号与 roadmap §6 M2 任务对应：`Task 3/5↔M2-01`，`Task 8↔M2-02/03/06/08`，`Task 4↔M2-04/05/06/07`，`Task 6↔M2-08`，`Task 9↔M2-09`。`Task 1` 为依赖链前置 spike，`Task 2` 为装饰器前置（源自 M1 playground 注释「装饰器适配列入 M2」+ M2-09 一致性），`Task 7` 为基础 Setter。

---

## 全局约束（Global Constraints）

以下约束逐字来自规格，每个任务的验收隐式包含本节；违反即视为任务未完成。

1. 版本硬约束：`@designable/core|react|shared|formily-antd|formily-setters|formily-transformer|react-settings-form` 均为 `1.0.0-beta.45`；`@formily/*` 2.3.7；`@formily/antd` 2.3.7；antd 4.22.8；`@ant-design/icons` 4.8.3；React 17.0.2；less 4.9.1。
2. 依赖方向单向：`designer` 不依赖 `renderer`；运行时（`renderer`/`sdk`）不依赖 `@designable/*`；`formily` 不依赖 Designable；业务项目只依赖 `sdk` + `components`。
3. `x-engine` 是唯一引擎扩展命名空间；设计器保存前必须 `validateEngineSchema(schema)` 通过（无 error）才允许导出。
4. 组件身份单一来源：设计器物料、预览实现、运行时实现都来自 `packages/components` 的同一份 `ReactComponentBinding`，不得在 designer 内复制组件定义。
5. 版本轴分离：信封 `version` 是业务 `schemaVersion`（保存自增），`engineSchemaVersion` 固定写 `ENGINE_SCHEMA_VERSION`；二者不混用。导入时 `engineSchemaVersion` 不一致 → 拒绝（fail-closed）。
6. `x-designable-id`/`x-index` 是设计器内部节点标识，渲染器编译时忽略，迁移时不作为业务键。
7. 表单级属性（`transformToSchema` 返回的 `form`）本期不持久化，`FormSchemaDocument` 保持冻结（Q6=A）。
8. 设计器画布与运行时 Renderer 是两条渲染路径，WYSIWYG 靠「同一份组件实现 + 同一份 Schema 编译产物 + 一致性验收用例」保证，不靠复用 Renderer 渲染入口。

---

## 评审重点（Review Focus）

规格是愿景文档，以下输入/边界是规格未明说、但最可能「咬到」使用者的坑，各条由标注的任务测试锁定：

1. **`x-component-props` 分层**：placeholder/options 必须挂到 `x-component-props` 而不是节点顶层，否则运行时组件收不到 props、WYSIWYG 破。→ Task 3 的 propsSchema 断言 + Task 9 的 WYSIWYG 集成测试。
2. **画布挂载覆盖 Behavior 注册**：物料必须以「宿主组件 map」形式同时喂给 `ResourceWidget` 与 `ComponentTreeWidget`，裸数组注册会被画布挂载整体替换。→ Task 3/5 测试 + Task 8 手动验收。
3. **字段 `name` 重复静默丢字段**：`transformToSchema` 对同名 key 静默覆盖。→ Task 4 的重复名拒绝测试。
4. **`x-decorator: 'FormItem'` 运行时无装饰器**：设计器导出 schema 带 FormItem，运行时/preview 不注册 FormItem 就渲染不出标签。→ Task 2 测试 + Task 9 集成测试。
5. **版本不匹配 fail-closed**：`engineSchemaVersion` 不一致必须拒绝导入，不得静默接受。→ Task 4 测试。
6. **预览/运行时同一条编译路径**：预览必须走 `createEngineSchemaField`，不得走 Designable simulator 或 `renderer`，否则预览≠运行时。→ Task 6 测试 + Task 9 静态守卫。

---

## Task 1: `packages/designer` 脚手架 + Designable 依赖链 spike（M2-01 前置）

**Files:**
- Create: `packages/designer/package.json`、`packages/designer/tsconfig.json`、`packages/designer/vitest.config.ts`、`packages/designer/vitest.setup.ts`
- Create: `packages/designer/src/index.ts`（占位：`export {}`）
- Test: `packages/designer/src/__tests__/designable-smoke.test.tsx`

**Interfaces:**
- Consumes: 无（首个任务，仅依赖已发布基线）
- Produces: `@x-form-engine/designer` 包可被 root vitest workspace 发现并运行；后续任务在此包内新增模块。

**依赖（package.json `dependencies`，逐字版本）：**
`@designable/core|react|shared|formily-antd|formily-setters|formily-transformer|react-settings-form` = `1.0.0-beta.45`；`@formily/core|react|reactive|reactive-react|shared|json-schema` = `2.3.7`；`@formily/antd` = `2.3.7`；`antd` = `4.22.8`；`@ant-design/icons` = `4.8.3`；`react|react-dom|react-is` = `17.0.2`；workspace: `@x-form-engine/types|components|core|formily`。
`devDependencies`：`@testing-library/react` 12.1.5、`@testing-library/jest-dom` 5.16.5、`@types/react` 17.0.0、`@types/react-dom` 17.0.0、`@types/testing-library__jest-dom` 5.14.9、`less` 4.9.1、`jsdom` 26.1.0、`typescript` 5.9.3、`vitest` 3.2.7。

- [ ] **Step 1: 创建包元数据与构建配置**

`tsconfig.json` 与 `packages/renderer/tsconfig.json` 同构（extends `../../tsconfig.base.json`、`jsx: react-jsx`、`types: ["node","vitest/globals","testing-library__jest-dom"]`、`noEmit: true`、`include: ["src"]`）。
`vitest.config.ts` 如下（关键：`css: false` + `resolve.alias` 指向 esm，规避 Designable CJS `require('.less')`）：

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@formily\/antd$/, replacement: '@formily/antd/esm' },
      { find: /^@designable\/react$/, replacement: '@designable/react/esm' },
      { find: /^@designable\/formily-antd$/, replacement: '@designable/formily-antd/esm' },
      { find: /^@designable\/formily-setters$/, replacement: '@designable/formily-setters/esm' },
      { find: /^@designable\/react-settings-form$/, replacement: '@designable/react-settings-form/esm' },
    ],
  },
  test: {
    name: '@x-form-engine/designer',
    globals: true,
    environment: 'jsdom',
    setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url))],
    css: false,
  },
});
```

`vitest.setup.ts` 内容为 `import '@testing-library/jest-dom';`。

- [ ] **Step 2: 安装依赖并验证包可发现**

Run: `pnpm install`，再 `pnpm vitest run packages/designer/src/__tests__/designable-smoke.test.tsx`
Expected: 测试文件不存在 → 报「no test files」或文件缺失（证明 workspace 已发现 `packages/designer` 项目且 vitest 能定位该路径）。

- [ ] **Step 3: 写 spike 冒烟测试（Designable 核心 API 可运行）**

`designable-smoke.test.tsx` 断言（真值来自 `verification/src/04-designable.test.tsx`）：

```tsx
import { TreeNode, createBehavior, createDesigner, createResource } from '@designable/core';
import { transformToSchema, transformToTreeNode } from '@designable/formily-transformer';

test('Designable 依赖链在 designer 包内可运行', () => {
  const schema = { type: 'object', properties: { username: { type: 'string', title: '用户名', 'x-decorator': 'FormItem', 'x-component': 'Input' } } };
  const tree = transformToTreeNode({ schema });
  expect(tree.componentName).toBe('Form');
  expect(tree.children).toHaveLength(1);
  const back = transformToSchema(tree);
  expect((back.schema as any).properties.username['x-component']).toBe('Input');

  const behavior = createBehavior({ name: 'X', extends: ['Field'], selector: (n: TreeNode) => n.props?.['x-component'] === 'X' });
  expect(behavior[0].selector(new TreeNode({ componentName: 'Field', props: { 'x-component': 'X' } }))).toBe(true);
  const resource = createResource({ title: 'X', elements: [{ componentName: 'Field', props: { 'x-component': 'X' } }] });
  expect(resource[0].node.isSourceNode).toBe(true);

  const engine = createDesigner({ rootComponentName: 'Form' });
  engine.workbench.ensureWorkspace({ id: 'smoke' });
  engine.setCurrentTree(tree);
  expect(engine.getCurrentTree()?.children).toHaveLength(1);
});
```

- [ ] **Step 4: 运行测试通过**

Run: `pnpm vitest run packages/designer/src/__tests__/designable-smoke.test.tsx`
Expected: PASS（若 `@designable/react-settings-form/esm` alias 报错，说明该包入口不是 `/esm`，按实际 `package.json.module` 修正 alias 后再跑）。

- [ ] **Step 5: 提交**

```bash
git add packages/designer pnpm-lock.yaml
git commit -m "feat(designer): 脚手架与 Designable 依赖链 spike"
```

---

## Task 2: 装饰器 FormItem 适配（M2 前置，源自 M1 playground 注释 + M2-09）

**Files:**
- Modify: `packages/types/src/engine.ts`（`FormEngineOptions` 增可选 `decorators`）
- Modify: `packages/core/src/engine.ts`（注册 `options.decorators`）
- Modify: `packages/formily/src/component-map.ts`（`resolveFormilyComponentMap` 合并 decorators）
- Modify: `packages/components/src/index.ts`、`packages/components/src/definitions/decorators.ts`（新建）
- Test: `packages/formily/src/__tests__/decorator.test.tsx`（新建，或在 `adapter.test.tsx` 内追加）

**Interfaces:**
- Consumes: `FormEngineOptions`（types）、`createFormEngine`（core）、`resolveFormilyComponentMap`/`createEngineSchemaField`（formily）
- Produces（后续任务依赖，签名必须一致）:

```ts
// types/engine.ts —— FormEngineOptions 增加可选字段（additive，非破坏）
export interface FormEngineOptions {
  // ...既有字段不变...
  decorators?: ComponentBinding[];  // 装饰器绑定（如 FormItem），注册进 registry.decorators
}

// components/definitions/decorators.ts
export const basicDecorators: ReactComponentBinding[];
// basicDecorators[0].protocol.name === 'FormItem'，implementations.pc === FormItem（来自 @formily/antd）

// formily/component-map.ts —— resolveFormilyComponentMap 现签名不变，行为增强：
// 除映射 registry.components 外，也把 registry.decorators 按 name 合并进返回的 components 表
// （Formily 的 createSchemaField 用同一张 components 表解析 x-component 与 x-decorator）
```

- [ ] **Step 1: 写失败测试（装饰器可被 Formily 解析渲染）**

`packages/formily/src/__tests__/decorator.test.tsx`：

```tsx
test('x-decorator: FormItem 在 SchemaField 内渲染出标签', () => {
  const engine = createFormEngine({ components: basicComponents, decorators: basicDecorators });
  const SchemaField = createEngineSchemaField(engine, 'pc');
  const { container } = render(
    <SchemaField schema={{ type: 'object', properties: { a: { type: 'string', title: '姓名', 'x-decorator': 'FormItem', 'x-component': 'Input' } } }} />
  );
  expect(container.querySelector('.ant-form-item-label')).toBeTruthy();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/formily/src/__tests__/decorator.test.tsx`
Expected: FAIL（`.ant-form-item-label` 不存在 / FormItem 未注册）。

- [ ] **Step 3: 实现装饰器注册与映射**

1. `types/engine.ts`：`FormEngineOptions` 增 `decorators?: ComponentBinding[]`。
2. `core/engine.ts`：构造器内 `for (const binding of options.decorators ?? []) this.registry.decorators.register(binding.protocol.name, binding, BUILTIN_SOURCE)`。
3. `formily/component-map.ts`：在映射完 `registry.components` 后，遍历 `registry.decorators.list()`，把 `entry.value.implementations[platform]` 按 `entry.name` 写入返回的 `components`（缺失实现同样抛 `COMPONENT_CAPABILITY_MISMATCH`）。
4. `components/definitions/decorators.ts`：导出 `basicDecorators`，其 FormItem 协议为 `{ name: 'FormItem', version: '1.0.0', meta: { title: '表单项' }, capabilities: { editable: false, readonly: false, mobile: false }, schema: { type: 'object' } }`，`implementations: { pc: FormItem }`（`FormItem` 来自 `@formily/antd`）。`components/index.ts` 一并导出。

- [ ] **Step 4: 运行测试通过**

Run: `pnpm vitest run packages/formily/src/__tests__/decorator.test.tsx`
Expected: PASS；再 `pnpm --filter @x-form-engine/core typecheck`、`pnpm --filter @x-form-engine/formily typecheck`。

- [ ] **Step 5: 提交**

```bash
git add packages/types packages/core packages/formily packages/components
git commit -m "feat(formily): 装饰器注册与 FormItem 适配（x-decorator 可渲染标签）"
```

---

## Task 3: 物料派生 `createDesignerMaterials`（M2-01）

**Files:**
- Create: `packages/designer/src/materials.ts`
- Test: `packages/designer/src/__tests__/materials.test.tsx`

**Interfaces:**
- Consumes: `basicComponents`、`basicDecorators`（components）；`createBehavior`/`createResource`（`@designable/core`）；`Field`/`Form`（`@designable/formily-antd`）
- Produces:

```ts
// materials.ts
import type { ReactComponentBinding } from '@x-form-engine/components';
import type { ComponentType } from 'react';

export interface DesignerHostComponent extends ComponentType<unknown> {
  Behavior?: unknown[];
  Resource?: unknown[];
}
export type DesignerMaterialMap = Record<string, DesignerHostComponent>;

export function createDesignerMaterials(
  bindings: ReactComponentBinding[]
): DesignerMaterialMap;
```

语义：返回 map 包含基础宿主 `Field`、`Form`（直接取自 `@designable/formily-antd`，自带 Behavior/Resource）与每个 binding 的宿主（`bindings[i].implementations.pc` 上挂 `.Behavior`/`.Resource`）。基础装饰器 `FormItem` 的宿主来自 `packages/components` 的 `basicDecorators`（`implementations.pc` 即 `@formily/antd` FormItem），也纳入 map，使画布能渲染 `x-decorator: 'FormItem'`。

- [ ] **Step 1: 写失败测试**

`materials.test.tsx` 关键断言：

```tsx
import { TreeNode } from '@designable/core';
import { basicComponents, basicDecorators } from '@x-form-engine/components';
import { createDesignerMaterials } from './materials';

const material = createDesignerMaterials(basicComponents);

test('host map 含基础宿主与 7 个组件宿主', () => {
  expect(Object.keys(material)).toEqual(expect.arrayContaining(['Field', 'Form', 'FormItem', 'Input', 'Textarea', 'Number', 'Select', 'Radio', 'Checkbox', 'DatePicker']));
});

test('Input 宿主 Behavior 可按 x-component 匹配且 extends Field', () => {
  const behavior = (material.Input.Behavior as any[]).find((b) => b.name === 'Input');
  expect(behavior.extends).toContain('Field');
  expect(behavior.selector(new TreeNode({ componentName: 'Field', props: { 'x-component': 'Input' } }))).toBe(true);
  expect(behavior.selector(new TreeNode({ componentName: 'Field', props: { 'x-component': 'Select' } }))).toBe(false);
});

test('Input 宿主 Resource 初始节点为 Field 且带 FormItem 装饰器', () => {
  const resource = (material.Input.Resource as any[])[0];
  expect(resource.node.isSourceNode).toBe(true);
  const el = resource.node.children[0];
  expect(el.componentName).toBe('Field');
  expect(el.props['x-component']).toBe('Input');
  expect(el.props['x-decorator']).toBe('FormItem');
});

test('propsSchema 字段级属性在顶层、组件属性在 x-component-props', () => {
  const behavior = (material.Select.Behavior as any[]).find((b) => b.name === 'Select');
  const props = behavior.designerProps.propsSchema.properties;
  expect(props.title).toBeTruthy();
  expect(props.required).toBeTruthy();
  expect(props.name).toBeTruthy();
  expect(props['x-component-props'].properties.options).toBeTruthy(); // options 在 x-component-props 内
  expect(props.options).toBeUndefined(); // 不得泄漏到顶层
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/designer/src/__tests__/materials.test.tsx`
Expected: FAIL（`createDesignerMaterials` 未导出）。

- [ ] **Step 3: 实现 `createDesignerMaterials`**

要点：
- `Behavior`：`createBehavior({ name, extends: ['Field'], selector: (n) => n.props?.['x-component'] === name, designerProps: { propsSchema }, designerLocales: { 'zh-CN': { title, ...meta } } })`。
- `propsSchema` 手工构造：`{ type: 'object', properties: { name: { type:'string','x-decorator':'FormItem','x-component':'Input' }, title: {...同}, description: { type:'string','x-decorator':'FormItem','x-component':'Input.TextArea' }, required: { type:'boolean','x-decorator':'FormItem','x-component':'Switch' }, 'x-component-props': { type:'object', properties: { ...binding.protocol.schema.properties, options: binding.protocol.schema.properties?.options ?? { type:'array','x-component':'OptionsSetter' } } } } }`。`options` 属性统一 `'x-component': 'OptionsSetter'`（Task 7 提供）。
- `Resource`：`createResource({ title, icon: 'TextSource', elements: [{ componentName: 'Field', props: { type: 'string', title, 'x-decorator': 'FormItem', 'x-component': name, ...(name === 'Select' || name === 'Radio' || name === 'Checkbox' ? { 'x-component-props': { options: [] } } : {}) } }] })`。
- 基础宿主：`import { Field, Form } from '@designable/formily-antd'`，`material.Field = Field as DesignerHostComponent`（Field/Form 自带 Behavior/Resource）；`material.FormItem = basicDecorators[0].implementations.pc as DesignerHostComponent`。

- [ ] **Step 4: 运行测试通过**

Run: `pnpm vitest run packages/designer/src/__tests__/materials.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/designer/src/materials.ts packages/designer/src/__tests__/materials.test.tsx
git commit -m "feat(designer): 组件定义派生 Designable 物料（Behavior/Resource）"
```

---

## Task 4: Schema 回写与信封 `schema-io`（M2-04/05/06/07）

**Files:**
- Create: `packages/designer/src/schema-io.ts`
- Test: `packages/designer/src/__tests__/schema-io.test.ts`

**Interfaces:**
- Consumes: `TreeNode`（`@designable/core`）、`transformToSchema`/`transformToTreeNode`（`@designable/formily-transformer`）、`parseSchemaDocument`/`validateEngineSchema`/`ENGINE_SCHEMA_VERSION`（`@x-form-engine/core`）、`FormEngineError`（`@x-form-engine/types`）
- Produces:

```ts
// schema-io.ts
import type { TreeNode } from '@designable/core';
import type { FormSchemaDocument } from '@x-form-engine/types';

export interface ExportSchemaOptions {
  schemaId: string;
  previousVersion?: number; // 缺省按 1
}

export function exportSchemaDocument(tree: TreeNode, options: ExportSchemaOptions): FormSchemaDocument;

export interface ImportedSchemaDocument {
  tree: TreeNode;
  doc: FormSchemaDocument;
}

export function importSchemaDocument(input: unknown): ImportedSchemaDocument;
```

- [ ] **Step 1: 写失败测试**

`schema-io.test.ts` 关键断言：

```tsx
function inputTree() {
  return new TreeNode({
    componentName: 'Form',
    children: [
      { componentName: 'Field', props: { name: 'username', title: '用户名', 'x-decorator': 'FormItem', 'x-component': 'Input', 'x-component-props': { placeholder: '请输入' } } },
    ],
  });
}

test('导出：信封字段齐全且 schema 校验通过、版本自增', () => {
  const doc = exportSchemaDocument(inputTree(), { schemaId: 's1', previousVersion: 3 });
  expect(doc.schemaId).toBe('s1');
  expect(doc.version).toBe(4);
  expect(doc.engineSchemaVersion).toBe(ENGINE_SCHEMA_VERSION);
  expect(validateEngineSchema(doc.schema).valid).toBe(true);
  expect((doc.schema as any).properties.username['x-component']).toBe('Input');
  expect((doc.schema as any).properties.username['x-component-props'].placeholder).toBe('请输入');
});

test('往返：导出再导入复用 x-designable-id 且结构一致', () => {
  const doc = exportSchemaDocument(inputTree(), { schemaId: 's1' });
  const { tree, doc: parsed } = importSchemaDocument(doc);
  expect(parsed.schemaId).toBe('s1');
  expect(tree.children).toHaveLength(1);
  expect(tree.children![0].props!['x-component']).toBe('Input');
});

test('重复字段 name 导出被拒绝', () => {
  const tree = new TreeNode({ componentName: 'Form', children: [
    { componentName: 'Field', props: { name: 'dup', 'x-component': 'Input' } },
    { componentName: 'Field', props: { name: 'dup', 'x-component': 'Select' } },
  ]});
  expect(() => exportSchemaDocument(tree, { schemaId: 's1' })).toThrow(/重复/);
});

test('engineSchemaVersion 不一致导入被拒绝', () => {
  const doc = exportSchemaDocument(inputTree(), { schemaId: 's1' });
  (doc as any).engineSchemaVersion = '0.0.0';
  expect(() => importSchemaDocument(doc)).toThrow(/engineSchemaVersion/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/designer/src/__tests__/schema-io.test.ts`
Expected: FAIL（`exportSchemaDocument` 未导出）。

- [ ] **Step 3: 实现 `exportSchemaDocument` / `importSchemaDocument`**

要点：
- `exportSchemaDocument`：先遍历 `tree` 收集所有 Field 子节点的 `props.name`，发现重复即 `throw new FormEngineError('SCHEMA_INVALID', 'duplicate field name: ...')`；再 `const { schema } = transformToSchema(tree)`；`const result = validateEngineSchema(schema)`，`result.valid === false` 时抛 `FormEngineError('SCHEMA_INVALID', result.errors.join('; '))`；返回 `{ schemaId, version: (options.previousVersion ?? 0) + 1, engineSchemaVersion: ENGINE_SCHEMA_VERSION, schema, updatedAt: new Date().toISOString() }`。
- `importSchemaDocument`：`const doc = parseSchemaDocument(input)`；`doc.engineSchemaVersion !== ENGINE_SCHEMA_VERSION` 抛 `FormEngineError('SCHEMA_INVALID', 'unsupported engineSchemaVersion: ' + doc.engineSchemaVersion)`；`const tree = transformToTreeNode({ schema: doc.schema })`；返回 `{ tree, doc }`。

- [ ] **Step 4: 运行测试通过**

Run: `pnpm vitest run packages/designer/src/__tests__/schema-io.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/designer/src/schema-io.ts packages/designer/src/__tests__/schema-io.test.ts
git commit -m "feat(designer): Schema 回写/导入导出/版本与重名校验"
```

---

## Task 5: 设计器启动引导 `createEngineDesigner`（M2-01）

**Files:**
- Create: `packages/designer/src/designer.ts`
- Test: `packages/designer/src/__tests__/designer.test.ts`

**Interfaces:**
- Consumes: `createDesigner`/`GlobalRegistry`/`TreeNode`（`@designable/core`）、`DesignerMaterialMap`（materials.ts）
- Produces:

```ts
// designer.ts
import { createDesigner } from '@designable/core';
import type { DesignerMaterialMap } from './materials';

export function createEngineDesigner(materials: DesignerMaterialMap): ReturnType<typeof createDesigner>;
```

语义：`createDesigner({ rootComponentName: 'Form' })` → `engine.workbench.ensureWorkspace({ id: 'default' })` → `GlobalRegistry.registerDesignerBehaviors(Object.values(materials))` → `engine.setCurrentTree(new TreeNode({ componentName: 'Form' }))`（顺序必须如此，否则 `setCurrentTree` 静默失效）。

- [ ] **Step 1: 写失败测试**

`designer.test.ts`：

```tsx
import { GlobalRegistry, TreeNode } from '@designable/core';
import { basicComponents, basicDecorators } from '@x-form-engine/components';
import { createDesignerMaterials } from './materials';
import { createEngineDesigner } from './designer';

test('启动顺序正确：当前树非空且物料可被匹配', () => {
  const material = createDesignerMaterials(basicComponents);
  const engine = createEngineDesigner(material);
  expect(engine.getCurrentTree()?.componentName).toBe('Form');
  const behaviors = GlobalRegistry.getDesignerBehaviors(new TreeNode({ componentName: 'Field', props: { 'x-component': 'Input' } }));
  expect(behaviors.map((b: any) => b.name)).toEqual(expect.arrayContaining(['Field', 'Input']));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/designer/src/__tests__/designer.test.ts`
Expected: FAIL（`createEngineDesigner` 未导出）。

- [ ] **Step 3: 实现 `createEngineDesigner`**

按上述语义实现，`registerDesignerBehaviors` 接收宿主组件数组（`Object.values(materials)`）。

- [ ] **Step 4: 运行测试通过**

Run: `pnpm vitest run packages/designer/src/__tests__/designer.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/designer/src/designer.ts packages/designer/src/__tests__/designer.test.ts
git commit -m "feat(designer): 启动引导（workspace/注册/设树的正确顺序）"
```

---

## Task 6: 预览组件 `DesignerPreview`（M2-08）

**Files:**
- Create: `packages/designer/src/preview.tsx`
- Test: `packages/designer/src/__tests__/preview.test.tsx`

**Interfaces:**
- Consumes: `createForm`（`@formily/core`）、`FormProvider`（`@formily/react`）、`createEngineSchemaField`（`@x-form-engine/formily`）、`basicComponents`/`basicDecorators`（components）、`createFormEngine`（core）
- Produces:

```ts
// preview.tsx
import type { FormEngine } from '@x-form-engine/types';
import type { ComponentType } from 'react';

export interface DesignerPreviewProps {
  engine: FormEngine;
  schema: Record<string, unknown>;
  platform?: 'pc' | 'mobile';
}
export const DesignerPreview: ComponentType<DesignerPreviewProps>;
```

语义：`createForm()` → `createEngineSchemaField(engine, platform)` → `<FormProvider form={form}><SchemaField schema={schema} /></FormProvider>`。**不 import `@x-form-engine/renderer`。**

- [ ] **Step 1: 写失败测试**

`preview.test.tsx`：

```tsx
test('DesignerPreview 走 formily 编译路径渲染出真实组件与标签', () => {
  const engine = createFormEngine({ components: basicComponents, decorators: basicDecorators });
  const { container } = render(
    <DesignerPreview engine={engine} schema={{ type: 'object', properties: { a: { type: 'string', title: '姓名', 'x-decorator': 'FormItem', 'x-component': 'Input', 'x-component-props': { placeholder: '请输入' } } } }} />
  );
  expect(container.querySelector('.ant-form-item-label')).toBeTruthy();
  expect(container.querySelector('input[placeholder="请输入"]')).toBeTruthy();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/designer/src/__tests__/preview.test.tsx`
Expected: FAIL（`DesignerPreview` 未导出）。

- [ ] **Step 3: 实现 `DesignerPreview`**

按上述语义实现；`engine` 需已注册 `basicComponents` + `basicDecorators`（由调用方创建引擎时传入）。

- [ ] **Step 4: 运行测试通过**

Run: `pnpm vitest run packages/designer/src/__tests__/preview.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/designer/src/preview.tsx packages/designer/src/__tests__/preview.test.tsx
git commit -m "feat(designer): DesignerPreview（复用 formily 编译路径）"
```

---

## Task 7: 基础 Setter `OptionsSetter`（M2-03 组件侧）

**Files:**
- Create: `packages/designer/src/setters.tsx`
- Test: `packages/designer/src/__tests__/setters.test.tsx`

**Interfaces:**
- Consumes: `@formily/antd`（Input/Button 等原语）、`@formily/react`（`useField` 可选）
- Produces:

```ts
// setters.tsx
import type { ComponentType } from 'react';

export interface OptionItem { label: string; value: unknown; }
export interface OptionsSetterProps { value?: OptionItem[]; onChange?: (value: OptionItem[]) => void; }
export const OptionsSetter: ComponentType<OptionsSetterProps>;
```

语义：受控 `value/onChange` 组件，编辑 `{label, value}[]` 数组（增删行 + label/value 两个输入框），遵循 `@designable/formily-setters` 的受控协议（value/onChange）。

- [ ] **Step 1: 写失败测试**

`setters.test.tsx`：

```tsx
test('OptionsSetter 受控回写 {label,value}[]', () => {
  const onChange = vi.fn();
  const { container } = render(<OptionsSetter value={[{ label: '研发部', value: 'rd' }]} onChange={onChange} />);
  expect(container.textContent).toContain('研发部');
  expect(container.textContent).toContain('rd');
  // 触发新增/删除后断言 onChange 被以新数组调用（断言调用至少一次且入参为数组）
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/designer/src/__tests__/setters.test.tsx`
Expected: FAIL（`OptionsSetter` 未导出）。

- [ ] **Step 3: 实现 `OptionsSetter`**

用 antd `Input`/`Button` 渲染每行 `label`/`value`，提供「添加」「删除」按钮；任何变更 `onChange(nextArray)`。

- [ ] **Step 4: 运行测试通过**

Run: `pnpm vitest run packages/designer/src/__tests__/setters.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/designer/src/setters.tsx packages/designer/src/__tests__/setters.test.tsx
git commit -m "feat(designer): OptionsSetter 基础数组 Setter"
```

---

## Task 8: `apps/designer-demo` 完整 Workbench（M2-02/03/06/08 UI）

**Files:**
- Create: `apps/designer-demo/package.json`、`tsconfig.json`、`vite.config.ts`、`index.html`
- Create: `apps/designer-demo/src/main.tsx`、`src/App.tsx`
- Modify: `packages/designer/src/index.ts`（导出公共面）

**Interfaces:**
- Consumes: `@designable/react` 的 `Designer`/`Workbench`/`StudioPanel`/`CompositePanel`/`ViewportPanel`/`SettingsPanel`/`WorkspacePanel`/`ToolbarPanel`/`ViewPanel` 及 `ResourceWidget`/`ComponentTreeWidget`/`OutlineWidget`/`HistoryWidget`；`@designable/react-settings-form` 的 `SettingsForm`；`@x-form-engine/designer` 的 `createDesignerMaterials`/`createEngineDesigner`/`DesignerPreview`/`OptionsSetter`；`@x-form-engine/components` 的 `basicComponents`/`basicDecorators`。
- Produces: 可运行的设计器应用（`pnpm --filter designer-demo build` 通过）。

**依赖（package.json）：** `@x-form-engine/designer`/`@x-form-engine/components`/`@x-form-engine/core`/`@x-form-engine/formily` = `workspace:*`；`@designable/react|core|react-settings-form` = `1.0.0-beta.45`；`antd` 4.22.8；`react`/`react-dom` 17.0.2。`devDependencies`：`@vitejs/plugin-react` `^4`、`vite` `^5`、`less` `^4`、`typescript` 5.9.3、`@types/react` 17.0.0、`@types/react-dom` 17.0.0。

- [ ] **Step 1: 创建应用脚手架**

`vite.config.ts` 与 `apps/playground/vite.config.ts` 同构（`@vitejs/plugin-react` + `resolve.alias /^~/ -> ''` + `less.javascriptEnabled`）。`main.tsx` 用 `ReactDOM.render`（React 17），`index.html` 引 `/src/main.tsx`。

- [ ] **Step 2: 实现 App 组装 Workbench**

`App.tsx` 结构（面板名逐字来自 `@designable/react`，宿主 map 同时喂 `ResourceWidget` 与 `ComponentTreeWidget`）：

```tsx
const materials = createDesignerMaterials(basicComponents);
const engine = createEngineDesigner(materials);

<Designer engine={engine}>
  <Workbench>
    <StudioPanel>
      <CompositePanel>
        <CompositePanel.Item title="物料" icon="ComponentSource">
          <ResourceWidget title="组件" sources={materials} />
        </CompositePanel.Item>
        <CompositePanel.Item title="组件树" icon="OutlineSource">
          <OutlineWidget />
        </CompositePanel.Item>
        <CompositePanel.Item title="历史" icon="HistorySource">
          <HistoryWidget />
        </CompositePanel.Item>
      </CompositePanel>
      <WorkspacePanel>
        <ToolbarPanel>
          <ViewPanel /> {/* 设计/预览切换 */}
        </ToolbarPanel>
        <ViewportPanel />
      </WorkspacePanel>
      <SettingsPanel>
        <SettingsForm uploadProps={{ action: '' }} />
      </SettingsPanel>
    </StudioPanel>
  </Workbench>
</Designer>
```

要点：`SettingsForm` 来自 `@designable/react-settings-form`；其 scope 需注册 `OptionsSetter`（供 Task 3 的 `options` 属性使用）与 `FormItem`/`Input`/`Input.TextArea`/`Switch` 等基础设置组件（`@formily/antd` 提供，按需注册）；**隐藏 Form 根节点设置面板**（Q6=A，点击根 Form 节点时不显示表单级设置，或直接不注册 Form 的 designerProps）。

- [ ] **Step 3: 实现保存/加载与预览**

`App.tsx` 增：`保存`/`加载` 按钮，`保存` 用 `exportSchemaDocument(engine.getCurrentTree(), { schemaId, previousVersion })` 写 `localStorage`；`加载` 读 `localStorage` → `importSchemaDocument` → `engine.setCurrentTree(tree)`。预览切换走 `DesignerPreview`（引擎由 `createFormEngine({ components: basicComponents, decorators: basicDecorators })` 创建）。

- [ ] **Step 4: 构建通过**

Run: `pnpm install`，再 `pnpm --filter designer-demo build`、`pnpm --filter designer-demo typecheck`
Expected: 构建与 typecheck 均通过（`@designable/react-settings-form` 引入 Monaco 若导致构建报错，需在其 `optimizeDeps`/别名中排除 Monaco 或改为按需导入 `SettingsForm`，以实际报错为准调整）。

- [ ] **Step 5: 手动验收清单（记录到提交信息）**

`pnpm --filter designer-demo dev` 后确认：物料面板列出 7 组件并可拖入画布；选中节点右侧属性面板可编辑 name/title/required/placeholder/options 并回写；保存→刷新→加载还原；预览切换渲染出带标签表单。

- [ ] **Step 6: 提交**

```bash
git add apps/designer-demo packages/designer/src/index.ts
git commit -m "feat(designer-demo): 完整 Workbench（物料/画布/组件树/属性面板/预览/保存加载）"
```

---

## Task 9: Designer/Runtime 解耦验收（M2-09）

**Files:**
- Create: `packages/designer/src/__tests__/no-renderer-dep.test.ts`
- Create: `packages/sdk/src/__tests__/no-designable-dep.test.ts`
- Create: `packages/renderer/src/__tests__/designer-schema-render.test.tsx`
- Modify: `packages/designer/src/index.ts`（补齐公共导出，若有缺）

**Interfaces:**
- Consumes: `FormRenderer`/`FormEngineProvider`（renderer/sdk）、`createFormEngine`（core）、`basicComponents`/`basicDecorators`（components）

- [ ] **Step 1: 写失败测试（静态守卫 + 运行时渲染）**

`no-renderer-dep.test.ts`（designer 包内，仿 `packages/types/src/__tests__/no-react-deps.test.ts`）：递归读取 `packages/designer/src/**/*.{ts,tsx}`，断言无任何 `import`/`require` 说明符以 `@x-form-engine/renderer` 开头。

`no-designable-dep.test.ts`（sdk 包内）：递归读取 `packages/renderer/src/**` 与 `packages/sdk/src/**`，断言无任何说明符以 `@designable` 开头。

`designer-schema-render.test.tsx`（renderer 包内，独立 Runtime 消费设计器产物）：

```tsx
test('独立 Runtime 渲染设计器形态 schema（含 FormItem 装饰器与 x-component-props）', () => {
  const engine = createFormEngine({ components: basicComponents, decorators: basicDecorators });
  const designerShaped = { type: 'object', properties: { 部门: { type: 'string', title: '部门', 'x-decorator': 'FormItem', 'x-component': 'Select', 'x-component-props': { options: [{ label: '研发部', value: 'rd' }], placeholder: '请选择' } } } };
  const { container } = render(<FormEngineProvider engine={engine}><FormRenderer schema={designerShaped} /></FormEngineProvider>);
  expect(container.querySelector('.ant-form-item-label')).toBeTruthy();
  expect(container.querySelector('.ant-select')).toBeTruthy();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run packages/designer/src/__tests__/no-renderer-dep.test.ts packages/sdk/src/__tests__/no-designable-dep.test.ts packages/renderer/src/__tests__/designer-schema-render.test.tsx`
Expected: 渲染用例 FAIL（若 FormItem 未接入）或守卫 FAIL（若存在违规 import）；通过/失败以实际为准，逐项修复。

- [ ] **Step 3: 修复守卫与渲染暴露的问题**

若守卫暴露 designer→renderer 或 renderer/sdk→@designable 的 import，改实现消除；若渲染用例失败，回查 Task 2/3 的 `x-decorator` 与 `x-component-props` 接线。

- [ ] **Step 4: 全量回归**

Run: `pnpm test:run`，再 `pnpm -r typecheck`，再 `pnpm --filter playground build`、`pnpm --filter designer-demo build`
Expected: 全绿（M1 的 48 用例不回归 + 新增 M2 用例通过）。

- [ ] **Step 5: 提交**

```bash
git add packages/designer packages/sdk packages/renderer
git commit -m "test(m2): Designer/Runtime 解耦守卫与设计器形态 schema 渲染验收"
```

---

## 自检记录（Self-Review）

- **Spec 覆盖**：M2-01（Task 1/3/5）、M2-02（Task 8）、M2-03（Task 7/8）、M2-04/05/06/07（Task 4/8）、M2-08（Task 6/8）、M2-09（Task 9）；装饰器前置（Task 2）覆盖 M1 playground 遗留注释。设计文档 §7 的 7 条决定均有对应任务或明确标注。
- **Review Focus**：6 条各由 Task 2/3/4/5/6/9 的测试锁定（见每条的 → 标注）。
- **类型一致性**：`createDesignerMaterials`/`createEngineDesigner`/`DesignerPreview`/`OptionsSetter`/`exportSchemaDocument`/`importSchemaDocument` 的签名在各任务 Interfaces 块一致引用；`basicDecorators` 在 Task 2 定义、Task 3/6/8/9 消费。
- **比例**：计划不展开组件实现体，仅给签名 + 测试名 + 断言 + 语义要点；`@designable` 面板/组件名逐字来自已核验的 node_modules 导出。
