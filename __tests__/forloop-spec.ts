import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle for of', done => {
  const typedef = `
    export function eulerPhi(x: number) {
        if (x <= 0) throw Error('Number should be greater than zero');
      
        let n = x;
        for (const p of primeFactors(x)) n *= (p - 1) / p;
        return n;
      }`;
  const expected = `proc eulerPhi(x:float): auto = 
  if x <= 0:
    raise Exception("Number should be greater than zero")
  var n = x
  for p in primeFactors(x).mitems:
    n *= p - 1 / p
  return n

`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
