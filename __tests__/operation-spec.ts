import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle three operands', done => {
  const typedef = `const height = 256 <= png.height ? 0 : png.height`;
  const expected = `var height = if 256 <= png.height: 0 else: png.height
`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
