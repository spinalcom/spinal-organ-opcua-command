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
exports.OPCUAService = void 0;
const node_opcua_1 = require("node-opcua");
const events_1 = require("events");
const make_certificate_1 = require("./make_certificate");
const utils_1 = require("./utils");
const securityMode = node_opcua_1.MessageSecurityMode["None"];
const securityPolicy = node_opcua_1.SecurityPolicy["None"];
const userIdentity = { type: node_opcua_1.UserTokenType.Anonymous };
class OPCUAService extends events_1.EventEmitter {
    constructor(url) {
        super();
        this.userIdentity = { type: node_opcua_1.UserTokenType.Anonymous };
        this.verbose = false;
        this.endpointUrl = "";
        this._restartConnection = () => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.client.disconnect();
                yield this.client.connect(this.endpointUrl);
            }
            catch (error) {
                console.log("OpcUa: restartConnection", error);
            }
        });
        this.endpointUrl = url;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const { certificateFile, clientCertificateManager, applicationUri, applicationName } = yield make_certificate_1.default;
            this.client = node_opcua_1.OPCUAClient.create({
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
        });
    }
    ////////////////////////////////////////////////////////////
    //					OPCUA Client			 			  //
    ////////////////////////////////////////////////////////////
    _createSession(client) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const session = yield (client || this.client).createSession(this.userIdentity);
                if (!client) {
                    this.session = session;
                    this._listenSessionEvent();
                }
                return session;
            }
            catch (err) {
                console.log(" Cannot create session ", err.toString());
            }
        });
    }
    _listenClientEvents() {
        this.client.on("backoff", (number, delay) => {
            if (number === 3)
                return this.client.disconnect();
            console.log(`connection failed, retrying attempt ${number + 1}`);
        });
        this.client.on("start_reconnection", () => console.log("Starting reconnection...." + this.endpointUrl));
        this.client.on("connection_reestablished", () => console.log("CONNECTION RE-ESTABLISHED !! " + this.endpointUrl));
        // monitoring des lifetimes
        this.client.on("lifetime_75", (token) => {
            if (this.verbose)
                console.log("received lifetime_75 on " + this.endpointUrl);
        });
        this.client.on("security_token_renewed", () => {
            if (this.verbose)
                console.log(" security_token_renewed on " + this.endpointUrl);
        });
        this.client.on("timed_out_request", (request) => {
            this.emit("timed_out_request", request);
        });
    }
    _listenSessionEvent() {
        this.session.on("session_closed", () => {
            // console.log(" Warning => Session closed");
        });
        this.session.on("keepalive", () => {
            console.log("session keepalive");
        });
        this.session.on("keepalive_failure", () => {
            this._restartConnection();
        });
    }
    createSubscription() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.session) {
                yield this._createSession();
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
                this.subscription = yield this.session.createSubscription2(parameters);
            }
            catch (error) {
                console.log("cannot create subscription !");
            }
        });
    }
    connect(userIdentity) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.userIdentity = userIdentity || { type: node_opcua_1.UserTokenType.Anonymous };
                yield this.client.connect(this.endpointUrl);
                yield this._createSession();
                yield this.createSubscription();
            }
            catch (error) {
                throw error;
            }
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.session) {
                const session = this.session;
                this.session = undefined;
                yield session.close();
            }
            yield this.client.disconnect();
        });
    }
    writeNode(nodeId, value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.session) {
                yield this._createSession();
            }
            const { dataType, arrayDimension, valueRank } = yield this._getNodesDetails(nodeId);
            if (dataType) {
                try {
                    const _value = this._parseValue(valueRank, arrayDimension, dataType, value);
                    const writeValue = new node_opcua_1.WriteValue({
                        nodeId,
                        attributeId: node_opcua_1.AttributeIds.Value,
                        value: { value: _value },
                    });
                    let statusCode = yield this.session.write(writeValue);
                    return statusCode;
                }
                catch (error) {
                    console.log("error writing value", error);
                    return node_opcua_1.StatusCodes.BadInternalError;
                }
            }
        });
    }
    _getNodesDetails(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataTypeIdDataValue = yield this.session.read({ nodeId, attributeId: node_opcua_1.AttributeIds.DataType });
            const arrayDimensionDataValue = yield this.session.read({ nodeId, attributeId: node_opcua_1.AttributeIds.ArrayDimensions });
            const valueRankDataValue = yield this.session.read({ nodeId, attributeId: node_opcua_1.AttributeIds.ValueRank });
            const dataTypeId = dataTypeIdDataValue.value.value;
            const dataType = yield (0, node_opcua_1.findBasicDataType)(this.session, dataTypeId);
            const arrayDimension = arrayDimensionDataValue.value.value;
            const valueRank = valueRankDataValue.value.value;
            return { dataType, arrayDimension, valueRank };
        });
    }
    ///////////////////////////////////////////////////////
    //					Utils							 //
    ///////////////////////////////////////////////////////
    _parseValue(valueRank, arrayDimension, dataType, value) {
        const arrayType = valueRank === -1 ? node_opcua_1.VariantArrayType.Scalar : valueRank === 1 ? node_opcua_1.VariantArrayType.Array : node_opcua_1.VariantArrayType.Matrix;
        const dimensions = arrayType === node_opcua_1.VariantArrayType.Matrix ? arrayDimension : undefined;
        const _value = new node_opcua_1.Variant({
            dataType,
            arrayType,
            dimensions,
            value: this.coerceStringToDataType(dataType, arrayType, node_opcua_1.VariantArrayType, value),
        });
        return _value;
    }
    coerceStringToDataType(dataType, arrayType, VariantArrayType, data) {
        const c = (0, utils_1.coerceFunc)(dataType);
        if (arrayType === VariantArrayType.Scalar) {
            return c(data);
        }
        else {
            return data.map((d) => c(d));
        }
    }
}
exports.OPCUAService = OPCUAService;
exports.default = OPCUAService;
//# sourceMappingURL=OPCUAService.js.map