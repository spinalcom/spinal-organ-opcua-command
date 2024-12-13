import env_data from "./services/env";

import { spinalCore, FileSystem } from "spinal-core-connectorjs_type"
import SpinalUtils from "./services/SpinalGraphUtils";

import ConfigFile from "spinal-lib-organ-monitoring";

const { protocol, userId, password, host, port, digitaltwin_path, context_name, category_name, group_name, organ_name } = env_data;
const url = `${protocol}://${userId}:${password}@${host}:${port}/`;


const connect = spinalCore.connect(url);


FileSystem.onConnectionError = (code: number) => {
    console.log("redemarrage");
    process.exit(code); // kill le process;
}


(async function () {
    try {
        await ConfigFile.init(connect, organ_name, host, protocol, parseInt(port));
        const spinalUtils = SpinalUtils.getInstance();
        await spinalUtils.init(connect, digitaltwin_path);
        const startNode = await spinalUtils.getStartNode(context_name, category_name, group_name);

        console.log("getting bmsEndpoints...")
        const bmsEndpoints = await spinalUtils.getBmsEndpointNode(startNode);
        console.log(bmsEndpoints.length, "endpoint(s) found");

        console.log("binding...")
        await spinalUtils.bindEndpoints(bmsEndpoints);
        console.log("** Done **")


    } catch (error) {
        console.error(error);
        process.exit(0);
    }
})();


