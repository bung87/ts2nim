import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should replace generic through type predicate', done => {
  const typedef = `
  export default function createValidator<T>(): (value: unknown) => value is T;

`;
  const expected = `proc createValidator[T](): proc [T](value:T): auto
`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
