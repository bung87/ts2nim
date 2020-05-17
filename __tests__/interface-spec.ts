import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle interface', done => {
  const typedef = `
  interface SquareConfig {
    color?: string;
    width?: number;
  }
  `;
  const expected = `type SquareConfig* = ref object of RootObj
  color*:string
  width*:float


`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
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
  const expected = `type SquareConfig* = ref object of RootObj
  color*:string
  width*:float


`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
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
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
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
  const expected = `type ClockInterface* = ref object of RootObj
  currentTime*:Date


proc setTime*(self:ClockInterface,d:Date): auto 

`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});

test('Should handle interface with new factor', done => {
  const typedef = `
    interface ClockConstructor {
        new (hour: number, minute: number);
      }
    `;
  const expected = `type ClockConstructor* = proc (hour:float,minute:float): auto 


`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});

test('Should handle class implements interface ', done => {
  const typedef = `
    class Clock implements ClockConstructor {
        currentTime: Date;
        constructor(h: number, m: number) { }
      }
    `;
  const expected = `type Clock* = ref object of RootObj
  currentTime*:Date


proc newClock*(h:float,m:float): Clock = discard

`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
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
  const expected = `type Square* = ref object of Shape
  sideLength*:float


type Square* = ref object of Shape,PenStroke
  sideLength*:float


`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
