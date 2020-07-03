import * as parser from '@typescript-eslint/typescript-estree';
import { fs } from 'memfs';
import { IWriteStream } from 'memfs/lib/volume';
import { TSESTree,AST_NODE_TYPES } from '@typescript-eslint/experimental-utils';
import { doWhile, brideHeader, seqFind } from './nimhelpers';
import * as path from 'path';
import { arraysEqual, getLine, skip, indented, getIndented, addslashes } from './utils';
import { BinaryOperatorsReturnsBoolean, primitiveTypes } from './types';
import { Subject } from 'rxjs';
import { performance } from 'perf_hooks';
import { reserved } from './nim';
import { Sym } from './analyzer';

type NumberAs = 'float' | 'int';

interface TranspilerOptions {
  isProject: boolean;
  numberAs: NumberAs;
}
const {
  TSCallSignatureDeclaration,
  BlockStatement,
  TSConstructSignatureDeclaration,
  TSParameterProperty,
  TSPropertySignature,
  TSIndexSignature,
  TSInterfaceHeritage,
  TSFunctionType,
  TSMethodSignature,
  TSVoidKeyword,
  TSNeverKeyword,
  TSTypePredicate,
  TSAnyKeyword,
  MethodDefinition,
  ImportDeclaration,
  ForInStatement,
  ForOfStatement,
  TSUnknownKeyword,
  ArrayExpression,
  ObjectExpression,
  AssignmentPattern,
  ObjectPattern,
  TSTypeQuery,
} = AST_NODE_TYPES;

function isConstructor(node: any): boolean {
  return node.type === MethodDefinition && node.kind === 'constructor';
}

/**
 * function interface
 * @param node
 */
