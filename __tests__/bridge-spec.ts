import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle .d.ts', done => {
  const typedef = `
    interface Console {
         Console: NodeJS.ConsoleConstructor;
       
        assert(value: any, message?: string, ...optionalParams: any[]): void;
    }
    declare var console: Console;
    `;
  const expected = `when not defined(js) and not defined(Nimdoc):
  {.error: "This module only works on the JavaScript platform".}


type Console* = ref object of RootObj
  ## Console*:NodeJS.ConsoleConstructor


proc assert*(self:Console){.importcpp,varargs.}

var console* {.importc, nodecl.}:Console
`;
  const { writer } = transpile('global.d.ts', typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
