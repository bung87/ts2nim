import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle ExportNamedDeclaration', (done) => {
const typedef = 
`const dest = path.join(dir, opt.name + FILE_EXTENSION)`
const expected =`import os

var dest = dir / opt.name & FILE_EXTENSION
`
  const result = transpile(undefined, typedef)

  result.on("close", () => {

    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done()

  })
});