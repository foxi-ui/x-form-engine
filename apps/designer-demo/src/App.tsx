import { SettingsForm } from '@designable/react-settings-form';
import {
  ComponentTreeWidget,
  CompositePanel,
  Designer,
  DesignerToolsWidget,
  HistoryWidget,
  OutlineTreeWidget,
  ResourceWidget,
  SettingsPanel,
  StudioPanel,
  ToolbarPanel,
  ViewPanel,
  ViewportPanel,
  ViewToolsWidget,
  Workbench,
  WorkspacePanel,
} from '@designable/react';
import { FormItem, Input, Switch } from '@formily/antd';
import { basicComponents, basicDecorators } from '@x-form-engine/components';
import { createFormEngine } from '@x-form-engine/core';
import {
  createDesignerMaterials,
  createEngineDesigner,
  DesignerPreview,
  exportSchemaDocument,
  importSchemaDocument,
  OptionsSetter,
} from '@x-form-engine/designer';
import { Button, message, Space } from 'antd';
import { useState } from 'react';
import type { FC, ReactNode } from 'react';

/** `CompositePanel.Item` 在 d.ts 中是可选属性，运行时必然存在。 */
const CompositePanelItem = CompositePanel.Item as FC<{
  title?: ReactNode;
  icon?: ReactNode;
}>;

const SCHEMA_ID = 'designer-demo';
const STORAGE_KEY = 'x-form-engine:designer-demo:schema';

const materials = createDesignerMaterials(basicComponents);
const engine = createEngineDesigner(materials);
const previewEngine = createFormEngine({
  components: basicComponents,
  decorators: basicDecorators,
});

/** SettingsForm 通过 Formily 组件 map 解析 propsSchema 里的 `x-component` 字符串。 */
const settingsComponents = {
  OptionsSetter,
  FormItem,
  Input,
  'Input.TextArea': Input.TextArea,
  Switch,
} as unknown as Record<string, FC<any>>;

function readStoredVersion(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return 0;
    }
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === 'number' && Number.isFinite(parsed.version)
      ? parsed.version
      : 0;
  } catch {
    return 0;
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type Mode = 'design' | 'preview';

export default function App() {
  const [mode, setMode] = useState<Mode>('design');
  const [schemaVersion, setSchemaVersion] = useState(0);
  const [previewSchema, setPreviewSchema] = useState<Record<string, unknown> | null>(null);

  const handleSave = () => {
    try {
      const doc = exportSchemaDocument(engine.getCurrentTree(), {
        schemaId: SCHEMA_ID,
        previousVersion: Math.max(schemaVersion, readStoredVersion()),
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      setSchemaVersion(doc.version);
      message.success(`已保存 v${doc.version}`);
    } catch (error) {
      message.error(`保存失败：${toErrorMessage(error)}`);
    }
  };

  const handleLoad = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        message.warning('没有已保存的 Schema');
        return;
      }
      const { tree, doc } = importSchemaDocument(JSON.parse(raw));
      engine.setCurrentTree(tree);
      setSchemaVersion(doc.version);
      message.success(`已加载 v${doc.version}`);
    } catch (error) {
      message.error(`加载失败：${toErrorMessage(error)}`);
    }
  };

  const handlePreview = () => {
    try {
      const doc = exportSchemaDocument(engine.getCurrentTree(), {
        schemaId: `${SCHEMA_ID}:preview`,
      });
      setPreviewSchema(doc.schema);
      setMode('preview');
    } catch (error) {
      message.error(`预览失败：${toErrorMessage(error)}`);
    }
  };

  return (
    <Designer engine={engine}>
      <Workbench>
        <StudioPanel>
          <CompositePanel>
            <CompositePanelItem title="组件" icon="ComponentSource">
              <ResourceWidget title="组件" sources={Object.values(materials)} />
            </CompositePanelItem>
            <CompositePanelItem title="组件树" icon="OutlineSource">
              <OutlineTreeWidget />
            </CompositePanelItem>
            <CompositePanelItem title="历史" icon="HistorySource">
              <HistoryWidget />
            </CompositePanelItem>
          </CompositePanel>
          <WorkspacePanel>
            <ToolbarPanel>
              <Space size={4}>
                <Button onClick={handleSave}>保存</Button>
                <Button onClick={handleLoad}>加载</Button>
                <Button
                  type={mode === 'design' ? 'primary' : 'default'}
                  onClick={() => setMode('design')}
                >
                  设计
                </Button>
                <Button type={mode === 'preview' ? 'primary' : 'default'} onClick={handlePreview}>
                  预览
                </Button>
              </Space>
              <Space size={4}>
                <DesignerToolsWidget />
                <ViewToolsWidget use={['DESIGNABLE']} />
              </Space>
            </ToolbarPanel>
            <ViewportPanel>
              {mode === 'design' ? (
                <ViewPanel type="DESIGNABLE">
                  {() => <ComponentTreeWidget components={materials} />}
                </ViewPanel>
              ) : previewSchema ? (
                <DesignerPreview engine={previewEngine} schema={previewSchema} />
              ) : null}
            </ViewportPanel>
          </WorkspacePanel>
          <SettingsPanel title="属性">
            <SettingsForm components={settingsComponents} uploadAction="" />
          </SettingsPanel>
        </StudioPanel>
      </Workbench>
    </Designer>
  );
}
