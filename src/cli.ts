#!/usr/bin/env node
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
  .option('numberAs', {
    alias: 'n',
    description: 'number as float or int?',
    type: 'string',
    default: 'float',
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
    '*.ts',
    { root: src, matchBase: true, ignore: ['node_modules/'] },
    (err: Error | null, files: string[]) => {
      files.forEach((file: string) => {
        const ext = path.extname(file);
        const relativePath = path.relative(src, file);

        const relativeDir = path.dirname(relativePath);
        const basename = path.basename(file, ext);
        const writePath = path.join(dest, relativeDir, basename + '.nim');
        const code = realfs.readFileSync(file).toString();
        const { writer } = transpile(writePath, code, {
          numberAs: (argv.numberAs as unknown) as any,
          isProject: true,
        });
        writer.on('close', () => {
          console.log(writer.path);
          const content = memfs.readFileSync(writer.path).toString();
          if (!realfs.existsSync(path.dirname(writer.path))) {
            mkdirp.sync(path.dirname(writer.path));
          }
          realfs.writeFileSync(writer.path, content);
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
  const code = realfs.readFileSync(src).toString();
  const { writer } = transpile(writePath, code, {
    numberAs: (argv.numberAs as unknown) as any,
    isProject: false,
  });
  writer.on('close', () => {
    console.log(writer.path);
    const content = memfs.readFileSync(writer.path).toString();
    if (!realfs.existsSync(path.dirname(writer.path))) {
      mkdirp.sync(path.dirname(writer.path));
    }
    realfs.writeFileSync(writer.path, content);
  });
}
