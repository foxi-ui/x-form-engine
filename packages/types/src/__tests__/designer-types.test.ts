import { expectTypeOf } from 'vitest';
import type {
  CreateDesignerOptions,
  DependencyEdge,
  DesignerAdapter,
  DesignerAdapterContext,
  DesignerComponentProps,
  DesignerEvent,
  DesignerEventBus,
  DesignerEnginePublicAPI,
  DesignerMaterialDefinition,
  DesignerMetadata,
  DesignerPlugin,
  DesignerPluginContext,
  DesignerPluginHost,
  DesignerWorkspace,
  FormEnginePlugin,
  FormSchemaDocument,
  MaterialCapabilities,
  MaterialCreateContext,
  MaterialRegistry,
  MaterialRuntimeTarget,
  PanelDefinition,
  PluginDefinition,
  PluginDependencyError,
  PluginInstallOptions,
  PluginLifecycleEvent,
  PluginRegistry,
  PluginStatus,
  Platform,
  SchemaDiagnostic,
  SchemaDiagnosticSeverity,
  SchemaEditor,
  SchemaNode,
  SetterBinding,
  SetterContext,
  SetterDefinition,
  SetterProps,
  SetterRegistry,
  SetterRegistryOptions,
  SetterResolveResult,
  ToolbarDefinition,
  ValidationResult,
} from '../index';

test('C1: FormSchemaDocument.schema 保持 Record<string, unknown>，designerMetadata 为兼容扩展', () => {
  expectTypeOf<FormSchemaDocument['schema']>().toEqualTypeOf<Record<string, unknown>>();
  expectTypeOf<FormSchemaDocument['designerMetadata']>().toEqualTypeOf<
    DesignerMetadata | undefined
  >();
  expectTypeOf<DesignerMetadata['version']>().toEqualTypeOf<string | undefined>();
});

test('DesignerMaterialDefinition 契约：UI 字段 unknown，createSchema 返回 Record，含 runtimeTarget', () => {
  expectTypeOf<DesignerMaterialDefinition['icon']>().toEqualTypeOf<unknown | undefined>();
  expectTypeOf<DesignerMaterialDefinition['designerComponent']>().toEqualTypeOf<
    unknown | undefined
  >();
  expectTypeOf<ReturnType<DesignerMaterialDefinition['createSchema']>>().toEqualTypeOf<
    Record<string, unknown>
  >();
  expectTypeOf<DesignerMaterialDefinition['runtimeTarget']>().toEqualTypeOf<
    MaterialRuntimeTarget | undefined
  >();
  expectTypeOf<DesignerMaterialDefinition['setters']>().toEqualTypeOf<
    Record<string, SetterBinding> | undefined
  >();
});

test('designable 专属字段为 unknown（仅 Designable Adapter 消费，C11/C13）', () => {
  expectTypeOf<DesignerMaterialDefinition['designable']>().toEqualTypeOf<
    { behavior?: unknown; resource?: unknown } | undefined
  >();
});

test('MaterialCapabilities 与 MaterialRuntimeTarget 三态', () => {
  expectTypeOf<MaterialCapabilities['container']>().toEqualTypeOf<boolean | undefined>();
  expectTypeOf<MaterialRuntimeTarget>().toEqualTypeOf<
    | { kind: 'component'; componentName: string }
    | { kind: 'schema-container'; schemaType: string }
    | { kind: 'designer-only' }
  >();
});

test('Setter 契约：泛型值、unknown 组件、Binding 为 name+props', () => {
  expectTypeOf<SetterProps<number>['value']>().toEqualTypeOf<number>();
  expectTypeOf<SetterProps<number>['onChange']>().toEqualTypeOf<(value: number) => void>();
  expectTypeOf<SetterDefinition['component']>().toEqualTypeOf<unknown>();
  expectTypeOf<SetterBinding>().toEqualTypeOf<{
    name: string;
    props?: Record<string, unknown>;
  }>();
});

test('SetterContext / ValidationResult / SetterRegistryOptions / SetterResolveResult', () => {
  expectTypeOf<SetterContext['path']>().toEqualTypeOf<string | undefined>();
  expectTypeOf<ValidationResult['valid']>().toEqualTypeOf<boolean>();
  expectTypeOf<SetterRegistryOptions['onDuplicate']>().toEqualTypeOf<
    'throw' | 'ignore' | 'override' | undefined
  >();
  expectTypeOf<SetterResolveResult['found']>().toEqualTypeOf<boolean>();
  expectTypeOf<SetterResolveResult['diagnostics']>().toEqualTypeOf<SchemaDiagnostic[]>();
});

test('SchemaDiagnostic 定位信息与严重级别（C5/C10）', () => {
  expectTypeOf<SchemaDiagnosticSeverity>().toEqualTypeOf<'error' | 'warning' | 'info'>();
  expectTypeOf<SchemaDiagnostic['severity']>().toEqualTypeOf<'error' | 'warning' | 'info'>();
  expectTypeOf<SchemaDiagnostic['code']>().toEqualTypeOf<string>();
  expectTypeOf<SchemaDiagnostic['materialName']>().toEqualTypeOf<string | undefined>();
  expectTypeOf<SchemaDiagnostic['schemaPath']>().toEqualTypeOf<string | undefined>();
  expectTypeOf<SchemaDiagnostic['componentName']>().toEqualTypeOf<string | undefined>();
  expectTypeOf<SchemaDiagnostic['platform']>().toEqualTypeOf<Platform | undefined>();
  expectTypeOf<SchemaDiagnostic['setterName']>().toEqualTypeOf<string | undefined>();
});

