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
exports.coerceFunc = exports.coerceNoop = exports.coerceNumberR = exports.coerceNumber = exports.coerceBoolean = void 0;
exports.init = init;
exports.getStartNodes = getStartNodes;
exports.getBmsEndpointsNodes = getBmsEndpointsNodes;
exports.bindEndpoints = bindEndpoints;
exports._bindEndpointcallback = _bindEndpointcallback;
exports.getInitZoneAttribute = getInitZoneAttribute;
exports.getOrCreateAttribute = getOrCreateAttribute;
exports.addAEndpointsToMap = addAEndpointsToMap;
exports._sendUpdateRequest = _sendUpdateRequest;
exports._consumeBatch = _consumeBatch;
exports.getServerUrl = getServerUrl;
exports.coerceStringToDataType = coerceStringToDataType;
const SpinalGraphUtils_1 = require("./SpinalGraphUtils");
const spinal_env_viewer_plugin_documentation_service_1 = require("spinal-env-viewer-plugin-documentation-service");
const spinalPilot_1 = require("./spinalPilot");
const node_opcua_1 = require("node-opcua");
const env_1 = require("./env");
const spinal_core_connectorjs_type_1 = require("spinal-core-connectorjs_type");
const spinal_lib_organ_monitoring_1 = require("spinal-lib-organ-monitoring");
const EndpointProcess_1 = require("./EndpointProcess");
const nodeBindedForTheFirstTime = {};
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
function getStartNodes(spinalUtils) {
    return __awaiter(this, void 0, void 0, function* () {
        const endpointStartNodeProm = spinalUtils.getStartNode(env_1.default.command_context_name, env_1.default.command_category_name, env_1.default.command_group_name);
        const zoneStartNodeProm = spinalUtils.getStartNode(env_1.default.zone_context_name, env_1.default.zone_category_name, env_1.default.zone_group_name);
        return Promise.all([zoneStartNodeProm, endpointStartNodeProm]);
    });
}
function getBmsEndpointsNodes(spinalUtils, groupDaliNodes, modeFonctionnement) {
    return __awaiter(this, void 0, void 0, function* () {
        const groupDaliProm = spinalUtils.getBmsEndpointNode(groupDaliNodes.startNode, groupDaliNodes.context);
        const modeFonctionnementProm = spinalUtils.getZoneModeFonctionnement(modeFonctionnement.startNode, modeFonctionnement.context);
        return Promise.all([groupDaliProm, modeFonctionnementProm]).then(([groupDaliNodes, modeFonctionnementNodes]) => {
            return { groupDaliNodes, modeFonctionnementNodes };
        });
    });
}
/////////////////////////////////////////////////////////////////////////
//                             Bind Endpoints                          //
/////////////////////////////////////////////////////////////////////////
function bindEndpoints(groupDaliEndpoints, modeFonctionnementEndpoints) {
    const executeCallbackOnConstruct = true; // false does not work, it's why it's true
    new EndpointProcess_1.default(groupDaliEndpoints, (node) => _bindEndpointcallback(node, false), executeCallbackOnConstruct);
    new EndpointProcess_1.default(modeFonctionnementEndpoints, (node) => _bindEndpointcallback(node, true), executeCallbackOnConstruct);
}
function _bindEndpointcallback(node_1) {
    return __awaiter(this, arguments, void 0, function* (node, isModeFonctionnement = false) {
        let initZoneAttribute = yield getInitZoneAttribute(node, isModeFonctionnement); // call to create the attribute if not exist
        try {
            const itsFirstTime = !nodeBindedForTheFirstTime[node.getId().get()];
            // on first time, just set the flag to true and return
            // because the bind is executed on the initialization of the EndpointProcess
            if (itsFirstTime) {
                console.log(`[${node._server_id}] - [${node.getName().get()}] - binded`);
                nodeBindedForTheFirstTime[node.getId().get()] = true;
                return; // avoid multiple call on the same node}
            }
            yield _sendUpdateRequest(node);
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
function getInitZoneAttribute(node, isModeFonctionnement) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isModeFonctionnement)
            return;
        const { attribute_category, init_zone_attribute_name, attribute_default_value } = env_1.default;
        return getOrCreateAttribute(node, attribute_category, init_zone_attribute_name, attribute_default_value);
    });
}
function getOrCreateAttribute(node_1, attributeCategory_1, attributeName_1) {
    return __awaiter(this, arguments, void 0, function* (node, attributeCategory, attributeName, attributeValue = "null") {
        const [attribute] = yield spinal_env_viewer_plugin_documentation_service_1.attributeService.getAttributesByCategory(node, attributeCategory, attributeName);
        if (attribute)
            return attribute;
        return spinal_env_viewer_plugin_documentation_service_1.attributeService.addAttributeByCategoryName(node, attributeCategory, attributeName, attributeValue);
    });
}
function addAEndpointsToMap(nodes) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!Array.isArray(nodes))
            nodes = [nodes];
        const spinalUtils = SpinalGraphUtils_1.default.getInstance();
        const result = yield _consumeBatch(nodes.map((node) => () => spinalUtils.addEndpointsToMap(node)), 50);
        return result;
        // const promises = nodes.map((node: SpinalNode) => spinalUtils.addEndpointsToMap(node));
        // const result = await Promise.allSettled(promises);
        // return result
        // .filter((res) => res.status === "fulfilled")
        // .map((res) => (res as PromiseFulfilledResult<IEndpointData>).value);
    });
}
// export async function _sendUpdateRequest(node: SpinalNode): Promise<{ first: boolean, data: IEndpointData }> {
function _sendUpdateRequest(node) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const graphUtils = SpinalGraphUtils_1.default.getInstance();
        const id = node.getId().get();
        let data = yield graphUtils.getEndpointDataInMap(node);
        // this condition is only true on initialization
        // if (!data) return { first: true, data: await graphUtils.addEndpointsToMap(node) };
        if (!data)
            throw `node ${id} is not found in the map`;
        if (!data.serverInfo)
            throw `this node is not link to an opcua network context`;
        const value = data.attribute.value.get();
        const nodeId = (_b = (_a = data.node.info) === null || _a === void 0 ? void 0 : _a.idNetwork) === null || _b === void 0 ? void 0 : _b.get();
        const url = getServerUrl(data.serverInfo);
        const res = yield spinalPilot_1.default.getInstance().sendUpdateRequest(url, { nodeId, value }); // send request to OPCUA Server
        data.element.currentValue.set(value); // change element value in graph
        return data;
        // return { first: false, data };
    });
}
function _consumeBatch(promises_1) {
    return __awaiter(this, arguments, void 0, function* (promises, batchSize = 10) {
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
/////////////////////////////////////////////////////////////////////////
//                             OPCUA Utils                             //   
/////////////////////////////////////////////////////////////////////////
function getServerUrl(serverInfo) {
    let endpoint = (serverInfo === null || serverInfo === void 0 ? void 0 : serverInfo.endpoint) || "";
    if (!endpoint.startsWith("/"))
        endpoint = `/${endpoint}`;
    if (!endpoint.endsWith("/"))
        endpoint = endpoint.substring(0, endpoint.length - 1);
    const ip = serverInfo.address || serverInfo.ip;
    return `opc.tcp://${ip}:${serverInfo.port}${endpoint}`;
}
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
//# sourceMappingURL=utils.js.map