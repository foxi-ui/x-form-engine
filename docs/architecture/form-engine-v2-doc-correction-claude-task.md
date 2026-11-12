# Claude Code 执行指导：订正 Form Engine V2 两份架构文档

> **用途**：将本文直接交给 Claude Code，在 `foxi-ui/x-form-engine`
> 仓库中执行文档审计、订正和一致性检查。
>
> **目标文件**： 1.《Form Engine V2 完整架构设计方案》 2.《Form Engine
> V2 Claude Code 工程改造任务书》
>
> **本任务性质**：本阶段只订正文档，不实施 V2
> 源码改造。完成并验收两份文档后，再依据修订后的工程任务书执行代码改造。

------------------------------------------------------------------------

# 1. Claude Code 总任务

你现在负责订正 `foxi-ui/x-form-engine` 仓库中的两份 Form Engine V2
文档：

-   **Form Engine V2 完整架构设计方案**
-   **Form Engine V2 Claude Code 工程改造任务书**

请先在仓库中定位这两份文档及其引用关系，读取现有文档、`AGENTS.md`、README、文档地图和相关源码，再执行订正。

本任务不是重新撰写一套脱离现状的新架构，也不是直接执行源码重构。你必须以仓库真实代码为依据，将已确认的
C1--C9 修正、C10--C13 新增决策，以及 Generic Plugin Core
前置任务、Material → Schema → Runtime Component
一致性校验，准确写入两份文档。

**本阶段只允许修改文档及必要的文档索引/`AGENTS.md`。不得实施
Designer、Runtime、Plugin Core 等源码改造。**

完成后，输出修改文件清单、关键变更摘要、源码依据、尚待确认事项和文档一致性检查结果。

------------------------------------------------------------------------

# 2. 执行前必须遵守的原则

## 2.1 先审计，后修改

必须先确认：

1.  两份 V2 文档的实际路径、文件名、版本和当前内容。
2.  两份文档是否互相引用，是否有其他文档引用它们。
3.  仓库当前 `AGENTS.md` 的规则和历史术语。
4.  当前文档地图的实际位置及维护方式。
5.  相关源码的真实状态。
6.  当前 package、依赖版本、构建和测试命令。

禁止猜测文档路径、包名、源码能力和脚本名称。

如果仓库中找不到目标文档，不得自行创建同名副本并假装完成。先报告检索结果，说明缺失情况，并提出最小化恢复方案。

## 2.2 事实、决策、规划必须分开

文档中所有内容必须区分：

-   **现状事实**：当前源码已经存在并可验证的能力。
-   **架构决策**：本次明确决定采用的设计。
-   **待实施任务**：当前尚未实现，未来需要完成的工作。
-   **暂缓事项**：不属于当前 MVP 的能力。
-   **待确认事项**：源码或产品约束不足以作出结论的内容。

不得将规划中的能力写成当前已经实现。

对源码无法验证的内容，标注"待源码审计确认"，不能推断为已完成。

## 2.3 不扩大本次改造范围

本次只修订文档，不修改 Runtime、Designer、Registry、Plugin Manager
等实现代码。

不得：

-   升级 React、React DOM、Formily、Designable、antd 或 antd-mobile。
-   创建新的源码 Package。
-   修改运行时公共 API。
-   重写现有架构。
-   擅自调整已有技术选型。
-   为满足文档描述而虚构接口或实现状态。

------------------------------------------------------------------------

# 3. C1--C9 必须订正的内容

以下修正必须同时反映在两份 V2
文档中。架构设计方案说明"为什么这样设计、边界是什么"；工程改造任务书说明"需要修改什么、先后顺序、如何验收"。

## C1：保留现有 FormSchemaDocument，禁止重复定义

必须核查并保留当前 `FormSchemaDocument` 定义。

订正文档要求：

1.  明确该类型当前已经存在。
2.  禁止再定义一个语义重复的 Schema Document。
3.  如果需要设计器元数据，只能在现有类型上做兼容性扩展。
4.  区分 Runtime Schema、Designer Metadata、Designer UI State。
5.  默认不持久化选中节点、面板展开、拖拽状态等临时 UI 状态。
6.  只有需要跨编辑会话保存的数据才进入持久化元数据。

