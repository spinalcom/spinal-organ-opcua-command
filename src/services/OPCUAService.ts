import {
    OPCUAClient, ClientSession, ClientSubscription,
    UserIdentityInfo, UserTokenType,
    MessageSecurityMode, SecurityPolicy, NodeId, AttributeIds,
    StatusCodes, VariantArrayType, DataType, findBasicDataType,
    Variant, WriteValue, coerceBoolean,
    resolveNodeId,
    coerceNodeId,
    DataValue,
    StatusCode
} from "node-opcua";

import { EventEmitter } from "events";
import certificatProm from "./make_certificate";
import { coerceFunc } from "./utils";


const securityMode: MessageSecurityMode = MessageSecurityMode["None"] as any as MessageSecurityMode;
const securityPolicy = (SecurityPolicy as any)["None"];
const userIdentity: UserIdentityInfo = { type: UserTokenType.Anonymous };

export class OPCUAService extends EventEmitter {
    private client?: OPCUAClient;
    private session?: ClientSession;
    private subscription?: ClientSubscription;
    private userIdentity: UserIdentityInfo = { type: UserTokenType.Anonymous };
    public verbose: boolean = false;
    private endpointUrl: string = "";

    public constructor(url: string) {
        super();
        this.endpointUrl = url;
    }

    public async initialize() {
        const { certificateFile, clientCertificateManager, applicationUri, applicationName } = await certificatProm;

        this.client = OPCUAClient.create({
            endpointMustExist: false,
            securityMode,
            securityPolicy,
            defaultSecureTokenLifetime: 30 * 1000,
            requestedSessionTimeout: 30 * 1000,
            keepSessionAlive: true,
            transportTimeout: 60 * 1000,
            connectionStrategy: {
                maxRetry: 3,
                initialDelay: 1000,
                maxDelay: 10 * 1000,
            },
        });

        this._listenClientEvents();
    }



    ////////////////////////////////////////////////////////////
    //					OPCUA Client			 			  //
    ////////////////////////////////////////////////////////////

    private async _createSession(client?: OPCUAClient): Promise<ClientSession> {
        try {
            const session = await (client || this.client)!.createSession(this.userIdentity);
            if (!client) {
                this.session = session;
                this._listenSessionEvent();
            }

            return session;
        } catch (err) {
            console.log(" Cannot create session ", err.toString());
        }
    }

    private _listenClientEvents(): void {
        this.client.on("backoff", (number, delay) => {
            if (number === 1) return this.client.disconnect();
            console.log(`connection failed, retrying attempt ${number + 1}`)
        });

        this.client.on("start_reconnection", () => console.log("Starting reconnection...." + this.endpointUrl));

        this.client.on("connection_reestablished", () => console.log("CONNECTION RE-ESTABLISHED !! " + this.endpointUrl));

        // monitoring des lifetimes
        this.client.on("lifetime_75", (token) => {
            if (this.verbose) console.log("received lifetime_75 on " + this.endpointUrl);
        });

        this.client.on("security_token_renewed", () => {
            if (this.verbose) console.log(" security_token_renewed on " + this.endpointUrl);
        });

        this.client.on("timed_out_request", (request) => {
            this.emit("timed_out_request", request);
        });
    }

    private _listenSessionEvent(): void {
        this.session.on("session_closed", () => {
            // console.log(" Warning => Session closed");
        })
        this.session.on("keepalive", () => {
            console.log("session keepalive");
        })
        this.session.on("keepalive_failure", () => {
            this._restartConnection();
        })
    }

    private _restartConnection = async () => {
        try {
            await this.client.disconnect()
            await this.client.connect(this.endpointUrl)
        } catch (error) {
            console.log("OpcUa: restartConnection", error)
        }
    }

    public async createSubscription() {
        if (!this.session) {
            await this._createSession();
        }

        try {
            const parameters = {
                requestedPublishingInterval: 500,
                requestedLifetimeCount: 10,
                requestedMaxKeepAliveCount: 5,
                maxNotificationsPerPublish: 10,
                publishingEnabled: true,
                priority: 1
            };

            this.subscription = await this.session.createSubscription2(parameters);
        } catch (error) {
            console.log("cannot create subscription !");
        }
    }

    public async connect(userIdentity?: UserIdentityInfo) {
        try {
            this.userIdentity = userIdentity || { type: UserTokenType.Anonymous };
            await this.client.connect(this.endpointUrl);
            await this._createSession();
            await this.createSubscription();
        } catch (error) {
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.session) {
            const session = this.session;
            this.session = undefined;
            await session.close();
        }

        await this.client!.disconnect();
    }

