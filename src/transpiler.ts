import * as parser from 'typescript-estree';
import * as indentString from 'indent-string';
import { fs } from 'memfs';
import { IWriteStream } from 'memfs/lib/volume';
import { Program } from 'typescript-estree/dist/estree/spec';

function tsType2nimType(typ: string): string {
  let result: string = ""
  switch (typ) {
    case parser.AST_NODE_TYPES.TSNumberKeyword:
      result = "int";
      break;
    case parser.AST_NODE_TYPES.TSStringKeyword:
      result = "string";
      break;
  }
  return result;
}

class Transpiler {
  constructor(protected ast: Program, protected writer: IWriteStream) {

  }
  handleExportNamedDeclaration(node: any) {
    if (node.declaration.type === parser.AST_NODE_TYPES.TSTypeAliasDeclaration) {
      const typeName = node.declaration.id.name;

      let members: string[] = []
      if (node.declaration.typeAnnotation.type === parser.AST_NODE_TYPES.TSTypeLiteral) {
        members = node.declaration.typeAnnotation.members.map((m: any) => {
          const name = m.key.name
          const typ = tsType2nimType(m.typeAnnotation.typeAnnotation.type)
          const comment = this.getComment(m)
          return `${name}*:${typ}${comment ? " #" + comment.replace(/^\*+/,"").trimEnd() :"" }`
        })
      }
      this.writer.write(`type ${typeName}* = object of RootObj\n`)

      this.writer.write(members.map(x => indentString(x, 2)).join("\n"))
      this.writer.write("\n\n")

    }
  }

  transpile() {
    this.ast.body.forEach((node: any) => {
      switch (node.type) {
        case parser.AST_NODE_TYPES.ExportNamedDeclaration:
          this.handleExportNamedDeclaration(node);
          break;
      }
    })
  }

  getComment(node: any): string | undefined {
    // @ts-ignore
    const comment = this.ast.comments.find( x=> x.loc.end.line === node.loc.start.line - 1)
    return comment?.value
  }
}


export function transpile(filePath = "/unnamed.nim", code: string, options = { comment: true }): IWriteStream {
  const writer = fs.createWriteStream(filePath);
  writer.on("open", (fd) => {
    const ast = parser.parse(code, options);
    const transpiler = new Transpiler(ast,writer);
    transpiler.transpile();
    writer.end()
  })

  return writer;
}