建议文档使用以下示意，不得将示意字段误写为现有源码事实：

``` ts
interface FormSchemaDocument {
  schema: Record<string, unknown>;
  designerMetadata?: DesignerMetadata;
}
```

具体字段必须以当前仓库类型为准。

## C2：修正 SchemaCompiler 的实现状态

必须明确：

-   当前已有 Parser、Validator、Component Map 等分散能力。
-   不得描述为已经存在完整统一的 SchemaCompiler，除非源码审计能证明。
-   优先复用已有实现。
-   只有实际需要统一编排时，才规划 Schema Preparation Pipeline。
-   不得为了架构图创建空壳 Compiler。

如果文档需要统一术语，优先考虑
`SchemaPreparationPipeline`，但它属于规划能力，不能冒充现有实现。

## C3：明确是新建 Designer Framework + 迁移 Designable Adapter

必须修正"简单拆包"的表述。

本次工作本质是：

1.  新建独立 Designer Framework。
2.  迁移并适配现有 Designable 相关实现。
3.  将 Designable 限定在 Adapter 层。
4.  让 Designer Core 不依赖 Designable。
5.  让业务插件不依赖 Designable TreeNode。
6.  最终统一切换设计器公开入口。

两份文档均不得再把本次工作描述为单纯拆分现有 Designer Package。

## C4：明确 createDesignerMaterials 的真实职责

必须说明：

-   `createDesignerMaterials(bindings)` 是从 ComponentBinding 派生
    Designable Behavior / Resource 的工具。
-   它不是 Material Registry。
-   新架构需要独立 MaterialRegistry。
-   `createDesignerMaterials` 应保留为 Designable Adapter
    内的转换工具或适配工厂。
-   DesignerMaterialDefinition 不要求从 ComponentBinding 派生。

不得只通过改名把派生工厂描述成 Registry。

## C5：缺少平台实现时不能静默跳过

必须核查当前实现中类似以下逻辑：

``` ts
const host = binding.implementations.pc;
if (!host) {
  return;
}
```

文档应准确描述现状：缺少 PC implementation
时，当前逻辑可能静默跳过，而不是主动拒绝注册。

目标设计必须补充：

-   Material 注册诊断。
-   画布平台实现能力检查。
-   Runtime Target 校验。
-   缺失 Setter / Component / 平台实现的诊断。
-   Schema 导出前校验。
-   明确 error / warning / info 级别。

允许 Designer Material 独立存在，不要求所有设计器物料都必须是 Runtime
Component；但导出规则必须明确。

## C6：Snapshot 状态不能夸大

必须区分：

1.  Snapshot 创建能力。
2.  Snapshot 类型定义。
3.  Snapshot Restore 类型定义。
4.  Restore 具体实现。
5.  Canonical Snapshot 协议。
6.  后端持久化和恢复集成。

不能因为存在 Snapshot 类型或局部代码，就描述为完整恢复闭环已经完成。

Snapshot 属于 Runtime / 后端数据能力，不是 Designer Core 的职责。本次
Designer MVP 不得隐式依赖完整 Snapshot 后端闭环。

## C7：更新过时术语

核查并处理 `FormComponentDefinition` 等历史术语。

新架构文档优先使用当前真实术语，例如：

-   `ComponentBinding`
-   `ComponentAdapter`
-   `FormSchemaDocument`
-   `DesignerMaterialDefinition`
-   `MaterialRuntimeTarget`

必须检查 `AGENTS.md`、README、开发指南、架构文档、Package
文档、示例代码中的过时描述。

如果旧类型仍存在，明确其兼容状态和迁移策略，不得将过时术语继续作为新架构核心概念。

## C8：先逻辑分层，再决定物理拆包

必须删除"为了满足架构图而立即创建全部 Package"的暗示。

修订为：

1.  先确定逻辑职责。
2.  再建立依赖边界。
3.  优先在现有 Package 中建立清晰模块边界。
4.  有独立职责、公共 API、依赖价值和测试后，再考虑物理拆包。
5.  不创建空壳 Package。
6.  不以 Package 数量作为架构验收标准。

两份文档中的 Package
清单必须标注为"目标逻辑模块"或"经审计确认后的物理包"，不能混为一谈。

