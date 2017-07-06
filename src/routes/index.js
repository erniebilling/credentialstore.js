// src/routes/index.js

var controllers = require('../controllers')

// set up routes
module.exports = function(server) {
    server.post('/credential/creds', controllers.addCredential)
    server.get('/credential/creds', controllers.listCredentials)
    server.get('/credential/creds/:id', controllers.getCredential)
    server.del('/credential/creds/:id', controllers.deleteCredential)
}