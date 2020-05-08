import * as parser from 'typescript-estree';
import * as indentString from 'indent-string';
import { fs } from 'memfs';
import { IWriteStream } from 'memfs/lib/volume';
import { Program } from 'typescript-estree/dist/estree/spec';
import {doWhile} from './helpers'
let modules = new Set<string>();
let helpers =  new Set<string>();

function nimModules() {
  return modules
}

function nimHelpers(){
  return helpers
}

function arraysEqual(a: any[], b: any[]) {
  if (a === b) { return true; }
  if (a == null || b == null) { return false; }
  if (a.length !== b.length) { return false; }

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) { return false; }
  }
  return true;
}

function convertLogicalExpression(expression: any): string {
  let result = ""
  let op = ""
  switch (expression.operator) {
    case "&&":
      op = "and"
      break;
    case "||":
      op = "or"
      break;
    default:
      op = expression.operator

  }
  result = `${tsType2nimType(expression.left)} ${op} ${tsType2nimType(expression.right)}`
  return result
}

function tsType2nimType(typeAnnotation: any): string {
  let result: string = ""
  const typ = typeAnnotation.type
  switch (typ) {
    case parser.AST_NODE_TYPES.Literal:
      if (typeof typeAnnotation.value === "string") {
        result = `"${typeAnnotation.value}"`
      } else if (typeAnnotation.value === null) {
        result = "nil"
      } else {
        result = `${typeAnnotation.value}`
      }
      break;
    case parser.AST_NODE_TYPES.MemberExpression:
      if (typeAnnotation.property === "length") {
        result = `${tsType2nimType(typeAnnotation.object)}.len`
      } else {
        result = `${tsType2nimType(typeAnnotation.object)}.${tsType2nimType(typeAnnotation.property)}`
      }

      break;
    case parser.AST_NODE_TYPES.Identifier:
      if (typeAnnotation.name === "Promise") {
        result = "Future"
      } else if (typeAnnotation.name === "length") {
        result = "len"
      }
      else {
        result = typeAnnotation.name
      }

      break;
    case parser.AST_NODE_TYPES.TSUnionType:
      const types = typeAnnotation.types.map((x: any) => x.type)
      if (arraysEqual(types, ["TSTypeReference", "TSNullKeyword"])) {
        result = `${typeAnnotation.types[0].typeName.name}`
      }
      break;
    case parser.AST_NODE_TYPES.TSNumberKeyword:
      result = "int";
      break;
    case parser.AST_NODE_TYPES.TSStringKeyword:
      result = "string";
      break;
    case parser.AST_NODE_TYPES.TSBooleanKeyword:
      result = "bool"
      break;
    case parser.AST_NODE_TYPES.TSArrayType:
      result = `seq[${tsType2nimType(typeAnnotation.elementType)}]`
      break;
    case parser.AST_NODE_TYPES.TSTypeReference:
      if (typeAnnotation?.typeParameters?.type === parser.AST_NODE_TYPES.TSTypeParameterInstantiation) {
        const genericName = tsType2nimType(typeAnnotation.typeName)
        const params = typeAnnotation.typeParameters.params
        result = `${genericName}[${params.map((x: any) => tsType2nimType(x)).join(",")}]`
      } else {
        result = typeAnnotation.typeName.name
      }

      break;
    case parser.AST_NODE_TYPES.AwaitExpression:
      if (typeAnnotation.argument.type === parser.AST_NODE_TYPES.CallExpression) {
        result = `await ${convertCallExpression(typeAnnotation)}`
      }
      break;
    case parser.AST_NODE_TYPES.ArrowFunctionExpression:
      const isGenerator = typeAnnotation.generator;
      const isAsync = typeAnnotation.async;
      const isExpression = typeAnnotation.expression;
      const params = typeAnnotation.params;
      const body = typeAnnotation.body
      const nimpa = params.map((p: any) => {
        const name = p.name
        const typ = p.typeAnnotation ? tsType2nimType(p.typeAnnotation.typeAnnotation) : "auto"
        return `${name}${typ ? ":" + typ : ""}`
      })
      let returnType = "auto"
      const returnStatement = typeAnnotation.body.body.find((x: any) => x.type === parser.AST_NODE_TYPES.ReturnStatement)
      if (returnStatement) {
        if (returnStatement.argument.type === parser.AST_NODE_TYPES.BinaryExpression) {
          if (-1 !== returnStatement.argument.operator.indexOf("==")) {
            returnType = "bool"
          } else if (["+", "-", "*", "/"].includes(returnStatement.argument.operator)) {
            returnType = "int"
          }
        }
      }
      if (isAsync) {
        nimModules().add("asyncdispatch")
      }
      const pragma = isAsync ? "{.async.}" : ""
      result += `proc (${nimpa.join(",")}): ${returnType} ${pragma ? pragma + " " : ""}= `

      // @TODO remove top level return variable
      let current: any
      while (current = body.body.shift()) {
        result += tsType2nimType(current)
      }
      break;
    case parser.AST_NODE_TYPES.ReturnStatement:
      switch (typeAnnotation.argument.type) {
        case parser.AST_NODE_TYPES.BinaryExpression:
          result = convertBinaryExpression(typeAnnotation.argument)
          break;
        case parser.AST_NODE_TYPES.CallExpression:
          result = `${convertCallExpression(typeAnnotation.argument)}`
          break;
        default:
          console.log("tsType2nimType:ReturnStatement", typeAnnotation)
          break;
      }
      break;
    case parser.AST_NODE_TYPES.BinaryExpression:
      result = convertBinaryExpression(typeAnnotation)
      break;
    case parser.AST_NODE_TYPES.UnaryExpression:
      result = convertUnaryExpression(typeAnnotation)
      break;
    case parser.AST_NODE_TYPES.LogicalExpression:
      result = convertLogicalExpression(typeAnnotation)
      break;
    case parser.AST_NODE_TYPES.AssignmentExpression:
      result = `${tsType2nimType(typeAnnotation.left)} = ${tsType2nimType(typeAnnotation.right)}`
      break;
    case parser.AST_NODE_TYPES.CallExpression:
      result = convertCallExpression(typeAnnotation)
      break;
    default:
      console.log("tsType2nimType", typeAnnotation)
      break;
  }
  return result;
}

