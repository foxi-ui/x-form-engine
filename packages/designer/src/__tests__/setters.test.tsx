import { fireEvent, render, screen } from '@testing-library/react';
import type { OptionItem } from '../setters';
import { OptionsSetter } from '../setters';

test('OptionsSetter 受控渲染 {label,value} 数组', () => {
  render(<OptionsSetter value={[{ label: '研发部', value: 'rd' }]} onChange={vi.fn()} />);

  // 输入框的当前内容需要用 displayValue 断言（input 的 value 不进入 textContent）。
  expect(screen.getByDisplayValue('研发部')).toBeTruthy();
  expect(screen.getByDisplayValue('rd')).toBeTruthy();
  expect(screen.getAllByRole('textbox')).toHaveLength(2);
});

test('编辑 label 以新数组回写，且不原地修改入参', () => {
  const value: OptionItem[] = [{ label: '研发部', value: 'rd' }];
  const onChange = vi.fn();
  render(<OptionsSetter value={value} onChange={onChange} />);

  fireEvent.change(screen.getByDisplayValue('研发部'), { target: { value: '产品部' } });

  expect(onChange).toHaveBeenCalledTimes(1);
  const [next] = onChange.mock.calls[0];
  expect(Array.isArray(next)).toBe(true);
  expect(next).toEqual([{ label: '产品部', value: 'rd' }]);
  expect(next).not.toBe(value);
  expect(value).toEqual([{ label: '研发部', value: 'rd' }]);
});

test('编辑 value 以新数组回写', () => {
  const onChange = vi.fn();
  render(<OptionsSetter value={[{ label: '研发部', value: 'rd' }]} onChange={onChange} />);

  fireEvent.change(screen.getByDisplayValue('rd'), { target: { value: 'product' } });

  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange.mock.calls[0][0]).toEqual([{ label: '研发部', value: 'product' }]);
});

test('编辑 label 时保留非字符串 value 原值', () => {
  const onChange = vi.fn();
  render(<OptionsSetter value={[{ label: '层级', value: 1 }]} onChange={onChange} />);

  fireEvent.change(screen.getByDisplayValue('层级'), { target: { value: '级别' } });

  expect(onChange.mock.calls[0][0]).toEqual([{ label: '级别', value: 1 }]);
});

test('添加行以新数组回写', () => {
  const value: OptionItem[] = [{ label: '研发部', value: 'rd' }];
  const onChange = vi.fn();
  render(<OptionsSetter value={value} onChange={onChange} />);

  fireEvent.click(screen.getByRole('button', { name: '添加选项' }));

  expect(onChange).toHaveBeenCalledTimes(1);
  const [next] = onChange.mock.calls[0];
  expect(Array.isArray(next)).toBe(true);
  expect(next).toEqual([
    { label: '研发部', value: 'rd' },
    { label: '', value: '' },
  ]);
  expect(next).not.toBe(value);
  expect(value).toHaveLength(1);
});

test('删除行以新数组回写', () => {
  const value: OptionItem[] = [
    { label: '研发部', value: 'rd' },
    { label: '产品部', value: 'pd' },
  ];
  const onChange = vi.fn();
  render(<OptionsSetter value={value} onChange={onChange} />);

  fireEvent.click(screen.getByRole('button', { name: '删除选项 1' }));

  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange.mock.calls[0][0]).toEqual([{ label: '产品部', value: 'pd' }]);
  expect(value).toHaveLength(2);
});

test('完全受控：外部 value 变化后行随之更新', () => {
  const { rerender } = render(<OptionsSetter value={[]} onChange={vi.fn()} />);
  expect(screen.queryAllByRole('textbox')).toHaveLength(0);

  rerender(
    <OptionsSetter
      value={[
        { label: '研发部', value: 'rd' },
        { label: '产品部', value: 'pd' },
      ]}
      onChange={vi.fn()}
    />
  );

  expect(screen.getAllByRole('textbox')).toHaveLength(4);
  expect(screen.getByDisplayValue('产品部')).toBeTruthy();
});