function isFunctionInterface(node: any): boolean {
  const body = node.body.body;
  if (!body) {
    return false;
  }
  if (body.length === 0) {
    return false;
  }
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

function convertIdentName(name: string): string {
  if (!name) {
    return '';
  }
  let result = '';
  if (name.startsWith('_')) {
    result = name.substring(1);
  } else if (name.startsWith('$')) {
    result = name.substring(1);
  } else if (name === 'length') {
    result = 'len';
  } else if (name === 'Error') {
    result = 'Exception';
  } else {
    result = name;
  }
  if (reserved.includes(name)) {
    result = '`' + name + '`';
  }
  return result;
}

function convertTypeName(name: string): string {
  let result = '';
  if (name === 'Promise') {
    result = 'Future';
  } else if (name === 'undefined') {
    result = 'nil';
  } else if (name === 'Error') {
    result = 'Exception';
  } else {
    result = name;
  }
  return result;
}

class Transpiler {
  public isD = false;
  public modules = new Set<string>();
  public helpers = new Set<string>();
  public logger: Subject<any>;
  public lastNode: any;
  protected pathWithoutExt: string;
  constructor(
    protected ast: TSESTree.Program,
    protected writer: IWriteStream,
    protected transpilerOptions: TranspilerOptions,
    public symbols: { [index: string]: Sym[] } = {}
  ) {
    const filePath = writer.path;
    const ext = path.extname(filePath);
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath, ext);
    const changed = path.join(dir, basename);
    this.pathWithoutExt = changed;
    this.logger = new Subject();
  }

  log(...args: any) {
    this.logger.next(args);
  }

  typeof2type(typ: string): string {
    if (typ === 'number') {
      return this.transpilerOptions.numberAs;
    } else {
      return typ;
    }
  }

  transCommonMemberExpression(obj: string, mem: string, args: any[] = [], isCall = true): string {
    let result = '';
    let func = '';
    if (mem === 'push') {
      func = `${obj}.add`;
    } else if (mem === 'length') {
      func = `${obj}.len`;
    } else if (obj === 'fs' && mem === 'readFileSync') {
      func = `readFile`;
      this.modules.add('os');
    } else if (obj === 'path' && mem === 'join') {
      this.modules.add('os');
      return `${args.map((x: string) => x.replace('+', '&')).join(' / ')}`;
    } else if (mem === 'some') {
      this.modules.add('sequtils');
      func = `${obj}.any`;
    } else if (mem === 'sort') {
      this.modules.add('algorithm');
      func = `${obj}.sorted`;
    } else if (mem === 'charCodeAt') {
      // @FIXME The charCodeAt() method returns an integer between 0 and 65535 representing the UTF-16 code unit at the given index.
      //  charAt() method returns a new string consisting of the single UTF-16 code unit located at the specified offset into the string.
      func = `ord(${obj}[${args[0]}])`;
      return func;
    } else if (mem === 'toLowerCase') {
      this.modules.add('unicode');
      func = `${obj}.toLower`;
    } else if (mem === 'toUpperCase') {
      this.modules.add('unicode');
      func = `${obj}.toUpper`;
    } else if (mem === 'substr') {
      this.modules.add('unicode');
      func = `${obj}.runeSubStr`;
    } else if (mem === 'substring') {
      // @FIXME maybe negtive
      //  && args[1] > 0
      if (args.length === 2) {
        const arg = `${args[0]},${args[1]} - ${args[0]}`;
        return `${obj}.runeSubStr(${arg})`;
      }
      func = `${obj}.runeSubStr`;
    } else if (obj === 'String' && mem === 'fromCharCode') {
      return `"\\u${args[0]}"`;
    } // indexOf  strutils.find
    else {
      func = `${obj}.${mem}`;
    }
    if (isCall) {
      result = `${func}(${args.join(',')})`;
    } else {
      result = `${func}`;
    }

    return result;
  }

  getComment(node: any, indentLevel = 1): string {
    const originComent = this.getOriginalComment(node);
    const comment = originComent?.trim()?.replace(/^([#\s\*]*)*/gm, '') || '';
    if (comment.length > 0) {
      const end = originComent?.includes('\n') ? '\n' : '';
      const value = '## ' + comment.split('\n').join('\n## ') + end;
      return getLine(value, indentLevel);
    } else {
      return '';
    }
  }

  getProcMeta(node: any): any[] {
    const {
      // isGenerator,
      isAsync,
      // isExpression,
      isGeneric,
    } = getFunctionMeta(node);
    const name = node.id?.name;
    let generics: string[] = [];
    if (isGeneric) {
      const gen = node.typeParameters.params.map((x: any) => x.name.name);
      generics = gen;
    }
    let skipIndex = -1;

    if (this.isD) {
      skipIndex = node.params.findIndex((x: any) => {
        if (x.optional) {
          return true;
        }
        const isAny = x.typeAnnotation.typeAnnotation.type === TSAnyKeyword;
        if (isAny) {
          return true;
        }
        const isRest = x.type === AST_NODE_TYPES.RestElement;
        if (isRest) {
          return true;
        }
        return this.tsType2nimType(x.typeAnnotation.typeAnnotation).includes('any');
      });
    }

    const params = skipIndex !== -1 ? skip(node.params, skipIndex) : node.params;
    // mutate the param if it is unknow type
    const availableT = ['T', 'S', 'U', 'V'];
    const used: Set<string> = new Set();
    for (const p of params) {
      if (p.typeAnnotation?.typeAnnotation.type === TSUnknownKeyword) {
        p.typeAnnotation.typeAnnotation.type = AST_NODE_TYPES.Identifier;
        let key = (p.name as string).charAt(0).toUpperCase();
        if (!used.has(key)) {
          const index = availableT.indexOf(key);
          if (-1 !== index) {
            availableT.splice(index, 1);
            used.add(key);
          }
        } else {
          if (availableT.length > 0) {
            key = (availableT.shift() as unknown) as string;
            used.add(key);
          }
        }
        generics.push(key);
        p.typeAnnotation.typeAnnotation.name = key;
      }
    }
    let hasName = 0;
    if (name) {
      hasName = 1;
    }
    const isTSMethodSignature = node.type === TSMethodSignature;
    const pragmas = this.isD && Boolean(hasName + Number(isTSMethodSignature)) ? ['importcpp'] : [];
    if (isAsync) {
      pragmas.push('async');
      if (!this.isD) {
        this.modules.add('asyncdispatch');
      } else {
        this.modules.add('asyncjs');
      }
    }
    if (this.isD && skipIndex !== -1) {
      pragmas.push('varargs');
    }
    return [generics, params, pragmas];
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

    const [generics, params, pragmas] = this.getProcMeta(node);
    const body = node.body;
    const nimpa = params?.map(this.mapParam, this) || [];

    if (self && pname !== `new${self}`) {
      if (isStatic) {
        nimpa.unshift(`self:typedesc[${self}]`);
      } else {
        nimpa.unshift(`self:${self}`);
      }
    }

    const exportMark = isExport && !name?.startsWith('_') ? '*' : '';
    const pragmaStr = pragmas.length > 0 ? `{.${pragmas.join(',')}.}` : undefined;
    const genericsStr = generics.length > 0 ? `[${generics.join(',')}]` : '';
    const returnTypeStr = !noReturnTypeNode ? ': ' + returnType : '';
    const paramStr = nimpa?.join(', ');
    let result = '';

    const isSignature = -1 !== node.type.indexOf('Signature');
    const hasBody = typeof body !== 'undefined' && body !== null;
    const emptyBody = hasBody && body.body && body.body.length === 0;
    const rp = [returnTypeStr, pragmaStr].filter(x => x && x !== ' ').join(' ');
    result += getLine(
      `proc ${convertIdentName(name)}${exportMark}${genericsStr}(${paramStr})${rp}${
        isSignature ? '' : hasBody ? (emptyBody ? ' = discard' : ' = ') : ' = discard'
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
      while ((current = body.body?.shift())) {
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
    if (
      declaration.type === AST_NODE_TYPES.TSTypeAliasDeclaration &&
      declaration.typeAnnotation.type === TSTypeQuery
    ) {
      // ignore kind like: type URI = typeof URI
      return '';
    }
    if (
      declaration.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
      declaration.type === AST_NODE_TYPES.TSInterfaceDeclaration
    ) {
      const typeName = declaration.id.name;

      let members: string[] = [];
      if (declaration.typeAnnotation?.type === AST_NODE_TYPES.TSTypeLiteral) {
        members = declaration.typeAnnotation.members.map(this.mapDecl.bind(this, isExport));
      } else if (declaration.type === AST_NODE_TYPES.TSInterfaceDeclaration) {
        members = declaration.body.body.map(this.mapDecl.bind(this, isExport));
      }
      result += `type ${typeName}* = ref object of RootObj\n`;

      result += members.map(indented(1)).join('\n');
      result += '\n\n';
    } else if (declaration.type === AST_NODE_TYPES.VariableDeclaration) {
      if (declaration.declarations) {
        outer: for (const m of declaration.declarations) {
          if (m.init) {
            switch (m.init.type) {
              case AST_NODE_TYPES.ArrowFunctionExpression:
              case AST_NODE_TYPES.FunctionExpression:
                {
                  if (indentLevel === 0) {
                    result = this.handleFunction(m.init, m.id.name, isExport, indentLevel);
                  } else {
                    result = this.convertVariableDeclaration(declaration, indentLevel);
                    break outer;
                  }
                }
                break;
              case AST_NODE_TYPES.ConditionalExpression:
                result = getLine(this.convertVariableDeclaration(declaration, indentLevel));
                break outer;
              case ObjectExpression:
              case ArrayExpression:
                const isPlainEmptyObj =
                  m.init.type === ObjectExpression && m.init.properties.length === 0;
                const isPlainEmptyArr =
                  m.init.type === ArrayExpression && m.init.elements.length === 0;
                let typ = '';
                if (m.id.typeAnnotation) {
                  typ = this.tsType2nimType(m.id.typeAnnotation.typeAnnotation);
                }
                const props = m.init.properties || m.init.elements;
                const newName = typ.charAt(0).toUpperCase() + typ.slice(1);

                if (isPlainEmptyObj) {
                  result += getLine(`var ${this.tsType2nimType(m.id)} = new${newName}()`);
                } else if (isPlainEmptyArr) {
                  result += getLine(`var ${this.tsType2nimType(m.id)} = @[]`, indentLevel);
                } else {
                  result += `var ${this.tsType2nimType(m.id)} = new${newName}(${props
                    .map(this.tsType2nimType, this)
                    .join(',')})`;
                  if (m.init.type === ObjectExpression) {
                    this.log('tsType2nimType:declaration.declarations.map:else', m.properties);
                  } else {
                    this.log('tsType2nimType:declaration.declarations.map:else', m);
                  }
                }
                break;

              default:
                result += this.getComment(m, indentLevel);
                result += getLine(this.convertVariableDeclaration(declaration, indentLevel));
                break outer;
              // this.log('handleDeclaration:VariableDeclaration:default', m);
              // break;
            }
          } else {
            result += this.getComment(m, indentLevel);
            result += getLine(this.convertVariableDeclaration(declaration, indentLevel));
          }
        }
      }
    } else if (declaration.type === AST_NODE_TYPES.FunctionDeclaration) {
      result += this.handleFunction(declaration, '', false, indentLevel);
    } else if (declaration.type === AST_NODE_TYPES.ClassDeclaration) {
      result = this.tsType2nimType(declaration);
    } else if (declaration.type === AST_NODE_TYPES.TSDeclareFunction) {
      result = this.tsType2nimType(declaration);
    } else if (declaration.type === AST_NODE_TYPES.TSModuleDeclaration) {
      declaration.body.body.forEach((node: any) => {
        result += this.tsType2nimType(node, 0);
      });
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
          if (mem === 'indexOf') {
            if (this.isString(theNode.callee.object)) {
              this.modules.add('strutils');
              mem = 'find';
            } else if (this.isArray(theNode.callee.object)) {
              this.helpers.add(seqFind);
              mem = 'find';
            }
          }
          const args = theNode.arguments.map(this.tsType2nimType, this);
          result = this.transCommonMemberExpression(obj, mem, args);
        }
        break;

      default:
        const func = this.tsType2nimType(theNode.callee);
        const args = theNode.arguments.map(this.tsType2nimType, this);
        result = `${func}(${args.join(',')})`;
        this.log('convertCallExpression:default', node);
        break;
    }
    return result;
  }

  isNil(node: any) {
    const name = node.id?.name || node.name;
    const end = node.range[1];
    const sym = this.symbols[this.pathWithoutExt]?.find(
      (x: any) => x.name === name && x.loc.end <= end && x.loc.pos <= node.range[0]
    );
    if (sym) {
      return sym.type === 'null' || sym.type === 'undefined';
    }
    return (
      node.type === AST_NODE_TYPES.Literal && (node.raw === 'null' || node.raw === 'undefined')
    );
  }

  isObj(node: any) {
    const name = node.id?.name || node.name;
    const end = node.range[1];
    const sym = this.symbols[this.pathWithoutExt]?.find(
      (x: any) => x.name === name && x.loc.end <= end && x.loc.pos <= node.range[0]
    );
    if (sym) {
      return !primitiveTypes.includes(sym.type);
    }
    return (
      node.type === AST_NODE_TYPES.Literal && (node.raw === 'null' || node.raw === 'undefined')
    );
  }

  isBoolean(node: any) {
    const name = node.id?.name || node.name;
    const value = node.init?.value || node.value;
    if (typeof value === 'boolean') {
      return true;
    }
    const end = node.range[1];
    const sym = this.symbols[this.pathWithoutExt]?.find(
      (x: any) => x.name === name && x.loc.end <= end && x.loc.pos <= node.range[0]
    );
    if (sym) {
      return sym.type === 'boolean';
    }
    return false;
  }

  isNumber(node: any) {
    const name = node.id?.name || node.name;
    const value = node.init?.value || node.value;
    if (typeof value === 'number') {
      return true;
    }
    const end = node.range[1];
    const sym = this.symbols[this.pathWithoutExt]?.find(
      (x: any) => x.name === name && x.loc.end <= end && x.loc.pos <= node.range[0]
    );
    if (sym) {
      // @ts-ignore
      return sym.type === 'number' || !isNaN(sym.type);
    }
    return false;
  }

  isRegExp(node: any) {
    // const name = node.id?.name || node.name;
    const value = node.init?.value || node.value;
    if (value instanceof RegExp) {
      return true;
    }
    // const end = node.range[1];
    // const sym = this.symbols[this.pathWithoutExt]?.find(
    //   (x: any) => x.name === name && x.loc.end <= end && x.loc.pos <= node.range[0]
    // );
    // console.log(sym)
    // if (sym) {
    //   // @ts-ignore
    //   return sym.type === 'number' ;
    // }
    return false;
  }

  isString(node: any) {
    const name = node.id?.name || node.name;
    const value = node.init?.value || node.value;
    if (typeof value === 'string') {
      return true;
    }
    const end = node.range[1];
    const sym = this.symbols[this.pathWithoutExt]?.find(
      (x: any) => x.name === name && x.loc.end <= end && x.loc.pos <= node.range[0]
    );
    if (sym) {
      return sym.type === 'string';
    }
    return false;
  }

  isArray(node: any) {
    const name = node.id?.name || node.name;
    const value = node.init?.value || node.value;
    const end = node.range[1];
    const sym = this.symbols[this.pathWithoutExt]?.find(
      (x: any) => x.name === name && x.loc.end <= end && x.loc.pos <= node.range[0]
    );
    if (sym) {
      return sym.type.endsWith('[]');
    }
    return Array.isArray(value);
  }

  convertBinaryExpression(expression: any): string {
    let result = '';
    let op = '';
    switch (expression.operator) {
      case '===':
      case '==':
        if (this.isNil(expression.right)) {
          return `isNil(${this.tsType2nimType(expression.left)})`;
        }
        op = '==';
        break;
      case '!==':
      case '!=':
        if (this.isNil(expression.right)) {
          return `not isNil(${this.tsType2nimType(expression.left)})`;
        }
        op = '!=';
        break;
      case '+':
        const leftIsString = typeof expression.left.value === 'string';
        const rightIsString = typeof expression.right.value === 'string';
        const hasString = leftIsString || rightIsString;
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
    if (node.id.type === ObjectPattern) {
      node.id.properties.forEach((prop: any) => {
        const name = convertIdentName(prop.key.name);
        result += getLine(`${name} = ${this.tsType2nimType(node.init)}.${name}`, indentLevel);
        if (prop.value && prop.value.type === AssignmentPattern) {
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

  convertNodeInTest(node: any): string {
    if (node.type === AST_NODE_TYPES.Identifier) {
      const prefix = '';
      if (this.isArray(node)) {
        return `${prefix}${this.tsType2nimType(node)}.len > 0`;
      } else if (this.isString(node)) {
        return `${prefix}${this.tsType2nimType(node)}.len > 0`;
      } else if (this.isNumber(node)) {
        return `${prefix}${this.tsType2nimType(node)} == 0`;
      } else if (this.isObj(node)) {
        return `${prefix}isNil(${this.tsType2nimType(node)})`;
      } else {
        this.log('convertNodeInTest:Identifier:else', node);
        return `${prefix}${this.tsType2nimType(node)}`;
      }
    } else {
      return this.tsType2nimType(node);
    }
  }

  convertUnaryExpression(node: any) {
    // UnaryOperators ["-", "+", "!", "~", "typeof", "void", "delete"]
    let result = '';
    let op = '';
    switch (node.operator) {
      case '!':
        const prefix = 'not ';
        if (this.isArray(node.argument)) {
          return `${prefix}${this.tsType2nimType(node.argument)}.len > 0`;
        } else if (this.isString(node.argument)) {
          return `${prefix}${this.tsType2nimType(node.argument)}.len > 0`;
        } else if (this.isNumber(node.argument)) {
          return `${prefix}${this.tsType2nimType(node.argument)} == 0`;
        } else if (this.isObj(node.argument)) {
          return `${prefix}isNil(${this.tsType2nimType(node.argument)})`;
        }
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

  mapVar(isDeclare: boolean, x: any): string {
    const hasTyp = typeof x.id.typeAnnotation !== 'undefined';
    const hasInit = x.init;
    const name = convertIdentName(x.id.name);
    if (!name) {
      return this.convertVariableDeclarator(x);
    }
    let result = name;
    if (isDeclare) {
      result += '*';
      result += ' {.importc, nodecl.}';
    }
    if (hasTyp) {
      result += ':' + this.tsType2nimType(x.id.typeAnnotation.typeAnnotation);
    }

    if (hasInit) {
      result += ' = ' + this.convertVariableDeclarator(x);
    }

    return result;
  }
  convertVariableDeclaration(node: any, indentLevel = 0): string {
    let result = '';
    const isDeclare = node.declare;
    const nimKind = node.kind === 'const' ? 'var' : 'var';
    let constVars = [];
    if (node.kind === 'const') {
      constVars = node.declarations.filter(
        (x: any) => this.isNumber(x) || this.isRegExp(x) || this.isString(x) || this.isBoolean(x),
        this
      );
    }
    if (constVars.length) {
      const consts: string = constVars.map(this.mapVar.bind(this, isDeclare)).join(',');
      const v = `const ${consts}`;
      result += getLine(v, indentLevel);
    }
    const vars = node.declarations.slice(constVars.length).map(this.mapVar.bind(this, isDeclare));
    if (vars.length) {
      const value = `${nimKind} ${vars.join(',')}`;
      result += getIndented(value, indentLevel);
    }

    return result;
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

  tsType2nimType(node: any, indentLevel = 0): string {
    this.lastNode = node;
    let result: string = '';
    const typ = node?.type;
    switch (typ) {
      case ImportDeclaration:
        const notName = node.source.value.includes('/');
        if (notName) {
          const isAbs = path.isAbsolute(node.source.value);
          const imp = `import ${node.source.value}`;
          if (!isAbs) {
            result = getLine(imp, 0);
          }
        }

        break;
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
            const propsStrs = props.map(this.mapMember, this);
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
          const test = this.convertNodeInTest(node.test);
          result = getLine(`if ${test}:`, indentLevel);

          if (node.consequent) {
            if (node.consequent.type === BlockStatement) {
              if (node.consequent.body && node.consequent.body.length > 0) {
                node.consequent.body.forEach((x: any, index: number) => {
                  result += getIndented(this.tsType2nimType(x), indentLevel + 1);
                });
              } else {
                result += getIndented('discard\n', indentLevel + 1);
              }
            } else {
              result += getIndented(this.tsType2nimType(node.consequent), indentLevel + 1);
            }
          }
          // else if , else
          let alternate = node.alternate;

          while (alternate) {
            const test = this.tsType2nimType(alternate.test);
            result += getLine(test ? `elif ${test}:` : 'else:', indentLevel);
            // if (alternate.type === BlockStatement) {
            if (alternate.body && alternate.body.length > 0) {
              alternate.body.forEach((x: any, index: number) => {
                result += this.ts2nimIndented(indentLevel + 1)(x);
              });
            } else if (alternate.consequent?.body && alternate.consequent?.body.length > 0) {
              alternate.consequent.body.forEach((x: any, index: number) => {
                result += this.ts2nimIndented(indentLevel + 1)(x);
              });
            } else {
              result += getIndented('discard\n', indentLevel + 1);
            }
            // } else {
            //   result += this.ts2nimIndented(indentLevel + 1)(alternate);
            // }

            alternate = alternate.alternate;
          }
        }
        break;

      case AST_NODE_TYPES.ExpressionStatement:
        {
          if (node.directive === 'use strict') {
            return '';
          }
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
              this.log('tsType2nimType:ExpressionStatement:default', node.expression);
              break;
          }
        }
        break;
      case AST_NODE_TYPES.TaggedTemplateExpression:
        result = `${this.tsType2nimType(node.tag)}(${this.tsType2nimType(node.quasi)})`;
        break;
      case AST_NODE_TYPES.TemplateLiteral:
        const expressions = node.expressions;
        const hasLineBreak = node.quasis?.some((x: any) => {
          return x.loc.start.line !== x.loc.end.line;
          // return x.raw?.includes('\n')
        });
        if (expressions.length > 0) {
          this.modules.add('strformat');
          if (hasLineBreak) {
            result = 'fmt"""';
          } else {
            result = 'fmt"';
          }

          let currentQ;
          while ((currentQ = node.quasis?.shift())) {
            if (currentQ?.value?.cooked) {
              result += addslashes(currentQ.value.cooked.replace(/\{/g, '{{').replace(/\}/g, '}}'));
            } else {
              result += addslashes(`{${this.tsType2nimType(expressions.shift(), indentLevel)}}`);
            }
          }
        } else {
          if (hasLineBreak) {
            result = '"""';
          } else {
            result = '"';
          }
          let currentQ, line;
          while ((currentQ = node.quasis?.shift())) {
            line = currentQ.value.cooked.replace(/\{/g, '{{').replace(/\}/g, '}}');
            if (!hasLineBreak) {
              result += addslashes(line);
            } else {
              result += line;
            }
          }
        }
        if (hasLineBreak) {
          result += '"""';
        } else {
          result += '"';
        }

        break;
      case ForOfStatement:
      case ForInStatement:
        {
          // const leftKind = node.left.kind; // eg. 'const'
          const rightName = this.tsType2nimType(node.right);
          const isForIn = node.type === ForInStatement;
          const isForOf = node.type === ForOfStatement;
          const mutator = isForOf ? '.mitems' : '';
          const decl = node.left.declarations;
          const forVar =
            isForIn && decl.length === 1
              ? `${this.convertVariableDeclarator(decl[0])},_`
              : decl.map(this.convertVariableDeclarator);
          const forInStatement = `for ${forVar} in ${rightName}${mutator}:`;
          result += getLine(forInStatement, indentLevel);
          if (node.body.type === BlockStatement) {
            node.body.body.forEach((x: any) => {
              result += this.tsType2nimType(x, indentLevel + 1);
            });
          } else {
            // if(node.body.type === AST_NODE_TYPES.ExpressionStatement){
            result += this.tsType2nimType(node.body, indentLevel + 1);
          }
        }
        break;
      case AST_NODE_TYPES.Property:
        result = `${this.tsType2nimType(node.key)}= ${this.tsType2nimType(node.value)}`;
        break;
      case AST_NODE_TYPES.ReturnStatement:
        if (!node.argument) {
          result = getLine('return void', indentLevel);
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
            this.log('this.tsType2nimType:ReturnStatement', node);
            break;
        }
        break;
      case AST_NODE_TYPES.ForStatement:
        result += getLine(this.convertVariableDeclaration(node.init, indentLevel));
        const test = `while ${this.convertBinaryExpression(node.test)}:`;
        result += getLine(test, indentLevel);
        node.body?.body?.forEach((x: any, index: number) => {
          // if (index !== node.body.body.length - 1) {
          result += getIndented(this.tsType2nimType(x), indentLevel + 1);
          // } else {
          //   result += getLine(this.tsType2nimType(x), indentLevel + 1)
          // }
        });
        break;
      case AST_NODE_TYPES.DoWhileStatement:
        {
          this.helpers.add(doWhile);
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
        result = convertIdentName(node.name);
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
      case TSAnyKeyword:
        result = 'any';
        break;
      case AST_NODE_TYPES.TSTypeReference:
        {
          if (node.typeName.type === AST_NODE_TYPES.Identifier) {
            const name = convertTypeName(node.typeName.name);
            if (node.typeParameters) {
              const typ = node.typeParameters.params.map(this.tsType2nimType, this).join(',');
              result = `${name}[${typ}]`;
            } else {
              this.log('this.tsType2nimType:TSTypeReference:Identifier:else', node);
              result = `${name}`;
            }
          } else if (node.typeName.type === AST_NODE_TYPES.TSQualifiedName) {
            if (this.isD) {
              result = `${this.tsType2nimType(node.typeName.left)}.${this.tsType2nimType(
                node.typeName.right
              )}`;
            } else {
              this.log('this.tsType2nimType:TSTypeReference:TSQualifiedName:else', node);
            }
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
        } else if (typeof node.regex !== 'undefined') {
          const pattern = node.regex.pattern;
          const flags = node.regex.flags;
          this.modules.add('regex');
          result = `re"${pattern}"`;
        } else {
          this.log('this.tsType2nimType:Literal:else', node);
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
      case AST_NODE_TYPES.TSNullKeyword:
        // in some case handle this independently
        result = 'nil';
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
        result = this.transpilerOptions.numberAs;
        break;
      case AST_NODE_TYPES.TSStringKeyword:
        if (this.isD) {
          result = 'cstring';
        } else {
          result = 'string';
        }

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
          const { left, right } = node;
          let name = convertIdentName(left.name);
          let typ;
          const leftIsObjectPattern = left.type === ObjectPattern;
          let props: string[] = [];
          if (leftIsObjectPattern) {
            props = props.concat(
              left.properties.map((prop: any) => {
                const name = convertIdentName(prop.key.name);
                if (prop.value && prop.value.type === AssignmentPattern) {
                  return `${name} = ${this.tsType2nimType(prop.value.right)}`;
                } else {
                  return '';
                }
              })
            );
          }
          if (right.type === ObjectExpression) {
            props = props.concat(
              right.properties.map((prop: any) => {
                const name = convertIdentName(prop.key.name);
                if (prop.value && prop.value.type === AssignmentPattern) {
                  return `${name} = ${this.tsType2nimType(prop.value.right)}`;
                } else {
                  return '';
                }
              })
            );
          }
          if (left.typeAnnotation) {
            typ = this.tsType2nimType(left.typeAnnotation.typeAnnotation);
          } else {
            typ = 'auto';
          }
          // @TODO fill params
          // pass by position
          if (!name) {
            name = typ.charAt(0).toLowerCase() + typ.slice(1);
          }
          // const isPlainEmptyObj = right.type === ObjectExpression && right.properties.length === 0;
          const isPlainEmptyArr = right.type === ArrayExpression && right.elements.length === 0;
          const newName = typ.charAt(0).toUpperCase() + typ.slice(1);
          if (isPlainEmptyArr) {
            result = `${name}:${typ} = new${newName}()`;
          } else {
            if (right.type === ObjectExpression) {
              result = `${name}:${typ} = new${newName}(${props.join(',')})`;
            } else if (right.type === ArrayExpression) {
              this.log('tsType2nimType:AssignmentPattern:else', node);
              result = `${name}:${typ} = @[${right.elements
                .map(this.tsType2nimType, this)
                .join(',')}]`;
            } else {
              result = `${name}:${typ} = ${this.tsType2nimType(right)}`;
            }
          }
        }
        break;
      case AST_NODE_TYPES.ArrowFunctionExpression:
      case TSFunctionType:
        const [generics, params, pragmas] = this.getProcMeta(node);
        const body = node.body;
        const nimpa = params.map(this.mapParam, this);
        let returnType = 'auto';
        const returnStatement = node.body?.body?.find(
          (x: any) => x.type === AST_NODE_TYPES.ReturnStatement
        );
        if (node.type === TSFunctionType) {
          // node.returnType
          // typeAnnotation: {
          //   type: 'TSTypePredicate',
          //   asserts: false,
          if (node.returnType.typeAnnotation.type === TSTypePredicate) {
            const predicateName = this.tsType2nimType(node.returnType.typeAnnotation.parameterName);
            const annotation = node.returnType.typeAnnotation.typeAnnotation.typeAnnotation;
            // TSTypeReference
            const Tstr = this.tsType2nimType(annotation.typeName);
            // replace generic through TSTypePredicate
            nimpa.forEach((pa: any, index: number) => {
              const [v, t] = pa.split(':');
              if (v === predicateName) {
                const j = generics.findIndex((x: any) => x === t);
                if (-1 !== j) {
                  generics[j] = Tstr;
                }
                nimpa[index] = pa.replace(t, Tstr);
              }
            });
          }
        } else if (returnStatement) {
          const arg = returnStatement.argument;
          if (arg.type === AST_NODE_TYPES.BinaryExpression) {
            if (BinaryOperatorsReturnsBoolean.includes(arg.operator)) {
              returnType = 'bool';
            } else if (['+', '-', '*', '/'].includes(arg.operator)) {
              const leftIsString = typeof arg.left.value === 'string';
              const rightIsString = typeof arg.right.value === 'string';
              const hasString = arg.operator === '+' && (leftIsString || rightIsString);
              if (hasString) {
                returnType = 'string';
              } else {
                returnType = this.transpilerOptions.numberAs;
              }
            }
          } else if (arg.type === AST_NODE_TYPES.LogicalExpression) {
            returnType = 'bool';
          }
        }
        const pragmaStr = pragmas.length > 0 ? `{.${pragmas.join(',')}.}` : undefined;
        const genericsStr = generics.length > 0 ? `[${generics.join(',')}]` : '';
        const rp = [returnType, pragmaStr].filter(x => x && x !== ' ').join(' ');
        result += `proc ${genericsStr}(${nimpa.join(', ')}): ${rp}${body ? ' = \n' : ''}`;
        // @TODO remove top level return variable
        let current: any;
        while ((current = body?.body?.shift())) {
          result += this.tsType2nimType(current, indentLevel + 1);
        }
        if (body && body.body && body.body.length > 1) {
          result += '\n';
        }
        break;
      case AST_NODE_TYPES.ExportDefaultDeclaration:
        result = this.tsType2nimType(node.declaration);

        break;
      case AST_NODE_TYPES.TSDeclareFunction:
        {
          const procNmae = this.tsType2nimType(node.id);
          const [generics, params, pragmas] = this.getProcMeta(node);

          const nimpa = params?.map(this.mapParam, this) || [];
          const returnTypeNode = node.returnType;
          const noReturnTypeNode =
            returnTypeNode?.typeAnnotation?.type === TSVoidKeyword ||
            returnTypeNode?.typeAnnotation?.type === TSNeverKeyword;
          let returnType;
          if (returnTypeNode?.typeAnnotation) {
            returnType = this.tsType2nimType(node.returnType.typeAnnotation);
          }
          const pragmaStr = pragmas.length > 0 ? `{.${pragmas.join(',')}.}` : undefined;
          const genericsStr = generics.length > 0 ? `[${generics.join(',')}]` : '';
          returnType = !noReturnTypeNode ? ': ' + returnType : '';
          const rp = [returnType, pragmaStr].filter(x => x).join(' ');
          result += `proc ${procNmae}${genericsStr}(${nimpa.join(', ')})${rp}`;
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
        if (node.left.type === AST_NODE_TYPES.ArrayPattern && node.right.type === ArrayExpression) {
          if (node.left.elements.length === node.right.elements.length) {
            node.left.elements.forEach((_: any, index: number) => {
              result += getLine(
                `${this.tsType2nimType(node.left.elements[index])} ${
                  node.operator
                } ${this.tsType2nimType(node.right.elements[index])}`,
                indentLevel
              );
            });
          }
        } else {
          result = `${this.tsType2nimType(node.left)} ${node.operator} ${this.tsType2nimType(
            node.right
          )}`;
        }

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
            const propsStrs = props.map(this.mapMember, this);
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
          const isPub = this.isPub(node);
          const name = convertIdentName(node.key.name);
          const value = this.tsType2nimType(node.value);
          const typ = this.getType(node);
          const comment = this.getComment(node);
          const exportMark = isPub ? '*' : '';
          result = `${name}${exportMark}:${typ}${comment}${
            value ? ` ## ts default value:${value}` : ''
          }`;
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
          for (const m of members) {
            const comment = this.getComment(m);
            const cc = comment
              ? comment
                  .replace(/^\*+/, '')
                  .replace(/\n/g, '')
                  .trimEnd()
              : '';
            const de = this.tsType2nimType(m, 1);
            result += indented(1)(`${de}${cc ? ' ' + cc : ''}\n`);
          }
          // result += getLine(members.map(this.tsType2nimType, this).join(', '), 1);
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
          result = node.body.body.map(this.ts2nimIndented(0)).join('');
        }
        break;
      case AST_NODE_TYPES.TSModuleBlock:
        if (node.body) {
          result = node.body.map(this.ts2nimIndented(0)).join('');
        }

        break;
      default:
        this.log('this.tsType2nimType:default', node);
        break;
    }
    return result;
  }

  ts2nimIndented(indentLevel: number) {
    return (node: any) => indented(indentLevel)(this.tsType2nimType(node));
  }

  isPub(prop: any): boolean {
    const name = prop.key?.name || prop.id?.name || prop.parameter.name;
    if (name.startsWith('_')) {
      return false;
    }
    const accessibility = prop.accessibility;
    return accessibility === 'public' || !accessibility;
  }

  mapParam(p: any): string {
    if (p.type === AST_NODE_TYPES.AssignmentPattern) {
      return this.tsType2nimType(p);
    } else if (p.type === AST_NODE_TYPES.RestElement) {
      return this.tsType2nimType(p);
    } else if (p.type === AST_NODE_TYPES.TSParameterProperty) {
      return this.tsType2nimType(p.parameter);
    } else {
      const name = convertIdentName(p.name || p.argument?.name);
      const optional = p.optional;
      let typ = 'auto';

      if (p.typeAnnotation) {
        if (optional) {
          this.modules.add('options');
          typ = `none(${this.tsType2nimType(p.typeAnnotation.typeAnnotation)})`;
          return `${name} = ${typ}`;
        } else {
          typ = this.tsType2nimType(p.typeAnnotation.typeAnnotation);
        }
      }
      return `${name}:${typ}`;
    }
  }

  mapDecl(isExport: boolean, m: any) {
    const name = convertIdentName(m.key.name);
    const typ = this.tsType2nimType(m.typeAnnotation.typeAnnotation);
    const comment = this.getComment(m);
    const exportMark = isExport ? '*' : '';
    const cc = comment ? ' ##' + comment.replace(/^\*+/, '').trimEnd() : '';
    return `${name}${exportMark}:${typ}${cc}`;
  }
  getType(node: any): string {
    let typ = '';
    if (node.typeAnnotation) {
      typ = this.tsType2nimType(node.typeAnnotation.typeAnnotation);
    } else if (node.value) {
      typ = this.typeof2type(typeof node.value);
    }
    return typ;
  }
  mapMember(prop: any): string {
    // readonly: undefined,
    // static: undefined,
    // export: undefined,
    const isPub = this.isPub(prop);
    const comment = this.getComment(prop);
    const exportMark = isPub ? '*' : '';
    if (prop.type === TSParameterProperty) {
      const parameter = prop.parameter;
      const name = convertIdentName(parameter.name);
      const typ = this.getType(parameter);

      return `${name}${exportMark}:${typ}${comment}`;
    } else if (prop.type === TSPropertySignature) {
      const name = convertIdentName(prop.key.name);
      const isTSQualifiedName =
        prop.typeAnnotation.typeAnnotation.typeName?.type === AST_NODE_TYPES.TSQualifiedName;
      const typ = this.tsType2nimType(prop.typeAnnotation.typeAnnotation);

      return `${isTSQualifiedName ? '## ' : ''}${name}${exportMark}:${typ}${comment}`;
    } else {
      return this.tsType2nimType(prop);
    }
  }

  transpile() {
    const filePath = this.writer.path;
    const ext = path.extname(filePath);
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath, ext);
    const changed = path.join(dir, basename + '.ts');
    this.ast.body.forEach((node: any) => {
      let content = '';
      try {
        content = this.tsType2nimType(node, 0);
      } catch (e) {
        const start = this.lastNode.loc;
        const end = this.lastNode.loc;
        console.log(e);
        console.log(`file://${changed}:${start.start.line}:${start.start.column}`);
        console.log(`file://${changed}:${end.end.line}:${end.end.column}`);
      }

      this.writer.write(content);
    });
  }

  getOriginalComment(node: any): string | undefined {
    // @ts-ignore
    const comment = this.ast.comments.find(x => {
      // this.log(x.loc,node.loc)
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
  transpilerOptions: TranspilerOptions = { isProject: false, numberAs: 'float' },
  parserOptions = { comment: true, loggerFn: false, loc: true, range: true },
  symbols: { [index: string]: Sym[] } = {}
): { writer: IWriteStream; logger: Subject<any> } {
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirpSync(path.dirname(filePath));
  }
  const ext = path.extname(filePath);
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath, ext);
  const changed = path.join(dir, basename + '.nim');
  const isD = -1 !== changed.indexOf('.d.');
  const writePath = changed.replace(/\.d(?=\.)/g, '_d');
  const writer = fs.createWriteStream(writePath);
  const start = performance.now();
  // @ts-ignore
  // loggerFn:false skip warning:"You are currently running a version of TypeScript which is not officially supported by typescript-estree SUPPORTED TYPESCRIPT VERSIONS: ~3.2.1"
  const ast = parser.parse(code, parserOptions);
  const duration = performance.now() - start;
  const copys = Object.fromEntries(
    Object.keys(symbols).map((key: string) => [key, [...symbols[key]].reverse()])
  );
  const transpiler = new Transpiler(ast, writer, transpilerOptions, copys);
  transpiler.isD = isD;
  writer.on('open', (fd: any) => {
    transpiler.log(`parse time takes:${duration} millisecond `);
    const start = performance.now();
    if (transpiler.isD) {
      writer.write(brideHeader);
    }
    const dur = performance.now() - start;
    transpiler.transpile();
    transpiler.log(`transpile time takes:${dur} millisecond `);
    const start2 = performance.now();
    let preCount = 0;
    if (transpiler.modules.size > 0) {
      const insert = Buffer.from('import ' + Array.from(transpiler.modules).join(',') + '\n\n');
      fs.writeSync(fd, insert, 0, insert.length, 0);
      preCount = insert.length;
    }
    if (transpiler.helpers.size > 0) {
      const insert = Buffer.from(Array.from(transpiler.helpers).join('\n') + '\n');
      fs.writeSync(fd, insert, preCount, insert.length, 0);
    }
    const dur2 = performance.now() - start2;
    transpiler.log(`extro header write time takes:${dur2} millisecond `);
    writer.end();
  });

  return { writer, logger: transpiler.logger };
}
