import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle param left AssignmentPattern right ObjectExpression', done => {
  const typedef = `
  declare module "fs" {
    async function move(
        src: string,
        dest: string,
        { overwrite = false }: MoveOptions = {}
      ): Promise<void> ;
}

`;
  const expected = `import asyncdispatch

proc move(src:string,dest:string,moveOptions:MoveOptions = newMoveOptions(overwrite = false)): Future[void] {.async.} 
`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
