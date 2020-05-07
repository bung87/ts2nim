import * as parser from 'typescript-estree';
import * as indentString from 'indent-string';
import { fs } from 'memfs';
import { IWriteStream } from 'memfs/lib/volume';
import { Program } from 'typescript-estree/dist/estree/spec';
let modules = new Set<string>();
function nimModules() {
  return modules
}

function tsType2nimType(typeAnnotation: any): string {
  let result: string = ""
  const typ = typeAnnotation.type
  switch (typ) {
    case parser.AST_NODE_TYPES.Literal:
      switch (typeof typeAnnotation.value) {
        case "string":
          result = `"${typeAnnotation.value}"`
          break;
        default:
          result = `${typeAnnotation.value}`
          break;
      }
      break;
    case parser.AST_NODE_TYPES.MemberExpression:
      result = `${tsType2nimType(typeAnnotation.object)}.${tsType2nimType(typeAnnotation.property)}`
      break;
    case parser.AST_NODE_TYPES.Identifier:
      if (typeAnnotation.name === "Promise") {
        result = "Future"
      } else {
        result = typeAnnotation.name
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
      var returnType = "auto"
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
      var current: any
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
    default:
      console.log("tsType2nimType", typeAnnotation)
      break;
  }
  return result;
}

function transCommonMemberExpression(obj: string, mem: string): string {
  var result = ""
  if (mem === "push") {
    result = `${obj}.add`
  } else if (obj === "fs" && mem === "readFileSync") {
    result = `readFile`
    nimModules().add("os")
  } else if (mem === "some") {
    nimModules().add("sequtils")
    result = `${obj}.any`
  } else if (mem === "sort") {
    nimModules().add("algorithm")
    result = `${obj}.sorted`
  } else {
    result = `${obj}.${mem}`
  }
  return result
}

function convertConditionalExpression(expression: any): string {
  var result = ""
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
        var obj: string = ""
        switch (theNode.callee.object.type) {
          case parser.AST_NODE_TYPES.CallExpression:
            obj = convertCallExpression(theNode.callee.object)
            break;
          default:
            obj = theNode.callee.object.name
            break;
        }
        const args = theNode.arguments.map((x: any) => tsType2nimType(x))
        const func = transCommonMemberExpression(obj, mem);
        result = `${func}(${args.join(",")})`
      }
      break;
    case parser.AST_NODE_TYPES.Identifier:
      {
        const func = theNode.callee.name
        const args = theNode.arguments.map((x: any) => tsType2nimType(x))
        result = `${func}(${args.join(",")})`
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
  var op = ""
  switch (expression.operator) {
    case "===":
      op = "=="
      break;
    case "!==":
      op = "!="
      break;
    default:
      op = expression.operator

  }
  result = `${tsType2nimType(expression.left)} ${op} ${tsType2nimType(expression.right)}`
  return result
}

function convertVariableDeclarator(node: any): string {

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
      console.log("convertVariableDeclarator:default:", node)
      break;
  }

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
  }

  writeComment(node: any, indentLevel = 1) {
    const comment = this.getComment(node)?.replace(/^\s*\*+/gm, "").trim() || ""
    if (comment.length > 0) {
      this.writeLine("## " + comment.split("\n").join("\n##"), indentLevel)
    }
  }

  writeNode(node: any, indentLevel = 1) {
    switch (node.type) {
      case parser.AST_NODE_TYPES.ExpressionStatement:
        {
          this.writeComment(node, indentLevel)
          switch (node.expression.type) {
            case parser.AST_NODE_TYPES.CallExpression:
              this.writeLine(convertCallExpression(node), indentLevel)
              break;
            default:
              console.log("writeNode:ExpressionStatement", node)
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
        })
        break;
      case parser.AST_NODE_TYPES.ReturnStatement:
        if (node.argument.type === parser.AST_NODE_TYPES.Identifier) {
          this.writeLine(`return ${node.argument.name}`)
        } else if (node.argument.type === parser.AST_NODE_TYPES.CallExpression) {
          this.writeLine(convertCallExpression(node), indentLevel)

        } else {
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
      default:
        console.log("writeNode:default:", node)
        break;
    }
  }

  writeLine(value: string, indentLevel = 1) {
    const indentSpaces = 2
    this.writer.write(indentString(value, indentSpaces * indentLevel) + "\n")
  }

  writeLn() {
    this.writer.write("\n")
  }

  handleDeclaration(declaration: any, isExport = true) {
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
        const name = m.id.name;
        const returnType = m.init.returnType ? tsType2nimType(m.init.returnType.typeAnnotation) : "auto";
        switch (m.init.type) {
          case parser.AST_NODE_TYPES.ArrowFunctionExpression:
            {
              const isGenerator = m.init.generator;
              const isAsync = m.init.async;
              const isExpression = m.init.expression;
              const params = m.init.params;
              const body = m.init.body
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
              this.writeLine(`proc ${name}${exportMark}(${nimpa.join(",")}): ${returnType} ${pragma ? pragma + " " : ""}= `, 0)
              this.writeComment(m)
              this.writeLn()
              // @TODO remove top level return variable
              var current: any
              while (current = body.body.shift()) {

                this.writeNode(current);
              }
            }
            break;
          case parser.AST_NODE_TYPES.ConditionalExpression:
            console.log("handleDeclaration:ConditionalExpression", m)
            this.writeLine(convertVariableDeclaration(declaration))
            break;
          default:

            console.log("handleDeclaration:VariableDeclaration:default", m)
            break;
        }
      })
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
        default:
          console.log("transpile:this.ast.body.forEach", node)
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


export function transpile(filePath = "/unnamed.nim", code: string, options = { comment: true }): IWriteStream {
  const writer = fs.createWriteStream(filePath);
  writer.on("open", (fd) => {
    const ast = parser.parse(code, options);
    const transpiler = new Transpiler(ast, writer);
    transpiler.transpile();
    if (nimModules().size > 0) {
      const insert = Buffer.from("import " + Array.from(nimModules()).join(",") + "\n\n")
      fs.writeSync(fd, insert, 0, insert.length, 0)
    }

    writer.end()
  })

  return writer;
}
