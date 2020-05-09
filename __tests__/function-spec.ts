import { transpile } from '../src/transpiler';
import { fs } from 'memfs';

test('Should handle async function', done => {
  const typedef = `
  /**
  * Generate the PNG files.
  * @param src Path of SVG file.
  * @param dir Output destination The path of directory.
  * @param sizes Required PNG image size.
  * @param logger Logger.
  */
  export const generatePNG = async (
    src: string,
    dir: string,
    sizes: number[],
    logger: Logger
  ): Promise<ImageInfo[]> => {
    logger.log('SVG to PNG:')

    const svg = fs.readFileSync(src)
    const images: ImageInfo[] = []
    for (const size of sizes) {
      images.push(await generate(svg, size, dir, logger))
    }

    return images
  }
  `;
  const expected = `import asyncdispatch,os

proc generatePNG*(src:string,dir:string,sizes:seq[int],logger:Logger): Future[seq[ImageInfo]] {.async.} = 
  ## Generate the PNG files.
  ## @param src Path of SVG file.
  ## @param dir Output destination The path of directory.
  ## @param sizes Required PNG image size.
  ## @param logger Logger.

  logger.log("SVG to PNG:")
  var svg = readFile(src)
  var images:seq[ImageInfo] = @[]
  for size in sizes:
    images.add(await generate(svg,size,dir,logger))
  return images
`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});

test('Should handle chained function', done => {
  const typedef = `
/**
 * Filter by size to the specified image informations.
 * @param images Image file informations.
 * @param sizes  Required sizes.
 * @return Filtered image informations.
 */
export const filterImagesBySizes = (images: ImageInfo[], sizes: number[]) => {
  return images
    .filter((image) => {
      return sizes.some((size) => {
        return image.size === size
      })
    })
    .sort((a, b) => {
      return a.size - b.size
    })
}
  `;
  const expected = `import sequtils,algorithm

proc filterImagesBySizes*(images:seq[ImageInfo],sizes:seq[int]): auto = 
  ## Filter by size to the specified image informations.
  ## @param images Image file informations.
  ## @param sizes  Required sizes.
  ## @return Filtered image informations.

  images.filter(proc (image:auto): auto = 
    sizes.any(proc (size:auto): bool = 
      image.size == size
    )
  ).sorted(proc (a:auto,b:auto): int = 
    a.size - b.size
  )
`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});

test('Should handle for statement', done => {
  const typedef = `
/**
 * Convert a PNG of the byte array to the DIB (Device Independent Bitmap) format.
 * PNG in color RGBA (and more), the coordinate structure is the Top/Left to Bottom/Right.
 * DIB in color BGRA, the coordinate structure is the Bottom/Left to Top/Right.
 * @param src Target image.
 * @param width The width of the image.
 * @param height The height of the image.
 * @param bpp The bit per pixel of the image.
 * @return Converted image
 * @see https://en.wikipedia.org/wiki/BMP_file_format
 */
const convertPNGtoDIB = (
  src: Buffer,
  width: number,
  height: number,
  bpp: number
) => {
  const cols = width * bpp
  const rows = height * cols
  const rowEnd = rows - cols
  const dest = Buffer.alloc(src.length)

  for (let row = 0; row < rows; row += cols) {
    for (let col = 0; col < cols; col += bpp) {
      // RGBA: Top/Left -> Bottom/Right
      let pos = row + col
      const r = src.readUInt8(pos)
      const g = src.readUInt8(pos + 1)
      const b = src.readUInt8(pos + 2)
      const a = src.readUInt8(pos + 3)

      // BGRA: Right/Left -> Top/Right
      pos = rowEnd - row + col
      dest.writeUInt8(b, pos)
      dest.writeUInt8(g, pos + 1)
      dest.writeUInt8(r, pos + 2)
      dest.writeUInt8(a, pos + 3)
    }
  }

  return dest
}
`;
  const expected = `proc convertPNGtoDIB(src:Buffer,width:int,height:int,bpp:int): auto = 
  ## Convert a PNG of the byte array to the DIB (Device Independent Bitmap) format.
  ## PNG in color RGBA (and more), the coordinate structure is the Top/Left to Bottom/Right.
  ## DIB in color BGRA, the coordinate structure is the Bottom/Left to Top/Right.
  ## @param src Target image.
  ## @param width The width of the image.
  ## @param height The height of the image.
  ## @param bpp The bit per pixel of the image.
  ## @return Converted image
  ## @see https://en.wikipedia.org/wiki/BMP_file_format

  var cols = width * bpp
  var rows = height * cols
  var rowEnd = rows - cols
  var dest = Buffer.alloc(src.len)
  var row = 0
  while row < rows:
    var col = 0
    while col < cols:
      ## RGBA: Top/Left -> Bottom/Right
      var pos = row + col
      var r = src.readUInt8(pos)
      var g = src.readUInt8(pos + 1)
      var b = src.readUInt8(pos + 2)
      var a = src.readUInt8(pos + 3)
      ## BGRA: Right/Left -> Top/Right
      pos = rowEnd - row + col
      dest.writeUInt8(b,pos)
      dest.writeUInt8(g,pos + 1)
      dest.writeUInt8(r,pos + 2)
      dest.writeUInt8(a,pos + 3)
  return dest
`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});

test('Should handle TSFunctionType', done => {
  const typedef = `const patchOuter: <T>(
    node: Element | DocumentFragment,
    template: (a: T | undefined) => void,
    data?: T | undefined
  ) => Node | null = createPatchOuter();`;
  const expected = `import options

var patchOuter:proc [T](node:,template:proc (a:T): auto ,data:Option[T]): auto  = createPatchOuter()
`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});

test('Should handle rest and optional param', done => {
  const typedef = `function elementVoid(
  nameOrCtor: NameOrCtorDef,
  key?: Key,
  // Ideally we could tag statics and varArgs as an array where every odd
  // element is a string and every even element is any, but this is hard.
  statics?: Statics,
  ...varArgs: Array<any>
) {
  elementOpen.apply(null, arguments as any);
  return elementClose(nameOrCtor);
}`;
  const expected = `import options

proc elementVoid(nameOrCtor:NameOrCtorDef,key:Option[Key],statics:Option[Statics],varArgs:openArray[any]): auto = 

  elementOpen.apply(nil,arguments)
  elementClose(nameOrCtor)
`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
