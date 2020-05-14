import * as yargs from 'yargs';
// @ts-ignore
import * as glob from 'glob';
import * as realfs from 'fs';
import * as path from 'path';
import { fs as memfs } from 'memfs';
import { transpile } from './transpiler';
import * as mkdirp from 'mkdirp';
const argv = yargs
  .option('src', {
    alias: 'i',
    description: 'input file or source dir',
    type: 'string',
  })
  .option('dest', {
    alias: 'o',
    description: 'dest file or dest dir',
    type: 'string',
  })
  .help()
  .alias('help', 'h').argv;
const src = argv.src ? path.resolve(argv.src) : process.cwd();
const dest = argv.dest ? path.resolve(argv.dest) : process.cwd();
if (realfs.lstatSync(src).isDirectory()) {
  // @ts-ignore
  glob(
    src + '!(node_modules)**/*.ts',
    {},
    (err: Error | null, files: string[]) => {
      files.forEach((file: string) => {
        const ext = path.extname(file);
        const relativePath = path.relative(src, file);

        const relativeDir = path.dirname(relativePath);
        const basename = path.basename(file, ext);
        const writePath = path.join(dest, relativeDir, basename + '.nim');

        const result = transpile(
          writePath,
          realfs.readFileSync(file).toString()
        );
        result.on('close', () => {
          console.log(result.path);
          const content = memfs.readFileSync(result.path).toString();
          if (!realfs.existsSync(path.dirname(result.path))) {
            mkdirp.sync(path.dirname(result.path));
          }
          realfs.writeFileSync(result.path, content);
        });
      });
    }
  );
} else {
  let writePath: string;
  const ext = path.extname(src);
  const basename = path.basename(src, ext);
  if (dest.endsWith('.nim')) {
    writePath = dest;
  } else {
    writePath = path.join(dest, basename + '.nim');
  }
  const result = transpile(writePath, realfs.readFileSync(src).toString());
  result.on('close', () => {
    console.log(result.path);
    const content = memfs.readFileSync(result.path).toString();
    if (!realfs.existsSync(path.dirname(result.path))) {
      mkdirp.sync(path.dirname(result.path));
    }
    realfs.writeFileSync(result.path, content);
  });
}
