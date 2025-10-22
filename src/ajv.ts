/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import type { JSONSchemaType, ValidateFunction } from 'ajv';
import AjvInstance from 'ajv';

const draft7Buffer = await readFile('./node_modules/ajv/dist/refs/json-schema-draft-07.json', 'utf-8');
const draft7MetaSchema = JSON.parse(draft7Buffer);

declare module 'ajv' {
  interface Ajv {
    getSchema<T = unknown>(keyRef: string): ValidateFunction<T>;
  }
}

const ajv = new AjvInstance.default({
  allErrors: true,
  removeAdditional: true,
  meta: false,
  loadSchema: async (uri: string) => {
    const root = resolve(fileURLToPath(import.meta.url), '../..');
    const path = join(root, 'json-schema', uri);
    const buffer = await readFile(path, 'utf-8');
    return JSON.parse(buffer);
  },
});

ajv.addMetaSchema(draft7MetaSchema, 'https://json-schema.org/draft-07/schema#');
ajv.addKeyword('x-meta');
ajv.addKeyword('x-group');
ajv.addKeyword('x-in');
ajv.addKeyword('x-example');

type AjvInstance = AjvInstance.Ajv
export type { JSONSchemaType, ValidateFunction, AjvInstance };
export { ajv };
