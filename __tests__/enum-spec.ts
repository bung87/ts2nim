import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle enum', done => {
  const typedef = `
enum Color {Red = 1, Green, Blue}
enum Color {Red, Green, Blue}
enum Color {Red = 1, Green = 2, Blue = 4}
`;
  const expected = `type Color = enum
  Red = 1
  Green
  Blue


type Color = enum
  Red
  Green
  Blue


type Color = enum
  Red = 1
  Green = 2
  Blue = 4


`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});

test('Should handle enum with comment', done => {
  const typedef = `
  const enum CharCode {
    Null = 0,
    /**
     * The \`\\t\` character.
     */
    Tab = 9,
    /**
     * The \`\\n\` character.
     */
    LineFeed = 10,
    /**
     * The \`\\r\` character.
     */
      CarriageReturn = 13
  }
  `;
  const expected = `type CharCode = enum
  Null = 0
  Tab = 9   ## The \`\\t\` character.
  LineFeed = 10   ## The \`\\n\` character.
  CarriageReturn = 13   ## The \`\\r\` character.


`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
