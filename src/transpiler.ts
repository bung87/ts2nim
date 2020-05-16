import * as parser from '@typescript-eslint/typescript-estree';
import { fs } from 'memfs';
import { IWriteStream } from 'memfs/lib/volume';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { doWhile } from './helpers';
import * as path from 'path';
import { arraysEqual, getLine, indented, getIndented } from './utils';
import { BinaryOperatorsReturnsBoolean } from './types';

const AST_NODE_TYPES = parser.AST_NODE_TYPES;
const {
  TSCallSignatureDeclaration,
  TSConstructSignatureDeclaration,
  TSParameterProperty,
  TSPropertySignature,
  TSIndexSignature,
  TSInterfaceHeritage,
  TSVoidKeyword,
  TSNeverKeyword,
  MethodDefinition,
  TSUnknownKeyword,
} = AST_NODE_TYPES;

let modules = new Set<string>();
let helpers = new Set<string>();

function nimModules() {
  return modules;
}

function nimHelpers() {
  return helpers;
}

function isConstructor(node: any): boolean {
  return node.type === MethodDefinition && node.kind === 'constructor';
}

/**
 * function interface
 * @param node
 */
function isFunctionInterface(node: any): boolean {
  const body = node.body.body;
  const typ = body[0].type;
  const isFunctionSignature =
    body.length === 1 &&
    (typ === TSCallSignatureDeclaration || typ === TSConstructSignatureDeclaration);
  return isFunctionSignature;
}

function isParamProp(node: any): boolean {
  return node.type === TSParameterProperty;
}

function notBreak(node: any): boolean {
  return node.type !== AST_NODE_TYPES.BreakStatement;
}

interface FuncMeta {
  isGenerator: boolean;
  isAsync: boolean;
  isExpression: boolean;
  isGeneric: boolean;
}

function getFunctionMeta(node: any): FuncMeta {
  return {
    isGenerator: node.generator,
    isAsync: node.async,
    isExpression: node.expression,
    isGeneric: node.typeParameters,
  };
}

function convertTypeName(name: string): string {
  let result = '';
  if (name === 'Promise') {
    result = 'Future';
  } else if (name === 'length') {
    result = 'len';
  } else if (name === 'undefined') {
    result = 'nil';
  } else if (name === 'Error') {
    result = 'Exception';
  } else {
    result = name;
  }
  return result;
}

function transCommonMemberExpression(
  obj: string,
  mem: string,
  args: any[] = [],
  isCall = true
): string {
  let result = '';
  let func = '';
  if (mem === 'push') {
    func = `${obj}.add`;
  } else if (mem === 'length') {
    func = `${obj}.len`;
  } else if (obj === 'fs' && mem === 'readFileSync') {
    func = `readFile`;
    nimModules().add('os');
  } else if (obj === 'path' && mem === 'join') {
    nimModules().add('os');
    return `${args.map((x: string) => x.replace('+', '&')).join(' / ')}`;
  } else if (mem === 'some') {
    nimModules().add('sequtils');
    func = `${obj}.any`;
  } else if (mem === 'sort') {
    nimModules().add('algorithm');
    func = `${obj}.sorted`;
  } else {
    func = `${obj}.${mem}`;
  }
  if (isCall) {
    result = `${func}(${args.join(',')})`;
  } else {
    result = `${func}`;
  }

  return result;
}

class Transpiler {
  constructor(protected ast: TSESTree.Program, protected writer: IWriteStream) {
    modules = new Set();
    helpers = new Set();
  }

