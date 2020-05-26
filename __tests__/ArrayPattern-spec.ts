import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle ArrayPatten assignment from ArrayExpression', done => {
  const typedef = `

    export namespace Random {
    
      /** Randomly shuffles the elements in an array a. */
      export function shuffle<T = any>(a: T[]): T[] {
        a = a.slice(0); // create copy
        for (let i = a.length - 1; i > 0; --i) {
          let j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }
      }`;
  const expected = `proc shuffle[T](a:seq[T]): seq[T] = 
  ## Randomly shuffles the elements in an array a.
  a = a.slice(0)
  var i = a.len - 1
  while i > 0:
    var j = Math.floor(Math.random() * i + 1)
    a[i] = a[j]
    a[j] = a[i]

  return a

`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
