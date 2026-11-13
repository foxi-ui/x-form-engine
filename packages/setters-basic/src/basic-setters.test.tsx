import { fireEvent, render, screen } from '@testing-library/react';
import { basicSetters } from './index';
import { ArraySetter, BooleanSetter, JSONSetter, StringSetter } from './basic-setters';

describe('basicSetters（Task 6.2）', () => {
  test('包含 7 个基础 Setter', () => {
    expect(basicSetters.map((s) => s.name)).toEqual([
      'StringSetter',
      'NumberSetter',
      'BooleanSetter',
      'SelectSetter',
      'RadioSetter',
      'JSONSetter',
      'ArraySetter',
    ]);
    for (const s of basicSetters) {
      expect(s.version).toBe('1.0.0');
      expect(s.component).toBeTruthy();
    }
  });

  test('StringSetter 受控：value 渲染 + onChange 回写', () => {
    const onChange = vi.fn();
    render(<StringSetter value="hello" onChange={onChange} context={{}} />);
    const input = screen.getByDisplayValue('hello');
    fireEvent.change(input, { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledWith('world');
  });

  test('StringSetter 支持 disabled / readonly', () => {
    const onChange = vi.fn();
    render(<StringSetter value="" onChange={onChange} context={{}} disabled />);
    expect((screen.getByDisplayValue('') as HTMLInputElement).disabled).toBe(true);

    render(<StringSetter value="x" onChange={onChange} context={{}} readonly />);
    expect((screen.getByDisplayValue('x') as HTMLInputElement).hasAttribute('readonly')).toBe(true);
  });

  test('BooleanSetter 受控：checked 渲染 + onChange', () => {
    const onChange = vi.fn();
    render(<BooleanSetter value={true} onChange={onChange} context={{}} />);
    const sw = screen.getByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  test('ArraySetter 支持添加 / 删除', () => {
    const onChange = vi.fn();
    render(<ArraySetter value={['a', 'b']} onChange={onChange} context={{}} />);

    fireEvent.click(screen.getByRole('button', { name: /添\s*加/ }));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b', '']);

    fireEvent.click(screen.getByRole('button', { name: '删除 0' }));
    expect(onChange).toHaveBeenLastCalledWith(['b']);
  });

  test('JSONSetter 合法 JSON 回写解析值，非法 JSON 不崩溃', () => {
    const onChange = vi.fn();
    const { container } = render(<JSONSetter value={{ a: 1 }} onChange={onChange} context={{}} />);
    const textarea = container.querySelector('textarea')!;
    expect(textarea.value).toContain('"a"');

    fireEvent.change(textarea, { target: { value: '{"b": 2}' } });
    expect(onChange).toHaveBeenLastCalledWith({ b: 2 });

    fireEvent.change(textarea, { target: { value: '{invalid' } });
    expect(onChange).toHaveBeenCalledTimes(1); // 非法 JSON 不再回调，不崩溃
  });
});