  getComment(node: any, indentLevel = 1): string {
    const origin = this.getOriginalComment(node);
    const originComent = this.getOriginalComment(node);
    const comment = originComent?.trim()?.replace(/^([#\s\*]*)*/gm, '') || '';
    if (comment.length > 0) {
      const end = origin?.includes('\n') ? '\n' : '';
      const value = '## ' + comment.split('\n').join('\n## ') + end;
      return getLine(value, indentLevel);
    } else {
      return '';
    }
  }

  handleFunction(
    node: any,
    pname: string,
    isExport = true,
    self: any = null,
    isStatic = false,
    indentLevel = 0
  ): string {
    const name = node?.id?.name || pname;
    const returnTypeNode = node.returnType;
    let returnType;
    const isVoid = returnTypeNode?.typeAnnotation.type === AST_NODE_TYPES.TSVoidKeyword;
    const isNever = returnTypeNode?.typeAnnotation.type === AST_NODE_TYPES.TSNeverKeyword;
    let noReturnTypeNode = isVoid || isNever;

    if (returnTypeNode?.typeAnnotation) {
      returnType = this.tsType2nimType(returnTypeNode.typeAnnotation);
    } else if (pname === `new${self}`) {
      noReturnTypeNode = false;
      returnType = self;
    } /*else if(returnTypeNode.type === AST_NODE_TYPES.TSThisType) {
      returnType = self
    }*/ else {
      noReturnTypeNode = false;
      returnType = 'auto';
    }
    if (!returnType) {
      returnType = 'auto';
    }
    const {
      // isGenerator,
      isAsync,
      // isExpression,
      isGeneric,
    } = getFunctionMeta(node);
    let generics: string[] = [];
    if (isGeneric) {
      const gen = node.typeParameters.params.map((x: any) => x.name.name);
      generics = gen;
    }

    const params = node.params;
    const unknownParams = node.params.filter(
      (x: any) => x.typeAnnotation?.typeAnnotation.type === TSUnknownKeyword
    );
    const hasUnknown = unknownParams.length > 0;
    const body = node.body;
    const nimpa = params?.map(this.mapParam, this) || [];
    const pragmas = [];
    if (self && pname !== `new${self}`) {
      if (isStatic) {
        nimpa.unshift(`self:typedesc[${self}]`);
      } else {
        nimpa.unshift(`self:${self}`);
      }
    }
    if (isAsync) {
      pragmas.push('async');
      nimModules().add('asyncdispatch');
    }

    const exportMark = isExport ? '*' : '';
    const pragmaStr = pragmas.length > 0 ? `{.${pragmas.join(',')}.} ` : '';
    const genericsStr = generics.length > 0 ? `[${generics.join(',')}]` : '';
    const returnTypeStr = !noReturnTypeNode ? ': ' + returnType : '';
    const paramStr = nimpa?.join(',');
    let result = '';

    const isSignature = -1 !== node.type.indexOf('Signature');
    const hasBody = typeof body !== 'undefined' && body !== null;
    const emptyBody = hasBody && body.body && body.body.length === 0;
    result += getLine(
      `proc ${name}${exportMark}${genericsStr}(${paramStr})${returnTypeStr} ${pragmaStr}${
        isSignature ? '' : hasBody ? (emptyBody ? '= discard' : '= ') : '= discard'
      }`,
      indentLevel
    );
    result += this.getComment(node, indentLevel + 1);
    // @TODO remove top level return variable
    let current: any;
    if (self && params) {
      params.filter(isParamProp).forEach((x: any) => {
        const id = x.parameter.name;
        result += getLine(`self.${id} = ${id}`, indentLevel + 1);
      });
    }
    if (hasBody) {
      while ((current = body?.body.shift())) {
        result += this.tsType2nimType(current, indentLevel + 1);
      }
    }
    result += '\n';
    return result;
  }

  handleDeclaration(declaration: any, isExport = true, indentLevel = 0): string {
    let result = '';
    if (!declaration) {
      return '';
    }
    if (declaration.type === AST_NODE_TYPES.TSTypeAliasDeclaration) {
      const typeName = declaration.id.name;

      let members: string[] = [];
      if (declaration.typeAnnotation.type === AST_NODE_TYPES.TSTypeLiteral) {
        members = declaration.typeAnnotation.members.map((m: any) => {
          const name = m.key.name;
          const typ = this.tsType2nimType(m.typeAnnotation.typeAnnotation);
          const comment = this.getComment(m);
          const exportMark = isExport ? '*' : '';
          const cc = comment ? ' ##' + comment.replace(/^\*+/, '').trimEnd() : '';
          return `${name}${exportMark}:${typ}${cc}`;
        });
      }
      result += `type ${typeName}* = ref object of RootObj\n`;

      result += members.map(indented(1)).join('\n');
      result += '\n\n';
    } else if (declaration.type === AST_NODE_TYPES.VariableDeclaration) {
      if (declaration.declarations) {
        declaration.declarations.map((m: any) => {
          if (m.init) {
            switch (m.init.type) {
              case AST_NODE_TYPES.ArrowFunctionExpression:
                {
                  if (indentLevel === 0) {
                    result = this.handleFunction(m.init, m.id.name, isExport, indentLevel);
                  } else {
                    result = this.convertVariableDeclaration(declaration, indentLevel);
                  }
                }
                break;
              case AST_NODE_TYPES.ConditionalExpression:
                result += getLine(this.convertVariableDeclaration(declaration, indentLevel));
                break;
              default:
                result += this.getComment(m, indentLevel);
                result += getLine(this.convertVariableDeclaration(declaration, indentLevel));
                console.log('handleDeclaration:VariableDeclaration:default', m);
                break;
            }
          } else {
            result += this.getComment(m, indentLevel);
            result += getLine(this.convertVariableDeclaration(declaration, indentLevel));
          }
        });
      }
    } else if (declaration.type === AST_NODE_TYPES.FunctionDeclaration) {
      result += this.handleFunction(declaration, '', false, indentLevel);
    } else if (declaration.type === AST_NODE_TYPES.ClassDeclaration) {
      result = this.tsType2nimType(declaration);
    }

    return result;
  }

  convertConditionalExpression(expression: any): string {
    let result = '';
    result = `if ${this.tsType2nimType(expression.test)}: ${this.tsType2nimType(
      expression.consequent
    )} else: ${this.tsType2nimType(expression.alternate)}`;
    return result;
  }

  convertCallExpression(node: any): string {
    let result = '';
    const theNode = node.expression || node.init || node.argument || node;

    switch (theNode.callee.type) {
      case AST_NODE_TYPES.MemberExpression:
        {
          let mem: string = '';

          switch (theNode.callee.property.type) {
            case AST_NODE_TYPES.CallExpression:
              mem = this.convertCallExpression(theNode.callee.property);
              break;
            default:
              mem = this.tsType2nimType(theNode.callee.property);
              break;
          }
          let obj: string = '';
          switch (theNode.callee.object.type) {
            case AST_NODE_TYPES.CallExpression:
              obj = this.convertCallExpression(theNode.callee.object);
              break;
            default:
              obj = this.tsType2nimType(theNode.callee.object);
              break;
          }
          const args = theNode.arguments.map(this.tsType2nimType, this);
          result = transCommonMemberExpression(obj, mem, args);
        }
        break;

      default:
        const func = this.tsType2nimType(theNode.callee);
        const args = theNode.arguments.map(this.tsType2nimType, this);
        result = `${func}(${args.join(',')})`;
        console.log('convertCallExpression:default', node);
        break;
    }
    return result;
  }

  convertBinaryExpression(expression: any): string {
    let result = '';
    let op = '';
    switch (expression.operator) {
      case '===':
        op = '==';
        break;
      case '!==':
        op = '!=';
        break;
      case '+':
        const hasString =
          typeof expression.left.value === 'string' || typeof expression.right.value === 'string';
        op = hasString ? '&' : '+';
        break;
      case '<<':
        op = 'shl';
        break;
      case '>>':
        op = 'shr';
        break;
      case '%':
        op = 'mod';
        break;
      case '^':
        op = 'xor';
        break;
      case '&':
        op = 'and';
        break;
      case '|':
        op = 'or';
        break;
      case '>>>': {
        const left = this.tsType2nimType(expression.left);
        const right = this.tsType2nimType(expression.right);
        return `abs(${left} shr 1 shr ${right})`;
      }
      case '~':
        op = 'not';
        break;
      default:
        op = expression.operator;
    }
    const left = this.tsType2nimType(expression.left);
    const right = this.tsType2nimType(expression.right);
    result = `${left} ${op} ${right}`;
    return result;
  }

  convertVariableDeclarator(node: any, indentLevel = 0): string {
    let result = '';
    if (!node.init) {
      return node.id.name;
    }
    if (node.id.type === AST_NODE_TYPES.ObjectPattern) {
      node.id.properties.forEach((prop: any) => {
        const name = prop.key.name;
        result += getLine(`${name} = ${this.tsType2nimType(node.init)}.${name}`, indentLevel);
        if (prop.value && prop.value.type === AST_NODE_TYPES.AssignmentPattern) {
          result += getLine(`if isNil(${name}):`, indentLevel);
          result += getIndented(
            `${name} = ${this.tsType2nimType(prop.value.right)}`,
            indentLevel + 1
          );
        }
      });
      return result;
    }
    result = this.tsType2nimType(node.init, indentLevel);
    return result;
  }

  convertUnaryExpression(node: any) {
    // UnaryOperators ["-", "+", "!", "~", "typeof", "void", "delete"]
    let result = '';
    let op = '';
    switch (node.operator) {
      case '!':
        // @TODO isNil check for object
        op = 'not';
        break;
      case 'delete':
        return `${this.tsType2nimType(node.argument)} = nil`;
      default:
        op = node.operator;
        break;
    }
    result = `${op} ${this.tsType2nimType(node.argument)}`;
    return result;
  }

  convertVariableDeclaration(node: any, indentLevel = 0): string {
    // @TODO using let for const primtive type?
    const nimKind = node.kind === 'const' ? 'var' : 'var';
    const vars = node.declarations.map((x: any) => {
      const hasTyp = typeof x.id.typeAnnotation !== 'undefined';
      const hasInit = x.init;
      const name = x.id.name;
      if (!name) {
        return this.convertVariableDeclarator(x);
      }
      let result = name;
      if (hasTyp) {
        result += ':' + this.tsType2nimType(x.id.typeAnnotation.typeAnnotation);
      }

      if (hasInit) {
        result += ' = ' + this.convertVariableDeclarator(x);
      }

      return result;
    });
    const value = `${nimKind} ${vars.join(',')}`;
    const r = getIndented(value, indentLevel);
    return r;
  }

  convertLogicalExpression(expression: any): string {
    let result = '';
    let op = '';
    switch (expression.operator) {
      case '&&':
        op = 'and';
        break;
      case '||':
        op = 'or';
        break;
      default:
        op = expression.operator;
    }
    result = `${this.tsType2nimType(expression.left)} ${op} ${this.tsType2nimType(
      expression.right
    )}`;
    return result;
  }

  mapParam(p: any): string {
    if (p.type === AST_NODE_TYPES.AssignmentPattern) {
      return this.tsType2nimType(p);
    } else if (p.type === AST_NODE_TYPES.RestElement) {
      return this.tsType2nimType(p);
    } else if (p.type === AST_NODE_TYPES.TSParameterProperty) {
      return this.tsType2nimType(p.parameter);
    } else {
      const name = p.name || p.argument?.name;
      const optional = p.optional;
      let typ = 'auto';

      if (p.typeAnnotation) {
        if (optional) {
          nimModules().add('options');
          typ = `none(${this.tsType2nimType(p.typeAnnotation.typeAnnotation)})`;
          return `${name} = ${typ}`;
        } else {
          typ = this.tsType2nimType(p.typeAnnotation.typeAnnotation);
        }
      }
      return `${name}:${typ}`;
    }
  }

  tsType2nimType(node: any, indentLevel = 0): string {
    let result: string = '';
    const typ = node?.type;
    switch (typ) {
      case AST_NODE_TYPES.TSInterfaceDeclaration:
        {
          // @TODO real isExport
          const ex = node.extends;
          const hasSuper = ex ? true : false;
          const className = this.tsType2nimType(node.id);
          const body = node.body.body;
          const isFunctionSignature = isFunctionInterface(node);

          if (isFunctionSignature) {
            const node = body[0];
            const procSignature = this.handleFunction(node, '', false, null, false, indentLevel);
            return `type ${className}* = ${procSignature}\n`;
          }
          const ctrIndex = body.findIndex((x: any) => x.type === TSConstructSignatureDeclaration);
          const hasCtr = -1 !== ctrIndex;

          if (hasSuper) {
            const supers = ex.map(this.tsType2nimType, this).join(',');
            result += `type ${className}* = ref object of ${supers}\n`;
          } else {
            result += `type ${className}* = ref object of RootObj\n`;
          }
          let ctrl;
          if (hasCtr) {
            ctrl = body[ctrIndex];
            body.splice(ctrIndex, 1);
            const ctrlProps = ctrl.params.filter((x: any) => x.type === TSParameterProperty);

            const members = ctrlProps.map(this.mapMember, this);
            if (members.length > 0) {
              result += members.map(indented(1)).join('\n') + '\n';
            }
          }
          const propsIndexes = body.reduce((p: any, cur: any, i: number) => {
            if (cur.type === TSPropertySignature) {
              return [...p, i];
            }
            return p;
          }, []);
          if (propsIndexes.length > 0) {
            const props = body.filter((x: any, i: number) => propsIndexes.includes(i));
            propsIndexes.reverse().forEach((v: number, i: number) => {
              body.splice(v, 1);
            });
            // @TODO handle TSTypeQuery
            const propsStrs = props.map(this.mapProp, this);
            if (propsStrs.length > 0) {
              result += propsStrs.map(indented(1)).join('\n') + '\n';
            }
          }

          result += '\n\n';

          // write constructor
          if (hasCtr) {
            result += this.handleFunction(
              ctrl,
              `new${className}`,
              true,
              className,
              false,
              indentLevel
            );
          }
          // write methods

          body
            .filter((x: any) => x.type !== TSIndexSignature)
            .forEach((v: any) => {
              result += this.handleFunction(v, v.key?.name, true, className, v.static, indentLevel);
            });
        }
        break;
      case TSInterfaceHeritage:
        result = this.tsType2nimType(node.expression);
        break;
      case TSIndexSignature:
        {
          // const params = node.parameters;
        }
        break;
      case AST_NODE_TYPES.ExportNamedDeclaration:
        result = this.handleDeclaration(node.declaration, true, indentLevel);
        break;
      case AST_NODE_TYPES.VariableDeclaration:
        result = this.handleDeclaration(node, false, indentLevel);
        break;
      case AST_NODE_TYPES.FunctionDeclaration:
        result = this.handleDeclaration(node, false, indentLevel);
        break;
      case AST_NODE_TYPES.IfStatement:
        {
          const test = this.tsType2nimType(node.test);
          result = getLine(`if ${test}:`, indentLevel);
          if (node.consequent) {
            node.consequent.body.forEach((x: any, index: number) => {
              // if (index !== node.consequent.body.length - 1) {
              result += getIndented(this.tsType2nimType(x), indentLevel + 1);
              // } else {
              //   result += getLine(this.tsType2nimType(x), indentLevel + 1);
              // }
            });
          } else {
            result += getIndented('discard\n', indentLevel + 1);
          }
          // else if , else
          {
            let alternate = node.alternate;

            while (alternate) {
              const test = this.tsType2nimType(alternate.test);

              result += getLine(test ? `elif ${test}:` : 'else:', indentLevel);
              if (alternate.consequent) {
                alternate.consequent.body.forEach((x: any, index: number) => {
                  // if (index !== node.consequent.body.length - 1) {
                  result += getIndented(this.tsType2nimType(x), indentLevel + 1);
                  // } else {
                  //   result += getLine(this.tsType2nimType(x), indentLevel + 1);
                  // }
                });
              } else {
                result += getIndented('discard\n', indentLevel + 1);
              }

              alternate = alternate.alternate;
            }
          }
        }
        break;

      case AST_NODE_TYPES.ExpressionStatement:
        {
          result += this.getComment(node, indentLevel);
          switch (node.expression.type) {
            case AST_NODE_TYPES.CallExpression:
              {
                result += getLine(this.convertCallExpression(node), indentLevel);
              }
              break;
            case AST_NODE_TYPES.AssignmentExpression:
              {
                const expression = this.tsType2nimType(node.expression);
                result += getLine(expression, indentLevel);
              }
              break;
            default:
              {
                result += getLine(this.tsType2nimType(node.expression), indentLevel);
              }
              console.log('tsType2nimType:ExpressionStatement:default', node.expression);
              break;
          }
        }
        break;
      case AST_NODE_TYPES.TemplateLiteral:
        const expressions = node.expressions;
        const hasLineBreak = node.quasis.some((x: any) => x.value.cooked.includes('\n'));
        if (expressions.length > 0) {
          nimModules().add('strformat');
          if (hasLineBreak) {
            result = 'fmt"""';
          } else {
            result = 'fmt"';
          }

          let currentQ;
          while ((currentQ = node.quasis.shift())) {
            if (currentQ?.value?.cooked) {
              result += currentQ.value.cooked.replace(/\{/g, '{{').replace(/\}/g, '}}');
            } else {
              result += `{${this.tsType2nimType(expressions.shift(), indentLevel)}}`;
            }
          }
        } else {
          if (hasLineBreak) {
            result = '"""';
          } else {
            result = '"';
          }
          let currentQ;
          while ((currentQ = node.quasis.shift())) {
            result += currentQ.value.cooked.replace(/\{/g, '{{').replace(/\}/g, '}}');
          }
        }
        if (hasLineBreak) {
          result += '"""';
        } else {
          result += '"';
        }

        break;
      case AST_NODE_TYPES.ForOfStatement:
      case AST_NODE_TYPES.ForInStatement:
        {
          // const leftKind = node.left.kind; // eg. 'const'
          const rightName = node.right.name;
          const ForInStatement = `for ${node.left.declarations.map((y: any) =>
            this.convertVariableDeclarator(y)
          )} in ${rightName}:`;
          result += getLine(ForInStatement, indentLevel);
          node.body.body.forEach((x: any) => {
            result += this.tsType2nimType(x, indentLevel + 1);
          });
        }
        break;
      case AST_NODE_TYPES.ReturnStatement:
        if (!node.argument) {
          result = getLine('return', indentLevel);
          break;
        }
        switch (node?.argument?.type) {
          case AST_NODE_TYPES.BinaryExpression:
            result = getLine(this.convertBinaryExpression(node.argument), indentLevel);
            break;
          case AST_NODE_TYPES.CallExpression:
            result = getLine(this.convertCallExpression(node), indentLevel);
            break;
          default:
            result = getLine('return ' + this.tsType2nimType(node.argument), indentLevel);
            console.log('this.tsType2nimType:ReturnStatement', node);
            break;
        }
        break;
      case AST_NODE_TYPES.ForStatement:
        result += getLine(this.convertVariableDeclaration(node.init, indentLevel));
        const test = `while ${this.convertBinaryExpression(node.test)}:`;
        result += getLine(test, indentLevel);
        node.body.body.forEach((x: any, index: number) => {
          // if (index !== node.body.body.length - 1) {
          result += getIndented(this.tsType2nimType(x), indentLevel + 1);
          // } else {
          //   result += getLine(this.tsType2nimType(x), indentLevel + 1)
          // }
        });
        break;
      case AST_NODE_TYPES.DoWhileStatement:
        {
          nimHelpers().add(doWhile);
          const test = this.tsType2nimType(node.test);
          result += getLine(`doWhile ${test}:`, indentLevel);
          node.body.body.forEach((x: any) => {
            result += this.tsType2nimType(x, indentLevel + 1);
          });
        }
        break;
      case AST_NODE_TYPES.ThrowStatement:
        const typedesc = this.tsType2nimType(node.argument.callee);
        // const isClass = typedesc.charCodeAt(0) <= 90
        const isClass = node.argument.type === AST_NODE_TYPES.NewExpression ? true : false;
        let argument;
        if (isClass) {
          const args = node.argument.arguments.map(this.tsType2nimType, this);
          argument = `newException(${typedesc},${args.join(',')})`;
        } else {
          argument = this.tsType2nimType(node.argument);
        }
        result = getLine(`raise ` + argument, indentLevel);
        break;
      case AST_NODE_TYPES.Identifier:
        result = convertTypeName(node.name);
        if (node.typeAnnotation && node.typeAnnotation.typeAnnotation) {
          result += ':';
          result += this.tsType2nimType(node.typeAnnotation.typeAnnotation);
        }

        break;
      case AST_NODE_TYPES.RestElement:
        {
          const name = node.argument.name;
          const primaryTyp = node.typeAnnotation.typeAnnotation.typeName?.name;
          const typ = this.tsType2nimType(node.typeAnnotation.typeAnnotation);

          result = `${name}:${typ}`;
          if (primaryTyp === 'Array') {
            result = result.replace('Array', 'openArray');
          }
        }
        break;
      case AST_NODE_TYPES.TSAnyKeyword:
        result = 'any';
        break;
      case AST_NODE_TYPES.TSTypeReference:
        {
          const name = convertTypeName(node.typeName.name);
          if (node.typeParameters) {
            const typ = node.typeParameters.params.map(this.tsType2nimType, this).join(',');
            result = `${name}[${typ}]`;
          } else {
            result = `${name}`;
          }
        }
        break;
      case AST_NODE_TYPES.Literal:
        if (typeof node.value === 'string') {
          result = JSON.stringify(node.value);
        } else if (node.value === null) {
          result = 'nil';
        } else if (typeof node.value === 'undefined') {
          result = 'nil';
        } else {
          console.log('this.tsType2nimType:Literal:else', node);
          result = `${node.value}`;
        }
        break;
      case AST_NODE_TYPES.MemberExpression:
        if (node.computed) {
          result = `${this.tsType2nimType(node.object)}[${this.tsType2nimType(node.property)}]`;
        } else {
          result = `${this.tsType2nimType(node.object)}.${this.tsType2nimType(node.property)}`;
        }
        break;
      case AST_NODE_TYPES.TSParenthesizedType:
        result = this.tsType2nimType(node.typeAnnotation);
        break;
      case AST_NODE_TYPES.TSUnionType:
        // TypeA || null,TypeA || undefined
        const types = node.types.map((x: any) => x.type);
        if (arraysEqual(types, ['TSTypeReference', 'TSNullKeyword'])) {
          result = `${node.types[0].typeName.name}`;
        } else if (arraysEqual(types, ['TSTypeReference', 'TSUndefinedKeyword'])) {
          result = `${node.types[0].typeName.name}`;
        } else {
          result = `${node.types.map(this.tsType2nimType, this).join('|')}`;
        }
        break;
      case AST_NODE_TYPES.TSNumberKeyword:
        result = 'float';
        break;
      case AST_NODE_TYPES.TSStringKeyword:
        result = 'string';
        break;
      case AST_NODE_TYPES.TSBooleanKeyword:
        result = 'bool';
        break;
      case AST_NODE_TYPES.TSArrayType:
        result = `seq[${this.tsType2nimType(node.elementType)}]`;
        break;
      case AST_NODE_TYPES.AwaitExpression:
        if (node.argument.type === AST_NODE_TYPES.CallExpression) {
          result = `await ${this.convertCallExpression(node)}`;
        }
        break;
      case AST_NODE_TYPES.AssignmentPattern:
        {
          const name = node.left.name;
          let typ;
          if (node.left.typeAnnotation) {
            typ = this.tsType2nimType(node.left.typeAnnotation.typeAnnotation);
          } else {
            typ = 'auto';
          }
          // @TODO fill params
          const isPlainEmptyObj =
            node.right.type === AST_NODE_TYPES.ObjectExpression &&
            node.right.properties.length === 0;
          const isPlainEmptyArr =
            node.right.type === AST_NODE_TYPES.ArrayExpression && node.right.elements.length === 0;
          if (isPlainEmptyObj) {
            result = `${name}:${typ} = new${typ.charAt(0).toUpperCase() + typ.slice(1)}()`;
          } else if (isPlainEmptyArr) {
            result = `${name}:${typ} = new${typ.charAt(0).toUpperCase() + typ.slice(1)}()`;
          } else {
            result = `${this.tsType2nimType(node.left)} = ${this.tsType2nimType(node.right)}`;
            console.log('tsType2nimType:AssignmentPattern:else', node);
          }
        }
        break;
      case AST_NODE_TYPES.ArrowFunctionExpression:
      case AST_NODE_TYPES.TSFunctionType:
        const {
          // isGenerator,
          isAsync,
          // isExpression,
          isGeneric,
        } = getFunctionMeta(node);
        let generics = '';
        if (isGeneric) {
          const gen = node.typeParameters.params.map((x: any) => x.name.name).join(',');
          generics = `[${gen}]`;
        }
        const params = node.params;
        const body = node.body;
        const nimpa = params.map(this.mapParam, this);
        let returnType = 'auto';
        const returnStatement = node.body?.body?.find(
          (x: any) => x.type === AST_NODE_TYPES.ReturnStatement
        );
        if (returnStatement) {
          const arg = returnStatement.argument;
          if (arg.type === AST_NODE_TYPES.BinaryExpression) {
            if (BinaryOperatorsReturnsBoolean.includes(arg.operator)) {
              returnType = 'bool';
            } else if (['+', '-', '*', '/'].includes(arg.operator)) {
              const hasString =
                arg.operator === '+' &&
                (typeof arg.left.value === 'string' || typeof arg.right.value === 'string');
              if (hasString) {
                returnType = 'string';
              }
              returnType = 'float';
            }
          } else if (arg.type === AST_NODE_TYPES.LogicalExpression) {
            returnType = 'bool';
          }
        }
        if (isAsync) {
          nimModules().add('asyncdispatch');
        }
        if (!returnType) {
          returnType = 'auto';
        }
        const pragma = isAsync ? '{.async.}' : '';
        result += `proc ${generics}(${nimpa.join(',')}): ${returnType} ${
          pragma ? pragma + ' ' : ''
        }${body ? '= \n' : ''}`;
        // @TODO remove top level return variable
        let current: any;
        while ((current = body?.body?.shift())) {
          result += this.tsType2nimType(current, indentLevel + 1);
        }
        if (body && body.body && body.body.length > 1) {
          result += '\n';
        }

        break;
      case AST_NODE_TYPES.TSDeclareFunction:
        {
          const procNmae = this.tsType2nimType(node.id);
          const {
            // isGenerator,
            isAsync,
            // isExpression,
            isGeneric,
          } = getFunctionMeta(node);

          let generics = '';
          if (isGeneric) {
            const gen = node.typeParameters.params.map((x: any) => x.name.name).join(',');
            generics = `[${gen}]`;
          }
          const params = node.params;

          const nimpa = params.map(this.mapParam, this);
          const returnTypeNode = node.returnType;
          const noReturnTypeNode =
            returnTypeNode?.typeAnnotation.type === TSVoidKeyword ||
            returnTypeNode?.typeAnnotation.type === TSNeverKeyword;
          const returnType = this.tsType2nimType(node.returnType.typeAnnotation);

          if (isAsync) {
            nimModules().add('asyncdispatch');
          }

          const pragma = isAsync ? '{.async.}' : '';
          result += `proc ${procNmae}${generics}(${nimpa.join(',')})${
            !noReturnTypeNode ? ': ' + returnType : ''
          } ${pragma ? pragma + ' ' : ''}`;
          result += '\n';
        }
        break;
      case TSVoidKeyword:
        // only handle when it is generic type param
        result = 'void';
        break;
      case TSNeverKeyword:
        // just ignore
        break;
      case AST_NODE_TYPES.TSLiteralType:
        result = JSON.stringify(node.literal.value);
        if (typeof node.literal.value === 'string') {
          result = JSON.stringify(node.literal.value);
        } else {
          result = node.literal.raw;
        }
        break;
      case AST_NODE_TYPES.TryStatement:
        {
          result = getLine(`try:`, indentLevel);
          node.block.body.forEach((x: any, index: number) => {
            // if (index !== node.block.body.length - 1) {
            result += getIndented(this.tsType2nimType(x), indentLevel + 1);
            // } else {
            //   result += getLine(this.tsType2nimType(x), indentLevel + 1);
            // }
          });
          if (node.handler) {
            result += getLine(`except:`, indentLevel);
            node.block.body.forEach((x: any) => {
              result += getLine(this.tsType2nimType(x), indentLevel + 1);
            });
          }
          if (node.finalizer) {
            result += getLine(`finally:`, indentLevel);
            node.finalizer.body.forEach((x: any, index: number) => {
              // if (index !== node.finalizer.body.length - 1) {
              result += getIndented(this.tsType2nimType(x), indentLevel + 1);
              // } else {
              //   result += getLine(
              //     this.tsType2nimType(x),
              //     indentLevel + 1
              //   );
              // }
            });
          }
        }
        break;
      case AST_NODE_TYPES.TSAsExpression:
        // @TODO cast type?
        result = this.tsType2nimType(node.expression);
        break;
      case AST_NODE_TYPES.ContinueStatement:
        result = getLine('continue', indentLevel);
        break;
      case AST_NODE_TYPES.BinaryExpression:
        result = this.convertBinaryExpression(node);
        break;
      case AST_NODE_TYPES.UnaryExpression:
        result = this.convertUnaryExpression(node);
        break;
      case AST_NODE_TYPES.LogicalExpression:
        result = this.convertLogicalExpression(node);
        break;
      case AST_NODE_TYPES.AssignmentExpression:
        result = `${this.tsType2nimType(node.left)} ${node.operator} ${this.tsType2nimType(
          node.right
        )}`;
        break;
      case AST_NODE_TYPES.ArrayExpression:
        // @TODO inter the actual type
        const eles = node.elements;
        let sameType = true;
        if (eles.length > 1) {
          const firstType = typeof eles[0].value;
          sameType = eles.slice(1).every((c: any, i: number) => {
            return firstType === typeof c.value;
          });
        }
        if (sameType) {
          result = `@[${eles.map(this.tsType2nimType, this)}]`;
        } else {
          result = `(${eles.map(this.tsType2nimType, this)})`;
        }

        break;
      case AST_NODE_TYPES.ThisExpression:
        result = 'self';
        break;
      case AST_NODE_TYPES.CallExpression:
        result = this.convertCallExpression(node);
        break;
      case AST_NODE_TYPES.NewExpression:
        result = `${this.convertCallExpression(node)}`;
        break;

      case AST_NODE_TYPES.SwitchStatement:
        const cas = `case ${this.tsType2nimType(node.discriminant)}:`;
        result = getLine(cas, indentLevel);
        if (Array.isArray(node.cases)) {
          node.cases.forEach((cas: any, casIndex: number) => {
            let statment;
            if (cas.test) {
              statment = `of ${this.tsType2nimType(cas.test)}:`;
            } else {
              statment = `else:`;
            }
            result += getLine(statment, indentLevel + 1);
            if (cas.consequent) {
              cas.consequent.filter(notBreak).forEach((x: any, index: number) => {
                // if (index !== node.consequent.body.length - 1) {
                result += getIndented(this.tsType2nimType(x), indentLevel + 2);
                // } else {
                //   result += getLine(this.tsType2nimType(x), indentLevel + 1);
                // }
              });
            } else {
              result += getIndented('discard\n', indentLevel + 1);
            }
          });
        }

        break;
      case AST_NODE_TYPES.ClassDeclaration:
        {
          const hasSuper = node.superClass ? true : false;
          const className = this.tsType2nimType(node.id);

          const body = node.body.body;
          const ctrIndex = body.findIndex(isConstructor);
          const hasCtr = -1 !== ctrIndex;
          if (hasSuper) {
            result += `type ${className}* = ref object of ${this.tsType2nimType(
              node.superClass
            )}\n`;
          } else {
            result += `type ${className}* = ref object of RootObj\n`;
          }
          let ctrl;
          if (hasCtr) {
            ctrl = body[ctrIndex];
            body.splice(ctrIndex, 1);
            const ctrlProps = ctrl.value.params.filter(isParamProp);
            const members = ctrlProps.map(this.mapMember, this);
            if (members.length > 0) {
              result += members.map(indented(1)).join('\n') + '\n';
            }
          }
          const propsIndexes = body.reduce((p: any, cur: any, i: number) => {
            if (cur.type === AST_NODE_TYPES.ClassProperty) {
              return [...p, i];
            }
            return p;
          }, []);
          if (propsIndexes.length > 0) {
            const props = body.filter((x: any, i: number) => propsIndexes.includes(i));
            propsIndexes.reverse().forEach((v: number, i: number) => {
              body.splice(v, 1);
            });
            const propsStrs = props.map(this.mapProp, this);
            if (propsStrs) {
              result += propsStrs.map(indented(1)).join('\n') + '\n';
            }
          }
          result += '\n\n';
          // write constructor
          if (hasCtr) {
            result += this.handleFunction(
              ctrl.value,
              `new${className}`,
              true,
              className,
              false,
              indentLevel
            );
          }
          // write methods
          body.forEach((v: any) => {
            result += this.handleFunction(
              v.value,
              v.key.name,
              true,
              className,
              v.static,
              indentLevel
            );
          });
          // node.body type === 'ClassBody'
          // body.body element  type  'MethodDefinition'
          // kind: 'constructor','method'
          // static:
          // value: type: 'FunctionExpression'
        }
        break;
      case AST_NODE_TYPES.ClassProperty:
        {
          const accessibility = node.accessibility;
          const isPub = accessibility === 'public' || !accessibility;
          const name = node.key.name;
          const typ = this.tsType2nimType(node.typeAnnotation.typeAnnotation);
          const comment = this.getComment(node);
          const exportMark = isPub ? '*' : '';
          result = `${name}${exportMark}:${typ}${comment}`;
        }
        break;
      case AST_NODE_TYPES.TSUndefinedKeyword:
        result = 'nil';
        break;
      case AST_NODE_TYPES.TSEnumDeclaration:
        {
          const name = this.tsType2nimType(node.id);
          result = `type ${name} = enum\n`;
          const members = node.members;
          result += getIndented(members.map(this.tsType2nimType, this).join(', '), 1);
          result += '\n\n';
        }
        break;
      case AST_NODE_TYPES.TSEnumMember:
        {
          const name = this.tsType2nimType(node.id);
          if (node.initializer) {
            result = `${name} = ${this.tsType2nimType(node.initializer)}`;
          } else {
            result = `${name}`;
          }
        }

        break;
      case AST_NODE_TYPES.TSTupleType:
        result = `(${node.elementTypes.map(this.tsType2nimType, this)})`;
        break;
      case AST_NODE_TYPES.ConditionalExpression:
        result = this.convertConditionalExpression(node);
        break;
      case AST_NODE_TYPES.TSModuleDeclaration:
        if (node.body && node.body.body) {
          result = node.body.body.map(indented(0)).join('');
        }
        break;
      case AST_NODE_TYPES.TSModuleBlock:
        if (node.body) {
          result = node.body.map(indented(0)).join('');
        }

        break;
      default:
        console.log('this.tsType2nimType:default', node);
        break;
    }
    return result;
  }

  isPub(prop: any): boolean {
    const accessibility = prop.accessibility;
    return accessibility === 'public' || !accessibility;
  }

  mapMember(prop: any): string {
    // readonly: undefined,
    // static: undefined,
    // export: undefined,
    const isPub = this.isPub(prop);
    const parameter = prop.parameter;
    const name = parameter.name;
    const typ = this.tsType2nimType(parameter.typeAnnotation.typeAnnotation);
    const comment = this.getComment(prop);
    const exportMark = isPub ? '*' : '';
    return `${name}${exportMark}:${typ}${comment}`;
  }

  mapProp(prop: any): string {
    // readonly: undefined,
    // static: undefined,
    // export: undefined,
    const isPub = this.isPub(prop);
    const name = prop.key.name;
    const typ = this.tsType2nimType(prop.typeAnnotation.typeAnnotation);
    const comment = this.getComment(prop);
    const exportMark = isPub ? '*' : '';
    return `${name}${exportMark}:${typ}${comment}`;
  }

  transpile() {
    this.ast.body.forEach((node: any) => {
      this.writer.write(this.tsType2nimType(node, 0));
    });
  }

  getOriginalComment(node: any): string | undefined {
    // @ts-ignore
    const comment = this.ast.comments.find(x => {
      // console.log(x.loc,node.loc)
      // @TODO could be same line,but it returns wrong
      // eg. { start: { line: 23, column: 27 }, end: { line: 23, column: 55 } } { start: { line: 24, column: 2 }, end: { line: 24, column: 29 } }
      return x.loc.end.line === node.loc.start.line - 1;
    });
    return comment?.value;
  }
}

export function transpile(
  filePath = '/unnamed.nim',
  code: string,
  options = { comment: true, loggerFn: false }
): IWriteStream {
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirpSync(path.dirname(filePath));
  }
  const writePath = filePath.replace(/\.d(?=\.)/g, '_d');
  const writer = fs.createWriteStream(writePath);
  writer.on('open', fd => {
    // @ts-ignore
    // loggerFn:false skip warning:"You are currently running a version of TypeScript which is not officially supported by typescript-estree SUPPORTED TYPESCRIPT VERSIONS: ~3.2.1"
    const ast = parser.parse(code, options);
    const transpiler = new Transpiler(ast, writer);
    transpiler.transpile();
    let preCount = 0;
    if (nimModules().size > 0) {
      const insert = Buffer.from('import ' + Array.from(nimModules()).join(',') + '\n\n');
      fs.writeSync(fd, insert, 0, insert.length, 0);
      preCount = insert.length;
    }
    if (nimHelpers().size > 0) {
      const insert = Buffer.from(Array.from(nimHelpers()).join('\n') + '\n');
      fs.writeSync(fd, insert, preCount, insert.length, 0);
    }
    writer.end();
  });

  return writer;
}
