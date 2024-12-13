"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./services/env");
const spinal_core_connectorjs_type_1 = require("spinal-core-connectorjs_type");
const SpinalGraphUtils_1 = require("./services/SpinalGraphUtils");
const spinal_lib_organ_monitoring_1 = require("spinal-lib-organ-monitoring");
const { protocol, userId, password, host, port, digitaltwin_path, context_name, category_name, group_name, organ_name } = env_1.default;
const url = `${protocol}://${userId}:${password}@${host}:${port}/`;
const connect = spinal_core_connectorjs_type_1.spinalCore.connect(url);
spinal_core_connectorjs_type_1.FileSystem.onConnectionError = (code) => {
    console.log("redemarrage");
    process.exit(code); // kill le process;
};
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield spinal_lib_organ_monitoring_1.default.init(connect, organ_name, host, protocol, parseInt(port));
            const spinalUtils = SpinalGraphUtils_1.default.getInstance();
            yield spinalUtils.init(connect, digitaltwin_path);
            const startNode = yield spinalUtils.getStartNode(context_name, category_name, group_name);
            console.log("getting bmsEndpoints...");
            const bmsEndpoints = yield spinalUtils.getBmsEndpointNode(startNode);
            console.log(bmsEndpoints.length, "endpoint(s) found");
            console.log("binding...");
            yield spinalUtils.bindEndpoints(bmsEndpoints);
            console.log("** Done **");
        }
        catch (error) {
            console.error(error);
            process.exit(0);
        }
    });
})();
//# sourceMappingURL=index.js.map