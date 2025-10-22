import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, access } from 'node:fs/promises';
import type {
  Declarated,
  Implementation,
  ProjectFile,
  Project,
} from './interfaces/index.js';
import { throwErr } from './utils.js';
import { ajv } from './ajv.js';

const root = process.cwd();
const libdir = resolve(fileURLToPath(import.meta.url), '../..');
const file = JSON.parse(await readFile(join(root, '.dnmp'), 'utf-8')) as ProjectFile;
const protocolDir = join(process.cwd(), file.dir?.protocol ?? '');
const contractsDir = join(process.cwd(), file.dir?.contracts ?? 'contracts');

const validate = ajv.compile({
  type: 'object',
  properties: {
    dir: {
      type: 'object',
      properties: {
        protocol: { type: 'string' },
        contracts: { type: 'string' },
      },
      required: ['protocol', 'contracts'],
    },
    adapters: {
      type: 'array',
      items: { type: 'string' },
    },
    meta: {
      type: 'object',
      additionalProperties: true,
    },
  },
  required: ['dir', 'adapters', 'meta'],
  additionalProperties: true,
});

if (!validate(file)) {
  throwErr("invalid '.dnmp' file", validate.errors);
}

let ext = 'js';

try {
  await access(join(protocolDir, 'protocol.ts'));
  ext = 'ts';
} catch {
  //
}

const [
  protocolBuffer,
  implementationModule,
] = await Promise.all([
  readFile(join(protocolDir, 'protocol.json'), 'utf-8'),
  import(join(protocolDir, `protocol.${ext}`)),
]);

if (
  implementationModule.default == null
  || typeof implementationModule.default !== 'function'
) {
  throwErr(`invalid implementation in 'protocol.${ext}'`);
}

export const protocol = JSON.parse(protocolBuffer) as Declarated.Protocol;
export const implementation = implementationModule.default as Implementation;
export const project: Project = {
  ext: ext as string,
  dir: {
    protocol: protocolDir,
    contracts: contractsDir,
    lib: libdir,
  },
  adapters: file.adapters,
  meta: file.meta ?? {},
};
