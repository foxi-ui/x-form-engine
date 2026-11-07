export const ENGINE_SCHEMA_VERSION = '1.0.0';

export interface FormSchemaDocument {
  schemaId: string;
  version: number;
  engineSchemaVersion: string;
  formilyVersion?: string;
  schema: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
