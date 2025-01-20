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
const spinal_core_connectorjs_type_1 = require("spinal-core-connectorjs_type");
const utils_1 = require("./services/utils");
spinal_core_connectorjs_type_1.FileSystem.onConnectionError = (code) => {
    console.log("redemarrage");
    process.exit(code); // kill le process;
};
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const spinalUtils = yield (0, utils_1.init)();
            const [zoneNodeStartNode, groupDaliStartNode] = yield (0, utils_1.getStartNodes)(spinalUtils);
            console.log("getting bmsEndpoints...");
            const { groupDaliNodes, modeFonctionnementNodes } = yield (0, utils_1.getBmsEndpointsNodes)(spinalUtils, groupDaliStartNode, zoneNodeStartNode);
            console.log(groupDaliNodes.length, "nodes 'group Dali(s)' found");
            console.log(modeFonctionnementNodes.length, "nodes 'mode fonctionnement(s)' found");
            console.log("binding...");
            (0, utils_1.bindEndpoints)(groupDaliNodes, modeFonctionnementNodes);
            console.log("** Done **");
            // await spinalUtils.bindEndpoints(bmsEndpoints);
        }
        catch (error) {
            console.error(error);
            process.exit(0);
        }
    });
})();
//# sourceMappingURL=index.js.map