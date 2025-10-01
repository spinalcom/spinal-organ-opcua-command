import { SpinalContext, SpinalNode } from "spinal-model-graph";
import SpinalGraphUtils, { IEndpointData } from "./SpinalGraphUtils";
import { attributeService } from "spinal-env-viewer-plugin-documentation-service";
import SpinalPilot from "./spinalPilot";
import { DataType } from "node-opcua";
import env_data from "./env";
import { spinalCore } from "spinal-core-connectorjs_type";
import ConfigFile from "spinal-lib-organ-monitoring";
import EndpointProcess, { TModels } from "./EndpointProcess";
import { SpinalAttribute } from "spinal-models-documentation";
import OPCUAService from "./OPCUAService";


type Consumedfunction<T> = () => Promise<T>;
type INodes = {
    context: SpinalContext;
    startNode: SpinalNode;
};


const nodeBindedForTheFirstTime: { [key: string]: boolean } = {};





/////////////////////////////////////////////////////////////////////////
//                             Nodes                                   //
/////////////////////////////////////////////////////////////////////////

export async function init() {
    const url = `${env_data.protocol}://${env_data.userId}:${env_data.password}@${env_data.host}:${env_data.port}/`;
    const connect = spinalCore.connect(url);

    await ConfigFile.init(connect, env_data.organ_name, env_data.host, env_data.protocol, parseInt(env_data.port));
    const spinalUtils = SpinalGraphUtils.getInstance();
    await spinalUtils.init(connect, env_data.digitaltwin_path);

    return spinalUtils;
}

export async function getStartNodes(spinalUtils: SpinalGraphUtils) {
    const endpointStartNodeProm = spinalUtils.getStartNode(env_data.command_context_name, env_data.command_category_name, env_data.command_group_name);
    const zoneStartNodeProm = spinalUtils.getStartNode(env_data.zone_context_name, env_data.zone_category_name, env_data.zone_group_name);

    return Promise.all([zoneStartNodeProm, endpointStartNodeProm]);
}

export async function getBmsEndpointsNodes(spinalUtils: SpinalGraphUtils, groupDaliNodes: INodes, modeFonctionnement: INodes) {
    const groupDaliProm = spinalUtils.getBmsEndpointNode(groupDaliNodes.startNode, groupDaliNodes.context);
    const modeFonctionnementProm = spinalUtils.getZoneModeFonctionnement(modeFonctionnement.startNode, modeFonctionnement.context);

    return Promise.all([groupDaliProm, modeFonctionnementProm]).then(([groupDaliNodes, modeFonctionnementNodes]) => {
        return { groupDaliNodes, modeFonctionnementNodes };
    })
}


/////////////////////////////////////////////////////////////////////////
//                             Bind Endpoints                          //
/////////////////////////////////////////////////////////////////////////


export function bindEndpoints(groupDaliEndpoints: TModels[], modeFonctionnementEndpoints: TModels[]) {
    const executeCallbackOnConstruct = true; // false does not work, it's why it's true
    new EndpointProcess(groupDaliEndpoints, (node) => _bindEndpointcallback(node, false), executeCallbackOnConstruct);
    new EndpointProcess(modeFonctionnementEndpoints, (node) => _bindEndpointcallback(node, true), executeCallbackOnConstruct);
}


export async function _bindEndpointcallback(node: SpinalNode, isModeFonctionnement: boolean = false) {

    let initZoneAttribute = await getInitZoneAttribute(node, isModeFonctionnement); // call to create the attribute if not exist

    try {

        const itsFirstTime = !nodeBindedForTheFirstTime[node.getId().get()];

        // on first time, just set the flag to true and return
        // because the bind is executed on the initialization of the EndpointProcess
        if (itsFirstTime) {
            console.log(`[${node._server_id}] - [${node.getName().get()}] - binded`);
            nodeBindedForTheFirstTime[node.getId().get()] = true;
            return; // avoid multiple call on the same node}
        }

        await _sendUpdateRequest(node);
        if (initZoneAttribute) initZoneAttribute.value.set("1");

        console.log(`[${node._server_id}] - [${node.getName().get()}] - updated successfully`);
    } catch (error) {
        if (initZoneAttribute) initZoneAttribute.value.set("-1");
        console.log(`[${node._server_id}] - [${node.getName().get()}] - failed, due to "${error.message}"`);
    }
}

export async function getInitZoneAttribute(node: SpinalNode, isModeFonctionnement: boolean): Promise<SpinalAttribute> {
    if (!isModeFonctionnement) return;

    const { attribute_category, init_zone_attribute_name, attribute_default_value } = env_data;
    return getOrCreateAttribute(node, attribute_category, init_zone_attribute_name, attribute_default_value);

}

