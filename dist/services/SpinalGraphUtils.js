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
exports.SpinalGraphUtils = void 0;
const spinal_core_connectorjs_type_1 = require("spinal-core-connectorjs_type");
const spinal_model_bmsnetwork_1 = require("spinal-model-bmsnetwork");
const env_1 = require("./env");
const utils_1 = require("./utils");
class SpinalGraphUtils {
    // public context: SpinalContext;
    constructor() {
        this._isInitialized = new Map();
    }
    static getInstance() {
        if (!this._instance)
            this._instance = new SpinalGraphUtils();
        return this._instance;
    }
    get graph() {
        return this._graph;
    }
    init(connect, digitaltwinPath) {
        return new Promise((resolve, reject) => {
            spinal_core_connectorjs_type_1.spinalCore.load(connect, digitaltwinPath, (graph) => {
                this._graph = graph;
                resolve(graph);
            }, () => reject(new Error(`No digitaltwin found at ${digitaltwinPath}`)));
        });
    }
    getStartNode(contextName, categoryName, groupName) {
        return __awaiter(this, void 0, void 0, function* () {
            const context = yield this.graph.getContext(contextName);
            if (!context)
                throw new Error(`No context found for "${contextName}"`);
            // this.context = context;
            let group = null;
            let category = null;
            if (groupName && !categoryName)
                throw new Error(`"COMMAND_CATEGORY_NAME" is mandatory, when "COMMAND_GROUP_NAME" is specified`);
            if (categoryName) {
                category = yield this._getCategoryByName(context, categoryName);
                if (!category)
                    throw new Error(`no category found for "${categoryName}"`);
            }
            if (groupName && category) {
                group = yield this._getGroupByName(context, category, groupName);
                if (!group)
                    throw new Error(`no group found for "${groupName}"`);
            }
            return { context, startNode: group || category || context };
        });
    }
    getBmsEndpointNode(startNode, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const nodes = yield startNode.findInContext(context, (node) => node.getType().get() === spinal_model_bmsnetwork_1.SpinalBmsEndpoint.nodeTypeName);
            return nodes.map(el => ({ directModificationDate: el.info.directModificationDate, node: el }));
        });
    }
    // public async getZoneModeFonctionnement(startNode: SpinalNode, context: SpinalContext): Promise<(TModels & { zone: SpinalNode })[]> {
    getZoneModeFonctionnement(startNode, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const modeF = yield startNode.findInContext(context, (node) => node.getType().get() === spinal_model_bmsnetwork_1.SpinalBmsEndpoint.nodeTypeName && node.getName().get() === "Mode fonctionnement");
            return modeF.map(el => ({ directModificationDate: el.info.directModificationDate, node: el }));
            // const zones = await startNode.findInContext(context, (node) => /^Zone/i.test(node.getName().get()));
            // return zones.reduce(async (listProm, zone) => {
            //     const list = await listProm;
            //     const children = await zone.getChildren([SpinalBmsEndpointGroup.relationName, SpinalBmsEndpoint.relationName]);
            //     const modeF = children.find(el => el.getName().get() === "Mode de fonctionnement");
            //     if (modeF) list.push({ directModificationDate: modeF.info.directModificationDate, node: modeF, zone });
            //     return listProm;
            // }, Promise.resolve([]))
        });
    }
    getEndpointDataInMap(id) {
        return this._isInitialized[id];
    }
    addEndpointsToMap(node) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = node.getId().get();
            const { attribute, element, serverInfo } = yield this.getEndpointData(node);
            this._isInitialized[id] = { node, attribute, element, serverInfo };
            return this._isInitialized[id];
            // _self._isInitialized[id] = data;
        });
    }
    getEndpointData(endpointNode) {
        return __awaiter(this, void 0, void 0, function* () {
            const [element, attribute, serverInfo] = yield Promise.all([
                endpointNode.getElement(),
                this._getEndpointControlValue(endpointNode),
                this._getEndpointServer(endpointNode)
            ]);
            return { element, attribute, serverInfo };
        });
    }
    ////////////////////////////////////////////// PRIVATES METHODS
    _getCategoryByName(context, categoryName) {
        return __awaiter(this, void 0, void 0, function* () {
            const categories = yield context.getChildrenInContext(context);
            return categories.find(el => el.getName().get() === categoryName);
        });
    }
    _getGroupByName(context, category, groupName) {
        return __awaiter(this, void 0, void 0, function* () {
            const groups = yield category.getChildrenInContext(context);
            return groups.find(el => el.getName().get() === groupName);
        });
    }
    _getEndpointControlValue(endpointNode) {
        return __awaiter(this, void 0, void 0, function* () {
            const { attribute_category, endpoint_control_value_name, attribute_default_value } = env_1.default;
            return (0, utils_1.getOrCreateAttribute)(endpointNode, attribute_category, endpoint_control_value_name, attribute_default_value);
        });
    }
    _getEndpointServer(endpointNode) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const found = yield endpointNode.findOneParent([spinal_model_bmsnetwork_1.SpinalBmsNetwork.relationName, spinal_model_bmsnetwork_1.SpinalBmsDevice.relationName, spinal_model_bmsnetwork_1.SpinalBmsEndpointGroup.relationName, spinal_model_bmsnetwork_1.SpinalBmsEndpoint.relationName], (node) => {
                return node.getType().get() === spinal_model_bmsnetwork_1.SpinalBmsNetwork.nodeTypeName;
            });
            if (found)
                return (_b = (_a = found.info) === null || _a === void 0 ? void 0 : _a.serverInfo) === null || _b === void 0 ? void 0 : _b.get();
        });
    }
}
exports.SpinalGraphUtils = SpinalGraphUtils;
exports.default = SpinalGraphUtils;
//# sourceMappingURL=SpinalGraphUtils.js.map