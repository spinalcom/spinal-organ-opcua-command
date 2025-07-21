/// <reference types="node" />
import { UserIdentityInfo, NodeId, DataValue } from "node-opcua";
import { EventEmitter } from "events";
export declare class OPCUAService extends EventEmitter {
    private client?;
    private session?;
    private subscription?;
    private userIdentity;
    verbose: boolean;
    private endpointUrl;
    constructor(url: string);
    initialize(): Promise<void>;
    private _createSession;
    private _listenClientEvents;
    private _listenSessionEvent;
    private _restartConnection;
    createSubscription(): Promise<void>;
    connect(userIdentity?: UserIdentityInfo): Promise<void>;
    disconnect(): Promise<void>;
    writeNode(nodeId: string, value: any): Promise<any>;
    private _getDataType;
    private _getNodesDetails;
    private detectOPCUAValueType;
    readNode(node: {
        nodeId: NodeId;
    } | {
        nodeId: NodeId;
    }[]): Promise<DataValue[]>;
    private _parseValue;
    private coerceStringToDataType;
    private _formatDataValue;
}
export default OPCUAService;
