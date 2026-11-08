import { render } from '@testing-library/react';
import { createRef } from 'react';
import { createFormEngine } from '@x-form-engine/core';
import { basicComponents } from '@x-form-engine/components';
import { SNAPSHOT_VERSION } from '@x-form-engine/types';
import { describe, expect, it } from 'vitest';
import { FormEngineProvider } from '../context';
import { FormRenderer } from '../FormRenderer';
import type { FormRendererInstance } from '../types';

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: '姓名', 'x-component': 'Input' },
    idCard: { type: 'string', title: '证件号', 'x-component': 'Input' },
  },
};

describe('FormRenderer.submit', () => {
  it('返回 values + 候选快照（含 title/component/componentVersion）', async () => {
    const engine = createFormEngine({ components: basicComponents });
    const ref = createRef<FormRendererInstance>();
    render(
      <FormEngineProvider engine={engine}>
        <FormRenderer
          ref={ref}
          schemaId="leave-form"
          schemaVersion={3}
          initialValues={{ name: '张三', idCard: '110101' }}
          schema={schema}
        />
      </FormEngineProvider>
    );

    const result = await ref.current!.submit();

    expect(result.schemaId).toBe('leave-form');
    expect(result.schemaVersion).toBe(3);
    expect(result.values).toEqual({ name: '张三', idCard: '110101' });
    expect(result.snapshot.snapshotVersion).toBe(SNAPSHOT_VERSION);
    expect(result.snapshot.schemaId).toBe('leave-form');
    expect(result.snapshot.schemaVersion).toBe(3);
    expect(result.snapshot.fields.name).toMatchObject({
      path: 'name',
      title: '姓名',
      component: 'Input',
      componentVersion: '1.0.0',
      value: '张三',
    });
  });

  it('提交前剔除无写权限字段', async () => {
    const engine = createFormEngine({ components: basicComponents });
    const ref = createRef<FormRendererInstance>();
    render(
      <FormEngineProvider engine={engine}>
        <FormRenderer
          ref={ref}
          initialValues={{ name: '张三', idCard: '110101' }}
          permission={{
            version: 1,
            form: { read: true, submit: true },
            fields: {
              name: { read: true, write: true },
              idCard: { read: true, write: false },
            },
          }}
          schema={schema}
        />
      </FormEngineProvider>
    );

    const result = await ref.current!.submit();
    expect(result.values).toEqual({ name: '张三' });
    expect(result.snapshot.fields.idCard).toBeUndefined();
    expect(result.snapshot.fields.name.value).toBe('张三');
  });
});
