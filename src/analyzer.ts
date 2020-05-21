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
  public symbols: { [index: string]: Sym[] } = {};
  private sourceFiles: ts.SourceFile[];
  private idx = '';
  constructor(fileNames: string[], compilerOptions: ts.CompilerOptions = {}) {
    this.program = ts.createProgram(fileNames, compilerOptions);
    this.checker = this.program.getTypeChecker();
    this.sourceFiles = this.program
      .getSourceFiles()
      .filter(
        (sourceFile: ts.SourceFile) =>
          !sourceFile.isDeclarationFile && !sourceFile.fileName.includes('node_modules' + path.sep)
      );
  }

  annalize() {
    for (const sourceFile of this.sourceFiles) {
      const idx = this.sourceFile2pathWithoutExt(sourceFile);
      this.idx = idx;
      this.symbols[idx] = [];
      ts.forEachChild(sourceFile, this.visit.bind(this));
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

  sourceFile2pathWithoutExt(sourceFile: ts.SourceFile): string {
    const filePath = sourceFile.fileName;
    const ext = path.extname(filePath);
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath, ext);
    const changed = path.join(dir, basename);
    return changed;
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
      this.symbols[this.idx].push(this.serializeSymbol(symbol, { pos: node.pos, end: node.end }));
    }
    node.forEachChild(this.visit.bind(this));
  }
}
