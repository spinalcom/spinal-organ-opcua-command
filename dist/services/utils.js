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
exports.coerceStringToDataType = exports.coerceFunc = exports.coerceNoop = exports.coerceNumberR = exports.coerceNumber = exports.coerceBoolean = exports.getServerUrl = exports._consumeBatch = exports._sendUpdateRequest = exports.getOrCreateAttribute = exports.getInitZoneAttribute = exports._bindEndpointcallback = exports.bindEndpoints = exports.getBmsEndpointsNodes = exports.getStartNodes = exports.init = void 0;
const SpinalGraphUtils_1 = require("./SpinalGraphUtils");
const spinal_env_viewer_plugin_documentation_service_1 = require("spinal-env-viewer-plugin-documentation-service");
const node_opcua_1 = require("node-opcua");
const env_1 = require("./env");
const spinal_core_connectorjs_type_1 = require("spinal-core-connectorjs_type");
const spinal_lib_organ_monitoring_1 = require("spinal-lib-organ-monitoring");
const EndpointProcess_1 = require("./EndpointProcess");
/////////////////////////////////////////////////////////////////////////
//                             Nodes                                   //
/////////////////////////////////////////////////////////////////////////
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${env_1.default.protocol}://${env_1.default.userId}:${env_1.default.password}@${env_1.default.host}:${env_1.default.port}/`;
        const connect = spinal_core_connectorjs_type_1.spinalCore.connect(url);
        yield spinal_lib_organ_monitoring_1.default.init(connect, env_1.default.organ_name, env_1.default.host, env_1.default.protocol, parseInt(env_1.default.port));
        const spinalUtils = SpinalGraphUtils_1.default.getInstance();
        yield spinalUtils.init(connect, env_1.default.digitaltwin_path);
        return spinalUtils;
    });
}
exports.init = init;
function getStartNodes(spinalUtils) {
    return __awaiter(this, void 0, void 0, function* () {
        const endpointStartNodeProm = spinalUtils.getStartNode(env_1.default.command_context_name, env_1.default.command_category_name, env_1.default.command_group_name);
        const zoneStartNodeProm = spinalUtils.getStartNode(env_1.default.zone_context_name, env_1.default.zone_category_name, env_1.default.zone_group_name);
        return Promise.all([zoneStartNodeProm, endpointStartNodeProm]);
    });
}
exports.getStartNodes = getStartNodes;
function getBmsEndpointsNodes(spinalUtils, groupDaliNodes, modeFonctionnement) {
    return __awaiter(this, void 0, void 0, function* () {
        const groupDaliProm = spinalUtils.getBmsEndpointNode(groupDaliNodes.startNode, groupDaliNodes.context);
        const modeFonctionnementProm = spinalUtils.getZoneModeFonctionnement(modeFonctionnement.startNode, modeFonctionnement.context);
        return Promise.all([groupDaliProm, modeFonctionnementProm]).then((result) => {
            return { groupDaliNodes: result[0], modeFonctionnementNodes: result[1] };
        });
    });
}
exports.getBmsEndpointsNodes = getBmsEndpointsNodes;
/////////////////////////////////////////////////////////////////////////
//                             Bind Endpoints                          //
/////////////////////////////////////////////////////////////////////////
function bindEndpoints(groupDaliEndpoints, modeFonctionnementEndpoints) {
    new EndpointProcess_1.default(groupDaliEndpoints, true, (node) => _bindEndpointcallback(node, false));
    new EndpointProcess_1.default(modeFonctionnementEndpoints, true, (node) => _bindEndpointcallback(node, true));
}
exports.bindEndpoints = bindEndpoints;
function _bindEndpointcallback(node, isModeFonctionnement = false) {
    return __awaiter(this, void 0, void 0, function* () {
        let initZoneAttribute = yield getInitZoneAttribute(node, isModeFonctionnement);
        try {
            const { first, data } = yield _sendUpdateRequest(node);
            if (first)
                return;
            if (initZoneAttribute)
                initZoneAttribute.value.set("1");
            console.log(`[${node._server_id}] - [${node.getName().get()}] - updated successfully`);
        }
        catch (error) {
            if (initZoneAttribute)
                initZoneAttribute.value.set("-1");
            console.log(`[${node._server_id}] - [${node.getName().get()}] - failed, due to "${error.message}"`);
        }
    });
}
exports._bindEndpointcallback = _bindEndpointcallback;
function getInitZoneAttribute(node, isModeFonctionnement) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isModeFonctionnement)
            return;
        const { attribute_category, init_zone_attribute_name, attribute_default_value } = env_1.default;
        return getOrCreateAttribute(node, attribute_category, init_zone_attribute_name, attribute_default_value);
    });
}
exports.getInitZoneAttribute = getInitZoneAttribute;
function getOrCreateAttribute(node, attributeCategory, attributeName, attributeValue = "null") {
    return __awaiter(this, void 0, void 0, function* () {
        const [attribute] = yield spinal_env_viewer_plugin_documentation_service_1.attributeService.getAttributesByCategory(node, attributeCategory, attributeName);
        if (attribute)
            return attribute;
        return spinal_env_viewer_plugin_documentation_service_1.attributeService.addAttributeByCategoryName(node, attributeCategory, attributeName, attributeValue);
    });
}
exports.getOrCreateAttribute = getOrCreateAttribute;
function _sendUpdateRequest(node) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const _self = SpinalGraphUtils_1.default.getInstance();
        const id = node.getId().get();
        let data = _self.getEndpointDataInMap(id);
        // this condition is only true on initialization
        if (!data)
            return { first: true, data: yield _self.addEndpointsToMap(node) };
        if (!data.serverInfo)
            throw `this node is not link to an opcua network context`;
        const value = data.attribute.value.get();
        const nodeId = (_b = (_a = data.node.info) === null || _a === void 0 ? void 0 : _a.idNetwork) === null || _b === void 0 ? void 0 : _b.get();
        const url = getServerUrl(data.serverInfo);
        // const res = await SpinalPilot.getInstance().sendUpdateRequest(url, { nodeId, value }); // send request to OPCUA Server
        data.element.currentValue.set(value); // change element value in graph
        return { first: false, data };
    });
}
exports._sendUpdateRequest = _sendUpdateRequest;
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
/////////////////////////////////////////////////////////////////////////
//                             OPCUA Utils                             //   
/////////////////////////////////////////////////////////////////////////
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