## C9：Runtime Plugin Manager 不能直接复制

必须明确：

-   现有 Runtime Plugin Manager 与 FormEngine / Runtime Registry 耦合。
-   不得直接复制为 Designer Plugin Manager。
-   应抽取通用生命周期、依赖排序、资源归属、安装回滚、卸载等机制。
-   Runtime 与 Designer 分别提供 Host / Context / Registry。
-   增加单插件 `uninstall(name)`。
-   卸载必须有依赖保护和逆序资源清理。

**本项进一步升级为独立的前置工程任务，见第 5 章。**

------------------------------------------------------------------------

# 4. C10--C13 必须新增的架构决策

以下四项必须进入两份文档的"架构决策清单"，编号保持
C10--C13，不得重新编号或遗漏。

## C10：Material → Schema → Runtime Component 一致性校验

这是跨 Designer 与 Runtime 的关键契约。

必须在两份文档中明确完整链路：

``` text
Designer Material
       |
       v
MaterialRuntimeTarget
       |
       v
Schema Node / FormSchemaDocument
       |
       v
Schema Parser / Validator
       |
       v
Runtime Component Registry
       |
       v
ComponentBinding
       |
       v
ComponentAdapter
       |
       v
PC / Mobile Runtime Component
```

### 4.1 Runtime Target 类型

文档可使用以下类型作为目标协议草案：

``` ts
type MaterialRuntimeTarget =
  | {
      kind: 'component';
      componentName: string;
    }
  | {
      kind: 'schema-container';
      schemaType: string;
    }
  | {
      kind: 'designer-only';
    };
```

必须解释三种类型：

  --------------------------------------------------------------------------
  类型                    说明                    导出要求
  ----------------------- ----------------------- --------------------------
  `component`             对应 Runtime            必须能映射到 Runtime
                          中可注册的组件          Component

  `schema-container`      对应 Schema             必须生成合法 Runtime
                          容器/布局结构           Schema

  `designer-only`         仅用于设计器辅助操作    不得直接进入最终 Runtime
                                                  Schema，导出前转换或剔除
  --------------------------------------------------------------------------

### 4.2 必须定义四个校验阶段

1.  **Material 注册阶段**：检查 Target 是否完整、Setter
    引用是否存在、画布实现是否可用。
2.  **Schema 生成阶段**：检查物料生成的 Schema
    节点是否符合协议，默认属性是否正确。
3.  **Schema 导出阶段**：检查 Schema
    结构、组件标识、容器结构、不可序列化值和 designer-only 节点。
4.  **Runtime 解析阶段**：检查组件是否注册、平台实现是否存在、Adapter
    是否能够解析。

### 4.3 必须明确错误诊断信息

错误至少应能定位：

-   Material 名称。
-   Schema 路径。
-   Runtime Component 名称。
-   缺失的平台。
-   缺失的 Setter。
-   错误代码。
-   严重级别。
-   具体原因。

不能静默跳过，也不能仅返回笼统的"Schema 无效"。

### 4.4 必须有一致性自动化测试

工程任务书必须新增 Material Contract / Schema Contract / Runtime Binding
Contract Tests，覆盖：

-   基础 Material 均能生成合法 Schema。
-   `component` Target 能找到 Runtime Binding。
-   `schema-container` 能生成合法容器 Schema。
-   `designer-only` 不会直接导出。
-   导出 Schema 能被 Runtime Parser / Validator 接受。
-   缺少 Runtime Component 时产生明确错误。
-   PC / Mobile 缺失实现时产生平台诊断。
-   Material 属性映射到 Schema 后不丢失。
-   Schema 导入后可恢复设计器状态。

不得只检查组件名称字符串相等；必须根据现有 Schema 协议和
ComponentBinding 的实际映射方式设计测试。

## C11：SchemaEditor 不暴露 Designable TreeNode

必须在架构设计中定义：

-   SchemaEditor 操作 `FormSchemaDocument` / Schema Node。
-   不公开 Designable TreeNode。
-   不允许插件直接依赖 Designable 内部类型。
-   Designable Adapter 负责 TreeNode 与 Schema 的双向映射。
-   画布事件转换为与底层画布无关的 Designer Event。

