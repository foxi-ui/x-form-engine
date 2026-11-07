# 07. Designer 与 Designable 1.x Adapter

## 1. 目标

使用 Designable 1.x（上游无 2.x，最新为 `1.0.0-beta.45`）构建可视化设计器，并通过 Adapter 将引擎组件定义映射为设计器物料、节点和 Setter。设计器与运行时共享组件元数据，避免两套组件定义长期漂移。

## 2. 设计器职责

- 物料面板与拖拽。
- 节点树和 Schema 结构维护。
- 属性 Setter。
- 组件配置校验和提示。
- PC / Mobile 平台配置编辑。
- 预览、导入、导出和版本管理。
- 组件弃用和兼容提示。

## 3. Designer Material

```ts
export interface DesignerMaterialDefinition {
  componentName: string;
  title: string;
  category: string;
  icon?: string;
  description?: string;
  defaultSchema: Record<string, unknown>;
  setters?: SetterDefinition[];
}

export interface SetterDefinition {
  name: string;
  title: string;
  component: string;
  props?: Record<string, unknown>;
}
```

以上为引擎抽象接口。Designable 的真实物料协议和节点 API 应由 Adapter 转换，不应让公共组件定义直接依赖 Designable 内部类型。

## 4. 统一组件定义来源

组件 Definition 应包含或关联：

- 组件名称和版本。
- 属性 Schema。
- 默认值。
- 平台能力。
- 设计器分类和图标。
- Setter 定义。
- 运行时实现。
- Snapshot Adapter。

设计器物料由 Definition 派生，必要时允许应用通过扩展点覆盖展示信息，但不能覆盖 Value 协议。

## 5. Schema 编辑与保存

建议设计器保存完整 Schema Document：

```ts
interface FormSchemaDocument {
  schemaId: string;
  version: number;
  engineSchemaVersion: string;
  schema: Record<string, unknown>;
}
```

保存前执行：

1. Schema 结构校验。
2. 组件名称和版本检查。
3. 属性配置校验。
4. 平台能力检查。
5. 数据源引用检查。
6. `x-engine` 扩展字段校验。
7. 版本号和变更记录处理。

## 6. 平台配置编辑

设计器应允许配置平台差异，但避免复制整份 Schema。建议使用通用属性 + 平台覆盖配置：

```json
{
  "x-component-props": {
    "placeholder": "请选择"
  },
  "x-engine": {
    "platform": {
      "pc": {
        "width": "320px"
      },
      "mobile": {
        "display": "block"
      }
    }
  }
}
```

平台覆盖字段应有白名单和类型校验，避免任意覆盖组件内部状态属性。

## 7. 设计器预览

设计器画布与运行时 Renderer 是两条渲染路径，designer 不反向依赖 Renderer 包。预览复用**组件实现**与**Schema 编译产物**，而非复用 Renderer 渲染入口：

- 预览数据与正式 Value 分离。
- 预览模式不执行真实提交。
- 外部服务调用可注入 Mock Service。
- 设计器变更后应能增量刷新预览。
- Schema 编译错误应定位到节点路径。
- 通过「画布与运行时渲染一致性」验收用例锁定所见即所得。

## 8. 版本与迁移

- 设计器保存 Schema 时记录版本。
- 组件升级需提供 Schema Migration。
- 未知组件应显示占位节点，不应静默丢弃。
- 旧 Schema 可只读打开并提示迁移。
- 设计器不应擅自修改历史业务实例的 Schema。

## 9. 验收标准

- 物料定义可从 Registry 自动生成。
- 拖拽生成的 Schema 可被正式 Renderer 消费。
- Setter 修改后 Schema 可正确回写。
- 平台配置能被 Compiler 正确解析。
- 未知组件和旧版本 Schema 有可理解的提示。
