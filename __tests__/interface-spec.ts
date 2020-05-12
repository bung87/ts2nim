import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle interface', done => {
  const typedef = `
  interface SquareConfig {
    color?: string;
    width?: number;
  }
  `;
  const expected = `type SquareConfig* = object of RootObj
  color*:string
  width*:int


`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});

test('Should handle interface with index signature', done => {
    const typedef = `
    interface SquareConfig {
        color?: string;
        width?: number;
        [propName: string]: any;
      }
    `;
const expected = `type SquareConfig* = object of RootObj
  color*:string
  width*:int


`;
    const result = transpile(undefined, typedef);
  
    result.on('close', () => {
      expect(fs.readFileSync(result.path).toString()).toBe(expected);
      done();
    });
  });

  test('Should handle function interface', done => {
    const typedef = `
    interface SearchFunc {
        (source: string, subString: string): boolean;
      }
    `;
const expected = `type SearchFunc* = proc (source:string,subString:string): bool 

`;
    const result = transpile(undefined, typedef);
  
    result.on('close', () => {
      expect(fs.readFileSync(result.path).toString()).toBe(expected);
      done();
    });
  });
  test('Should handle  interface with prop and method', done => {
    const typedef = `
    interface ClockInterface {
        currentTime: Date;
        setTime(d: Date);
      }
    `;
const expected = `type ClockInterface* = object of RootObj
  currentTime*:Date


proc setTime*(self:ClockInterface,d:Date): auto 

`;
    const result = transpile(undefined, typedef);
  
    result.on('close', () => {
      expect(fs.readFileSync(result.path).toString()).toBe(expected);
      done();
    });
  });


//   test('Should handle interface with new factor', done => {
//     const typedef = `
//     interface ClockConstructor {
//         new (hour: number, minute: number);
//       }
//     `;
// const expected = `proc newClockConstructor*(hour:int,minute:int): ClockConstructor


// `;
//     const result = transpile(undefined, typedef);
  
//     result.on('close', () => {
//       expect(fs.readFileSync(result.path).toString()).toBe(expected);
//       done();
//     });
//   });

  test('Should handle class implements interface ', done => {
    const typedef = `
    class Clock implements ClockConstructor {
        currentTime: Date;
        constructor(h: number, m: number) { }
      }
    `;
const expected = `type Clock* = object of RootObj

  currentTime*:Date


proc newClock*(h:int,m:int): Clock = discard

`;
    const result = transpile(undefined, typedef);
  
    result.on('close', () => {
      expect(fs.readFileSync(result.path).toString()).toBe(expected);
      done();
    });
  });

  test('Should handle interface extends', done => {
    const typedef = `
    interface Square extends Shape {
        sideLength: number;
      }
      interface Square extends Shape, PenStroke {
        sideLength: number;
      }
    `;
const expected = `type Square* = object of 
  sideLength*:int


type Square* = object of 
  sideLength*:int


`;
    const result = transpile(undefined, typedef);
  
    result.on('close', () => {
      expect(fs.readFileSync(result.path).toString()).toBe(expected);
      done();
    });
  });