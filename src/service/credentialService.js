/**
 * src/service/credentialService.js
 */

var promisify = require('promisify-node')
var model = promisify(require('../models/credAWS'))
var crypto = require('../lib/crypto')
var keymgmt = promisify(require('../models/kmsAWS'))

var credBuilder = function(cred) {
    return new Promise((resolve,reject) => {
        if (cred.data && cred.data.cmkId && cred.data.encryptedDataKey) {
            keymgmt.decryptKey(cred.data.cmkId, Buffer.from(cred.data.encryptedDataKey, 'hex'))
            .then((data) => {
                let ret = {
                    data: JSON.parse(crypto.decrypt(data.dataKey, cred.data.encryptedData)),
                    name: cred.name,
                    type: cred.type,
                    id: cred.credentialID,
                }
                resolve(ret)
            })
            .catch((err) => {
                reject(err)
            })
        } else {
            resolve({
                id: cred.credentialID,
            })
        }
    })
}

/**
 * @module credentialService
 * Service interface for credential store
 */
module.exports = {
    /**
     * store a new credential
     * @param {object}  credentialInfo {type:, name:, data:}
     * @returns {Promise} returns promise to complete operation
     */
    storeCredential: function(credentialInfo) {
        return keymgmt.generateKey()
        .then(msg => {
            dataCipher = {
                cmkId: msg.cmkId, 
                encryptedDataKey: msg.encryptedDataKey.toString('hex'), 
                encryptedData: crypto.encrypt(msg.dataKey, JSON.stringify(credentialInfo.data))     
            }
            return model.createCred({type: credentialInfo.type, name: credentialInfo.name, data: dataCipher})
        })        
    },
    /**
     * list credentials
     * @param {string}  credentialType optional type filter 
     * @returns {Promise} Promise to complete operation
     */
    listCredentials: function(credentialType) {
        var listCreds
        if (credentialType) {
            listCreds = model.filterCredsByType(credentialType)
        } else {
            listCreds = model.listCreds()
        }
        
        return listCreds
        .then(rawCreds => {
            return Promise.all(rawCreds.map((cred) => {
                return credBuilder(cred)
            }))
        })
    },
    /**
     * fetch given credential
     * @param {string}  credentialId id of credential to fetch
     * @returns {Promise} Promise to complete operation
     */
    getCredential: function(credentialId) {
        return model.readCred(credentialId)
        .then(data => {
            // decrypt data
            return credBuilder(data)
        })
    },
    /**
     * delete given credential
     * @param   {string}  credentialId id of credential to delete
     * @returns {Promise} Promise to complete operation
     */
    deleteCredential: function(credentialId) {
        return model.deleteCred(credentialId)
    }
}