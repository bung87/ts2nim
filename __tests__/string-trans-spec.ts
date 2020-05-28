import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should transform basic string methods', done => {
  const typedef = `
  authority.substr(0, idx)
  authority.substr(idx)
  uri.path.charCodeAt(1)
  path.substring(2);
  authority = path.substring(2, idx);
  String.fromCharCode(2333)
`;
  const expected = `import unicode

runeSubStr(0,idx)
runeSubStr(idx)
ord(uri.path[1])
runeSubStr(2)
authority = path.runeSubStr(2,idx - 2)
"\\u2333"
`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
