import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle tuple', done => {
  const typedef = `
// Declare a tuple type
let x: [string, number];
// Initialize it
x = ['hello', 10]; // OK
`;
  const expected = `## Declare a tuple type
var x:(string,float)
## Initialize it
x = ("hello",10)
`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
