import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should regex', done => {
  const typedef = `
  const _schemePattern = /^\\w[\\w\\d+.-]*$/;
  const _singleSlashStart = /^\\//;
  const _doubleSlashStart = /^\\/\\//;

`;
  const expected = `import regex

const schemePattern = re"^\\w[\\w\\d+.-]*$"

const singleSlashStart = re"^\\/"

const doubleSlashStart = re"^\\/\\/"

`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
