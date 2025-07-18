// Simple mock for memory storage - no Redis needed
const storage = new Map();

async function clearData() {
    // Clear all test data from memory storage
    for (const key of storage.keys()) {
        if (key.startsWith("test_fdk")) {
            storage.delete(key);
        }
    }
}

function connect() {
    // No connection needed for memory storage
    return Promise.resolve();
}

function disconnect() {
    // No disconnection needed for memory storage
    return Promise.resolve();
}

module.exports = {
    connect,
    disconnect,
    clearData
};