import { readFileSync } from "fs";
import * as ts from "typescript";
import { fs } from 'memfs';

// function report(this: ts.SourceFile, node: ts.Node, message: string) {
//   const { line, character } = this.getLineAndCharacterOfPosition(node.getStart());
//   console.log(`${this.fileName} (${line + 1},${character + 1}): ${message}`);
// }

function traveseNode(node: ts.Node) {

  switch (node.kind) {
    case ts.SyntaxKind.ForStatement:
    case ts.SyntaxKind.ForInStatement:
    case ts.SyntaxKind.WhileStatement:
    case ts.SyntaxKind.DoStatement:
      if ((node as ts.IterationStatement).statement.kind !== ts.SyntaxKind.Block) {
        // reportFunc(
        //   node,
        //   'A looping statement\'s contents should be wrapped in a block body.'
        // );
      }
      break;

    case ts.SyntaxKind.IfStatement:
      const ifStatement = node as ts.IfStatement;
      if (ifStatement.thenStatement.kind !== ts.SyntaxKind.Block) {
        // reportFunc(ifStatement.thenStatement, 'An if statement\'s contents should be wrapped in a block body.');
      }
      if (
        ifStatement.elseStatement &&
        ifStatement.elseStatement.kind !== ts.SyntaxKind.Block &&
        ifStatement.elseStatement.kind !== ts.SyntaxKind.IfStatement
      ) {
      
      }
      break;

    case ts.SyntaxKind.BinaryExpression:
      // const op = (node as ts.BinaryExpression).operatorToken.kind;
      
      break;
      case ts.SyntaxKind.TypeAliasDeclaration:
        // @ts-ignore
        console.log(node.name.escapedText,node.type.members.length,node.type.members[0])
        break;
  }

  ts.forEachChild(node, traveseNode);
}

export function compile2nim(sourceFile: ts.SourceFile) {
  traveseNode(sourceFile);
}

export function compileByFs(fileName:string){
  ts.createProgram
  const sourceFile = ts.createSourceFile(
    fileName,
    readFileSync(fileName).toString(),
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true
  );
  compile2nim(sourceFile);
}

export function compileByMemo(fileName:string){
  
  const sourceFile = ts.createSourceFile(
    fileName,
    fs.readFileSync(fileName, 'utf8').toString(),
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true
  );
  compile2nim(sourceFile);
}

const typedef = `
export type ImageInfo = {
  /** Image size (width/height). */
  size: number
  /** Path of an image file. */
  filePath: string
}
`
fs.writeFileSync('/typedef.ts', typedef);
compileByMemo('/typedef.ts')