function transCommonMemberExpression(obj: string, mem: string, args: any[] = []): string {
  let result = ""
  let func = ""
  if (mem === "push") {
    func = `${obj}.add`
  } else if (mem === "length") {
    func = `${obj}.len`
  } else if (obj === "fs" && mem === "readFileSync") {
    func = `readFile`
    nimModules().add("os")
  } else if (obj === "path" && mem === "join") {
    nimModules().add("os")
    return `${args.map((x: string) => x.replace("+", "&")).join(" / ")}`
  } else if (mem === "some") {
    nimModules().add("sequtils")
    func = `${obj}.any`
  } else if (mem === "sort") {
    nimModules().add("algorithm")
    func = `${obj}.sorted`
  } else {
    func = `${obj}.${mem}`
  }
  result = `${func}(${args.join(",")})`
  return result
}

function convertConditionalExpression(expression: any): string {
  let result = ""
  result = `if ${tsType2nimType(expression.test)}: ${tsType2nimType(expression.consequent)} else: ${tsType2nimType(expression.alternate)}`
  return result
}

function convertCallExpression(node: any): string {
  let result = ""
  const theNode = node.expression || node.init || node.argument || node
  switch (theNode.callee.type) {
    case parser.AST_NODE_TYPES.MemberExpression:
      {
        let mem: string = ""

        switch (theNode.callee.property.type) {
          case parser.AST_NODE_TYPES.CallExpression:
            mem = convertCallExpression(theNode.callee.property)
            break;
          default:
            mem = theNode.callee.property.name
            break;
        }
        let obj: string = ""
        switch (theNode.callee.object.type) {
          case parser.AST_NODE_TYPES.CallExpression:
            obj = convertCallExpression(theNode.callee.object)
            break;
          default:
            obj = theNode.callee.object.name
            break;
        }
        const args = theNode.arguments.map((x: any) => tsType2nimType(x))
        result = transCommonMemberExpression(obj, mem, args);
      }
      break;
    case parser.AST_NODE_TYPES.Identifier:
      {

        const func = theNode.callee.name
        if (func === "Error") {
          const args = theNode.arguments.map((x: any) => tsType2nimType(x))
          result = `newException(Exception,${args.join(",")})`
        } else {
          const args = theNode.arguments.map((x: any) => tsType2nimType(x))
          result = `${func}(${args.join(",")})`
        }

      }
      break;
    default:
      console.log("convertCallExpression", node)
      break;
  }
  return result
}

