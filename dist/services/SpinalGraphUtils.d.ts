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
export declare class SpinalUtils {
    connect: spinal.FileSystem;
    private static _instance;
    private _graph;
    private _isInitialized;
    context: SpinalContext;
    private constructor();
    static getInstance(): SpinalUtils;
    get graph(): SpinalGraph<any>;
    init(connect: spinal.FileSystem, digitaltwinPath: string): Promise<SpinalGraph>;
    getStartNode(contextName: string, categoryName?: string, groupName?: string): Promise<SpinalNode>;
    getBmsEndpointNode(startNode: SpinalNode): Promise<TModels[]>;
    bindEndpoints(models: TModels[]): void;
    private _getCategoryByName;
    private _getGroupByName;
    private _getEndpointData;
    private _getEndpointControlValue;
    private _getEndpointServer;
}
export default SpinalUtils;
