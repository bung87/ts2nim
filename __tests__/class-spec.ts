import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle class', done => {
  const typedef = `class Transpiler {
    noAccMember:string
    private privateMember:string
    constructor(public ast: Program, protected writer: IWriteStream,noMember:boolean) {
      modules = new Set();
      helpers = new Set();
    }
    methodA(){}
    }`;
  const expected = `type Transpiler* = ref object of RootObj
  ast*:Program
  writer:IWriteStream
  noAccMember*:string
  privateMember:string


proc newTranspiler*(ast:Program, writer:IWriteStream, noMember:bool): Transpiler = 
  self.ast = ast
  self.writer = writer
  modules = Set()
  helpers = Set()

proc methodA*(self:Transpiler): auto = discard

`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});

test('Should handle static method', done => {
  const typedef = `export class BufWriter extends AbstractBufBase implements Writer {
    /** return new BufWriter unless writer is BufWriter */
    static create(writer: Writer, size: number = DEFAULT_BUF_SIZE): BufWriter {
      return writer instanceof BufWriter ? writer : new BufWriter(writer, size);
    }
  }`;
  const expected = `type BufWriter* = ref object of AbstractBufBase


proc create*(self:typedesc[BufWriter], writer:Writer, size:float = DEFAULT_BUF_SIZE): BufWriter = 
  ## return new BufWriter unless writer is BufWriter
  return if writer instanceof BufWriter: writer else: BufWriter(writer,size)

`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
