import * as parser from 'typescript-estree';
import * as indentString from 'indent-string';
import { fs } from 'memfs';
import { IWriteStream } from 'memfs/lib/volume';


function tsType2nimType(typ:string):string{
  let result:string = ""
  switch(typ){
    case parser.AST_NODE_TYPES.TSNumberKeyword:
    result = "int";
    break;
    case parser.AST_NODE_TYPES.TSStringKeyword:
    result = "string";
    break;
  }
  return result;
}

function handleExportNamedDeclaration(node:any,writer:IWriteStream){
  if(node.declaration.type === parser.AST_NODE_TYPES.TSTypeAliasDeclaration){
    const typeName = node.declaration.id.name;
   
    let members:string[] = []
    if(node.declaration.typeAnnotation.type === parser.AST_NODE_TYPES.TSTypeLiteral){
       members = node.declaration.typeAnnotation.members.map( (m:any) => {
        const name = m.key.name
        const typ = tsType2nimType(m.typeAnnotation.typeAnnotation.type)
        return `${name}*:${typ}`
      })
    }
    writer.write(`type ${typeName}* = object of RootObj\n`)
    
    writer.write(members.map( x=> indentString(x, 2) ).join("\n"))
    writer.write("\n\n")
  
  }
}

export function transpile(filePath="/unnamed.nim",code:string,options = {}):IWriteStream{
  const writer = fs.createWriteStream(filePath);
  writer.on("open", (fd)=>{
    const ast = parser.parse(code,options);
    ast.body.forEach( (node:any) => {
      switch(node.type){
        case parser.AST_NODE_TYPES.ExportNamedDeclaration:
        handleExportNamedDeclaration(node,writer);
        break;
      }
    })
       
    writer.end()
  })

  return writer;
}
