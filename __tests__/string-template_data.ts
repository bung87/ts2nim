export const ErrorBase = {
  ValidatorNoTypeParameter: `Failed to find type parameter. createValidator should be called with a type parameter. Example: "createValidator<TypeName>()"`,
  NotCalledAsFunction: `Macro should be called as function but was called as a`,
  MoreThanOneTypeParameter: `Macro should be called with 1 type parameter but was called with`,
  RegisterInvalidCall: stripIndent`
                                  "register" should be called right below the type
                                  declaration it is registering:
                                  \`\`\`
                                  interface Foo {
                                    bar: string
                                  }
                                  // no return value
                                  register<Foo>()
                                  \`\`\`
                                  `,
  UnregisteredType: `Tried to generate a validator for an unregistered type with name`,
  // TODO: These will need to be updated once register accepts an options object
  RegisterInvalidNumberParams: `register should be called with 1 argument, but it was called with`,
  RegisterParam1NotStringLiteral: `register's first (and only) parameter should be a string literal, which is the name of the type to register, but it was a`,

  TypeDoesNotAcceptGenericParameters: `types don't accept generic parameters`,
  TooManyTypeParameters: `even though it only accepts`,
  NotEnoughTypeParameters: `type parameters even though it requires at least`,
  InvalidTypeParameterReference: `tried to reference the default type parameter in position:`,
};