export async function getOrCreateAttribute(node: SpinalNode, attributeCategory: string, attributeName: string, attributeValue: any = "null"): Promise<SpinalAttribute> {

    const [attribute] = await attributeService.getAttributesByCategory(node, attributeCategory, attributeName)
    if (attribute) return attribute;

    return attributeService.addAttributeByCategoryName(node, attributeCategory, attributeName, attributeValue);
}

export async function addAEndpointsToMap(nodes: SpinalNode | SpinalNode[]): Promise<IEndpointData[]> {
    if (!Array.isArray(nodes)) nodes = [nodes];

    const spinalUtils = SpinalGraphUtils.getInstance();
    const result = await _consumeBatch(nodes.map((node: SpinalNode) => () => spinalUtils.addEndpointsToMap(node)), 50);
    return result;
    // const promises = nodes.map((node: SpinalNode) => spinalUtils.addEndpointsToMap(node));
    // const result = await Promise.allSettled(promises);

    // return result
    // .filter((res) => res.status === "fulfilled")
    // .map((res) => (res as PromiseFulfilledResult<IEndpointData>).value);


}

// export async function _sendUpdateRequest(node: SpinalNode): Promise<{ first: boolean, data: IEndpointData }> {
export async function _sendUpdateRequest(node: SpinalNode): Promise<IEndpointData> {

    const graphUtils = SpinalGraphUtils.getInstance();
    const id = node.getId().get();
    let data: IEndpointData = await graphUtils.getEndpointDataInMap(node);

    // this condition is only true on initialization
    // if (!data) return { first: true, data: await graphUtils.addEndpointsToMap(node) };
    if (!data) throw `node ${id} is not found in the map`;
    if (!data.serverInfo) throw `this node is not link to an opcua network context`;


    const value = data.attribute.value.get();

    const url = getServerUrl(data.serverInfo);

    const opcuaService = new OPCUAService(url);
    await opcuaService.initialize();
    await opcuaService.connect();

    let nodeId = await opcuaService.getNodeIdByPath(data.node.info?.path?.get());

    if (!nodeId) {
        console.warn(`can't find nodeId for node ${data.node.getName().get()} with path ! it will try with old idNetwork`);
        nodeId = data.node.info?.idNetwork?.get();
    }

    // const nodeId: string = data.node.info?.idNetwork?.get();

    const res = await SpinalPilot.getInstance().sendUpdateRequest(url, { nodeId, value }); // send request to OPCUA Server
    data.element.currentValue.set(value); // change element value in graph

    return data;
    // return { first: false, data };
}

export async function _consumeBatch<T>(promises: Consumedfunction<T>[], batchSize = 10): Promise<T[]> {
    let index = 0;
    const result: any = [];

    while (index < promises.length) {
        let endIndex = index + batchSize;
        if (promises.length <= endIndex) endIndex = promises.length;
        const slice = promises.slice(index, endIndex);
        const resProm = await Promise.all(slice.map((e: Consumedfunction<T>): Promise<T> => e()));
        result.push(...resProm);
        index = endIndex;
    }

    return result;
}

/////////////////////////////////////////////////////////////////////////
//                             OPCUA Utils                             //   
/////////////////////////////////////////////////////////////////////////


export function getServerUrl(serverInfo: any): string {
    let endpoint: string = serverInfo?.endpoint || "";

    if (!endpoint.startsWith("/")) endpoint = `/${endpoint}`;
    if (!endpoint.endsWith("/")) endpoint = endpoint.substring(0, endpoint.length - 1);

    const ip = serverInfo.address || serverInfo.ip;
    return `opc.tcp://${ip}:${serverInfo.port}${endpoint}`;
}


export const coerceBoolean = (data: any) => {
    return data === "true" || data === "1" || data === true;
};

export const coerceNumber = (data: any) => {
    return parseInt(data, 10);
};

export const coerceNumberR = (data: any) => {
    return parseFloat(data);
};

export const coerceNoop = (data: any) => data;

export const coerceFunc = (dataType: DataType) => {
    switch (dataType) {
        case DataType.Boolean:
            return coerceBoolean;
        case DataType.Int16:
        case DataType.Int32:
        case DataType.Int64:
        case DataType.UInt16:
        case DataType.UInt32:
        case DataType.UInt64:
            return coerceNumber;
        case DataType.Double:
        case DataType.Float:
            return coerceNumberR;
        default:
            return coerceNoop;
    }
};


export function coerceStringToDataType(dataType, arrayType, VariantArrayType, data: any) {
    const c = coerceFunc(dataType);
    if (arrayType === VariantArrayType.Scalar) {
        return c(data);
    } else {
        return data.map((d: any) => c(d));
    }
}