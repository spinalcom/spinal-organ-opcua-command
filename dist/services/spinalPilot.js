"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpinalPilot = void 0;
const node_opcua_1 = require("node-opcua");
const OPCUAService_1 = require("./OPCUAService");
const securityMode = node_opcua_1.MessageSecurityMode["None"];
const securityPolicy = node_opcua_1.SecurityPolicy["None"];
const userIdentity = { type: node_opcua_1.UserTokenType.Anonymous };
class SpinalPilot {
    constructor() { }
    static getInstance() {
        if (!this._instance)
            this._instance = new SpinalPilot();
        return this._instance;
    }
    sendUpdateRequest(url, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const opcuaService = new OPCUAService_1.default(url);
            let err;
            try {
                yield opcuaService.initialize();
                yield opcuaService.connect();
                yield opcuaService.writeNode(data.nodeId, data.value);
            }
            catch (error) {
                err = error;
            }
            yield opcuaService.disconnect();
            if (err)
                throw err;
            return data;
        });
    }
}
exports.SpinalPilot = SpinalPilot;
exports.default = SpinalPilot;
//# sourceMappingURL=spinalPilot.js.map