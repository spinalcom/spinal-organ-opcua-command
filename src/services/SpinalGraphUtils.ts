import { promises } from "dns";
import { spinalCore } from "spinal-core-connectorjs_type";
import { SpinalContext, SpinalGraph, SpinalNode } from "spinal-model-graph";
import EndpointProcess, { TModels } from "./EndpointProcess";
import { SpinalBmsDevice, SpinalBmsEndpoint, SpinalBmsEndpointGroup, SpinalBmsNetwork } from "spinal-model-bmsnetwork";
import { SpinalAttribute } from "spinal-models-documentation";
import { attributeService } from "spinal-env-viewer-plugin-documentation-service";
import env_data from "./env";
import { _callbackMethod, _consumeBatch } from "./utils";



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

export class SpinalUtils {
    connect: spinal.FileSystem
    private static _instance: SpinalUtils;
    private _graph: SpinalGraph;
    private _isInitialized: Map<string, IEndpointData> = new Map()
    public context: SpinalContext;

    private constructor() { }

    public static getInstance(): SpinalUtils {
        if (!this._instance) this._instance = new SpinalUtils();

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

    public async getStartNode(contextName: string, categoryName?: string, groupName?: string): Promise<SpinalNode> {
        const context = await this.graph.getContext(contextName);
        if (!context) throw new Error(`No context found for "${contextName}"`);

        this.context = context;

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


        return group || category || context;
    }


    public async getBmsEndpointNode(startNode: SpinalNode): Promise<TModels[]> {
        const seen: Set<SpinalNode<any>> = new Set([startNode]);
        let nextGen: SpinalNode[] = [startNode];
        let currentGen: SpinalNode[] = [];
        let found: TModels[] = [];

        while (nextGen.length) {
            currentGen = nextGen;
            nextGen = [];

            const promises = currentGen.map(node => {
                seen.add(node);
                return () => node.getChildrenInContext(this.context)
            });

            const childrenArray = await _consumeBatch(promises, 30);

            for (const node of childrenArray.flat()) {
                if (node.getType().get() === SpinalBmsEndpoint.nodeTypeName) {
                    found.push({ directModificationDate: node.info.directModificationDate, node });
                    continue;
                }

                if (!seen.has(node)) nextGen.push(node);
            }
        }

        return found;
    }


    public bindEndpoints(models: TModels[]) {
        new EndpointProcess(models, true, _callbackMethod.bind(this));
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

    private async _getEndpointData(endpointNode: SpinalNode): Promise<{ element: SpinalBmsEndpoint, attribute: SpinalAttribute, serverInfo: IServer }> {
        const [element, attribute, serverInfo] = await Promise.all([
            endpointNode.getElement(),
            this._getEndpointControlValue(endpointNode),
            this._getEndpointServer(endpointNode)
        ])

        return { element, attribute, serverInfo }
    }

    private async _getEndpointControlValue(endpointNode: SpinalNode): Promise<SpinalAttribute> {
        const { attribute_category, attribute_name, attribute_default_value } = env_data

        const [attribute] = await attributeService.getAttributesByCategory(endpointNode, attribute_category, attribute_name)
        if (attribute) return attribute;

        return attributeService.addAttributeByCategoryName(endpointNode, attribute_category, attribute_name, attribute_default_value);
    }


    private async _getEndpointServer(endpointNode: SpinalNode): Promise<IServer> {
        const found = await endpointNode.findOneParent([SpinalBmsNetwork.relationName, SpinalBmsDevice.relationName, SpinalBmsEndpointGroup.relationName, SpinalBmsEndpoint.relationName], (node) => {
            return node.getType().get() === SpinalBmsNetwork.nodeTypeName;
        });

        if (found) return found.info?.serverInfo?.get();
    }

}


export default SpinalUtils;