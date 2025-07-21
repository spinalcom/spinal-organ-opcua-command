import { Model, Process } from "spinal-core-connectorjs_type";
import { SpinalNode } from "spinal-model-graph";


export type TModels = { directModificationDate: Model, node: SpinalNode };
type TCallback = (node: SpinalNode) => void

export class EndpointProcess extends Process {
    public static _constructorName: string = "EndpointProcess";
    private models: TModels[];
    private _callback: TCallback;

    constructor(models: TModels[], callback: TCallback, call_onchange_on_construction: boolean = false) {
        super(models.map(el => el.directModificationDate), call_onchange_on_construction);
        this.models = models;
        this._callback = callback;
    }

    public onchange() {
        for (const { directModificationDate, node } of this.models) {
            if (directModificationDate.has_been_directly_modified()) this._callback(node);
        }
    }
}

export default EndpointProcess;