function convertBinaryExpression(expression: any): string {
  let result = ""
  let op = ""
  switch (expression.operator) {
    case "===":
      op = "=="
      break;
    case "!==":
      op = "!="
      break;
    case "+":
      const hasString = typeof expression.left.value === "string" || typeof expression.right.value === "string"
      op = hasString ? "&" : "+"
      break;
    default:
      op = expression.operator

  }
  result = `${tsType2nimType(expression.left)} ${op} ${tsType2nimType(expression.right)}`
  return result
}

function convertVariableDeclarator(node: any): string {
  console.log(node)
  let result = ""
  if (!node.init) {
    return node.id.name
  }
  switch (node.init.type) {
    case parser.AST_NODE_TYPES.CallExpression:
      result = convertCallExpression(node)
      break;
    case parser.AST_NODE_TYPES.ArrayExpression:
      const eles = node.init.elements
      result = `@[${eles.map((x: any) => tsType2nimType(x))}]`
      break;
    case parser.AST_NODE_TYPES.BinaryExpression:
      result = convertBinaryExpression(node.init)
      break;
    case parser.AST_NODE_TYPES.Literal:
      result = tsType2nimType(node.init)
      break;
    case parser.AST_NODE_TYPES.ConditionalExpression:
      result = convertConditionalExpression(node.init)
      break;
    default:
      result = tsType2nimType(node.init)
      console.log("convertVariableDeclarator:default:", node)
      break;
  }

  return result
}

function convertUnaryExpression(node: any) {
  let result = ""
  let op = ""
  switch (node.operator) {
    case "!":
      op = "not"
      break;
    default:
      op = ""
      break;
  }
  result = `${op} ${tsType2nimType(node.argument)}`
  return result
}

function convertVariableDeclaration(node: any): string {
  // @TODO using let for const primtive type?
  const nimKind = node.kind === "const" ? "var" : "var"
  const vars = node.declarations.map((x: any) => {
    if (x.id.typeAnnotation) {
      const typ = tsType2nimType(x.id.typeAnnotation.typeAnnotation)
      return `${x.id.name}:${typ} = ${convertVariableDeclarator(x)}`
    } else {
      return `${x.id.name} = ${convertVariableDeclarator(x)}`
    }
  })
  const r = `${nimKind} ${vars.join(",")}`
  return r
}

class Transpiler {
  constructor(protected ast: Program, protected writer: IWriteStream) {
    modules = new Set()
    helpers = new Set()
  }

  writeComment(node: any, indentLevel = 1) {
    const comment = this.getComment(node)?.replace(/^\s*\*+/gm, "").trim() || ""
    if (comment.length > 0) {
      this.writeLine("## " + comment.split("\n").join("\n##"), indentLevel)
    }
  }

