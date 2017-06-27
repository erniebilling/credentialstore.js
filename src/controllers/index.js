// src/controllers/index.js
var model = promisify(require('./src/models/credAWS'))

// credential store controllers

module.exports = {
    // add a new credential to the store
    // return new credential id
    addCredential: function(req, res, next) {
    },
    // return list of all credentials in the store
    listCredentials: function(req, res, next) {
        model.listCreds().
        then(creds => {
            // need to decrypt each
            res.send(creds);
            return next();
        }).
        catch(err => {
            return next(new restify.InternalServerError(err))
        }).
    },
    // get credential by id
    getCredential: function(req, res, next) {
        
    },
    // delete credential by id
    deleteCredential: function(req, res, next) {
        
    }
}