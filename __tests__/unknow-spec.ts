import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle one unknow type param', done => {
  const typedef = `
  function applyAttr(el: Element, name: string, value: unknown){}

`;
  const expected = `proc applyAttr[V](el:Element,name:string,value:V): auto = discard

`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
