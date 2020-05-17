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
  const expected = `type ImageInfo* = ref object of RootObj
  size*:float ##  ## Image size (width/height).
  filePath*:string ##  ## Path of an image file.

`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
