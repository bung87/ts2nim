import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle relative import ignore package', done => {
  const typedef = `
    import fs from 'fs'
    import path from 'path'
    import generateICO from './ico'
    import { ImageInfo, filterImagesBySizes } from './png'
    import Logger from './logger'
    `;
  const expected = `import ./ico
import ./png
import ./logger
`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
