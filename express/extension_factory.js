const { FdkInvalidCluster } = require("./error_code");
const { Extension } = require("./extension")

class ExtensionFactory {
    static _extensionMap = {};
    static _defaultExt = null;

    static getExtension(clusterId) {
        const clusterExt = ExtensionFactory._extensionMap[clusterId]
        if (clusterId !== null && !clusterExt) {
            throw FdkInvalidCluster(`Extension instance not found for clusterId ${clusterId}`);
        }
        return clusterExt;
    }

    static defaultExtInstance() {
        return ExtensionFactory._defaultExt;
    }

    static async initializeExtension(clusterData, clusterId = null) {
        const promises = [];
        for (let extConfig of clusterData) {
            const extInstance = new Extension();
            if(clusterId != null && clusterId !== extConfig.cluster_id) {
                continue;
            }
            if (!ExtensionFactory._defaultExt) {
                ExtensionFactory._defaultExt = extInstance;
            }
            ExtensionFactory._extensionMap[extConfig.cluster_id] = extInstance;
            promises.push(extInstance.initialize(extConfig))
        }
        return Promise.all(promises);
    }
}

module.exports = {
    ExtensionFactory
};