import * as yargs from 'yargs';
import * as glob from 'glob';
import * as realfs from 'fs';
import * as path from 'path';
import { fs as memfs, vol } from 'memfs';
import { ufs } from 'unionfs';
import { transpile } from './transpiler';
const argv = yargs
  .option('src', {
    alias: 'src',
    description: 'src',
    type: 'string',
  })
  .option('dest', {
    alias: 'o',
    description: 'dest',
    type: 'string',
  })
  .help()
  .alias('help', 'h').argv;
const src = argv.src ? path.resolve(argv.src) : process.cwd();
const dest = argv.dest ? path.resolve(argv.dest) : process.cwd();

glob(
  src + '/!(node_modules)/**/*.ts',
  {},
  (err: Error | null, files: string[]) => {
    files.forEach((file: string) => {
      const ext = path.extname(file);
      const relativePath = path.relative(src, file);

      const relativeDir = path.dirname(relativePath);
      const basename = path.basename(file, ext);
      const writePath = path.join(dest, relativeDir, basename + '.nim');

      const result = transpile(writePath, realfs.readFileSync(file).toString());
      result.on('close', () => {
        console.log(writePath);
        const content = memfs.readFileSync(result.path).toString();
        realfs.writeFileSync(writePath, content);
      });
    });
  }
);
