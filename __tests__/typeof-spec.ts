import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should ignore typeof', done => {
  const typedef = `
  export type URI = typeof URI

`;
  const expected = '';
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