工程任务书必须新增 API 边界检查和类型依赖检查。

## C12：分阶段开发，最终统一切换

必须明确：

-   开发按 Phase 分阶段。
-   最终发布统一切换。
-   不长期维护两套 Designer。
-   所有 Demo、Tests、Public Exports、文档在最终切换时一起更新。
-   可提供短期兼容 Facade，但必须有退役策略。
-   不允许新旧实现长期双轨演进。

## C13：Designer Core 依赖边界

必须明确 Designer Core：

允许： - React（按需作为 peer dependency）。 - Types / Protocol。 -
Generic Plugin Core。

禁止： - Designable。 - antd。 - antd-mobile。 - Runtime Renderer。 -
FormEngine。 - 具体业务组件。 - 具体画布实现。

Setter UI、物料 UI、画布实现通过 Adapter / Extension 注入。

必须在工程任务书中增加依赖图检查和 package dependency 检查。

------------------------------------------------------------------------

# 5. Generic Plugin Core：独立前置工程任务

这是本次文档订正中必须重点调整的实施顺序。

**Generic Plugin Core 不再是 Designer Core
开发过程中的顺带重构，而是独立、先行、可验收的工程任务。**

## 5.1 前置关系

实施顺序必须调整为：

``` text
Phase 0：仓库和源码审计
        |
        v
Phase 1：公共协议和依赖边界确认
        |
        v
Phase 2：Generic Plugin Core 抽取（独立前置任务）
        |
        v
Phase 3：Runtime Plugin Host 迁移与回归
        |
        v
Phase 4：Designer Core
        |
        v
Phase 5：Designable Adapter
        |
        v
Phase 6：基础物料与 Setter
        |
        v
Phase 7：Material → Schema → Runtime 一致性闭环
        |
        v
Phase 8：高级扩展（可延后）
        |
        v
Phase 9：统一切换、文档和发布验证
```

如果源码审计发现公共类型必须先于 Generic Plugin Core 定义，可以在 Phase
1 先完成最小必要类型；但不得因此把 Plugin Core 推迟到 Designer Core
之后。

## 5.2 Generic Plugin Core 的职责

只处理通用插件机制：

-   Plugin Definition。
-   Plugin Registry。
-   依赖解析和拓扑排序。
-   重复注册 / 安装检测。
-   安装顺序。
-   安装失败回滚。
-   插件资源归属。
-   单插件卸载。
-   依赖保护。
-   逆序资源清理。
-   全量 dispose。

不得依赖：

-   FormEngine。
-   DesignerContext。
-   Runtime Registry。
-   Designer Registry。
-   Formily。
-   Designable。
-   antd。

## 5.3 Runtime Plugin Host

Runtime Host 负责将 Generic Plugin Core 接入现有 Runtime：

-   提供 Runtime Context。
-   暴露 Runtime Registry 能力。
-   将现有 Runtime Plugin Manager 的行为迁移到通用机制。
-   保持现有 Runtime 插件 API 的必要兼容。
-   对比迁移前后的行为。
-   保证 Runtime 既有插件功能回归。

不得因为抽取 Plugin Core 而改变 Runtime 业务行为。

## 5.4 Designer Plugin Host

Designer Host 在 Designer Core 阶段实现：

-   提供 DesignerContext。
-   管理 Material / Setter / Panel / Command / Toolbar 等资源。
-   将插件注册资源归属到插件。
-   支持插件卸载时清理资源。
-   不直接依赖 Runtime Context。

## 5.5 插件卸载规则

MVP 默认采用依赖保护：

-   若插件 A 依赖插件 B，且 A 仍处于已安装状态，不允许直接卸载 B。
-   先卸载 A，再卸载 B。
-   卸载顺序按安装顺序逆序执行。
-   卸载时清理插件注册的资源。
-   `disposeAll()` 必须尽最大努力清理所有已安装插件。
-   级联卸载不作为 MVP 默认行为。

## 5.6 前置任务验收

Generic Plugin Core 独立验收通过后，才能进入 Designer Core
依赖它的实现。

必须覆盖：

