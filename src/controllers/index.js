// src/controllers/index.js

var service = require('../service/credentialService')
var path = require('path')

// credential store controllers

module.exports = {
    // add a new credential to the store
    // return new credential id
    // expects { type:, name:, data: }
    addCredential: function(req, res, next) {
        // get key
        service.storeCredential(req.body)
        .then(id => {
            res.header('location', path.join(req.url, id))
            res.send(201)
            next()
        })
        .catch(err => {
            req.log.error(err)
            res.send(500)
        })
    },
    // return list of all credentials in the store
    // returns { items: [], itemCount: }
    listCredentials: function(req, res, next) {
        service.listCredentials(req.params.type)
        .then(creds => {
            creds.forEach((cred) => {
                // add hyperlinks
                cred.links = [{rel:'self', href:path.join(req.url, cred.id)}]
            })
            res.send(200, { items: creds, itemCount: creds.length})
            next();
        })
        .catch(err => {
            req.log.error(err)
            res.send(500)
        })
    },
    // get credential by id
    getCredential: function(req, res, next) {
        service.getCredential(req.params.id)
        .then(cred => {
            // add hyperlinks
            cred.links = [{rel:'self', href:path.join(path.dirname(req.url), cred.id)}]
            res.send(200,cred)
        }).catch(err => {
            if (err.error === "ENOENT") {
                res.send(404)
            } else {
                req.log.error(err)
                res.send(500)
            }
        })
    },
    // delete credential by id
    deleteCredential: function(req, res, next) {
        service.deleteCredential(req.params.id)
        .then(data => {
            res.send(204)
        })
        .catch(err => {
            req.log.error(err)
            res.send(500)
        })
    }
}