import { createContext, useContext } from 'react';
import type { FormEngine } from '@x-form-engine/types';

/**
 * Engine 上下文只承载 `FormEngine`，不持有任何 Formily Form 实例。
 * 每个 FormRenderer 自行创建并管理独立的 form。
 */
const FormEngineContext = createContext<FormEngine | null>(null);

export interface FormEngineProviderProps {
  engine: FormEngine;
  children?: React.ReactNode;
}

export function FormEngineProvider({ engine, children }: FormEngineProviderProps): JSX.Element {
  return <FormEngineContext.Provider value={engine}>{children}</FormEngineContext.Provider>;
}

export function useFormEngine(): FormEngine {
  const engine = useContext(FormEngineContext);

  if (engine === null) {
    throw new Error('useFormEngine 必须在 FormEngineProvider 内使用');
  }

  return engine;
}
