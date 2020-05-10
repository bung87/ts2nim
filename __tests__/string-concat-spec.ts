import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should string concat', done => {
  const typedef = `/**
* Makes sure that the caller is where attributes are expected.
* @param functionName The name of the caller, for the error message.
*/
function assertInAttributes(functionName: string) {
 if (!inAttributes) {
   throw new Error(
     functionName +
       "() can only be called after calling " +
       "elementOpenStart()."
   );
 }
}`;
  const expected = `proc assertInAttributes(functionName:string): auto = 
  ## Makes sure that the caller is where attributes are expected.
  ## @param functionName The name of the caller, for the error message.

  if not inAttributes:
    raise newException(Exception,functionName & "() can only be called after calling " & "elementOpenStart().")

`;
  const result = transpile(undefined, typedef);

  result.on('close', () => {
    expect(fs.readFileSync(result.path).toString()).toBe(expected);
    done();
  });
});
