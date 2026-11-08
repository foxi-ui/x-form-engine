import { render, screen } from '@testing-library/react';
import type { ReadonlyRenderContext } from '@x-form-engine/types';
import { describe, expect, it } from 'vitest';
import { basicComponents } from '../index';
import { ReadonlyText } from './readonly-components';

const context: ReadonlyRenderContext = {
  locale: 'zh-CN',
  platform: 'pc',
  diagnostics: [],
};

describe('只读实现', () => {
  it('basicComponents 均挂载 readonly 实现', () => {
    expect(basicComponents).toHaveLength(7);
    for (const binding of basicComponents) {
      expect(binding.readonly?.pc).toBeTruthy();
      expect(binding.readonly?.default).toBeTruthy();
    }
  });

  it('ReadonlyText 优先渲染 snapshotValue（冻结展示）', () => {
    render(
      <ReadonlyText
        value="u_1"
        snapshotValue="张三"
        schema={{}}
        context={context}
      />
    );
    expect(screen.getByText('张三')).toBeTruthy();
  });

  it('ReadonlyText 空值给占位符', () => {
    render(<ReadonlyText value={null} schema={{}} context={context} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('ReadonlyText 对象取 name、数组以「、」连接', () => {
    render(
      <ReadonlyText
        value={[{ name: '张三' }, { name: '李四' }]}
        schema={{}}
        context={context}
      />
    );
    expect(screen.getByText('张三、李四')).toBeTruthy();
  });
});