  writeNode(node: any, indentLevel = 0) {
    switch (node.type) {
      case parser.AST_NODE_TYPES.ExpressionStatement:
        {
          this.writeComment(node, indentLevel)
          switch (node.expression.type) {
            case parser.AST_NODE_TYPES.CallExpression:
              this.writeLine(convertCallExpression(node), indentLevel)
              break;
            case parser.AST_NODE_TYPES.AssignmentExpression:
              const result = `${tsType2nimType(node.expression.left)} = ${tsType2nimType(node.expression.right)}`
              this.writeLine(result, indentLevel)
              break;
            default:
              console.log("writeNode:ExpressionStatement", node.expression)
              break;
          }
        }
        break;
      case parser.AST_NODE_TYPES.VariableDeclaration:
        {
          this.writeComment(node, indentLevel)

          this.writeLine(convertVariableDeclaration(node), indentLevel);
        }
        break;
      case parser.AST_NODE_TYPES.ForOfStatement:
        const leftKind = node.left.kind // eg. 'const'
        const rightName = node.right.name
        const result = `for ${node.left.declarations.map((y: any) => convertVariableDeclarator(y))} in ${rightName}:`
        this.writeLine(result, indentLevel)
        node.body.body.forEach((x: any) => {
          this.writeNode(x, indentLevel + 1)
        });
        break;
      case parser.AST_NODE_TYPES.ReturnStatement:
        if (node.argument.type === parser.AST_NODE_TYPES.CallExpression) {
          this.writeLine(convertCallExpression(node), indentLevel)
        } else {
          this.writeLine("return " + tsType2nimType(node.argument), indentLevel)
          console.log("writeNode:ReturnStatement:", node)
        }
        break;
      case parser.AST_NODE_TYPES.ForStatement:
        this.writeLine(convertVariableDeclaration(node.init), indentLevel);
        const test = `while ${convertBinaryExpression(node.test)}:`
        this.writeLine(test, indentLevel);
        node.body.body.forEach((x: any) => {
          this.writeNode(x, indentLevel + 1)
        })
        break;
      case parser.AST_NODE_TYPES.DoWhileStatement:
        
        {
          nimHelpers().add(doWhile)
          let test = tsType2nimType(node.test)
          this.writeLine(`doWhile ${test}:`, indentLevel);
          node.body.body.forEach((x: any) => {
            this.writeNode(x, indentLevel + 1)
          })
        }
        break;
      case parser.AST_NODE_TYPES.ThrowStatement:
        this.writeLine(`raise ` + convertCallExpression(node), indentLevel)
        break;
      case parser.AST_NODE_TYPES.IfStatement:
        {
          const test = tsType2nimType(node.test)
          this.writeLine(`if ${test}:`, indentLevel)
          node.consequent.body.forEach((x: any) => {
            this.writeNode(x, indentLevel + 1)
          })
        }
        break;
      default:
        console.log("writeNode:default:", node)
        break;
    }
  }

  writeLine(value: string, indentLevel = 0) {
    const indentSpaces = 2
    this.writer.write(indentString(value, indentSpaces * indentLevel) + "\n")
  }

  writeLn() {
    this.writer.write("\n")
  }

  handleFunction(node: any, pname: string, isExport = true, indentLevel = 0) {
    const name = node?.id?.name || pname;
    const returnType = node.returnType ? tsType2nimType(node.returnType.typeAnnotation) : "auto";
    const isGenerator = node.generator;
    const isAsync = node.async;
    const isExpression = node.expression;
    const params = node.params;
    const body = node.body
    const nimpa = params.map((p: any) => {
      const name = p.name
      const typ = tsType2nimType(p.typeAnnotation.typeAnnotation)
      return `${name}:${typ}`
    })
    if (isAsync) {
      nimModules().add("asyncdispatch")
    }
    const exportMark = isExport ? "*" : "";
    const pragma = isAsync ? "{.async.}" : ""
    this.writeLine(`proc ${name}${exportMark}(${nimpa.join(",")}): ${returnType} ${pragma ? pragma + " " : ""}= `, indentLevel)
    this.writeComment(node, 1)
    this.writeLn()
    // @TODO remove top level return variable
    let current: any
    while (current = body.body.shift()) {
      this.writeNode(current, indentLevel + 1);
    }
  }

