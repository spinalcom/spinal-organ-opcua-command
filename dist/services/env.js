"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../.env"), debug: true });
const env_data = {
    // hub
    userId: process.env.USER_ID,
    password: process.env.PASSWORD,
    protocol: process.env.PROTOCOL,
    host: process.env.HOST,
    port: process.env.PORT,
    digitaltwin_path: process.env.DIGITAL_TWIN_PATH,
    organ_name: process.env.ORGAN_NAME,
    // command
    command_context_name: process.env.COMMAND_CONTEXT_NAME,
    command_category_name: process.env.COMMAND_CATEGORY_NAME,
    command_group_name: process.env.COMMAND_GROUP_NAME,
    // zone
    zone_context_name: process.env.ZONE_CONTEXT_NAME,
    zone_category_name: process.env.ZONE_CATEGORY_NAME,
    zone_group_name: process.env.ZONE_GROUP_NAME,
    // attribute
    attribute_category: process.env.ATTRIBUTE_CATEGORY_NAME,
    endpoint_control_value_name: process.env.ENDPOINT_ATTRIBUTE_NAME,
    init_zone_attribute_name: process.env.INIT_ZONE_ATTRIBUTE,
    attribute_default_value: process.env.DEFAULT_ATTRIBUTE_VALUE,
};
exports.default = env_data;
//# sourceMappingURL=env.js.map