// src/controllers/index.js
var promisify = require('promisify-node')
var model = promisify(require('../models/credAWS'))
var crypto = require('../lib/crypto')
var keymgmt = promisify(require('../models/kmsAWS'))
var path = require('path')

// credential store controllers

var credBuilder = function(cred, baseURL) {
    return new Promise((resolve,reject) => {
        if (cred.data && cred.data.cmkId && cred.data.encryptedDataKey) {
            keymgmt.decryptKey(cred.data.cmkId, Buffer.from(cred.data.encryptedDataKey, 'hex'))
            .then((data) => {
                let ret = {
                    data: JSON.parse(crypto.decrypt(data.dataKey, cred.data.encryptedData)),
                    name: cred.name,
                    type: cred.type,
                    id: cred.credentialID,
                    links: [{rel:'self', href:path.join(baseURL, cred.credentialID)}]
                }
                resolve(ret)
            })
            .catch((err) => {
                reject(err)
            })
        } else {
            resolve({
                id: cred.credentialID,
                links: [{rel:'self', href:path.join(baseURL, cred.credentialID)}]
            })
        }
    })
}

module.exports = {
    // add a new credential to the store
    // return new credential id
    // expects { type:, name:, data: }
    addCredential: function(req, res, next) {
        // get key
        keymgmt.generateKey()
        .then(msg => {
            dataCipher = {
                cmkId: msg.cmkId, 
                encryptedDataKey: msg.encryptedDataKey.toString('hex'), 
                encryptedData: crypto.encrypt(msg.dataKey, JSON.stringify(req.body.data))     
            }
            return model.createCred({type: req.body.type, name: req.body.name, data: dataCipher})
        })
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
        var promise
        if (req.params.type) {
            promise = model.filterCredsByType(req.params.type)
        } else {
            promise = model.listCreds()
        }
        
        promise
        .then(rawCreds => {
            return Promise.all(rawCreds.map((cred) => {
                return credBuilder(cred, req.url)
            }))
        })
        .then(creds => {
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
        model.readCred(req.params.id)
        .then(data => {
            // decrypt data
            return credBuilder(data,path.dirname(req.url))
        })
        .then(cred => {
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
        model.deleteCred(req.params.id)
        .then(data => {
            res.send(204)
        })
        .catch(err => {
            req.log.error(err)
            res.send(500)
        })
    }
}