import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
import * as realfs from 'fs';
import { Analyzer } from '../src/analyzer';
import * as path from 'path';

test('Should inffer type through anayzer', done => {
  const expected = `var b = 1
proc add(a:float, d:seq[any]) = 
  var c = 5
  if a == b:
    a + 1
  if not isNil(d):
    discard

var a = 1
var e
add(a,e)
`;
  const dataPath = path.join(__dirname, 'analyzer_data.ts');
  const anayzer = new Analyzer([dataPath]);
  anayzer.annalize();

  const { writer, logger } = transpile(
    dataPath,
    realfs.readFileSync(dataPath).toString(),
    undefined,
    undefined,
    anayzer.symbols
  );

  writer.once('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
