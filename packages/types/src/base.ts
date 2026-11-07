export type Platform = 'pc' | 'mobile';

export type RenderMode = 'edit' | 'preview' | 'readonly';

export type Primitive = string | number | boolean | null;

export type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = Record<string, JsonValue>;

export type FieldPath = string;

export type ComponentName = string;

export type PluginName = string;
