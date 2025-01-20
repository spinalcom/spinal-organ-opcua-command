import { SpinalContext, SpinalGraph, SpinalNode } from "spinal-model-graph";
import { TModels } from "./EndpointProcess";
import { SpinalBmsEndpoint } from "spinal-model-bmsnetwork";
import { SpinalAttribute } from "spinal-models-documentation";
export interface IServer {
    name: string;
    ip: string;
    port: number | string;
    endpoint: string;
}
export interface IEndpointData {
    node: SpinalNode;
    attribute: SpinalAttribute;
    element: SpinalBmsEndpoint;
    serverInfo: IServer;
}
export declare class SpinalGraphUtils {
    connect: spinal.FileSystem;
    private static _instance;
    private _graph;
    private _isInitialized;
    private constructor();
    static getInstance(): SpinalGraphUtils;
    get graph(): SpinalGraph<any>;
    init(connect: spinal.FileSystem, digitaltwinPath: string): Promise<SpinalGraph>;
    getStartNode(contextName: string, categoryName?: string, groupName?: string): Promise<{
        context: SpinalContext;
        startNode: SpinalNode;
    }>;
    getBmsEndpointNode(startNode: SpinalNode, context: SpinalContext): Promise<TModels[]>;
    getZoneModeFonctionnement(startNode: SpinalNode, context: SpinalContext): Promise<TModels[]>;
    getEndpointDataInMap(id: string): IEndpointData | undefined;
    addEndpointsToMap(node: SpinalNode): Promise<IEndpointData>;
    getEndpointData(endpointNode: SpinalNode): Promise<{
        element: SpinalBmsEndpoint;
        attribute: SpinalAttribute;
        serverInfo: IServer;
    }>;
    private _getCategoryByName;
    private _getGroupByName;
    private _getEndpointControlValue;
    private _getEndpointServer;
}
export default SpinalGraphUtils;
