import {
    OPCUAClient, ClientSession, ClientSubscription,
    UserIdentityInfo, UserTokenType,
    MessageSecurityMode, SecurityPolicy, NodeId, AttributeIds,
    StatusCodes, VariantArrayType, DataType, findBasicDataType,
    Variant, WriteValue, coerceBoolean
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
            if (number === 3) return this.client.disconnect();
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

        const { dataType, arrayDimension, valueRank } = await this._getNodesDetails(nodeId);

        if (dataType) {
            try {
                const _value = this._parseValue(valueRank, arrayDimension, dataType, value);

                const writeValue = new WriteValue({
                    nodeId,
                    attributeId: AttributeIds.Value,
                    value: { value: _value },
                });

                let statusCode = await this.session.write(writeValue);

                return statusCode;
            } catch (error) {
                console.log("error writing value", error);
                return StatusCodes.BadInternalError;
            }
        }
    }

    private async _getNodesDetails(nodeId: string) {
        const dataTypeIdDataValue = await this.session.read({ nodeId, attributeId: AttributeIds.DataType });
        const arrayDimensionDataValue = await this.session.read({ nodeId, attributeId: AttributeIds.ArrayDimensions });
        const valueRankDataValue = await this.session.read({ nodeId, attributeId: AttributeIds.ValueRank });

        const dataTypeId = dataTypeIdDataValue.value.value as NodeId;
        const dataType = await findBasicDataType(this.session, dataTypeId);

        const arrayDimension = arrayDimensionDataValue.value.value as null | number[];
        const valueRank = valueRankDataValue.value.value as number;

        return { dataType, arrayDimension, valueRank };
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

}



export default OPCUAService;
