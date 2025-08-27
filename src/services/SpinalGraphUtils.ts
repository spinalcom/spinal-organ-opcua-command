import { spinalCore } from "spinal-core-connectorjs_type";
import { SpinalContext, SpinalGraph, SpinalNode } from "spinal-model-graph";
import { TModels } from "./EndpointProcess";
import { SpinalBmsDevice, SpinalBmsEndpoint, SpinalBmsEndpointGroup, SpinalBmsNetwork } from "spinal-model-bmsnetwork";
import { SpinalAttribute } from "spinal-models-documentation";


import env_data from "./env";
import { getOrCreateAttribute } from "./utils";



export interface IServer {
    name: string;
    ip: string;
    port: number | string;
    endpoint: string;
}

export interface IEndpointData {
    node: SpinalNode,
    attribute: SpinalAttribute,
    element: SpinalBmsEndpoint,
    serverInfo: IServer
}

export class SpinalGraphUtils {
    connect: spinal.FileSystem
    private static _instance: SpinalGraphUtils;
    private _graph: SpinalGraph;
    private _isInitialized: Map<string, IEndpointData> = new Map()
    // public context: SpinalContext;

    private constructor() { }

    public static getInstance(): SpinalGraphUtils {
        if (!this._instance) this._instance = new SpinalGraphUtils();

        return this._instance;
    }

    public get graph() {
        return this._graph;
    }


    public init(connect: spinal.FileSystem, digitaltwinPath: string): Promise<SpinalGraph> {
        return new Promise((resolve, reject) => {
            spinalCore.load(connect, digitaltwinPath, (graph: SpinalGraph) => {
                this._graph = graph;
                resolve(graph)
            }, () => reject(new Error(`No digitaltwin found at ${digitaltwinPath}`)));
        });
    }

    public async getStartNode(contextName: string, categoryName?: string, groupName?: string): Promise<{ context: SpinalContext, startNode: SpinalNode }> {
        const context = await this.graph.getContext(contextName);
        if (!context) throw new Error(`No context found for "${contextName}"`);

        // this.context = context;

        let group = null;
        let category = null;

        if (groupName && !categoryName) throw new Error(`"COMMAND_CATEGORY_NAME" is mandatory, when "COMMAND_GROUP_NAME" is specified`);

        if (categoryName) {
            category = await this._getCategoryByName(context, categoryName);
            if (!category) throw new Error(`no category found for "${categoryName}"`);
        }

        if (groupName && category) {
            group = await this._getGroupByName(context, category, groupName);
            if (!group) throw new Error(`no group found for "${groupName}"`);
        }


        return { context, startNode: group || category || context };
    }


    public async getBmsEndpointNode(startNode: SpinalNode, context: SpinalContext): Promise<TModels[]> {
        const nodes = await startNode.findInContext(context, (node) => node.getType().get() === SpinalBmsEndpoint.nodeTypeName);

        return nodes.map(el => ({ directModificationDate: el.info.directModificationDate, node: el }));
    }

    // public async getZoneModeFonctionnement(startNode: SpinalNode, context: SpinalContext): Promise<(TModels & { zone: SpinalNode })[]> {
    public async getZoneModeFonctionnement(startNode: SpinalNode, context: SpinalContext): Promise<TModels[]> {

        const modeF = await startNode.findInContext(context, (node) => node.getType().get() === SpinalBmsEndpoint.nodeTypeName);

        return modeF.map(el => ({ directModificationDate: el.info.directModificationDate, node: el }));
        // const zones = await startNode.findInContext(context, (node) => /^Zone/i.test(node.getName().get()));
        // return zones.reduce(async (listProm, zone) => {
        //     const list = await listProm;
        //     const children = await zone.getChildren([SpinalBmsEndpointGroup.relationName, SpinalBmsEndpoint.relationName]);
        //     const modeF = children.find(el => el.getName().get() === "Mode de fonctionnement");

        //     if (modeF) list.push({ directModificationDate: modeF.info.directModificationDate, node: modeF, zone });
        //     return listProm;
        // }, Promise.resolve([]))
    }

    public async getEndpointDataInMap(node: SpinalNode): Promise<IEndpointData | undefined> {
        const id = node.getId().get();
        const data = this._isInitialized[id];
        if(data) return data;

        return this.addEndpointsToMap(node);
    }

    public async addEndpointsToMap(node: SpinalNode): Promise<IEndpointData> {
        const id = node.getId().get();
        const { attribute, element, serverInfo } = await this.getEndpointData(node);
        this._isInitialized[id] = { node, attribute, element, serverInfo };

        return this._isInitialized[id];
        // _self._isInitialized[id] = data;
    }


    public async getEndpointData(endpointNode: SpinalNode): Promise<{ element: SpinalBmsEndpoint, attribute: SpinalAttribute, serverInfo: IServer }> {
        const [element, attribute, serverInfo] = await Promise.all([
            endpointNode.getElement(),
            this._getEndpointControlValue(endpointNode),
            this._getEndpointServer(endpointNode)
        ])

        return { element, attribute, serverInfo }
    }



    ////////////////////////////////////////////// PRIVATES METHODS

    private async _getCategoryByName(context: SpinalContext, categoryName: string): Promise<SpinalNode> {
        const categories = await context.getChildrenInContext(context);
        return categories.find(el => el.getName().get() === categoryName);
    }

    private async _getGroupByName(context: SpinalContext, category: SpinalNode, groupName: string): Promise<SpinalNode> {
        const groups = await category.getChildrenInContext(context);
        return groups.find(el => el.getName().get() === groupName);
    }



    private async _getEndpointControlValue(endpointNode: SpinalNode): Promise<SpinalAttribute> {
        const { attribute_category, endpoint_control_value_name, attribute_default_value } = env_data
        return getOrCreateAttribute(endpointNode, attribute_category, endpoint_control_value_name, attribute_default_value);
    }


    private async _getEndpointServer(endpointNode: SpinalNode): Promise<IServer> {
        const found = await endpointNode.findOneParent([SpinalBmsNetwork.relationName, SpinalBmsDevice.relationName, SpinalBmsEndpointGroup.relationName, SpinalBmsEndpoint.relationName], (node) => {
            // return node.getType().get() === SpinalBmsNetwork.nodeTypeName;
            return node.getType().get() === SpinalBmsDevice.nodeTypeName;
        });

        // if (found) return found.info?.serverInfo?.get();
        if (found) return found.info?.server?.get();
    }

}


export default SpinalGraphUtils;