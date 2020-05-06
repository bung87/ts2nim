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
  const result = transpile(undefined,typedef)
  
  result.on("close",()=>{
    
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
`type ImageInfo* = object of RootObj
  size*:int # Image size (width/height).
  filePath*:string # Path of an image file.

`
  const result = transpile(undefined,typedef)
  
  result.on("close",()=>{
    
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done()

   })
});


