import { transpile } from '../src/transpiler';
import { fs } from 'memfs';

test('Should handle if,else if,else', done => {
  const typedef = `function transCommonMemberExpression(
  obj: string,
  mem: string,
  args: any[] = []
  ): string {
  let result = '';
  let func = '';
    if (obj === 'fs' && mem === 'readFileSync') {
    func = \`readFile \${mem\}\`;
    nimModules().add('os');
  } else if (obj === 'path' && mem === 'join') {
    nimModules().add('os');
  } else{}
  
  return result;
  }`;
  const expected = `import strformat

proc transCommonMemberExpression(obj:string,mem:string,args:seq[any] = newSeq[any]()): string = 
  var result = ""
  var func = ""
  if obj == "fs" and mem == "readFileSync":
    func = fmt"readFile {mem}"
    nimModules().add("os")
  elif obj == "path" and mem == "join":
    nimModules().add("os")
  else:
    discard
  return result

`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
