"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointProcess = void 0;
const spinal_core_connectorjs_type_1 = require("spinal-core-connectorjs_type");
class EndpointProcess extends spinal_core_connectorjs_type_1.Process {
    constructor(models, call_onchange_on_construction, callback) {
        super(models.map(el => el.directModificationDate), call_onchange_on_construction);
        this.models = models;
        this._callback = callback;
    }
    onchange() {
        for (const { directModificationDate, node } of this.models) {
            if (directModificationDate.has_been_directly_modified())
                this._callback(node);
        }
    }
}
exports.EndpointProcess = EndpointProcess;
EndpointProcess._constructorName = "EndpointProcess";
exports.default = EndpointProcess;
//# sourceMappingURL=EndpointProcess.js.map