-   注册插件。
-   重复注册。
-   安装插件。
-   重复安装。
-   依赖缺失。
-   依赖拓扑顺序。
-   循环依赖检测。
-   安装失败回滚。
-   插件资源归属。
-   单插件卸载。
-   依赖保护。
-   逆序清理。
-   `disposeAll()`。
-   Runtime Plugin Host 回归。

如果 Generic Plugin Core 的抽取导致现有 Runtime
插件行为改变，必须先解决兼容问题，不得继续向 Designer
传播不稳定的插件机制。

------------------------------------------------------------------------

# 6. 两份文档必须如何分工

## 6.1 文档一：完整架构设计方案

文档一重点回答：

-   为什么需要独立 Designer Framework？
-   Runtime 和 Designer 的边界是什么？
-   Schema Protocol 是什么？
-   Material、Schema、Runtime Component 如何关联？
-   Generic Plugin Core 如何抽取？
-   Designable Adapter 如何隔离？
-   Package 依赖方向是什么？
-   哪些是 MVP，哪些是后续能力？
-   架构风险和约束是什么？

文档一应包含：

1.  背景与目标。
2.  当前架构事实。
3.  C1--C13 决策及修正。
4.  总体架构图。
5.  Schema Protocol。
6.  Material / Runtime Target。
7.  Material → Schema → Runtime 一致性机制。
8.  Generic Plugin Core。
9.  Runtime Plugin Host。
10. Designer Framework。
11. Designable Adapter。
12. SchemaEditor 边界。
13. Package 与依赖规则。
14. Runtime 约束。
15. Snapshot 边界。
16. MVP 与后续规划。
17. 风险与技术决策记录。

## 6.2 文档二：Claude Code 工程改造任务书

文档二重点回答：

-   Claude Code 应该先做什么？
-   每个 Phase 改哪些代码？
-   哪些代码不能动？
-   每阶段依赖什么？
-   每阶段产出什么？
-   如何验收？
-   出现偏差时如何暂停和报告？

文档二应包含：

1.  执行目标与禁止事项。
2.  仓库审计任务。
3.  源码现状核对表。
4.  C1--C13 对应改造任务。
5.  Generic Plugin Core 独立前置任务。
6.  Runtime Plugin Host 迁移任务。
7.  Designer Core 任务。
8.  Designable Adapter 任务。
9.  基础物料与 Setter 任务。
10. Material → Schema → Runtime 一致性测试任务。
11. `AGENTS.md` 更新任务。
12. 文档地图更新任务。
13. 分阶段验收标准。
14. 风险、回滚和暂停条件。
15. 最终统一切换任务。

工程任务书必须比架构方案更具体，不能只是复制架构描述。

------------------------------------------------------------------------

# 7. 更新 AGENTS.md

必须检查仓库根目录和相关子目录中的 `AGENTS.md`。

## 7.1 更新目标

将 V2 已确认的架构约束写入 Agent 工作规范，防止后续 AI
编码重新引入旧设计。

至少补充以下内容：

### 架构事实约束

-   `FormSchemaDocument` 已存在，修改前先检查现有定义。
-   `ComponentBinding` 是现有 Runtime 组件绑定核心。
-   `createDesignerMaterials` 是 Designable 适配派生工具，不是
    MaterialRegistry。
-   当前 Parser / Validator 等能力的真实实现状态以源码为准。
-   Snapshot 类型存在不等于完整 Restore 闭环完成。

### Designer 依赖约束

-   Designer Core 不得依赖 Designable。
-   Designer Core 不得依赖 antd / antd-mobile。
-   Designer Core 不得依赖 Runtime Renderer / FormEngine。
-   Designable 只能通过 Adapter 接入。
-   Designer 插件不得暴露或依赖 Designable TreeNode。
-   SchemaEditor 只操作 Schema Document。

### Plugin 约束

-   Generic Plugin Core 不依赖 Runtime / Designer 业务上下文。
-   Runtime / Designer 各自提供 Plugin Host。
-   插件注册资源必须归属插件。
-   插件卸载必须处理依赖保护和资源清理。
-   不得直接复制 Runtime Plugin Manager 实现为 Designer Plugin Manager。

### Schema 一致性约束

