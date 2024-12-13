"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../.env"), debug: true });
const env_data = {
    userId: process.env.USER_ID,
    password: process.env.PASSWORD,
    protocol: process.env.PROTOCOL,
    host: process.env.HOST,
    port: process.env.PORT,
    context_name: process.env.COMMAND_CONTEXT_NAME,
    category_name: process.env.COMMAND_CATEGORY_NAME,
    group_name: process.env.COMMAND_GROUP_NAME,
    digitaltwin_path: process.env.DIGITAL_TWIN_PATH,
    organ_name: process.env.ORGAN_NAME,
    attribute_category: process.env.ATTRIBUTE_CATEGORY_NAME,
    attribute_name: process.env.ATTRIBUTE_NAME,
    attribute_default_value: process.env.DEFAULT_COMMAND_VALUE
};
console.log("env_data", env_data);
exports.default = env_data;
//# sourceMappingURL=env.js.map