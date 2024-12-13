import { SpinalNode } from "spinal-model-graph";
import { IEndpointData } from "./SpinalGraphUtils";
import { attributeService } from "spinal-env-viewer-plugin-documentation-service";
import SpinalPilot from "./spinalPilot";
import { DataType } from "node-opcua";
type Consumedfunction<T> = () => Promise<T>;



export async function _callbackMethod(node: SpinalNode) {

    let nodeName = node.getName().get();

    try {
        const id = node.getId().get();
        let data: IEndpointData = this._isInitialized[id];
        // this condition is only true on initialization
        if (!data) {
            const { attribute, element, serverInfo } = await this._getEndpointData(node);
            data = { node, attribute, element, serverInfo };
            this._isInitialized[id] = data;
            return;
        }


        if (!data.serverInfo) throw `this node is not link to an opcua network context`;

        const value = data.attribute.value.get();
        const nodeId: string = data.node.info?.idNetwork?.get();
        const url = getServerUrl(data.serverInfo);

        await SpinalPilot.getInstance().sendUpdateRequest(url, { nodeId, value }); // send request to OPCUA Server
        data.element.currentValue.set(value); // change element value in graph

        console.log(`[${nodeName}] updated successfully`);

    } catch (error) {
        console.log(`[${nodeName}] failed, due to "${error.message}"`);
    }

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

export function getServerUrl(serverInfo: any): string {
    let endpoint: string = serverInfo?.endpoint || "";

    if (!endpoint.startsWith("/")) endpoint = `/${endpoint}`;
    if (!endpoint.endsWith("/")) endpoint = endpoint.substring(0, endpoint.length - 1);

    return `opc.tcp://${serverInfo.ip}:${serverInfo.port}${endpoint}`;
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