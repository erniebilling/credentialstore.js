// src/controllers/index.js
var promisify = require('promisify-node')
var model = promisify(require('../models/credAWS'))
var crypto = require('../lib/crypto')
var keymgmt = promisify(require('../models/kmsAWS'))
var path = require('path')

// credential store controllers

var keyDecryptor = function(cred) {
    return new Promise((resolve,reject) => {
        keymgmt.decryptKey(cred.cmkId, Buffer.from(cred.encryptedDataKey, 'hex'))
        .then((data) => {
            resolve({dataKey: data.dataKey, cipherData: cred.encryptedData})    
        })
        .catch((err) => {
            reject(err)
        })
    })
}

module.exports = {
    // add a new credential to the store
    // return new credential id
    addCredential: function(req, res, next) {
        console.log("adding credential " + JSON.stringify(req.body,null,2))
        // get key
        keymgmt.generateKey()
        .then(msg => {
            console.log("created key: " + JSON.stringify(msg,null,2))
            cred = {
                cmkId: msg.cmkId, 
                encryptedDataKey: msg.encryptedDataKey.toString('hex'), 
                encryptedData: crypto.encrypt(msg.dataKey, JSON.stringify(req.body))     
            }
            console.log('encrypted cred ' + JSON.stringify(cred,null,2))
            return model.createCred(cred)
        })
        .then(id => {
            console.log("stored credential: " + JSON.stringify(id,null,2))
            res.header('location', path.join('/credential/creds', id))
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
                return keyDecryptor(cred.credentialData)
            }))
        })
        .then(creds => {
            res.send(200, creds.map((cred) => {
                return crypto.decrypt(cred.dataKey, cred.cipherData)
            }))
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
            return keyDecryptor(data)
        })
        .then(keyData => {
            res.send(200,crypto.decrypt(keyData.dataKey, keyData.cipherData))
            next()
        }).catch(err => {
            res.send(500,err)
        })
    },
    // delete credential by id
    deleteCredential: function(req, res, next) {
        
    }
}