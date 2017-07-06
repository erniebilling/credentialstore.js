// src/model/kmsAWS.js
var fs = require('fs')
var path = require('path')
var AWS = require('aws-sdk')
var config = require('../config')

const mks_config_file = path.join(config.kms_config_dir, "cmkid")

module.exports = {
    cmkId: "unknown",
    initModel: function(callback) {
        // make sure there is a customer master key to use (CMK)
        fs.readFile(mks_config_file, 'utf8', (err, data) => {
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
                        fs.writeFile(mks_config_file, this.cmkId, (err) => {
                            if (err) {
                                callback(err, null)
                            } else {
                                callback(null, cmkId)
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
    // data will be { }
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