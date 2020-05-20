import * as indentString from 'indent-string';
const indentSpaces = 2;
export function arraysEqual(a: any[], b: any[]) {
  if (a === b) {
    return true;
  }
  if (a == null || b == null) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export function getLine(value: string, indentLevel = 0): string {
  if (value.length === 0) {
    return '';
  }
  // @ts-ignore
  return indentString(value, indentSpaces * indentLevel) + '\n';
}
export function indented(indentLevel: number) {
  // @ts-ignore
  return (value: string) => indentString(value, indentSpaces * indentLevel);
}

export function getIndented(value: string, indentLevel: number) {
  // @ts-ignore
  return indentString(value, indentSpaces * indentLevel);
}

export function skip(arr: any[], index: number): any[] {
  const a = [];
  let i = 0;
  while (i < index) {
    a.push(arr[i]);
    i++;
  }
  return a;
}

/**
 * add backslshes to double quoted string
 */
export function addslashes(str: string) {
  return (
    str
      .replace(/\\/g, '\\\\')
      .replace(/\u0008/g, '\\b')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\f/g, '\\f')
      .replace(/\r/g, '\\r')
      // replace(/'/g, '\\\'').
      .replace(/"/g, '\\"')
  );
}
