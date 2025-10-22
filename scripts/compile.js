import { exec as execCB } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execCB);

await Promise.all([
  exec('quicktype -s schema ./json-schema/contract.json -o ./src/interfaces/contract.ts --just-types --top-level=Contract'),
  exec('quicktype -s schema ./json-schema/protocol.json -o ./src/interfaces/declarated.ts --just-types --top-level=Protocol'),
  exec('quicktype -s schema ./json-schema/implemented.json -o ./src/interfaces/implemented.ts --just-types --top-level=Protocol'),
]);
