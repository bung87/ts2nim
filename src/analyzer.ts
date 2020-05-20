import * as ts from 'typescript';
import * as path from 'path';

// https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
export interface Sym {
  name: string;
  type: string;
  loc: {
    pos: number;
    end: number;
  };
}

export class Analyzer {
  program: ts.Program;
  public checker: ts.TypeChecker;
  public symbols: Sym[] = [];
  constructor(fileNames: string[], compilerOptions: ts.CompilerOptions = {}) {
    this.program = ts.createProgram(fileNames, compilerOptions);
    this.checker = this.program.getTypeChecker();
  }

  annalize() {
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        if (!sourceFile.fileName.includes('node_modules' + path.sep)) {
          ts.forEachChild(sourceFile, this.visit.bind(this));
        }
      }
    }
  }

  serializeSymbol(symbol: ts.Symbol, loc: { pos: number; end: number }): Sym {
    return {
      loc,
      name: symbol.getName(),
      type: this.checker.typeToString(
        this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
        // undefined,
        // ts.TypeFormatFlags.SuppressAnyReturnType |
        // ts.TypeFormatFlags.UseTypeOfFunction |
        // ts.TypeFormatFlags.NoTypeReduction
        // ts.TypeFormatFlags.UseFullyQualifiedType
      ),
    };
  }

  visit(node: ts.Node) {
    let symbol;
    try {
      // @ts-ignore
      symbol = this.checker.getSymbolAtLocation(node.name);
    } catch (e) {
      console.error(e);
    }
    if (symbol) {
      this.symbols.push(this.serializeSymbol(symbol, { pos: node.pos, end: node.end }));
    }
    node.forEachChild(this.visit.bind(this));
  }
}
