import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle three operands', done => {
  const typedef = `const height = 256 <= png.height ? 0 : png.height`;
  const expected = `var height = if 256 <= png.height: 0 else: png.height
`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
