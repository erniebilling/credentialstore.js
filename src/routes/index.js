// src/routes/index.js

var controllers = require('../controllers')

// set up routes
module.exports = function(server) {
    server.post('/credentials/cred', controllers.addCredential)
    server.get('/credentials'), controllers.listCredentials)
    server.get('/credentials/:id', controllers.getCredential)
    server.delete('/credentials/:id', controllers.deleteCredential)
}