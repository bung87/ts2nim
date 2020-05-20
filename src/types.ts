// https://github.com/estree/estree/blob/master/es5.md

export const primitiveTypes = [
  'number',
  'bigInt', // TODO: Check if this fits assertBuiltinType
  'string',
  'boolean',
  // "null",
  // "object",
  // "any",
  // "undefined",
  // "unknown",
];

export const BinaryOperators = [
  '==',
  '!=',
  '===',
  '!==',
  '<',
  '<=',
  '>',
  '>=',
  '<<',
  '>>',
  '>>>',
  '+',
  '-',
  '*',
  '/',
  '%',
  '|',
  '^',
  '&',
  'in',
  'instanceof',
];
export const BinaryOperatorsReturnsBoolean = [
  '==',
  '!=',
  '===',
  '!==',
  '<',
  '<=',
  '>',
  '>=',
  '|',
  '^',
  '&',
  'in',
  'instanceof',
];
export const UnaryOperators = ['-', '+', '!', '~', 'typeof', 'void', 'delete'];
// UpdateExpression
export const UpdateOperators = ['++', '--'];
export const AssignmentOperators = [
  '=',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '<<=',
  '>>=',
  '>>>=',
  '|=',
  '^=',
  '&=',
];
// LogicalExpression
export const LogicalOperators = ['||', '&&'];
