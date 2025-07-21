import { SpinalContext, SpinalNode } from "spinal-model-graph";
import SpinalGraphUtils, { IEndpointData } from "./SpinalGraphUtils";
import { DataType } from "node-opcua";
import { TModels } from "./EndpointProcess";
import { SpinalAttribute } from "spinal-models-documentation";
type Consumedfunction<T> = () => Promise<T>;
type INodes = {
    context: SpinalContext;
    startNode: SpinalNode;
};
export declare function init(): Promise<SpinalGraphUtils>;
export declare function getStartNodes(spinalUtils: SpinalGraphUtils): Promise<[{
    context: SpinalContext<any>;
    startNode: SpinalNode<any>;
}, {
    context: SpinalContext<any>;
    startNode: SpinalNode<any>;
}]>;
export declare function getBmsEndpointsNodes(spinalUtils: SpinalGraphUtils, groupDaliNodes: INodes, modeFonctionnement: INodes): Promise<{
    groupDaliNodes: TModels[];
    modeFonctionnementNodes: TModels[];
}>;
export declare function bindEndpoints(groupDaliEndpoints: TModels[], modeFonctionnementEndpoints: TModels[]): void;
export declare function _bindEndpointcallback(node: SpinalNode, isModeFonctionnement?: boolean): Promise<void>;
export declare function getInitZoneAttribute(node: SpinalNode, isModeFonctionnement: boolean): Promise<SpinalAttribute>;
export declare function getOrCreateAttribute(node: SpinalNode, attributeCategory: string, attributeName: string, attributeValue?: any): Promise<SpinalAttribute>;
export declare function addAEndpointsToMap(nodes: SpinalNode | SpinalNode[]): Promise<IEndpointData[]>;
export declare function _sendUpdateRequest(node: SpinalNode): Promise<IEndpointData>;
export declare function _consumeBatch<T>(promises: Consumedfunction<T>[], batchSize?: number): Promise<T[]>;
export declare function getServerUrl(serverInfo: any): string;
export declare const coerceBoolean: (data: any) => boolean;
export declare const coerceNumber: (data: any) => number;
export declare const coerceNumberR: (data: any) => number;
export declare const coerceNoop: (data: any) => any;
export declare const coerceFunc: (dataType: DataType) => (data: any) => any;
export declare function coerceStringToDataType(dataType: any, arrayType: any, VariantArrayType: any, data: any): any;
export {};
