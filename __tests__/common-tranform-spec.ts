import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should transform path.join', done => {
  const typedef = `const dest = path.join(dir, opt.name + FILE_EXTENSION)`;
  const expected = `import os

var dest = dir / opt.name & FILE_EXTENSION
`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});

test('Should transform .length', done => {
  const typedef = `stream.write(createFileHeader(pngs.length), 'binary')`;
  const expected = `stream.write(createFileHeader(pngs.len),"binary")
`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});

test('Should transform raise', done => {
  const typedef = `throw new Error('There was no PNG file matching the specified size.')`;
  const expected = `raise newException(Exception,"There was no PNG file matching the specified size.")
`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
