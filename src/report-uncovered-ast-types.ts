import * as realfs from 'fs';
import * as path from 'path';
import * as parser from '@typescript-eslint/typescript-estree';
import * as process from 'process';
const dataPath = path.join(__dirname, 'transpiler.ts');
const source = realfs.readFileSync(dataPath).toString();
for (const typ in parser.AST_NODE_TYPES) {
  if (!source.includes(typ)) {
    process.stdout.write(`\x1b[32m${typ}\n\x1b[0m`);
  }
}
