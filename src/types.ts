// https://github.com/estree/estree/blob/master/es5.md

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
