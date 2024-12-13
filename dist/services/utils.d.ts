import { SpinalNode } from "spinal-model-graph";
import { DataType } from "node-opcua";
type Consumedfunction<T> = () => Promise<T>;
export declare function _callbackMethod(node: SpinalNode): Promise<void>;
export declare function _consumeBatch<T>(promises: Consumedfunction<T>[], batchSize?: number): Promise<T[]>;
export declare function getServerUrl(serverInfo: any): string;
export declare const coerceBoolean: (data: any) => boolean;
export declare const coerceNumber: (data: any) => number;
export declare const coerceNumberR: (data: any) => number;
export declare const coerceNoop: (data: any) => any;
export declare const coerceFunc: (dataType: DataType) => (data: any) => any;
export declare function coerceStringToDataType(dataType: any, arrayType: any, VariantArrayType: any, data: any): any;
export {};
