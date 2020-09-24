# ts2nim  
[![Build Status](https://travis-ci.org/bung87/ts2nim.svg?branch=master)](https://travis-ci.org/bung87/ts2nim)  [![Total alerts](https://img.shields.io/lgtm/alerts/g/bung87/ts2nim.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/bung87/ts2nim/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/bung87/ts2nim.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/bung87/ts2nim/context:javascript) [![Npm Version](https://badgen.net/npm/v/ts2nim)](https://www.npmjs.com/package/ts2nim)  ![npm: total downloads](https://badgen.net/npm/dt/ts2nim) ![Types](https://badgen.net/npm/types/ts2nim) ![Dep](https://badgen.net/david/dep/bung87/ts2nim) ![license](https://badgen.net/npm/license/ts2nim)

Typescript to Nim transpiler  

It also can translate js code with the Nim type `auto` as `typescript-estree` compatible with the js estree.  

## Motivation  

Transpile nodejs modules, write in Typescript and transpile it to Nim, expand the Nim-Javascript backend ecosystem and so on. 

Current goal is translating Typescript syntax into valid and pretty looking nim code.  you may manually modify nim sources after translation.  it just translate source code exclude dependency,even modules in nodejs std.    

demo transpiled project:  
[vscode-uri](https://github.com/bung87/vscode-uri)  

It can be easy to translate library processes like string manipulation, images, bytes and all these things.  

## RoadMap  

This project has two routes  
1. Generate nim js bridge through typescript type difinition file.  
2. Generate nim source code through typescript source file.  

### Todos
- [ ] Inferring js type (object or others)  
- [ ] Inferring native type (eg. number is int or float)  

## Limitations  

[assemblyscript basics](https://docs.assemblyscript.org/basics) described well, share same theory.  

## Installation  

`npm i ts2nim` or   
`yarn add ts2nim`  

## Usage   

`ts2nim -i inputFileOrDir -o outFileOrDir` 

without param it will transpile current directory in place with extension `.nim`  

## Translation  

| origin       | to     | description     |
| :-------------: | :----------: | :----------- |
| number   | float |  |
| boolean   | bool |  |
|  interface,type,class | type   |    |
|  Example() | newExample()   | constructor for a class    |
| let,var,const   | var | const no-object -> const,others var |
| this   | self |  |
| null,undefinded   | nil |  |
| optinal param   | none(T) | options module |
| T\|null,T\|undefinded | T | ref type|
| RestElement param   | openArray[T] |  |
| switch   | case of |  |
| Array   | seq |  |
| StringTemplate   | fmt | strformat module |
| do while   | doWhile | doWhile template |
| raise new T()   | raise newException(T) |  |
| .length   | .len |  |
| .push   | .add |  |
| fs.readFileSync   | readFile | os module  |
| path.join   | / | os module |
| .some   | .any | sequtils module |
| .sort   | .sorted | algorithm module |
| async   | {.async.} | asyncdispatch or asyncjs module |
| ===   | == |  |
| !==   | != |  |
| &&   | and |  |
| \|\|   | or |  |
| !   | not |  |
| +   | & or + | depends on a literal string or number found |
| delete   | assign to nil |  |
| extends A,B| ref object of A,B | Multiple Inheritance not supported in Nim | 


## Related Projects  

[mcclure/dts2nim](https://github.com/mcclure/dts2nim)  
