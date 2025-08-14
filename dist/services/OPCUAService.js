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
            if (number === 1)
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
            // const { dataType, arrayDimension, valueRank } = await this._getNodesDetails(node);
            const PossibleDataType = yield this._getDataType(value);
            try {
                let statusCode;
                let isGood = false; // check we found a data type
                while (!isGood && PossibleDataType.length) {
                    const dataType = PossibleDataType.shift();
                    if (!dataType)
                        throw new Error("No data type found for value: " + value);
                    statusCode = yield this.session.writeSingleNode(nodeId.toString(), { dataType, value });
                    if (statusCode.isGoodish())
                        isGood = true;
                }
                return node_opcua_1.StatusCodes;
                // const _value = this._parseValue(valueRank, arrayDimension, dataType, value);
                // console.log("Value in writeNode() => ", _value);
                // const writeValue = new WriteValue({
                // 	nodeId: node.nodeId,
                // 	attributeId: AttributeIds.Value,
                // 	value: { value: _value },
                // });
                // let statusCode = await this.session.write(writeValue);
                // return statusCode;
            }
            catch (error) {
                console.log("error writing value", error);
                return node_opcua_1.StatusCodes.BadInternalError;
            }
        });
    }
    _getDataType(value) {
        // try {
        // 	const dataTypeId = resolveNodeId(nodeId);
        // 	const dataType = await findBasicDataType(this.session, dataTypeId);
        // 	return dataType;
        // } catch (error) {
        // 	return this.detectOPCUAValueType(nodeId);
        // }
        if (!isNaN(value)) {
            const numerics = [node_opcua_1.DataType.Float, node_opcua_1.DataType.Double, node_opcua_1.DataType.Int16, node_opcua_1.DataType.Int32, node_opcua_1.DataType.Int64, node_opcua_1.DataType.UInt16, node_opcua_1.DataType.UInt32, node_opcua_1.DataType.UInt64];
            if (value == 0 || value == 1)
                return [...numerics, node_opcua_1.DataType.Boolean]; // if the value is 0 or 1, it can be a boolean or a numeric type
            return numerics; // if the value is a number, it can be a numeric type
        }
        if (typeof value == "string") {
            return [node_opcua_1.DataType.String, node_opcua_1.DataType.LocalizedText, node_opcua_1.DataType.XmlElement]; // if the value is a string, it can be a string or a localized text
        }
        if (typeof value == "boolean") {
            return [node_opcua_1.DataType.Boolean];
        }
        if (value instanceof Date) {
            return [node_opcua_1.DataType.DateTime];
        }
        return [node_opcua_1.DataType.Null]; // if the value is not recognized, return null
    }
    _getNodesDetails(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const arrayDimensionDataValue = yield this.session.read({ nodeId: nodeId, attributeId: node_opcua_1.AttributeIds.ArrayDimensions });
            const valueRankDataValue = yield this.session.read({ nodeId: nodeId, attributeId: node_opcua_1.AttributeIds.ValueRank });
            const arrayDimension = arrayDimensionDataValue.value.value;
            const valueRank = valueRankDataValue.value.value;
            const dataType = yield this._getDataType(nodeId.toString());
            return { dataType, arrayDimension, valueRank };
        });
    }
    detectOPCUAValueType(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const resValue = yield this.readNode({ nodeId: (0, node_opcua_1.coerceNodeId)(nodeId) });
            if (!resValue && !resValue[0]) {
                const valuesFormatted = this._formatDataValue(resValue[0]);
                if (valuesFormatted && valuesFormatted.dataType)
                    return node_opcua_1.DataType[valuesFormatted.dataType];
                return node_opcua_1.DataType[typeof valuesFormatted.value];
            }
        });
    }
    readNode(node) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(node))
                node = [node];
            return this.session.read(node);
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
    _formatDataValue(dataValue) {
        var _a, _b, _c, _d, _e;
        // if dataValue.value is a Variant return the value of the Variant
        if (typeof ((_a = dataValue === null || dataValue === void 0 ? void 0 : dataValue.value) === null || _a === void 0 ? void 0 : _a.value) !== "undefined") {
            const obj = { dataType: node_opcua_1.DataType[(_b = dataValue === null || dataValue === void 0 ? void 0 : dataValue.value) === null || _b === void 0 ? void 0 : _b.dataType], value: undefined };
            switch ((_c = dataValue === null || dataValue === void 0 ? void 0 : dataValue.value) === null || _c === void 0 ? void 0 : _c.arrayType) {
                /*case VariantArrayType.Scalar:
                    obj.value = dataValue?.value?.value;
                    break;
                    */
                case node_opcua_1.VariantArrayType.Array:
                    obj.value = (_d = dataValue === null || dataValue === void 0 ? void 0 : dataValue.value) === null || _d === void 0 ? void 0 : _d.value.join(",");
                    break;
                default:
                    let value = (_e = dataValue === null || dataValue === void 0 ? void 0 : dataValue.value) === null || _e === void 0 ? void 0 : _e.value;
                    if (value == null)
                        value = "null";
                    obj.value = value;
                    break;
            }
            return obj;
        }
        // if dataValue.value is not a Variant, return the value and dataType
        if (typeof dataValue.value !== "object") {
            if (dataValue.value == null)
                dataValue.value = "null";
            return dataValue;
        }
        return null;
    }
}
exports.OPCUAService = OPCUAService;
exports.default = OPCUAService;
//# sourceMappingURL=OPCUAService.js.map