test('C9: FormEnginePlugin / DesignerPlugin 结构满足 PluginDefinition（Generic Plugin Core 解耦）', () => {
  expectTypeOf<FormEnginePlugin>().toMatchTypeOf<PluginDefinition>();
  expectTypeOf<DesignerPlugin>().toMatchTypeOf<PluginDefinition>();
  expectTypeOf<PluginDefinition['name']>().toEqualTypeOf<string>();
  expectTypeOf<PluginDefinition['dependencies']>().toEqualTypeOf<string[] | undefined>();
  expectTypeOf<DependencyEdge>().toEqualTypeOf<{ from: string; to: string }>();
  expectTypeOf<PluginRegistry['get']>().toEqualTypeOf<
    (name: string) => PluginDefinition | undefined
  >();
});

test('Plugin 补充类型：PluginInstallOptions / PluginStatus / PluginLifecycleEvent / PluginDependencyError', () => {
  expectTypeOf<PluginInstallOptions['force']>().toEqualTypeOf<boolean | undefined>();
  expectTypeOf<PluginStatus>().toEqualTypeOf<
    'registered' | 'installing' | 'active' | 'failed' | 'disposed'
  >();
  expectTypeOf<PluginLifecycleEvent['status']>().toEqualTypeOf<PluginStatus>();
  expectTypeOf<PluginDependencyError['missing']>().toEqualTypeOf<string[]>();
});

test('C11: SchemaEditor 只操作 FormSchemaDocument，不暴露 Designable TreeNode', () => {
  expectTypeOf<SchemaEditor['getDocument']>().toEqualTypeOf<() => FormSchemaDocument>();
  expectTypeOf<SchemaEditor['update']>().toEqualTypeOf<
    (updater: (document: FormSchemaDocument) => FormSchemaDocument) => void
  >();
  expectTypeOf<SchemaNode>().toEqualTypeOf<{
    path: string;
    schema: Record<string, unknown>;
  }>();

  const editor = {} as SchemaEditor;
  // @ts-expect-error SchemaEditor 不得暴露 Designable TreeNode
  editor.treeNode;

  const ctx = {} as DesignerPluginContext;
  // @ts-expect-error DesignerPluginContext 不得暴露 Designable 内部实例
  ctx.treeNode;
});

test('DesignerPluginContext 注入 registries / schema / engine（无 Designable）', () => {
  expectTypeOf<DesignerPluginContext['materials']>().toEqualTypeOf<MaterialRegistry>();
  expectTypeOf<DesignerPluginContext['setters']>().toEqualTypeOf<SetterRegistry>();
  expectTypeOf<DesignerPluginContext['schema']>().toEqualTypeOf<SchemaEditor>();
  expectTypeOf<DesignerPluginContext['engine']>().toEqualTypeOf<DesignerEnginePublicAPI>();
  expectTypeOf<DesignerPluginContext['events']>().toEqualTypeOf<DesignerEventBus>();
});

test('Panel / Toolbar 组件字段为 unknown，DesignerEvent 与画布无关', () => {
  expectTypeOf<PanelDefinition['component']>().toEqualTypeOf<unknown>();
  expectTypeOf<ToolbarDefinition['component']>().toEqualTypeOf<unknown>();
  expectTypeOf<DesignerEvent['type']>().toEqualTypeOf<
    'node:select' | 'node:unselect' | 'node:add' | 'node:remove' | 'node:move' | 'node:update' | 'schema:change'
  >();
});

test('DesignerEnginePublicAPI / DesignerPluginHost / DesignerAdapter / CreateDesignerOptions', () => {
  expectTypeOf<DesignerEnginePublicAPI['destroy']>().toEqualTypeOf<() => void>();
  expectTypeOf<DesignerEnginePublicAPI['plugins']>().toEqualTypeOf<DesignerPluginHost>();
  expectTypeOf<DesignerPluginHost['install']>().toEqualTypeOf<
    (plugin: DesignerPlugin, options?: PluginInstallOptions) => void
  >();
  expectTypeOf<DesignerPluginHost['uninstall']>().toEqualTypeOf<(name: string) => void>();
  expectTypeOf<DesignerAdapter['createWorkspace']>().toEqualTypeOf<
    (context: DesignerAdapterContext) => DesignerWorkspace
  >();
  expectTypeOf<CreateDesignerOptions['adapter']>().toEqualTypeOf<DesignerAdapter | undefined>();
  expectTypeOf<CreateDesignerOptions['plugins']>().toEqualTypeOf<DesignerPlugin[] | undefined>();
});

test('MaterialCreateContext / DesignerComponentProps 可扩展且 UI 无关', () => {
  expectTypeOf<MaterialCreateContext['platform']>().toEqualTypeOf<Platform | undefined>();
  expectTypeOf<DesignerComponentProps['children']>().toEqualTypeOf<unknown | undefined>();
});
