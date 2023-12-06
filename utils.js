function formRequestObject(req){
    return {
        body: req.body,
        query: req.query,
        headers: req.headers,
        extension: req?.extension,
        fdkSession: req?.fdkSession,
        signedCookies: req.signedCookies,
        params: req.params
    }
}

module.exports = {
    formRequestObject
}