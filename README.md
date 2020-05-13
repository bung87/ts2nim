# ts2nim  
[![Build Status](https://travis-ci.org/bung87/ts2nim.svg?branch=master)](https://travis-ci.org/bung87/ts2nim.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/bung87/ts2nim/badge.svg?branch=master)](https://coveralls.io/github/bung87/ts2nim?branch=master)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)  

typescript to Nim transpiler  

## Motivation  

transpile nodejs module write in typescript to Nim, expand Nim js backend ecosystem  

## Translation  

| origin       | to     | description     |
| :-------------: | :----------: | :----------- |
| number   | int |  |
| boolean   | bool |  |
|  Example() | newExample()   | constructor for a class    |
| let,var,const   | var | as no type infer for now |
| this   | self |  |
| null,undefinded   | nil |  |
| optinal param   | Option[T] | options module |
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
| async   | {.async.} | asyncdispatch module |
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