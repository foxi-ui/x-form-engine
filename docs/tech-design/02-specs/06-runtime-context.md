# 06. Runtime Context、Scope、事件与服务注入

## 1. 目标

为组件、Effects、Schema 表达式和插件提供受控的运行时能力访问方式，避免组件依赖全局单例或直接导入业务模块。

## 2. Runtime Context

```ts
export interface RuntimeContext {
  engine: FormEngine;
  platform: 'pc' | 'mobile' | 'readonly';
  mode: 'edit' | 'preview' | 'readonly';
  locale: string;
  services: EngineServices;
  permissions: PermissionContext;
}
```

Engine Context 与 Renderer Runtime Context 应分开：前者是应用级共享能力，后者包含具体表单实例和渲染模式。

## 3. Scope 命名空间

建议分为：

- `engine`：引擎内置能力。
- `app`：业务应用注入的方法和只读数据。
- `custom`：当前表单或当前实例的自定义上下文。

示例：

```ts
const scope = {
  engine: {
    formatDate,
  },
  app: {
    currentUser,
    getDepartmentName,
  },
  custom: {
    calculateAmount,
  },
};
```

不要把所有方法平铺到同一个命名空间。应避免 Scope 暴露任意网络请求、敏感凭证或可绕过权限的操作。

## 4. Scope 生命周期

- Engine Scope：随 Engine 创建和销毁。
- App Scope：由业务应用提供，可按需更新。
- Form Scope：随 Renderer 实例创建和销毁。
- Schema 中只能引用明确暴露的能力。

Scope 需要定义覆盖规则，建议禁止静默覆盖同名属性；冲突时给出诊断信息。

## 5. React Hooks

建议提供：

```ts
function useFormEngine(): FormEngine;
function useFormRuntime(): RuntimeContext;
function useEngineService<T>(name: string): T;
```

这些 Hooks 是引擎自定义 API，不是 Formily 原生 API。

## 6. 服务注入

核心服务通过接口注入：

- DatasourceService：远程选项和业务数据。
- PermissionService：字段级展示和操作策略。
- I18nService：国际化资源和格式化。
- SnapshotService：快照生成、校验和版本适配。
- Logger：诊断和运行日志。

Engine 不应绑定某个具体请求库。应用负责将服务接口适配到自身 HTTP Client。

## 7. 事件规范

事件用于观察生命周期和跨模块通知，不用于代替直接函数调用。

建议事件：

- `engine:ready`
- `engine:destroy`
- `plugin:installed`
- `plugin:failed`
- `schema:compiled`
- `renderer:mounted`
- `renderer:unmounted`
- `snapshot:created`

事件 payload 应有版本化类型，监听器应返回 unsubscribe 函数。

## 8. 权限边界

前端权限服务负责控制 UI 展示和交互体验。后端必须独立校验：

- 用户是否有权读取表单。
- 用户是否有权修改字段。
- 用户提交的数据是否符合业务规则。
- 是否允许执行当前业务操作。

不能把 Schema 中的 `permission` 配置视为可信授权凭证。

## 9. 验收标准

- 多个 Renderer 的 Form Scope 相互隔离。
- App Scope 更新不会意外覆盖 Engine Scope。
- 服务可替换，组件不依赖具体 HTTP 实现。
- Hooks 在 Provider 外调用时给出明确错误。
- 事件订阅可清理，销毁后不再触发。