  handleDeclaration(declaration: any, isExport = true, indentLevel = 0) {
    if (declaration.type === parser.AST_NODE_TYPES.TSTypeAliasDeclaration) {
      const typeName = declaration.id.name;

      let members: string[] = []
      if (declaration.typeAnnotation.type === parser.AST_NODE_TYPES.TSTypeLiteral) {
        members = declaration.typeAnnotation.members.map((m: any) => {
          const name = m.key.name
          const typ = tsType2nimType(m.typeAnnotation.typeAnnotation)
          const comment = this.getComment(m)
          const exportMark = isExport ? "*" : "";
          return `${name}${exportMark}:${typ}${comment ? " ##" + comment.replace(/^\*+/, "").trimEnd() : ""}`
        })
      }
      this.writer.write(`type ${typeName}* = object of RootObj\n`)

      this.writer.write(members.map(x => indentString(x, 2)).join("\n"))
      this.writer.write("\n\n")

    } else if (declaration.type === parser.AST_NODE_TYPES.VariableDeclaration) {

      declaration.declarations.map((m: any) => {

        switch (m.init.type) {
          case parser.AST_NODE_TYPES.ArrowFunctionExpression:
            {
              this.handleFunction(m.init, m.id.name, isExport)
            }
            break;
          case parser.AST_NODE_TYPES.ConditionalExpression:
            this.writeLine(convertVariableDeclaration(declaration))
            break;
          default:
            this.writeLine(convertVariableDeclaration(declaration))
            // console.log("handleDeclaration:VariableDeclaration:default", m)
            break;
        }
      })
    } else if (declaration.type === parser.AST_NODE_TYPES.FunctionDeclaration) {
      this.handleFunction(declaration, "", false, indentLevel)
    } else {
      console.log("handleExportNamedDeclaration:else", declaration)
    }
  }

  transpile() {

    this.ast.body.forEach((node: any) => {
      switch (node.type) {
        case parser.AST_NODE_TYPES.ExportNamedDeclaration:
          this.handleDeclaration(node.declaration, true);
          break;
        case parser.AST_NODE_TYPES.VariableDeclaration:
          this.handleDeclaration(node, false);
          break;
        case parser.AST_NODE_TYPES.ExpressionStatement:
          this.writeNode(node, 0)
          break;
        case parser.AST_NODE_TYPES.FunctionDeclaration:
          this.handleDeclaration(node)
          break;
        default:
          this.writeNode(node, 0)
          console.log("transpile:this.ast.body.forEach:default")
          break;
      }
    })
  }

  getComment(node: any): string | undefined {
    // @ts-ignore
    const comment = this.ast.comments.find(x => {
      // console.log(x.loc,node.loc)
      // @TODO could be same line,but it returns wrong
      // eg. { start: { line: 23, column: 27 }, end: { line: 23, column: 55 } } { start: { line: 24, column: 2 }, end: { line: 24, column: 29 } }
      return x.loc.end.line === node.loc.start.line - 1
    })
    return comment?.value
  }
}


export function transpile(filePath = "/unnamed.nim", code: string, options = { comment: true, loggerFn: false }): IWriteStream {
  const writer = fs.createWriteStream(filePath);
  writer.on("open", (fd) => {
    // @ts-ignore
    // loggerFn:false skip warning:"You are currently running a version of TypeScript which is not officially supported by typescript-estree SUPPORTED TYPESCRIPT VERSIONS: ~3.2.1"
    const ast = parser.parse(code, options);
    const transpiler = new Transpiler(ast, writer);
    transpiler.transpile();
    let preCount = 0
    if (nimModules().size > 0) {
      const insert = Buffer.from("import " + Array.from(nimModules()).join(",") + "\n\n")
      fs.writeSync(fd, insert, 0, insert.length, 0)
      preCount = insert.length
    }
    if(nimHelpers().size > 0){
      const insert = Buffer.from(Array.from(nimHelpers()).join("\n") + "\n")
      fs.writeSync(fd, insert, preCount, insert.length, 0)
    }

    writer.end()
  })

  return writer;
}