-   每个普通 Material 必须声明 Runtime Target。
-   Schema 导出必须检查 Material Target。
-   Runtime 解析必须检查组件是否可用。
-   缺失组件、平台实现或 Setter 时必须产生诊断。
-   禁止静默跳过不支持的节点。
-   designer-only 节点不能直接进入最终 Runtime Schema。

### 工程执行约束

-   先审计再修改。
-   先逻辑分层再拆 Package。
-   不创建空壳 Package。
-   不擅自升级依赖。
-   不将规划能力标记为已实现。
-   每个 Phase 必须有测试和验收报告。
-   先完成 Generic Plugin Core 前置任务，再让 Designer Core 依赖它。

## 7.2 更新原则

不要覆盖或删除 `AGENTS.md` 中仍然有效的现有规范。

应当：

1.  先读取全文。
2.  标出过时内容。
3.  合并重复约束。
4.  保留有效的工程规范。
5.  删除或改写与 V2 决策冲突的历史术语。
6.  避免把架构方案全文复制进 AGENTS.md。
7.  通过链接引用详细架构文档和工程任务书。

`AGENTS.md` 应保持精炼，重点放置 Agent 每次编码都必须遵守的约束。

------------------------------------------------------------------------

# 8. 更新文档地图

必须先找到仓库当前使用的文档地图文件。

可能是
README、`docs/README.md`、`docs/index.md`、`docs/architecture/README.md`
或其他实际文件；以仓库为准，不得猜测。

更新要求：

1.  两份 V2 文档都能从文档地图直接找到。
2.  明确标记"架构设计方案"和"工程改造任务书"。
3.  标明当前文档版本或状态。
4.  明确架构方案是决策依据。
5.  明确工程任务书是执行依据。
6.  如果存在旧版本文档，标注废弃、历史或迁移关系。
7.  修正失效链接。
8.  不要创建重复的文档索引体系。

建议文档地图呈现：

``` text
Form Engine
├── Architecture
│   └── Form Engine V2 完整架构设计方案
├── Engineering
│   └── Form Engine V2 Claude Code 工程改造任务书
└── Development Guide
    └── 组件、物料、插件和扩展开发指南
```

该结构仅为展示示意，实际路径应遵循仓库现有组织。

------------------------------------------------------------------------

# 9. 工程任务书必须采用的实施阶段

修订后的文档二必须使用以下实施顺序。可以根据源码审计调整具体子任务，但不得把
Generic Plugin Core 移到 Designer Core 之后。

## Phase 0：仓库和源码审计

产出：

-   当前架构事实。
-   Package 依赖图。
-   现有公开 API 清单。
-   Plugin Manager 行为清单。
-   Schema 类型清单。
-   Material / Binding 对照表。
-   测试与构建命令。
-   文档引用关系。

验收：每项事实有文件路径、符号名或测试依据。

## Phase 1：公共协议和依赖边界

完成：

-   核对现有 `FormSchemaDocument`。
-   定义或完善 Designer Material 类型。
-   定义 MaterialRuntimeTarget。
-   定义 Schema Diagnostic。
-   明确 SchemaEditor 的协议边界。
-   明确 Plugin Core 的最小通用类型。
-   明确 Package 依赖方向。

验收：没有重复类型，没有 Designable / Runtime 内部类型泄漏。

## Phase 2：Generic Plugin Core（独立前置任务）

完成：

-   从现有 Runtime Plugin Manager 抽取通用生命周期能力。
-   建立通用插件依赖管理。
-   建立资源归属和清理机制。
-   增加单插件卸载。
-   增加依赖保护。
-   增加失败回滚和逆序销毁。

验收：独立测试通过，且不依赖 Runtime / Designer 业务模块。

## Phase 3：Runtime Plugin Host 迁移与回归

完成：

-   用 Generic Plugin Core 承载 Runtime 插件机制。
-   保持现有 Runtime 插件行为。
-   必要时提供兼容 Facade。
-   补充 Runtime 插件回归测试。

验收：现有 Runtime 插件功能不退化。

## Phase 4：Designer Core

完成：

-   Designer 实例。
-   DesignerContext。
-   MaterialRegistry。
-   SetterRegistry。
-   SchemaEditor。
-   Designer Plugin Host。
-   Diagnostics。

验收：不依赖 Designable、antd、Runtime Renderer。

