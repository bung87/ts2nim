import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should transform path.join', (done) => {
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

test('Should transform .length', (done) => {
    const typedef = 
    `stream.write(createFileHeader(pngs.length), 'binary')`
    const expected =`stream.write(createFileHeader(pngs.len),"binary")
`
      const result = transpile(undefined, typedef)
    
      result.on("close", () => {
    
        expect(fs.readFileSync(result.path).toString()).toBe(expected);
        done()
    
      })
    });


