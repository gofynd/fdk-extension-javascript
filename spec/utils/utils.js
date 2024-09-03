const hmacSHA256 = require("crypto-js/hmac-sha256");

function getSignature() {
    return hmacSHA256('API_KEY:API_SECRET', 'API_SECRET')
}

module.exports={
    getSignature
}