import * as parser from 'typescript-estree';
import * as indentString from 'indent-string';
import { fs } from 'memfs';
import { IWriteStream } from 'memfs/lib/volume';
import { Program } from 'typescript-estree/dist/estree/spec';
import { doWhile } from './helpers';
import * as path from 'path';
let modules = new Set<string>();
let helpers = new Set<string>();

function nimModules() {
  return modules;
}

function nimHelpers() {
  return helpers;
}

function arraysEqual(a: any[], b: any[]) {
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

function getLine(value: string, indentLevel: number): string {
  if (value.length === 0) {
    return ""
  }
  const indentSpaces = 2;
  return indentString(value, indentSpaces * indentLevel) + '\n';
}

function getIndented(value: string, indentLevel: number) {
  const indentSpaces = 2;
  return indentString(value, indentSpaces * indentLevel);
}


function convertTypeName(name: string): string {
  let result = '';
  if (name === 'Promise') {
    result = 'Future';
  } else if (name === 'length') {
    result = 'len';
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
  constructor(protected ast: Program, protected writer: IWriteStream) {
    modules = new Set();
    helpers = new Set();
  }

  getComment(node: any, indentLevel = 1): string {

    const origin = this.getOriginalComment(node)
    console.log(origin?.includes("\n"))
    const comment =
      this.getOriginalComment(node)
        ?.replace(/^\s*\*+/gm, '')
        .trim() || '';
    if (comment.length > 0) {
      const end = origin?.includes("\n") ? "\n" : ""
      return this.getLine('## ' + comment.split('\n').join('\n##') + end, indentLevel)
    } else {
      return ""
    }
  }

  getLine(value: string, indentLevel = 0): string {
    if (value.length === 0) {
      return ""
    }
    const indentSpaces = 2;
    return indentString(value, indentSpaces * indentLevel) + '\n';
  }

  handleFunction(node: any, pname: string, isExport = true, indentLevel = 0): string {
    const name = node?.id?.name || pname;
    const returnType = node.returnType
      ? this.tsType2nimType(node.returnType.typeAnnotation)
      : 'auto';
    const isGenerator = node.generator;
    const isAsync = node.async;
    const isExpression = node.expression;
    const isGeneric = node.typeParameters;
    let generics = '';
    if (isGeneric) {
      const gen = node.typeParameters.params
        .map((x: any) => x.name.name)
        .join(',');
      generics = `[${gen}]`;
    }

    const params = node.params;
    const body = node.body;
    const nimpa = params?.map(this.mapParam.bind(this));
    if (isAsync) {
      nimModules().add('asyncdispatch');
    }
    const exportMark = isExport ? '*' : '';
    const pragma = isAsync ? '{.async.}' : '';
    let result = ""
    result += this.getLine(
      `proc ${name}${exportMark}${generics}(${nimpa?.join(
        ','
      )}): ${returnType} ${pragma ? pragma + ' ' : ''}= `,
      indentLevel
    );
    result += this.getComment(node, indentLevel + 1);
    // @TODO remove top level return variable
    let current: any;
    while ((current = body?.body.shift())) {
      result += this.tsType2nimType(current, indentLevel + 1);
    }
    if (body) {
      result += "\n"
    }
    return result
  }

  handleDeclaration(declaration: any, isExport = true, indentLevel = 0): string {
    let result = ""
    if (!declaration) {
      return "";
    }
    if (declaration.type === parser.AST_NODE_TYPES.TSTypeAliasDeclaration) {
      const typeName = declaration.id.name;

      let members: string[] = [];
      if (
        declaration.typeAnnotation.type === parser.AST_NODE_TYPES.TSTypeLiteral
      ) {
        members = declaration.typeAnnotation.members.map((m: any) => {
          const name = m.key.name;
          const typ = this.tsType2nimType(m.typeAnnotation.typeAnnotation);
          const comment = this.getOriginalComment(m);
          const exportMark = isExport ? '*' : '';
          return `${name}${exportMark}:${typ}${
            comment ? ' ##' + comment.replace(/^\*+/, '').trimEnd() : ''
            }`;
        });
      }
      result += `type ${typeName}* = object of RootObj\n`;

      result += members.map(x => indentString(x, 2)).join('\n');
      result += '\n\n';
    } else if (declaration.type === parser.AST_NODE_TYPES.VariableDeclaration) {
      if (declaration.declarations) {
        declaration.declarations.map((m: any) => {
          if (!m.init) {
            return;
          }
          switch (m.init.type) {
            case parser.AST_NODE_TYPES.ArrowFunctionExpression:
              {
                if (indentLevel === 0) {
                  result = this.handleFunction(m.init, m.id.name, isExport, indentLevel);
                } else {
                  result = this.convertVariableDeclaration(declaration, indentLevel)
                }
              }
              break;
            case parser.AST_NODE_TYPES.ConditionalExpression:
              result += this.getLine(this.convertVariableDeclaration(declaration, indentLevel));
              break;
            default:
              result += this.getComment(m, indentLevel);
              result += this.getLine(this.convertVariableDeclaration(declaration, indentLevel));
              console.log('handleDeclaration:VariableDeclaration:default', m);
              break;
          }
        });
      }
    } else if (declaration.type === parser.AST_NODE_TYPES.FunctionDeclaration) {
      result += this.handleFunction(declaration, '', false, indentLevel);
    } else {
      console.log('handleExportNamedDeclaration:else', declaration);
    }
    return result
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
      case parser.AST_NODE_TYPES.MemberExpression:
        {
          let mem: string = '';

          switch (theNode.callee.property.type) {
            case parser.AST_NODE_TYPES.CallExpression:
              mem = this.convertCallExpression(theNode.callee.property);
              break;
            default:
              mem = this.tsType2nimType(theNode.callee.property);
              break;
          }
          let obj: string = '';
          switch (theNode.callee.object.type) {
            case parser.AST_NODE_TYPES.CallExpression:
              obj = this.convertCallExpression(theNode.callee.object);
              break;
            default:
              obj = this.tsType2nimType(theNode.callee.object);;
              break;
          }
          const args = theNode.arguments.map((x: any) => this.tsType2nimType(x));
          result = transCommonMemberExpression(obj, mem, args);
        }
        break;
      case parser.AST_NODE_TYPES.Identifier:
        {
          const func = theNode.callee.name;
          if (func === 'Error') {
            const args = theNode.arguments.map((x: any) => this.tsType2nimType(x));
            result = `newException(Exception,${args.join(',')})`;
          } else {
            const args = theNode.arguments.map((x: any) => this.tsType2nimType(x));
            result = `${func}(${args.join(',')})`;
          }
        }
        break;
      default:
        console.log('convertCallExpression', node);
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
          typeof expression.left.value === 'string' ||
          typeof expression.right.value === 'string';
        op = hasString ? '&' : '+';
        break;
      default:
        op = expression.operator;
    }
    result = `${this.tsType2nimType(expression.left)} ${op} ${this.tsType2nimType(
      expression.right
    )}`;
    return result;
  }

  convertVariableDeclarator(node: any, indentLevel = 0): string {
    let result = '';
    if (!node.init) {
      return node.id.name;
    }
    if (node.id.type === parser.AST_NODE_TYPES.ObjectPattern) {
      node.id.properties.forEach((prop: any) => {
        const name = prop.key.name;
        result += getLine(`${name} = ${this.tsType2nimType(node.init)}.${name}`, indentLevel);
        if (
          prop.value &&
          prop.value.type === parser.AST_NODE_TYPES.AssignmentPattern
        ) {
          result += getLine(`if isNil(${name}):`, indentLevel);
          result += getIndented(
            `${name} = ${this.tsType2nimType(prop.value.right)}`,
            indentLevel + 1
          );
        }
      });
      return result;
    }

    switch (node.init.type) {
      case parser.AST_NODE_TYPES.CallExpression:
        result = this.convertCallExpression(node);
        break;
      case parser.AST_NODE_TYPES.ArrayExpression:
        const eles = node.init.elements;
        result = `@[${eles.map((x: any) => this.tsType2nimType(x))}]`;
        break;
      case parser.AST_NODE_TYPES.BinaryExpression:
        result = this.convertBinaryExpression(node.init);
        break;
      case parser.AST_NODE_TYPES.Literal:
        result = this.tsType2nimType(node.init);
        break;
      case parser.AST_NODE_TYPES.ConditionalExpression:
        result = this.convertConditionalExpression(node.init);
        break;
      default:
        result = this.tsType2nimType(node.init, indentLevel);
        // console.log("convertVariableDeclarator:default:", node)
        break;
    }

    return result;
  }

  convertUnaryExpression(node: any) {
    let result = '';
    let op = '';
    switch (node.operator) {
      case '!':
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
      if (x.id.typeAnnotation) {
        const typ = this.tsType2nimType(x.id.typeAnnotation.typeAnnotation);
        const d = this.convertVariableDeclarator(x);
        if (d) {
          return `${x.id.name}:${typ} = ${d}`;
        } else {
          return `${x.id.name}:${typ}`;
        }
      } else if (x.id.name) {

        return `${x.id.name} = ${this.convertVariableDeclarator(x)}`;
      } else {
        return this.convertVariableDeclarator(x);
      }
    });
    const value = `${nimKind} ${vars.join(',')}`
    if (value.length === 1) {
      return ""
    }
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
    if (p.type === parser.AST_NODE_TYPES.AssignmentPattern) {
      return this.tsType2nimType(p);
    } else if (p.type === parser.AST_NODE_TYPES.RestElement) {
      return this.tsType2nimType(p);
    } else {
      const name = p.name || p.argument?.name;
      const optional = p.optional;
      let typ = 'auto';

      if (p.typeAnnotation) {
        if (optional) {
          nimModules().add('options');
          typ = `Option[${this.tsType2nimType(p.typeAnnotation.typeAnnotation)}]`;
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
      case parser.AST_NODE_TYPES.ExportNamedDeclaration:
        result = this.handleDeclaration(node.declaration, true, indentLevel);
        break;
      case parser.AST_NODE_TYPES.VariableDeclaration:
        result = this.handleDeclaration(node, false, indentLevel);
        break;
      case parser.AST_NODE_TYPES.FunctionDeclaration:
        result = this.handleDeclaration(node, false, indentLevel);
        break;

      case parser.AST_NODE_TYPES.IfStatement:
        {
          const test = this.tsType2nimType(node.test);
          result = getLine(`if ${test}:`, indentLevel);
          if (node.consequent) {
            node.consequent.body.forEach((x: any, index: number) => {
              // if (index !== node.consequent.body.length - 1) {
              result += getIndented(
                this.tsType2nimType(x),
                indentLevel + 1
              );
              // } else {
              //   result += getLine(this.tsType2nimType(x), indentLevel + 1);
              // }
            });
          } else {
            result += getIndented(
              "discard\n",
              indentLevel + 1
            );
          }
          // else if , else
          {
            let alternate = node.alternate

            while (alternate) {
              const test = this.tsType2nimType(alternate.test);

              result += getLine(test ? `elif ${test}:` : "else:", indentLevel);
              if (alternate.consequent) {
                alternate.consequent.body.forEach((x: any, index: number) => {
                  // if (index !== node.consequent.body.length - 1) {
                  result += getIndented(
                    this.tsType2nimType(x),
                    indentLevel + 1
                  );
                  // } else {
                  //   result += getLine(this.tsType2nimType(x), indentLevel + 1);
                  // }
                });
              } else {
                result += getIndented(
                  "discard\n",
                  indentLevel + 1
                );
              }

              alternate = alternate.alternate
            }

          }
        }
        break;

      case parser.AST_NODE_TYPES.ExpressionStatement:
        {
          result += this.getComment(node, indentLevel);
          switch (node.expression.type) {
            case parser.AST_NODE_TYPES.CallExpression:
              {
                result += this.getLine(this.convertCallExpression(node), indentLevel);
              }
              break;
            case parser.AST_NODE_TYPES.AssignmentExpression:
              {
                const expression = this.tsType2nimType(node.expression);
                result += this.getLine(expression, indentLevel);
              }
              break;
            default:
              {
                result += this.getLine(this.tsType2nimType(node.expression), indentLevel);
              }
              console.log('tsType2nimType:ExpressionStatement:default', node.expression);
              break;
          }
        }
        break;
      case parser.AST_NODE_TYPES.TemplateLiteral:
        result = "fmt\""
        nimModules().add("strformat")
        const expressions = node.expressions
        let currentQ
        while (currentQ = node.quasis.shift()) {
          if (currentQ?.value?.cooked) {
            result += currentQ.value.cooked
          } else {
            result += `{${this.tsType2nimType(expressions.shift(), indentLevel)}}`
          }
        }
        result += "\""

        break;
      case parser.AST_NODE_TYPES.ForOfStatement:
      case parser.AST_NODE_TYPES.ForInStatement:
        {
          const leftKind = node.left.kind; // eg. 'const'
          const rightName = node.right.name;
          const ForInStatement = `for ${node.left.declarations.map((y: any) =>
            this.convertVariableDeclarator(y)
          )} in ${rightName}:`;
          result += this.getLine(ForInStatement, indentLevel);
          node.body.body.forEach((x: any) => {
            result += this.tsType2nimType(x, indentLevel + 1);
          });
        }
        break;
      case parser.AST_NODE_TYPES.ReturnStatement:
        if (!node.argument) {
          result = this.getLine('return', indentLevel);
          break;
        }
        switch (node?.argument?.type) {
          case parser.AST_NODE_TYPES.BinaryExpression:
            result = this.getLine(this.convertBinaryExpression(node.argument), indentLevel);
            break;
          case parser.AST_NODE_TYPES.CallExpression:
            result = this.getLine(this.convertCallExpression(node), indentLevel);
            break;
          default:
            result = this.getLine("return " + this.tsType2nimType(node.argument), indentLevel)
            console.log('this.tsType2nimType:ReturnStatement', node);
            break;
        }
        break;
      case parser.AST_NODE_TYPES.ForStatement:
        result += this.getLine(this.convertVariableDeclaration(node.init, indentLevel));
        const test = `while ${this.convertBinaryExpression(node.test)}:`;
        result += this.getLine(test, indentLevel);
        node.body.body.forEach((x: any, index: number) => {
          // if (index !== node.body.body.length - 1) {
          result += getIndented(this.tsType2nimType(x), indentLevel + 1);
          // } else {
          //   result += getLine(this.tsType2nimType(x), indentLevel + 1)
          // }

        });
        break;
      case parser.AST_NODE_TYPES.DoWhileStatement:
        {
          nimHelpers().add(doWhile);
          const test = this.tsType2nimType(node.test);
          result += this.getLine(`doWhile ${test}:`, indentLevel);
          node.body.body.forEach((x: any) => {
            result += this.tsType2nimType(x, indentLevel + 1);
          });
        }
        break;
      case parser.AST_NODE_TYPES.ThrowStatement:
        result += this.getLine(`raise ` + this.convertCallExpression(node), indentLevel);
        break;

      case parser.AST_NODE_TYPES.Identifier:
        result = convertTypeName(node.name);

        if (
          node.typeAnnotation &&
          node.typeAnnotation.typeAnnotation
        ) {
          result += ':';
          result += `${this.tsType2nimType(
            node.typeAnnotation.typeAnnotation
          )}`;
        }

        break;
      case parser.AST_NODE_TYPES.RestElement:
        {
          const name = node.argument.name;
          const primaryTyp =
            node.typeAnnotation.typeAnnotation.typeName.name;
          const typ = this.tsType2nimType(
            node.typeAnnotation.typeAnnotation
          );

          result = `${name}:${typ}`;
          if (primaryTyp === 'Array') {
            result = result.replace('Array', 'openArray');
          }
        }
        break;
      case parser.AST_NODE_TYPES.TSAnyKeyword:
        result = 'any';
        break;
      case parser.AST_NODE_TYPES.TSTypeReference:
        {
          const name = convertTypeName(node.typeName.name);
          if (node.typeParameters) {
            const typ = node.typeParameters.params
              .map((x: any) => this.tsType2nimType(x))
              .join(',');
            result = `${name}[${typ}]`;
          } else {
            result = `${name}`;
          }
        }
        break;
      case parser.AST_NODE_TYPES.Literal:
        if (typeof node.value === 'string') {
          result = JSON.stringify(node.value);
        } else if (node.value === null) {
          result = 'nil';
        } else {
          console.log('this.tsType2nimType:Literal:else', node);
          result = `${node.value}`;
        }
        break;
      case parser.AST_NODE_TYPES.MemberExpression:

        if (node.computed) {
          result = `${this.tsType2nimType(node.object)}[${this.tsType2nimType(
            node.property
          )}]`;
        } else {
          result = `${this.tsType2nimType(node.object)}.${this.tsType2nimType(
            node.property
          )}`;
        }
        break;

      case parser.AST_NODE_TYPES.TSUnionType:
        const types = node.types.map((x: any) => x.type);
        if (arraysEqual(types, ['TSTypeReference', 'TSNullKeyword'])) {
          result = `${node.types[0].typeName.name}`;
        } else if (
          arraysEqual(types, ['TSTypeReference', 'TSUndefinedKeyword'])
        ) {
          result = `${node.types[0].typeName.name}`;
        }
        break;
      case parser.AST_NODE_TYPES.TSNumberKeyword:
        result = 'int';
        break;
      case parser.AST_NODE_TYPES.TSStringKeyword:
        result = 'string';
        break;
      case parser.AST_NODE_TYPES.TSBooleanKeyword:
        result = 'bool';
        break;
      case parser.AST_NODE_TYPES.TSArrayType:
        result = `seq[${this.tsType2nimType(node.elementType)}]`;
        break;
      case parser.AST_NODE_TYPES.AwaitExpression:
        if (
          node.argument.type === parser.AST_NODE_TYPES.CallExpression
        ) {
          result = `await ${this.convertCallExpression(node)}`;
        }
        break;
      case parser.AST_NODE_TYPES.AssignmentPattern:
        {
          const name = node.left.name;
          let typ;
          if (node.left.typeAnnotation) {
            typ = this.tsType2nimType(
              node.left.typeAnnotation.typeAnnotation
            );
          } else {
            typ = 'auto';
          }

          const isPlainEmptyObj =
            node.right.type ===
            parser.AST_NODE_TYPES.ObjectExpression &&
            node.right.properties.length === 0;
          const isPlainEmptyArr =
            node.right.type ===
            parser.AST_NODE_TYPES.ArrayExpression &&
            node.right.elements.length === 0;
          if (isPlainEmptyObj) {
            result = `${name}:${typ} = new${typ.charAt(0).toUpperCase() + typ.slice(1)}()`;
          } else if (isPlainEmptyArr) {
            result = `${name}:${typ} = new${typ.charAt(0).toUpperCase() + typ.slice(1)}()`;
          }
        }
        break;
      case parser.AST_NODE_TYPES.ArrowFunctionExpression:
      case parser.AST_NODE_TYPES.TSFunctionType:
        const isGenerator = node.generator;
        const isAsync = node.async;
        const isExpression = node.expression;
        const isGeneric = node.typeParameters;
        let generics = '';
        if (isGeneric) {
          const gen = node.typeParameters.params
            .map((x: any) => x.name.name)
            .join(',');
          generics = `[${gen}]`;
        }
        const params = node.params;
        const body = node.body;
        const nimpa = params.map(this.mapParam.bind(this));
        let returnType = 'auto';
        const returnStatement = node.body?.body?.find(
          (x: any) => x.type === parser.AST_NODE_TYPES.ReturnStatement
        );
        if (returnStatement) {
          if (
            returnStatement.argument.type ===
            parser.AST_NODE_TYPES.BinaryExpression
          ) {
            if (-1 !== returnStatement.argument.operator.indexOf('==')) {
              returnType = 'bool';
            } else if (
              ['+', '-', '*', '/'].includes(returnStatement.argument.operator)
            ) {
              returnType = 'int';
            }
          }
        }
        if (isAsync) {
          nimModules().add('asyncdispatch');
        }
        const pragma = isAsync ? '{.async.}' : '';
        result += `proc ${generics}(${nimpa.join(',')}): ${returnType} ${
          pragma ? pragma + ' ' : ''
          }${body ? '= \n' : ''}`;
        // @TODO remove top level return variable
        let current: any;
        while ((current = body?.body?.shift())) {
          result +=
            this.tsType2nimType(current, indentLevel + 1)
        }
        if (body && body.body.length > 1) {
          result += "\n"
        }

        break;
      case parser.AST_NODE_TYPES.TryStatement:
        {
          result = getLine(`try:`, indentLevel);
          node.block.body.forEach((x: any, index: number) => {
            // if (index !== node.block.body.length - 1) {
            result += getIndented(
              this.tsType2nimType(x),
              indentLevel + 1
            );
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
              result += getIndented(
                this.tsType2nimType(x),
                indentLevel + 1
              );
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
      case parser.AST_NODE_TYPES.TSAsExpression:
        // @TODO cast type?
        result = this.tsType2nimType(node.expression);
        break;
      case parser.AST_NODE_TYPES.ContinueStatement:
        result = getLine('continue', indentLevel);
        break;
      case parser.AST_NODE_TYPES.BinaryExpression:
        result = this.convertBinaryExpression(node);
        break;
      case parser.AST_NODE_TYPES.UnaryExpression:
        result = this.convertUnaryExpression(node);
        break;
      case parser.AST_NODE_TYPES.LogicalExpression:
        result = this.convertLogicalExpression(node);
        break;
      case parser.AST_NODE_TYPES.AssignmentExpression:
        result = `${this.tsType2nimType(node.left)} ${
          node.operator
          } ${this.tsType2nimType(node.right)}`;
        break;
      case parser.AST_NODE_TYPES.ArrayExpression:
        const eles = node.elements;
        result = `@[${eles.map((x: any) => this.tsType2nimType(x))}]`;
        break;
      case parser.AST_NODE_TYPES.ThisExpression:
        result = "self"
        break;
      case parser.AST_NODE_TYPES.CallExpression:
        result = this.convertCallExpression(node);
        break;
      case parser.AST_NODE_TYPES.NewExpression:
        result = `${this.convertCallExpression(node)}`;
        break;

      case parser.AST_NODE_TYPES.SwitchStatement:
        const cas = `case ${this.tsType2nimType(node.discriminant)}:`;
        result = this.getLine(cas, indentLevel);
        if (Array.isArray(node.cases)) {
          node.cases.forEach((cas: any, casIndex: number) => {
            let statment
            if (cas.test) {
              console.log(cas.test)
              statment = `of ${this.tsType2nimType(cas.test)}:`
            } else {
              statment = `else:`
            }
            result += this.getLine(statment, indentLevel + 1)
            if (cas.consequent) {
              cas.consequent.filter((x: any) => x.type !== parser.AST_NODE_TYPES.BreakStatement).forEach((x: any, index: number) => {
                // if (index !== node.consequent.body.length - 1) {
                result += getIndented(
                  this.tsType2nimType(x),
                  indentLevel + 2
                );
                // } else {
                //   result += getLine(this.tsType2nimType(x), indentLevel + 1);
                // }
              });
            } else {
              result += getIndented(
                "discard\n",
                indentLevel + 1
              );
            }

          })
        }

        break;
      default:
        console.log('this.tsType2nimType:default', node);
        break;
    }
    return result;
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
  const writer = fs.createWriteStream(filePath);
  writer.on('open', fd => {
    // @ts-ignore
    // loggerFn:false skip warning:"You are currently running a version of TypeScript which is not officially supported by typescript-estree SUPPORTED TYPESCRIPT VERSIONS: ~3.2.1"
    const ast = parser.parse(code, options);
    const transpiler = new Transpiler(ast, writer);
    transpiler.transpile();
    let preCount = 0;
    if (nimModules().size > 0) {
      const insert = Buffer.from(
        'import ' + Array.from(nimModules()).join(',') + '\n\n'
      );
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
