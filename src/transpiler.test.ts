import rewire from "rewire"
const transpiler = rewire("./transpiler")
const isConstructor = transpiler.__get__("isConstructor")
const isFunctionInterface = transpiler.__get__("isFunctionInterface")
const isParamProp = transpiler.__get__("isParamProp")
const notBreak = transpiler.__get__("notBreak")
const getFunctionMeta = transpiler.__get__("getFunctionMeta")
const convertIdentName = transpiler.__get__("convertIdentName")
const convertTypeName = transpiler.__get__("convertTypeName")
const Transpiler = transpiler.__get__("Transpiler")
// @ponicode
describe("isConstructor", () => {
    test("0", () => {
        let callFunction: any = () => {
            isConstructor(-100)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            isConstructor({ kind: "Pierre Edouard", type: "array" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            isConstructor(100)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            isConstructor(1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            isConstructor(0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            isConstructor(Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("isFunctionInterface", () => {
    test("0", () => {
        let callFunction: any = () => {
            isFunctionInterface(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            isFunctionInterface(1.0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            isFunctionInterface(-29.45)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let object: any = [{ type: "number" }]
        let callFunction: any = () => {
            isFunctionInterface({ body: { body: object } })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            isFunctionInterface(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            isFunctionInterface(-Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("isParamProp", () => {
    test("0", () => {
        let callFunction: any = () => {
            isParamProp("George")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            isParamProp(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            isParamProp(-1.0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            isParamProp(-0.5)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            isParamProp({ type: "number" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            isParamProp(-Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("notBreak", () => {
    test("0", () => {
        let callFunction: any = () => {
            notBreak({ type: "array" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            notBreak(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            notBreak(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            notBreak({ type: "object" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            notBreak(1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            notBreak(-Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("getFunctionMeta", () => {
    test("0", () => {
        let callFunction: any = () => {
            getFunctionMeta(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            getFunctionMeta(0.0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            getFunctionMeta(-1.0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            getFunctionMeta(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            getFunctionMeta({ expression: 100, async: true, generator: false, typeParameters: "array" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            getFunctionMeta(-Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("convertIdentName", () => {
    test("0", () => {
        let callFunction: any = () => {
            convertIdentName("0]__length")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            convertIdentName("$")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            convertIdentName("George")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            convertIdentName("Error")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            convertIdentName("0]__length$")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            convertIdentName("")
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("convertTypeName", () => {
    test("0", () => {
        let callFunction: any = () => {
            convertTypeName("undefined")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            convertTypeName("Error")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            convertTypeName("Pierre Edouard")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            convertTypeName("Promise")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            convertTypeName("Jean-Philippe")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            convertTypeName("")
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("log", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.log("Sales")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.log(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.log("Marketing")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.log(-5.48)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.log(0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.log(NaN)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("typeof2type", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.typeof2type("number")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.typeof2type("m2v")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.typeof2type("jpeg")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.typeof2type("pdf")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.typeof2type("mpe")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.typeof2type("")
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("transCommonMemberExpression", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.transCommonMemberExpression("String", "toUpperCase", [], false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.transCommonMemberExpression("String", "join", [], true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.transCommonMemberExpression("path", "join", [], false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.transCommonMemberExpression("path", "charCodeAt", [], true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.transCommonMemberExpression("path", "^5.0.0", [], true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.transCommonMemberExpression("", "", undefined, true)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("getComment", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.getComment(-29.45, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.getComment(-1.0, 64)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.getComment(false, 1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.getComment(10.0, 256)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.getComment(false, 64)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.getComment(Infinity, Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("getProcMeta", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.getProcMeta(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.getProcMeta(10.23)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.getProcMeta("Pierre Edouard")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.getProcMeta("Jean-Philippe")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.getProcMeta({ params: ["http://www.croplands.org/account/confirm?t=", "https://", "http://www.croplands.org/account/confirm?t=", "https://accounts.google.com/o/oauth2/revoke?token=%s"], typeParameters: { params: ["Www.GooGle.com", "https://api.telegram.org/bot", "https://api.telegram.org/", "www.google.com", "http://base.com"] }, type: "string" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.getProcMeta(Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("handleFunction", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.handleFunction("Anas", "https://croplands.org/app/a/confirm?t=", true, undefined, false, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.handleFunction(1.0, "ponicode.com", true, undefined, false, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.handleFunction(1.0, "http://www.croplands.org/account/confirm?t=", true, undefined, true, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.handleFunction(10.23, "https://", true, undefined, true, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.handleFunction("George", "http://www.croplands.org/account/confirm?t=", true, undefined, false, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.handleFunction(-Infinity, "", true, undefined, false, -Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("handleDeclaration", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.handleDeclaration(true, true, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.handleDeclaration(true, false, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.handleDeclaration(true, true, 16)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.handleDeclaration(false, true, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.handleDeclaration({ id: { name: "George" }, type: "array", typeAnnotation: { members: ["a1969970175", 987650], type: "number" }, body: { body: [true, false, true, false, true, false] }, declarations: -1 }, true, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.handleDeclaration({ id: { name: "" }, type: "", typeAnnotation: { members: [] }, body: { body: [] }, declarations: -Infinity }, true, -Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("convertConditionalExpression", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.convertConditionalExpression("logistical")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.convertConditionalExpression({ alternate: "Pierre Edouard", consequent: 12345 })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.convertConditionalExpression(1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.convertConditionalExpression(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.convertConditionalExpression({ alternate: "George", consequent: "c466a48309794261b64a4f02cfcc3d64" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.convertConditionalExpression(-Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("convertCallExpression", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.convertCallExpression(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.convertCallExpression(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.convertCallExpression({ expression: 100, argument: -5.48 })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.convertCallExpression(10.23)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.convertCallExpression({ expression: -100, argument: 1 })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.convertCallExpression({ expression: -Infinity, argument: -Infinity })
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("isNil", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.isNil(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.isNil({ name: "Michael", raw: "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20baseProfile%3D%22full%22%20width%3D%22undefined%22%20height%3D%22undefined%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22grey%22%2F%3E%3Ctext%20x%3D%22NaN%22%20y%3D%22NaN%22%20font-size%3D%2220%22%20alignment-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%3Eundefinedxundefined%3C%2Ftext%3E%3C%2Fsvg%3E", type: "string", range: "Pierre Edouard" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.isNil({ name: "George", raw: "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20baseProfile%3D%22full%22%20width%3D%22undefined%22%20height%3D%22undefined%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22grey%22%2F%3E%3Ctext%20x%3D%22NaN%22%20y%3D%22NaN%22%20font-size%3D%2220%22%20alignment-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%3Eundefinedxundefined%3C%2Ftext%3E%3C%2Fsvg%3E", type: "array", range: "Anas" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.isNil(-29.45)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.isNil({ id: { name: "Anas" }, type: "number", raw: "undefined", name: "Michael", range: "Anas" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.isNil({ id: { name: "" }, type: "", raw: "", name: "", range: "" })
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("isObj", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.isObj({ name: "George", raw: "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20baseProfile%3D%22full%22%20width%3D%22undefined%22%20height%3D%22undefined%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22grey%22%2F%3E%3Ctext%20x%3D%22NaN%22%20y%3D%22NaN%22%20font-size%3D%2220%22%20alignment-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%3Eundefinedxundefined%3C%2Ftext%3E%3C%2Fsvg%3E", type: "object", range: "George" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.isObj(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.isObj({ id: { name: "Edmond" }, type: "string", raw: "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20baseProfile%3D%22full%22%20width%3D%22undefined%22%20height%3D%22undefined%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22grey%22%2F%3E%3Ctext%20x%3D%22NaN%22%20y%3D%22NaN%22%20font-size%3D%2220%22%20alignment-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%3Eundefinedxundefined%3C%2Ftext%3E%3C%2Fsvg%3E", name: "Anas", range: "Edmond" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.isObj({ name: "Pierre Edouard", raw: "undefined", type: "string", range: "Michael" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.isObj({ id: { name: "George" }, type: "number", raw: "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20baseProfile%3D%22full%22%20width%3D%22undefined%22%20height%3D%22undefined%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22grey%22%2F%3E%3Ctext%20x%3D%22NaN%22%20y%3D%22NaN%22%20font-size%3D%2220%22%20alignment-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%3Eundefinedxundefined%3C%2Ftext%3E%3C%2Fsvg%3E", name: "Jean-Philippe", range: "George" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.isObj(NaN)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("isBoolean", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.isBoolean("George")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.isBoolean({ value: "Elio", name: "Michael", range: [520, 400] })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.isBoolean("Pierre Edouard")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.isBoolean("Michael")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.isBoolean(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.isBoolean(Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("isNumber", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.isNumber({ value: "Elio", name: "Anas", range: [1, 400] })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.isNumber(-29.45)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.isNumber(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.isNumber(10.0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.isNumber({ value: "Dillenberg", name: "George", range: [70, 550] })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.isNumber({ value: "", name: "", range: "" })
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("isRegExp", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.isRegExp(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.isRegExp({ value: "Elio" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.isRegExp({ value: "elio@example.com" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.isRegExp(-1.0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.isRegExp({ value: "Dillenberg", init: { value: "Dillenberg" } })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.isRegExp(Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("isString", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.isString("Jean-Philippe")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.isString({ value: "Dillenberg", name: "Anas", range: [350, 4] })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.isString({ id: { name: "George" }, init: { value: "Elio" }, name: "Edmond", value: "Dillenberg", range: [520, 30] })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.isString("Anas")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.isString({ value: "Dillenberg", name: "Anas", range: [350, 50] })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.isString(Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("isArray", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.isArray({ id: { name: "Edmond" }, init: { value: "Dillenberg" }, name: "Edmond", value: "Dillenberg", range: [550, 4] })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.isArray({ id: { name: "Anas" }, init: { value: "Elio" }, name: "Jean-Philippe", value: "Dillenberg", range: [100, 30] })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.isArray({ id: { name: "Edmond" }, init: { value: "Elio" }, name: "Pierre Edouard", value: "elio@example.com", range: [320, 320] })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.isArray({ value: "Elio", init: { value: "Dillenberg" }, name: "Michael", range: "Jean-Philippe" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.isArray(-1.0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.isArray({ id: { name: "" }, init: { value: "" }, name: "", value: "", range: "" })
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("convertBinaryExpression", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.convertBinaryExpression("dedicated")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.convertBinaryExpression("methodical")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.convertBinaryExpression(1)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.convertBinaryExpression("4th generation")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.convertBinaryExpression(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.convertBinaryExpression({ right: { value: null }, operator: "", left: { value: null } })
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("convertVariableDeclarator", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.convertVariableDeclarator("George", 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.convertVariableDeclarator(0.5, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.convertVariableDeclarator(-29.45, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.convertVariableDeclarator({ id: { type: "array", name: "Anas", properties: [true, false, true, true, true, true] } }, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.convertVariableDeclarator({ id: { type: "array", name: "Pierre Edouard", properties: [true, true, false, false, false, true] } }, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.convertVariableDeclarator(-Infinity, -Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("convertNodeInTest", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.convertNodeInTest({ key1: "Hello, world!", key4: 1, key3: 100, type: "string" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.convertNodeInTest(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.convertNodeInTest("Edmond")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.convertNodeInTest("Pierre Edouard")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.convertNodeInTest("Anas")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.convertNodeInTest(Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("convertUnaryExpression", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.convertUnaryExpression(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.convertUnaryExpression(-0.5)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.convertUnaryExpression("Anas")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.convertUnaryExpression("Pierre Edouard")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.convertUnaryExpression(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.convertUnaryExpression(NaN)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("mapVar", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.mapVar(false, { id: { typeAnnotation: { typeAnnotation: "number" }, name: "Edmond" }, init: "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20baseProfile%3D%22full%22%20width%3D%22undefined%22%20height%3D%22undefined%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22grey%22%2F%3E%3Ctext%20x%3D%22NaN%22%20y%3D%22NaN%22%20font-size%3D%2220%22%20alignment-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%3Eundefinedxundefined%3C%2Ftext%3E%3C%2Fsvg%3E" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.mapVar(true, 400)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.mapVar(false, 550)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.mapVar(false, { id: { typeAnnotation: { typeAnnotation: "array" }, name: "George" }, init: "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20baseProfile%3D%22full%22%20width%3D%22undefined%22%20height%3D%22undefined%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22grey%22%2F%3E%3Ctext%20x%3D%22NaN%22%20y%3D%22NaN%22%20font-size%3D%2220%22%20alignment-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%3Eundefinedxundefined%3C%2Ftext%3E%3C%2Fsvg%3E" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.mapVar(false, "Hello, world!")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.mapVar(false, NaN)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("convertVariableDeclaration", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.convertVariableDeclaration(10.0, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let object: any = [[0, 64, 32, 32, 16, 10, 256], [256, 0, 32, 0, 0, 10, 10], [0, 10, 0, 10, 32, 64, 10], [64, 64, 32, 256, 256, 10, 10], [256, 32, 256, 10, 32, 32, 0], [10, 16, 256, 32, 10, 64, 32], [0, 10, 10, 0, 64, 16, 0]]
        let callFunction: any = () => {
            inst.convertVariableDeclaration({ declare: false, declarations: ["George", "Jean-Philippe", "Edmond", "Jean-Philippe", "Pierre Edouard", "Edmond"], kind: "Anas", length: object }, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.convertVariableDeclaration(false, 256)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.convertVariableDeclaration("Edmond", 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.convertVariableDeclaration(0.0, 0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.convertVariableDeclaration(NaN, NaN)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("convertLogicalExpression", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.convertLogicalExpression(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.convertLogicalExpression("4th generation")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.convertLogicalExpression(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.convertLogicalExpression({ right: "18.12.93.94", operator: "&&", left: "18.12.93.94" })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.convertLogicalExpression("dedicated")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.convertLogicalExpression({ right: "", operator: "", left: "" })
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("ts2nimIndented", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.ts2nimIndented(10)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.ts2nimIndented(256)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.ts2nimIndented(0)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.ts2nimIndented(16)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.ts2nimIndented(64)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.ts2nimIndented(NaN)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("isPub", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.isPub({ key: { name: "Jean-Philippe" }, accessibility: 0, parameter: { name: "Anas" } })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.isPub("Data Scientist")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.isPub({ key: { name: "Jean-Philippe" }, accessibility: 0, parameter: { name: "Edmond" } })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.isPub({ key: { name: "George" }, accessibility: "public", parameter: { name: "Jean-Philippe" } })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.isPub("Sales")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.isPub(-Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("mapParam", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.mapParam({ type: "number", typeAnnotation: { typeAnnotation: "array" }, name: "Michael", optional: true, argument: { name: "Anas" }, parameter: true })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.mapParam("rgb(20%,10%,30%)")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.mapParam(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.mapParam({ type: "string", typeAnnotation: { typeAnnotation: "string" }, name: "George", optional: true, parameter: false })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.mapParam({ type: "string", typeAnnotation: { typeAnnotation: "object" }, name: "Pierre Edouard", optional: true, argument: { name: "Michael" }, parameter: false })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.mapParam(NaN)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("mapDecl", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.mapDecl(false, "#F00")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.mapDecl(true, true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.mapDecl(false, true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.mapDecl(false, 50)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.mapDecl(false, { key: { name: "George" }, typeAnnotation: { typeAnnotation: "array" } })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.mapDecl(true, -Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("getType", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.getType(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.getType("Pierre Edouard")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.getType("Jean-Philippe")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.getType({ value: "Elio", typeAnnotation: { typeAnnotation: "string" } })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.getType(-29.45)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.getType(-Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("mapMember", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "float" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.mapMember("Software Engineer")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.mapMember({ key: { name: "Anas" }, typeAnnotation: { typeAnnotation: { typeName: { type: "array" } } }, type: "string", parameter: { name: "Anas" } })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.mapMember(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.mapMember({ key: { name: "Anas" }, type: "object", parameter: { name: "Anas" } })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.mapMember({ key: { name: "Edmond" }, type: "string", parameter: { name: "Jean-Philippe" } })
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.mapMember(Infinity)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("transpile", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: false, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.transpile()
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("getOriginalComment", () => {
    let inst: any

    beforeEach(() => {
        inst = new Transpiler(undefined, undefined, { isProject: true, numberAs: "int" }, {})
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.getOriginalComment("Jean-Philippe")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.getOriginalComment(-5.48)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.getOriginalComment(true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.getOriginalComment(false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.getOriginalComment("Pierre Edouard")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.getOriginalComment(NaN)
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("transpiler.transpile", () => {
    test("0", () => {
        let callFunction: any = () => {
            transpiler.transpile("/unnamed.nim", "function unescape(code) {\n        return code.replace(/\\\\('|\\\\)/g, \"$1\").replace(/[\\r\\t\\n]/g, \" \");\n    }", { isProject: false, numberAs: "float" }, { comment: true, loggerFn: false, loc: true, range: true }, {})
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            transpiler.transpile("/unnamed.nim", "function(code) {\n\t\t\t\treturn I.mode === 'client' || !Basic.arrayDiff(code, [200, 404]);\n\t\t\t}", { isProject: false, numberAs: "float" }, { comment: true, loggerFn: false, loc: true, range: true }, {})
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            transpiler.transpile("/unnamed.nim", "function readToken_lt_gt(code) {\n\t      // '<>'\n\t      var next = this.input.charCodeAt(this.state.pos + 1);\n\t      var size = 1;\n\t\n\t      if (next === code) {\n\t        size = code === 62 && this.input.charCodeAt(this.state.pos + 2) === 62 ? 3 : 2;\n\t        if (this.input.charCodeAt(this.state.pos + size) === 61) return this.finishOp(_types.types.assign, size + 1);\n\t        return this.finishOp(_types.types.bitShift, size);\n\t      }\n\t\n\t      if (next === 33 && code === 60 && this.input.charCodeAt(this.state.pos + 2) === 45 && this.input.charCodeAt(this.state.pos + 3) === 45) {\n\t        if (this.inModule) this.unexpected();\n\t        // `<!--`, an XML-style comment that should be interpreted as a line comment\n\t        this.skipLineComment(4);\n\t        this.skipSpace();\n\t        return this.nextToken();\n\t      }\n\t\n\t      if (next === 61) {\n\t        // <= | >=\n\t        size = 2;\n\t      }\n\t\n\t      return this.finishOp(_types.types.relational, size);\n\t    }", { isProject: false, numberAs: "float" }, { comment: true, loggerFn: false, loc: true, range: true }, {})
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            transpiler.transpile("/unnamed.nim", "function log(code) {\n        var args = [];\n        for (var _i = 1; _i < arguments.length; _i++) {\n            args[_i - 1] = arguments[_i];\n        }\n        console.log(utils.tr.apply(null, arguments));\n    }\n", { isProject: false, numberAs: "float" }, { comment: true, loggerFn: false, loc: true, range: true }, {})
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            transpiler.transpile("/unnamed.nim", "function substr(start, length) {\n        return string_substr.call(\n            this,\n            start < 0 ? ((start = this.length + start) < 0 ? 0 : start) : start,\n            length\n        );\n    }", { isProject: false, numberAs: "float" }, { comment: true, loggerFn: false, loc: true, range: true }, {})
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            transpiler.transpile("/unnamed.nim", "", undefined, "", undefined)
        }
    
        expect(callFunction).not.toThrow()
    })
})
