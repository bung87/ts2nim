import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle enum', done => {
  const typedef = `
enum Color {Red = 1, Green, Blue}
enum Color {Red, Green, Blue}
enum Color {Red = 1, Green = 2, Blue = 4}
`;
  const expected = `type Color = enum
  Red = 1, Green, Blue

type Color = enum
  Red, Green, Blue

type Color = enum
  Red = 1, Green = 2, Blue = 4

`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