## Phase 5：Designable Adapter

完成：

-   Designable 初始化。
-   Material 转换。
-   Behavior / Resource 转换。
-   TreeNode 与 Schema 映射。
-   画布事件转换。
-   Schema 同步。
-   生命周期管理。

验收：Designer Core 不感知 Designable 类型，画布操作能够同步 Schema。

## Phase 6：基础物料与 Setter

完成：

-   基础物料。
-   基础 Setter。
-   物料分类。
-   默认配置。
-   属性编辑。
-   拖入、修改、删除。
-   Schema 导入导出。

验收：能够设计基础表单。

## Phase 7：Material → Schema → Runtime 一致性闭环

完成：

-   Material Target 检查。
-   Schema 生成检查。
-   Schema 导出检查。
-   Runtime Component Registry 检查。
-   ComponentBinding / ComponentAdapter 检查。
-   PC / Mobile 实现检查。
-   Contract Tests。

验收：设计器导出的基础表单 Schema 能被 Runtime
正确解析和渲染；缺失能力会明确报错。

## Phase 8：高级扩展

高级 Setter、复杂表达式、权限、国际化、模板等作为可选扩展。

不得阻塞基础 MVP。

## Phase 9：统一切换、文档与发布验证

完成：

-   更新所有公开入口。
-   更新 Demo。
-   更新测试。
-   更新文档。
-   更新 Package 依赖和导出。
-   清理或兼容旧入口。
-   完整构建、类型检查、测试和发布验证。

验收：不存在长期双轨 Designer 实现。

------------------------------------------------------------------------

# 10. 文档质量与一致性验收

两份文档修改后，必须进行交叉检查。

## 10.1 决策一致性

逐项确认：

-   [ ] C1--C9 在两份文档中均已修正。
-   [ ] C10--C13 在两份文档中均已新增。
-   [ ] Generic Plugin Core 是独立前置任务。
-   [ ] Runtime Plugin Host 在 Designer Core 前完成迁移与回归。
-   [ ] Material → Schema → Runtime Component 有完整一致性链路。
-   [ ] SchemaEditor 不暴露 Designable TreeNode。
-   [ ] Designer Core 依赖边界一致。
-   [ ] 分阶段开发、最终统一切换。
-   [ ] Package 先逻辑分层再物理拆分。
-   [ ] React 17 / antd 4 / antd-mobile 5 约束未被改变。

## 10.2 架构方案与任务书映射

建立一张映射表：

  -------------------------------------------------------------------------------
  架构决策             架构方案章节      工程任务书 Phase  验收用例
                                         / Task            
  -------------------- ----------------- ----------------- ----------------------
  C1                   Schema Protocol   Phase 1           类型无重复
  FormSchemaDocument                                       

  C2 SchemaCompiler    Schema Pipeline   Phase 0 / 1       现状准确、无空壳实现

  C3 Designer          总体架构          Phase 4 / 5       Core 与 Adapter 隔离
  Framework                                                

  C4 Material Registry Designer Core     Phase 4 / 5       Registry
                                                           与派生工厂分离

  C5 平台诊断          Material /        Phase 5 / 7       缺失实现有诊断
                       Adapter                             

  C6 Snapshot          Runtime 边界      不纳入 Designer   状态描述准确
                                         MVP               

  C7 术语更新          全文 / Agent 规范 Phase 0 / 9       无过时核心术语

  C8 Package 边界      Package 架构      Phase 1 / 9       无空壳包

  C9 Plugin Core       插件架构          Phase 2 / 3       通用核心独立验收

  C10 一致性校验       Schema / Runtime  Phase 7           Contract Tests
                       契约                                

  C11 SchemaEditor     Designer Core     Phase 4 / 5       无 TreeNode 泄漏

  C12 统一切换         迁移策略          Phase 9           入口、Demo、测试同步

  C13 Core 依赖        依赖架构          Phase 1 / 4       依赖检查通过
  -------------------------------------------------------------------------------

## 10.3 术语一致性

全仓文档中统一：

