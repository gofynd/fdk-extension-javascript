const hmacSHA256 = require("crypto-js/hmac-sha256");

function getSignature() {
    return hmacSHA256(JSON.stringify(
        { client_id: 'API_KEY', company_id: 1, cluster: 'http://localdev.fyndx0.de' }
    ), 'API_SECRET')
}

module.exports = {
    getSignature
}