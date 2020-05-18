// http://rosettacode.org/wiki/Loops/Do-while#Nim
/**
 * template doWhile(a, b: untyped): untyped =
 *  b
 *  while a:
 *    b
 * var val = 1
 * doWhile val mod 6 != 0:
 *  val += 1
 *  echo val
 */
export const doWhile = `template doWhile(a, b: untyped): untyped =
  b
  while a:
    b
`;

export const brideHeader = `when not defined(js) and not defined(Nimdoc):
  {.error: "This module only works on the JavaScript platform".}


`;
