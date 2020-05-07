import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle ExportNamedDeclaration', (done) => {
  const typedef = `
  export type ImageInfo = {
    /** Image size (width/height). */
    size: number
    /** Path of an image file. */
    filePath: string
  }
  `
  const expected =
    `type ImageInfo* = object of RootObj
  size*:int # Image size (width/height).
  filePath*:string # Path of an image file.

`
  const result = transpile(undefined, typedef)

  result.on("close", () => {

    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done()

  })
});

test('Should handle async function', (done) => {
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
  `
  const expected =
    `import asyncdispatch,os

proc generatePNG*(src:string,dir:string,sizes:seq[int],logger:Logger): Future[seq[ImageInfo]] {.async.} = 
  # Generate the PNG files.
  # @param src Path of SVG file.
  # @param dir Output destination The path of directory.
  # @param sizes Required PNG image size.
  # @param logger Logger.

  logger.log("SVG to PNG:")
  var svg = readFile(src)
  var images:seq[ImageInfo] = @[]
  for size in sizes:
    images.add(await generate(svg,size,dir,logger))
  return images
`
  const result = transpile(undefined, typedef)

  result.on("close", () => {

    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done()

  })
});

test('Should handle chained function', (done) => {
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
  `
  const expected = `import sequtils,algorithm

proc filterImagesBySizes*(images:seq[ImageInfo],sizes:seq[int]): auto = 
  # Filter by size to the specified image informations.
  # @param images Image file informations.
  # @param sizes  Required sizes.
  # @return Filtered image informations.

  images.filter(proc (image:auto): auto = sizes.any(proc (size:auto): bool = image.size == size)).sorted(proc (a:auto,b:auto): int = a.size - b.size)
`
  const result = transpile(undefined, typedef)

  result.on("close", () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done()

  })
});


