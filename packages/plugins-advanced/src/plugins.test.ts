import { createDesigner } from '@x-form-engine/designer-core';
import { advancedPlugins } from './index';

describe('plugins-advanced（Task 8.2）', () => {
  test('安装后 ExpressionSetter 与 apply-expression 命令已注册', () => {
    const designer = createDesigner({ plugins: advancedPlugins });
    expect(designer.setters.has('ExpressionSetter')).toBe(true);
    expect(designer.commands.has('apply-expression')).toBe(true);
  });

  test('apply-expression 经 SchemaEditor 写 x-reactions 且保留原生字段', () => {
    const designer = createDesigner({ plugins: advancedPlugins });
    designer.schema.update((doc) => ({
      ...doc,
      schema: {
        type: 'object',
        properties: {
          price: { type: 'number', 'x-decorator': 'FormItem', 'x-component': 'Number' },
        },
      },
    }));

    const cmd = designer.commands.get('apply-expression')!;
    cmd.execute({ fieldPath: 'price', expression: '{{ $self.value * 2 }}' });

    const field = (designer.schema.getDocument().schema.properties as any).price;
    expect(field['x-reactions']).toEqual({ expression: '{{ $self.value * 2 }}' });
    expect(field['x-component']).toBe('Number');
    expect(field['x-decorator']).toBe('FormItem');
  });

  test('卸载插件清理其注册的 setter 与命令', () => {
    const designer = createDesigner({ plugins: advancedPlugins });
    expect(designer.setters.has('ExpressionSetter')).toBe(true);

    designer.plugins.uninstall('expression-config');
    expect(designer.setters.has('ExpressionSetter')).toBe(false);
    expect(designer.commands.has('apply-expression')).toBe(false);
  });

  test('重复安装抛 PLUGIN_CONFLICT', () => {
    const designer = createDesigner({ plugins: advancedPlugins });
    const plugin = advancedPlugins[0];
    expect(() => designer.plugins.install(plugin)).toThrow();
  });
});
