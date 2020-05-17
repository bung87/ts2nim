import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle one unknown type param', done => {
  const typedef = `
  function applyAttr(el: Element, name: string, value: unknown){}

`;
  const expected = `proc applyAttr[V](el:Element,name:string,value:V): auto = discard

`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
