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
exports.coerceStringToDataType = exports.coerceFunc = exports.coerceNoop = exports.coerceNumberR = exports.coerceNumber = exports.coerceBoolean = exports.getServerUrl = exports._consumeBatch = exports._callbackMethod = void 0;
const spinalPilot_1 = require("./spinalPilot");
const node_opcua_1 = require("node-opcua");
function _callbackMethod(node) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        let nodeName = node.getName().get();
        try {
            const id = node.getId().get();
            let data = this._isInitialized[id];
            // this condition is only true on initialization
            if (!data) {
                const { attribute, element, serverInfo } = yield this._getEndpointData(node);
                data = { node, attribute, element, serverInfo };
                this._isInitialized[id] = data;
                return;
            }
            if (!data.serverInfo)
                throw `this node is not link to an opcua network context`;
            const value = data.attribute.value.get();
            const nodeId = (_b = (_a = data.node.info) === null || _a === void 0 ? void 0 : _a.idNetwork) === null || _b === void 0 ? void 0 : _b.get();
            const url = getServerUrl(data.serverInfo);
            yield spinalPilot_1.default.getInstance().sendUpdateRequest(url, { nodeId, value }); // send request to OPCUA Server
            data.element.currentValue.set(value); // change element value in graph
            console.log(`[${nodeName}] updated successfully`);
        }
        catch (error) {
            console.log(`[${nodeName}] failed, due to "${error.message}"`);
        }
    });
}
exports._callbackMethod = _callbackMethod;
function _consumeBatch(promises, batchSize = 10) {
    return __awaiter(this, void 0, void 0, function* () {
        let index = 0;
        const result = [];
        while (index < promises.length) {
            let endIndex = index + batchSize;
            if (promises.length <= endIndex)
                endIndex = promises.length;
            const slice = promises.slice(index, endIndex);
            const resProm = yield Promise.all(slice.map((e) => e()));
            result.push(...resProm);
            index = endIndex;
        }
        return result;
    });
}
exports._consumeBatch = _consumeBatch;
function getServerUrl(serverInfo) {
    let endpoint = (serverInfo === null || serverInfo === void 0 ? void 0 : serverInfo.endpoint) || "";
    if (!endpoint.startsWith("/"))
        endpoint = `/${endpoint}`;
    if (!endpoint.endsWith("/"))
        endpoint = endpoint.substring(0, endpoint.length - 1);
    return `opc.tcp://${serverInfo.ip}:${serverInfo.port}${endpoint}`;
}
exports.getServerUrl = getServerUrl;
const coerceBoolean = (data) => {
    return data === "true" || data === "1" || data === true;
};
exports.coerceBoolean = coerceBoolean;
const coerceNumber = (data) => {
    return parseInt(data, 10);
};
exports.coerceNumber = coerceNumber;
const coerceNumberR = (data) => {
    return parseFloat(data);
};
exports.coerceNumberR = coerceNumberR;
const coerceNoop = (data) => data;
exports.coerceNoop = coerceNoop;
const coerceFunc = (dataType) => {
    switch (dataType) {
        case node_opcua_1.DataType.Boolean:
            return exports.coerceBoolean;
        case node_opcua_1.DataType.Int16:
        case node_opcua_1.DataType.Int32:
        case node_opcua_1.DataType.Int64:
        case node_opcua_1.DataType.UInt16:
        case node_opcua_1.DataType.UInt32:
        case node_opcua_1.DataType.UInt64:
            return exports.coerceNumber;
        case node_opcua_1.DataType.Double:
        case node_opcua_1.DataType.Float:
            return exports.coerceNumberR;
        default:
            return exports.coerceNoop;
    }
};
exports.coerceFunc = coerceFunc;
function coerceStringToDataType(dataType, arrayType, VariantArrayType, data) {
    const c = (0, exports.coerceFunc)(dataType);
    if (arrayType === VariantArrayType.Scalar) {
        return c(data);
    }
    else {
        return data.map((d) => c(d));
    }
}
exports.coerceStringToDataType = coerceStringToDataType;
//# sourceMappingURL=utils.js.map