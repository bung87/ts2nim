import indentString from 'indent-string';
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

  return indentString(value, indentSpaces * indentLevel) + '\n';
}

export function getIndented(value: string, indentLevel: number) {
  return indentString(value, indentSpaces * indentLevel);
}
