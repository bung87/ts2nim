import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
const typedef = `/**
* Applies the statics. When importing an Element, any existing attributes that
* match a static are converted into a static attribute.
* @param node The Element to apply statics for.
* @param data The NodeData associated with the Element.
* @param statics The statics array.
*/
function diffStatics(node: Element, data: NodeData, statics: Statics) {
 if (data.staticsApplied) {
   return;
 }

 data.staticsApplied = true;

 if (!statics || !statics.length) {
   return;
 }

 if (data.hasEmptyAttrsArr()) {
   for (let i = 0; i < statics.length; i += 2) {
     updateAttribute(node, statics[i] as string, statics[i + 1]);
   }
   return;
 }

 for (let i = 0; i < statics.length; i += 2) {
   prevAttrsMap[statics[i] as string] = i + 1;
 }

 const attrsArr = data.getAttrsArr(0);
 let j = 0;
 for (let i = 0; i < attrsArr.length; i += 2) {
   const name = attrsArr[i];
   const value = attrsArr[i + 1];
   const staticsIndex = prevAttrsMap[name];

   if (staticsIndex) {
     // For any attrs that are static and have the same value, make sure we do
     // not set them again.
     if (statics[staticsIndex] === value) {
       delete prevAttrsMap[name];
     }

     continue;
   }

   // For any attrs that are dynamic, move them up to the right place.
   attrsArr[j] = name;
   attrsArr[j + 1] = value;
   j += 2;
 }
 // Anything after \`j\` was either moved up already or static.
 truncateArray(attrsArr, j);

 for (const name in prevAttrsMap) {
   updateAttribute(node, name, statics[prevAttrsMap[name]]);
   delete prevAttrsMap[name];
 }
}`;
const expected = `proc diffStatics(node:Element,data:NodeData,statics:Statics): auto = 
  ## Applies the statics. When importing an Element, any existing attributes that
  ## match a static are converted into a static attribute.
  ## @param node The Element to apply statics for.
  ## @param data The NodeData associated with the Element.
  ## @param statics The statics array.

  if data.staticsApplied:
    return
  data.staticsApplied = true
  if not statics or not statics.len:
    return
  if data.hasEmptyAttrsArr():
    var i = 0
    while i < statics.len:
      updateAttribute(node,statics[i],statics[i + 1])
    return
  var i = 0
  while i < statics.len:
    prevAttrsMap[statics[i]] = i + 1
  var attrsArr = data.getAttrsArr(0)
  var j = 0
  var i = 0
  while i < attrsArr.len:
    var name = attrsArr[i]
    var value = attrsArr[i + 1]
    var staticsIndex = prevAttrsMap[name]
    if staticsIndex:
      if statics[staticsIndex] == value:
        prevAttrsMap[name] = nil
      continue
    ## For any attrs that are dynamic, move them up to the right place.
    attrsArr[j] = name
    attrsArr[j + 1] = value
    j += 2
  ## Anything after \`j\` was either moved up already or static.
  truncateArray(attrsArr,j)
  for name in prevAttrsMap:
    updateAttribute(node,name,statics[prevAttrsMap[name]])
    prevAttrsMap[name] = nil

`;
test('Should handle computed prop', done => {
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
