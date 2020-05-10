import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should handle generic,spread,try', done => {
  const typedef = `/**
* Returns a patcher function that sets up and restores a patch context,
* running the run function with the provided data.
* @param run The function that will run the patch.
* @param patchConfig The configuration to use for the patch.
* @returns The created patch function.
*/
function createPatcher<T, R>(
    run: PatchFunction<T, R>,
    patchConfig: PatchConfig = {}
): PatchFunction<T, R> {
    const { matches = defaultMatchFn } = patchConfig;

    const f: PatchFunction<T, R> = (node, fn, data) => {
    const prevContext = context;
    const prevDoc = doc;
    const prevFocusPath = focusPath;
    const prevArgsBuilder = argsBuilder;
    const prevAttrsBuilder = attrsBuilder;
    const prevCurrentNode = currentNode;
    const prevCurrentParent = currentParent;
    const prevMatchFn = matchFn;
    let previousInAttributes = false;
    let previousInSkip = false;

    doc = node.ownerDocument;
    context = new Context();
    matchFn = matches;
    argsBuilder = [];
    attrsBuilder = [];
    currentNode = null;
    currentParent = node.parentNode;
    focusPath = getFocusedPath(node, currentParent);

    if (DEBUG) {
        previousInAttributes = setInAttributes(false);
        previousInSkip = setInSkip(false);
        updatePatchContext(context);
    }

    try {
        const retVal = run(node, fn, data);
        if (DEBUG) {
        assertVirtualAttributesClosed();
        }

        return retVal;
    } finally {
        context.notifyChanges();

        doc = prevDoc;
        context = prevContext;
        matchFn = prevMatchFn;
        argsBuilder = prevArgsBuilder;
        attrsBuilder = prevAttrsBuilder;
        currentNode = prevCurrentNode;
        currentParent = prevCurrentParent;
        focusPath = prevFocusPath;

        // Needs to be done after assertions because assertions rely on state
        // from these methods.
        if (DEBUG) {
        setInAttributes(previousInAttributes);
        setInSkip(previousInSkip);
        updatePatchContext(context);
        }
    }
    };
    return f;
}`;
  const expected = `proc createPatcher[T,R](run:PatchFunction[T,R],patchConfig:PatchConfig = PatchConfig()): PatchFunction[T,R] = 
  ## Returns a patcher function that sets up and restores a patch context,
  ## running the run function with the provided data.
  ## @param run The function that will run the patch.
  ## @param patchConfig The configuration to use for the patch.
  ## @returns The created patch function.

  var matches = patchConfig.matches
  if isNil(matches):
    matches = defaultMatchFn
  var f:PatchFunction[T,R] = proc (node:auto,fn:auto,data:auto): auto = 
    var prevContext = context
    var prevDoc = doc
    var prevFocusPath = focusPath
    var prevArgsBuilder = argsBuilder
    var prevAttrsBuilder = attrsBuilder
    var prevCurrentNode = currentNode
    var prevCurrentParent = currentParent
    var prevMatchFn = matchFn
    var previousInAttributes = false
    var previousInSkip = false
    doc = node.ownerDocument
    context = Context()
    matchFn = matches
    argsBuilder = @[]
    attrsBuilder = @[]
    currentNode = nil
    currentParent = node.parentNode
    focusPath = getFocusedPath(node,currentParent)
    if DEBUG:
      previousInAttributes = setInAttributes(false)
      previousInSkip = setInSkip(false)
      updatePatchContext(context)
    try:
      var retVal = run(node,fn,data)
      if DEBUG:
        assertVirtualAttributesClosed()
      return retVal
    finally:
      context.notifyChanges()
      doc = prevDoc
      context = prevContext
      matchFn = prevMatchFn
      argsBuilder = prevArgsBuilder
      attrsBuilder = prevAttrsBuilder
      currentNode = prevCurrentNode
      currentParent = prevCurrentParent
      focusPath = prevFocusPath
      if DEBUG:
        setInAttributes(previousInAttributes)
        setInSkip(previousInSkip)
        updatePatchContext(context)
  return f
`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
