import * as ts from 'typescript';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';

// https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API

const src = ts.sys.getCurrentDirectory();
export class Analyzer {
  program: ts.Program;
  checker: ts.TypeChecker;
  constructor(fileNames: string[], compilerOptions: ts.CompilerOptions = {}) {
    this.program = ts.createProgram(fileNames, compilerOptions);
    this.checker = this.program.getTypeChecker();
  }

  annalize() {
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        if (
          sourceFile.fileName.startsWith(src) &&
          !sourceFile.fileName.includes('node_modules' + path.sep)
        ) {
          ts.forEachChild(sourceFile, this.visit.bind(this));
          console.log(sourceFile.fileName);
        }
      }
    }
  }

  serializeSymbol(symbol: ts.Symbol) {
    return {
      name: symbol.getName(),
      type: this.checker.typeToString(
        this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
      ),
    };
  }

  visit(node: ts.Node) {
    try {
      // @ts-ignore
      const symbol = this.checker.getSymbolAtLocation(node.name);
      if (symbol) {
        const symbolTyp = this.checker.typeToString(
          this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
        );
        console.log(this.serializeSymbol(symbol), symbolTyp);
      }
    } catch (e) {}
    ts.forEachChild(node, this.visit.bind(this));
  }
}

glob(
  '*.ts',
  { root: ts.sys.getCurrentDirectory(), matchBase: true, ignore: ['**/node_modules/**'] },
  (err: Error | null, files: string[]) => {
    console.log(files);
    const anayzer = new Analyzer(files);
    anayzer.annalize();
  }
);
