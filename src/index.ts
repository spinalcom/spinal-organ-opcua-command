import env_data from "./services/env";
import { spinalCore, FileSystem } from "spinal-core-connectorjs_type"
import SpinalUtils from "./services/SpinalGraphUtils";
import { addAEndpointsToMap, bindEndpoints, getBmsEndpointsNodes, getStartNodes, init } from "./services/utils";


FileSystem.onConnectionError = (code: number) => {
    console.log("redemarrage");
    process.exit(code); // kill le process;
}


(async function () {
    try {

        const spinalUtils = await init();
        const [zoneNodeStartNode, groupDaliStartNode] = await getStartNodes(spinalUtils);

        console.log("getting bmsEndpoints...")
        const { groupDaliNodes, modeFonctionnementNodes } = await getBmsEndpointsNodes(spinalUtils, groupDaliStartNode, zoneNodeStartNode);

        console.log(groupDaliNodes.length, "nodes 'group Dali(s)' found");
        console.log(modeFonctionnementNodes.length, "nodes 'mode fonctionnement(s)' found");

        // console.log("initiate endpoints and add them to map...");
        // const allNodes = groupDaliNodes.concat(modeFonctionnementNodes).map((el) => el.node);
        // await addAEndpointsToMap(allNodes);
        console.log("Endpoint initilized");

        console.log("binding endpoints...")
        bindEndpoints(groupDaliNodes, modeFonctionnementNodes);
        console.log("*** Done ***")

    } catch (error) {
        console.error(error);
        process.exit(0);
    }
})();