    public async writeNode(nodeId: string, value: any): Promise<any> {
        if (!this.session) {
            await this._createSession();
        }

        // const { dataType, arrayDimension, valueRank } = await this._getNodesDetails(node);

        const PossibleDataType = await this._getDataType(value);

        try {

            let statusCode: StatusCode;
            let isGood: boolean = false; // check we found a data type

            while (!isGood && PossibleDataType.length) {
                const dataType = PossibleDataType.shift();
                if (!dataType) throw new Error("No data type found for value: " + value);

                statusCode = await (this.session as any).writeSingleNode(nodeId.toString(), { dataType, value });

                if (statusCode.isGoodish()) isGood = true;

            }

            return StatusCodes;


            // const _value = this._parseValue(valueRank, arrayDimension, dataType, value);
            // console.log("Value in writeNode() => ", _value);
            // const writeValue = new WriteValue({
            // 	nodeId: node.nodeId,
            // 	attributeId: AttributeIds.Value,
            // 	value: { value: _value },
            // });

            // let statusCode = await this.session.write(writeValue);

            // return statusCode;
        } catch (error) {
            console.log("error writing value", error);
            return StatusCodes.BadInternalError;
        }
    }

    private _getDataType(value: any): DataType[] {
        // try {
        // 	const dataTypeId = resolveNodeId(nodeId);
        // 	const dataType = await findBasicDataType(this.session, dataTypeId);
        // 	return dataType;
        // } catch (error) {
        // 	return this.detectOPCUAValueType(nodeId);
        // }

        if (!isNaN(value)) {
            const numerics = [DataType.Float, DataType.Double, DataType.Int16, DataType.Int32, DataType.Int64, DataType.UInt16, DataType.UInt32, DataType.UInt64]
            if (value == 0 || value == 1)
                return [...numerics, DataType.Boolean]; // if the value is 0 or 1, it can be a boolean or a numeric type

            return numerics; // if the value is a number, it can be a numeric type
        }

        if (typeof value == "string") {
            return [DataType.String, DataType.LocalizedText, DataType.XmlElement]; // if the value is a string, it can be a string or a localized text
        }


        if (typeof value == "boolean") {
            return [DataType.Boolean];
        }

        if (value instanceof Date) {
            return [DataType.DateTime];
        }


        return [DataType.Null]; // if the value is not recognized, return null
    }


    private async _getNodesDetails(nodeId: string) {
        const arrayDimensionDataValue = await this.session.read({ nodeId: nodeId, attributeId: AttributeIds.ArrayDimensions });
        const valueRankDataValue = await this.session.read({ nodeId: nodeId, attributeId: AttributeIds.ValueRank });

        const arrayDimension = arrayDimensionDataValue.value.value as null | number[];
        const valueRank = valueRankDataValue.value.value as number;
        const dataType = await this._getDataType(nodeId.toString());

        return { dataType, arrayDimension, valueRank };
    }

    private async detectOPCUAValueType(nodeId: string): Promise<DataType | undefined> {
        const resValue = await this.readNode({ nodeId: coerceNodeId(nodeId) });

        if (!resValue && !resValue[0]) {
            const valuesFormatted = this._formatDataValue(resValue[0])
            if (valuesFormatted && valuesFormatted.dataType) return DataType[valuesFormatted.dataType];
            return DataType[typeof valuesFormatted.value];
        }

    }


    public async readNode(node: { nodeId: NodeId } | { nodeId: NodeId }[]): Promise<DataValue[]> {
        if (!Array.isArray(node)) node = [node];
        return this.session.read(node);
    }


    ///////////////////////////////////////////////////////
    //					Utils							 //
    ///////////////////////////////////////////////////////


    private _parseValue(valueRank: number, arrayDimension: number[], dataType: DataType, value: any) {
        const arrayType = valueRank === -1 ? VariantArrayType.Scalar : valueRank === 1 ? VariantArrayType.Array : VariantArrayType.Matrix;
        const dimensions = arrayType === VariantArrayType.Matrix ? arrayDimension : undefined;

        const _value = new Variant({
            dataType,
            arrayType,
            dimensions,
            value: this.coerceStringToDataType(dataType, arrayType, VariantArrayType, value),
        });
        return _value;
    }

    private coerceStringToDataType(dataType, arrayType, VariantArrayType, data: any) {
        const c = coerceFunc(dataType);
        if (arrayType === VariantArrayType.Scalar) {
            return c(data);
        } else {
            return data.map((d: any) => c(d));
        }
    }

    private _formatDataValue(dataValue: any): { value: any; dataType: string } {

        // if dataValue.value is a Variant return the value of the Variant
        if (typeof dataValue?.value?.value !== "undefined") {
            const obj = { dataType: DataType[dataValue?.value?.dataType], value: undefined };

            switch (dataValue?.value?.arrayType) {
                /*case VariantArrayType.Scalar:
                    obj.value = dataValue?.value?.value;
                    break;
                    */
                case VariantArrayType.Array:
                    obj.value = dataValue?.value?.value.join(",");
                    break;
                default:
                    let value = dataValue?.value?.value;
                    if (value == null) value = "null";

                    obj.value = value;
                    break;
            }

            return obj;
        }

        // if dataValue.value is not a Variant, return the value and dataType
        if (typeof dataValue.value !== "object") {
            if (dataValue.value == null) dataValue.value = "null";
            return dataValue;
        }

        return null;
    }

}



export default OPCUAService;
