import * as Authenticator from "./Authenticator"
// @ponicode
describe("Authenticator.Authenticator.create", () => {
    test("0", () => {
        let callFunction: any = () => {
            Authenticator.Authenticator.create(() => undefined, "!Lov3MyPianoPony")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            Authenticator.Authenticator.create(() => undefined, "NoWiFi4you")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            Authenticator.Authenticator.create(() => undefined, "YouarenotAllowed2Use")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            Authenticator.Authenticator.create(() => undefined, "$p3onyycat")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            Authenticator.Authenticator.create(() => undefined, "accessdenied4u")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            Authenticator.Authenticator.create(() => undefined, "")
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("authenticate", () => {
    let inst: any

    beforeEach(() => {
        inst = new Authenticator.Authenticator(() => undefined, "$p3onyycat")
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.authenticate("$p3onyycat", "18.12.93.94")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.authenticate("YouarenotAllowed2Use", "240.159.249.190")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.authenticate("$p3onyycat", "139.3.227.118")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.authenticate("NoWiFi4you", "201.100.244.168")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.authenticate("$p3onyycat", "240.159.249.190")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.authenticate("", "")
        }
    
        expect(callFunction).not.toThrow()
    })
})

// @ponicode
describe("isAuthenticated", () => {
    let inst: any

    beforeEach(() => {
        inst = new Authenticator.Authenticator(() => undefined, "!Lov3MyPianoPony")
    })

    test("0", () => {
        let callFunction: any = () => {
            inst.isAuthenticated("244.9.255.240", ";")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            inst.isAuthenticated("18.12.93.94", "</s>")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            inst.isAuthenticated("201.100.244.168", "}")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            inst.isAuthenticated("240.159.249.190", ".")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            inst.isAuthenticated("139.3.227.118", "data")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            inst.isAuthenticated("", "")
        }
    
        expect(callFunction).not.toThrow()
    })
})
