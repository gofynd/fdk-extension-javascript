const sqlite3 = require('sqlite3').verbose();
const sqliteInstance = new sqlite3.Database('session_storage.db');

async function clearData() {
    sqliteInstance.run(`DELETE FROM storage`, function(err) {
        if (err) {
          return console.error('Error clearing table data:', err.message);
        }
        console.log(`All data from table storage has been cleared.`);
    });      
    
}

function disconnect() {
    return sqliteInstance.close();
}

module.exports = {
    sqliteInstance,
    disconnect,
    clearData
};