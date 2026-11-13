import { fireEvent, render, screen } from '@testing-library/react';
import { advancedSetters } from './index';
import { ExpressionSetter, validateExpression } from './expression-setter';

describe('setters-advanced（Task 8.1）', () => {
  test('advancedSetters 含 ExpressionSetter 且挂载 validate', () => {
    expect(advancedSetters).toHaveLength(1);
    expect(advancedSetters[0].name).toBe('ExpressionSetter');
    expect(advancedSetters[0].version).toBe('1.0.0');
    expect(typeof advancedSetters[0].validate).toBe('function');
  });

  test('ExpressionSetter 受控渲染 + onChange 回写', () => {
    const onChange = vi.fn();
    render(<ExpressionSetter value="a" onChange={onChange} context={{}} />);
    const textarea = screen.getByDisplayValue('a');
    fireEvent.change(textarea, { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });

  test('validateExpression：平衡表达式通过、不平衡/非字符串失败', () => {
    expect(validateExpression('{{ $self.value }}', {})).toEqual({ valid: true });
    expect(validateExpression('{{ $self.value', {})).toEqual(
      expect.objectContaining({ valid: false })
    );
    expect(validateExpression(123, {})).toEqual(expect.objectContaining({ valid: false }));
  });
});