-   Designer Framework
-   Designer Core
-   DesignerMaterialDefinition
-   MaterialRegistry
-   SetterRegistry
-   SchemaEditor
-   Designable Adapter
-   Generic Plugin Core
-   Runtime Plugin Host
-   Designer Plugin Host
-   MaterialRuntimeTarget
-   FormSchemaDocument
-   ComponentBinding
-   ComponentAdapter

如果源码命名与上述建议不同，文档应区分"目标命名"和"当前命名"，不要擅自改写源码事实。

## 10.4 文档链接检查

检查：

-   文档地图能找到两份文档。
-   两份文档相互引用正确。
-   相对路径有效。
-   不存在旧文件名导致的失效链接。
-   `AGENTS.md` 引用正确。
-   旧版本文档有明确状态。

------------------------------------------------------------------------

# 11. 执行流程与停止条件

请按以下顺序执行：

1.  输出目标文档和文档地图的定位结果。
2.  阅读两份 V2 文档和 `AGENTS.md`。
3.  检查相关源码，核对 C1--C9 的事实基础。
4.  形成当前文档问题清单。
5.  订正文档一。
6.  订正文档二。
7.  更新 `AGENTS.md`。
8.  更新文档地图。
9.  执行两份文档的交叉一致性检查。
10. 执行 Markdown 链接和术语检查。
11. 输出最终变更报告。

遇到以下情况必须暂停并报告，不得自行猜测：

-   找不到两份目标文档。
-   两份文档存在多个候选版本，无法判断哪个是当前版本。
-   源码与架构决策存在重大冲突。
-   当前 Plugin Manager 行为与预期差异过大。
-   `FormSchemaDocument` 的真实结构与既有描述不一致。
-   Package 依赖关系使目标边界无法成立。
-   文档地图规则不明确。
-   需要删除或覆盖用户已有的重要文档。

非阻塞问题可以记录为待确认项，继续处理其余文档，但必须明确标注。

------------------------------------------------------------------------

# 12. 最终交付报告格式

完成后请按以下格式汇报：

## 12.1 修改文件

列出每个修改文件的路径和修改目的。

## 12.2 C1--C13 修订结果

逐项标记：

-   已修订。
-   部分修订。
-   待确认。

每项附对应文档章节。

## 12.3 Generic Plugin Core 前置任务

说明：

-   是否已明确为独立 Phase。
-   是否先于 Designer Core。
-   Runtime Plugin Host 是否有独立迁移与回归阶段。
-   单插件卸载、依赖保护、资源清理是否有验收标准。

## 12.4 Material → Schema → Runtime 一致性

说明：

-   Material Target 是否定义。
-   Schema 生成和导出校验是否明确。
-   Runtime Binding / Adapter 检查是否明确。
-   PC / Mobile 平台能力检查是否明确。
-   Contract Tests 是否列入任务书。

## 12.5 AGENTS.md 与文档地图

说明：

-   更新了哪些规则。
-   清理了哪些过时术语。
-   文档地图如何定位两份 V2 文档。
-   是否存在失效链接。

## 12.6 验证结果

列出实际执行过的检查命令及结果。

没有执行的检查必须标记"未执行"，不得写成通过。

## 12.7 待确认事项

只列出确实无法从源码或现有决策中确定的问题。

## 12.8 明确声明

最终报告必须明确：

**本次只完成文档订正，没有实施 V2 源码改造。下一阶段应以修订后的《Form
Engine V2 Claude Code 工程改造任务书》为执行依据，按 Phase 0--9 推进。**

------------------------------------------------------------------------

# 13. Claude Code 最终执行提示

请严格按本文件执行。

优先保证两份文档之间的架构决策、任务顺序、验收标准一致，不要追求文档篇幅或
Package 数量。

本次最关键的四个结果：

1.  C1--C9 的事实性错误和架构边界修正全部写回两份 V2 文档。
2.  C10--C13 成为正式架构决策，并映射到工程任务与验收。
3.  Generic Plugin Core 被提升为独立前置工程任务，先于 Designer
    Core，并完成 Runtime Plugin Host 迁移回归。
4.  Material → Schema → Runtime Component 建立完整一致性校验和自动化
    Contract Tests。

同时必须更新 `AGENTS.md` 和文档地图。

**不要在本任务中修改业务源码。文档订正完成并通过交叉验收后，再开始下一阶段的源码改造。**
