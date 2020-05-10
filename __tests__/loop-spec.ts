import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle do while and union type', done => {
  const typedef = `/**
    * Finds the matching node, starting at \`node\` and looking at the subsequent
    * siblings if a key is used.
    * @param matchNode The node to start looking at.
    * @param nameOrCtor The name or constructor for the Node.
    * @param key The key used to identify the Node.
    * @returns The matching Node, if any exists.
    */
    function getMatchingNode(
     matchNode: Node | null,
     nameOrCtor: NameOrCtorDef,
     key: Key
    ): Node | null {
     if (!matchNode) {
       return null;
     }
    
     let cur: Node | null = matchNode;
    
     do {
       if (matches(cur, nameOrCtor, key)) {
         return cur;
       }
     } while (key && (cur = cur.nextSibling));
    
     return null;
    }`;
  const expected = `template doWhile(a, b: untyped): untyped =
  b
  while a:
    b

proc getMatchingNode(matchNode:Node,nameOrCtor:NameOrCtorDef,key:Key): Node = 
  ## Finds the matching node, starting at \`node\` and looking at the subsequent
  ## siblings if a key is used.
  ## @param matchNode The node to start looking at.
  ## @param nameOrCtor The name or constructor for the Node.
  ## @param key The key used to identify the Node.
  ## @returns The matching Node, if any exists.

  if not matchNode:
    return nil
  var cur:Node = matchNode
  doWhile key and cur = cur.nextSibling:
    if matches(cur,nameOrCtor,key):
      return cur
  return nil

`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
