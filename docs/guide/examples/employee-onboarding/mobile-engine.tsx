import { connect } from '@formily/react';
import React from 'react';
import {
  basicComponents as mobileBasicComponents,
  basicDecorators as mobileBasicDecorators,
} from '@x-form-engine/components/mobile';
import { createFormEngine, defaultFormattersPlugin } from '@x-form-engine/sdk';
import type { FormEngine } from '@x-form-engine/sdk';
import type { ComponentBinding, ComponentProtocolDefinition } from '@x-form-engine/sdk';

/**
 * PC 专用的遗留备注组件：只有 `pc` 实现，用于演示移动端回退诊断。
 *
 * `connect` 来自 `@formily/react`，只在编写自定义组件时需要；
 * 七类 P0 组件已由引擎内置，业务代码无需直接依赖 `@formily/react`。
 */
function LegacyRemarkWidget(props: {
  value?: unknown;
  onChange?: (value: string) => void;
  placeholder?: string;
}): JSX.Element {
  return (
    <input
      value={props.value == null ? '' : String(props.value)}
      onChange={(event) => props.onChange?.(event.target.value)}
      placeholder={props.placeholder}
      style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box' }}
    />
  );
}

const LegacyRemark = connect(LegacyRemarkWidget);

const legacyRemarkProtocol: ComponentProtocolDefinition = {
  name: 'LegacyRemark',
  version: '1.0.0',
  meta: { title: '遗留备注（PC 专用）', category: 'basic' },
  capabilities: { editable: true, readonly: false, mobile: false },
  schema: {
    type: 'object',
    properties: { placeholder: { type: 'string' } },
  },
};

/** 只有 `pc` 实现：移动端渲染时回退到 pc 并派发 `PlatformFallbackDiagnostic`。 */
export const legacyRemarkBinding: ComponentBinding = {
  protocol: legacyRemarkProtocol,
  implementations: { pc: LegacyRemark },
};

/**
 * 创建移动端 Engine。
 *
 * `components` 同时包含七类 P0 移动物料与 pc-only 的 `LegacyRemark`，
 * 以便演示「移动端缺少实现时回退 PC 并上报诊断」。
 */
export function createEmployeeOnboardingMobileEngine(): FormEngine {
  return createFormEngine({
    platform: 'mobile',
    locale: 'zh-CN',
    components: [...mobileBasicComponents, legacyRemarkBinding],
    decorators: mobileBasicDecorators,
    plugins: [defaultFormattersPlugin],
  });
}
