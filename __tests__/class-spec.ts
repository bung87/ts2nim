import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle ExportNamedDeclaration', done => {
  const typedef = `class Transpiler {
    noAccMember:string
    private privateMember:string
    constructor(public ast: Program, protected writer: IWriteStream,noMember:boolean) {
      modules = new Set();
      helpers = new Set();
    }
    methodA(){}
    }`;
  const expected = `type Transpiler* = object of RootObj
  ast*:Program
  writer:IWriteStream
  noAccMember*:string
  privateMember:string


proc newTranspiler*(ast:Program,writer:IWriteStream,noMember:bool): Transpiler = 
  self.ast = ast
  self.writer = writer
  modules = Set()
  helpers = Set()

proc methodA*(self:Transpiler): auto = discard

`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
  expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
