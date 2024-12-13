import { SpinalOPCUAPilot, IRequest } from "spinal-model-opcua";
import { IEndpointData } from "./SpinalGraphUtils";
import { MessageSecurityMode, OPCUAClient, SecurityPolicy, UserIdentityInfo, UserTokenType } from "node-opcua";
import OPCUAService from "./OPCUAService";



const securityMode: MessageSecurityMode = MessageSecurityMode["None"] as any as MessageSecurityMode;
const securityPolicy = (SecurityPolicy as any)["None"];
const userIdentity: UserIdentityInfo = { type: UserTokenType.Anonymous };


export class SpinalPilot {
    private static _instance: SpinalPilot;
    private constructor() { }

    public static getInstance() {
        if (!this._instance) this._instance = new SpinalPilot();
        return this._instance;
    }


    public async sendUpdateRequest(url: string, data: { nodeId: string, value: any }) {
        const opcuaService = new OPCUAService(url);
        let err;
        try {
            await opcuaService.initialize();
            await opcuaService.connect();
            await opcuaService.writeNode(data.nodeId, data.value);
        } catch (error) {
            err = error;
        }

        await opcuaService.disconnect();
        if (err) throw err;

        return data;
    }

}

export default SpinalPilot;