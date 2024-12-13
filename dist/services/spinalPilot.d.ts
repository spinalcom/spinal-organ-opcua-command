export declare class SpinalPilot {
    private static _instance;
    private constructor();
    static getInstance(): SpinalPilot;
    sendUpdateRequest(url: string, data: {
        nodeId: string;
        value: any;
    }): Promise<{
        nodeId: string;
        value: any;
    }>;
}
export default SpinalPilot;
