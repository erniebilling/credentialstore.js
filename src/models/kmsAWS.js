// src/model/kmsAWS.js

var AWS = require('aws-sdk')

/**
 * Callback
 *
 * @callback requestCallback
 * @param {object} err non null if call failed
 * @param {object} data returned data
 */


module.exports = {
    cmkId: "unknown",
    
    /**
     * Initialize KMS
     * @param {function} getCmkId - function(callback) that returns master cmkId or error if it doesn't exist
     * @param {function} putCmkId - function(data,callback) that writes cmkId to permanent store for use on restart
     * @param {requestCallback} callback
     */
    initModel: function(getCmkId, putCmkId, callback) {
        // make sure there is a customer master key to use (CMK)
        getCmkId((err, data) => {
            if (err) {
                // no existing cmkid file, generate a cmk
                let kms = new AWS.KMS()
                let params = {
                    Description: "credential store CMK",
                    KeyUsage: "ENCRYPT_DECRYPT",
                    Tags: [
                        {
                            TagKey: "CreatedBy",
                            TagValue: "credentialStore"
                        }
                    ]
                }
                kms.createKey(params, (err, data) => {
                    if (err) {
                        console.log('create key failed')
                        callback(err, null)
                    } else {
                        // have new key
                        this.cmkId = data.KeyMetadata.KeyId
                        
                        // write key to config file
                        putCmkId(this.cmkId, (err) => {
                            if (err) {
                                callback(err, null)
                            } else {
                                callback(null, this.cmkId)
                            }
                        })
                    }
                })
            } else {
                this.cmkId = data
                callback(null, this.cmkId)
            }
        })
    },
    /**
     * generate a key
     * @param {requestCallback} callback 
     *
     * on success, data will be {cmkId, encryptedDataKey, dataKey}
     */
    generateKey: function(callback) {
        if ("unknown" === this.cmkId) {
            callback("initModel has not been called", null)
        } else {
            let kms = new AWS.KMS()
            let params = {
                KeyId: this.cmkId,
                KeySpec: "AES_256"
            }
            kms.generateDataKey(params, (err, data) => {
                if (err) {
                    callback(err, null)
                } else {
                    callback(null, { 
                        cmkId: data.KeyId, 
                        encryptedDataKey: data.CiphertextBlob, 
                        dataKey: data.Plaintext
                    })
                }
            })
        }
    },
    /**
     * decrypt an encrypted key
     * @param {string} cmkId master key id, as returned by generateKey
     * @param {Buffer} buffer containing encrypted key data
     * @param {requestCallback} callback
     *
     * on success, data will be {dataKey: <string>}
     */
    decryptKey: function(cmkId, encryptedKey, callback) {
        let kms = new AWS.KMS()
        let params = {
            CiphertextBlob: encryptedKey
        }
        kms.decrypt(params, (err, data) => {
            if (err) {
                callback(err, null)
            } else {
                callback(null, { dataKey: data.Plaintext })
            }
        })
    }
}