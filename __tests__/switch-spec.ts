import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle switch', done => {
  const typedef = `switch (theNode.callee.object.type) {
  case parser.AST_NODE_TYPES.CallExpression:
    obj = this.convertCallExpression(theNode.callee.object);
    break;
  default:
    obj = theNode.callee.object.name;
    break;
  }`;
  const expected = `case theNode.callee.\`object\`.\`type\`:
  of parser.AST_NODE_TYPES.CallExpression:
    obj = self.convertCallExpression(theNode.callee.\`object\`)
  else:
    obj = theNode.callee.\`object\`.name
`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
