import { transpile } from '../src/transpiler';
import { fs } from 'memfs';

test('Should handle inline comment', done => {
  const typedef = `
/**
 * Create the Icon entry.
 * @param png PNG image.
 * @param offset The offset of directory data from the beginning of the ICO/CUR file
 * @return Directory data.
 *
 * @see https://msdn.microsoft.com/en-us/library/ms997538.aspx
 */
const createDirectory = (png: PNG, offset: number) => {
  const b = Buffer.alloc(ICO_DIRECTORY_SIZE)
  const size = png.data.length + BITMAPINFOHEADER_SIZE
  const width = 256 <= png.width ? 0 : png.width
  const height = 256 <= png.height ? 0 : png.height
  const bpp = BPP_ALPHA * 8

  b.writeUInt8(width, 0) // 1 BYTE  Image width
  b.writeUInt8(height, 1) // 1 BYTE  Image height
  b.writeUInt8(0, 2) // 1 BYTE  Colors
  b.writeUInt8(0, 3) // 1 BYTE  Reserved
  b.writeUInt16LE(1, 4) // 2 WORD  Color planes
  b.writeUInt16LE(bpp, 6) // 2 WORD  Bit per pixel
  b.writeUInt32LE(size, 8) // 4 DWORD Bitmap (DIB) size
  b.writeUInt32LE(offset, 12) // 4 DWORD Offset

  return b
}
`;
  const expected = `proc createDirectory(png:PNG,offset:int): auto = 
  ## Create the Icon entry.
  ## @param png PNG image.
  ## @param offset The offset of directory data from the beginning of the ICO/CUR file
  ## @return Directory data.
  ##
  ## @see https://msdn.microsoft.com/en-us/library/ms997538.aspx

  var b = Buffer.alloc(ICO_DIRECTORY_SIZE)
  var size = png.data.len + BITMAPINFOHEADER_SIZE
  var width = if 256 <= png.width: 0 else: png.width
  var height = if 256 <= png.height: 0 else: png.height
  var bpp = BPP_ALPHA * 8
  b.writeUInt8(width,0)
  ## 1 BYTE  Image width
  b.writeUInt8(height,1)
  ## 1 BYTE  Image height
  b.writeUInt8(0,2)
  ## 1 BYTE  Colors
  b.writeUInt8(0,3)
  ## 1 BYTE  Reserved
  b.writeUInt16LE(1,4)
  ## 2 WORD  Color planes
  b.writeUInt16LE(bpp,6)
  ## 2 WORD  Bit per pixel
  b.writeUInt32LE(size,8)
  ## 4 DWORD Bitmap (DIB) size
  b.writeUInt32LE(offset,12)
  return b
`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
