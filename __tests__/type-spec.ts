import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle ExportNamedDeclaration', done => {
  const typedef = `
  export type ImageInfo = {
    /** Image size (width/height). */
    size: number
    /** Path of an image file. */
    filePath: string
  }
  `;
  const expected = `type ImageInfo* = object of RootObj
  size*:int ## Image size (width/height).
  filePath*:string ## Path of an image file.

`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
