// src/controllers/index.js
var promisify = require('promisify-node')
var model = promisify(require('../models/credAWS'))
var crypto = require('../lib/crypto')
var keymgmt = promisify(require('../models/kmsAWS'))
var path = require('path')

// credential store controllers

var credBuilder = function(cred, baseURL) {
    return new Promise((resolve,reject) => {
        keymgmt.decryptKey(cred.credentialData.cmkId, Buffer.from(cred.credentialData.encryptedDataKey, 'hex'))
        .then((data) => {
            let ret = JSON.parse(crypto.decrypt(data.dataKey, cred.credentialData.encryptedData))
            ret.id = cred.credentialID
            ret.links = [{rel:'self', href:path.join(baseURL, cred.credentialID)}]
            resolve(ret)
        })
        .catch((err) => {
            reject(err)
        })
    })
}

module.exports = {
    // add a new credential to the store
    // return new credential id
    // expects { type: , name:, data: }
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
            res.send(500,err)
        })
    },
    // return list of all credentials in the store
    listCredentials: function(req, res, next) {
        model.listCreds()
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
            res.send(500,err)
        })
    },
    // get credential by id
    getCredential: function(req, res, next) {
        model.readCred(req.params.id)
        .then(data => {
            // decrypt data
            return credBuilder(data,req.url)
        })
        .then(cred => {
            res.send(200,cred)
        }).catch(err => {
            if (err.error === "ENOENT") {
                res.send(404)
            } else {
                res.send(500,err)
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
            res.send(500,err)
        })
    }
}