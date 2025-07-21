import { Model, Process } from "spinal-core-connectorjs_type";
import { SpinalNode } from "spinal-model-graph";
export type TModels = {
    directModificationDate: Model;
    node: SpinalNode;
};
type TCallback = (node: SpinalNode) => void;
export declare class EndpointProcess extends Process {
    static _constructorName: string;
    private models;
    private _callback;
    constructor(models: TModels[], callback: TCallback, call_onchange_on_construction?: boolean);
    onchange(): void;
}
export default EndpointProcess;
