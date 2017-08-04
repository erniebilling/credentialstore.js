// src/model/kmsAWS.spec.js

var chai = require('chai')
var expect = chai.expect
var AWS = require('aws-sdk-mock')
var kms = require('./kmsAWS')

var cmkId = null

var getCmkId = function(callback) {
    if ( cmkId === null ) {
        callback('error')
    } else {
        callback(null, cmkId)
    }
}

var putCmkId = function(data, callback) {
    cmkId = data
    callback(null, data)
}

describe('KmsAWS', () => {
    

    beforeEach( () => {
        AWS.mock('KMS', 'createKey', (params, callback) => {
            callback(null, { KeyMetadata: {
                                 AWSAccountId: "111122223333", 
                                 Arn: "arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890aa", 
                                 Description: "", 
                                 Enabled: true, 
                                 KeyId: "1234abcd-12ab-34cd-56ef-1234567890aa", 
                                 KeyState: "Enabled", 
                                 KeyUsage: "ENCRYPT_DECRYPT", 
                                 Origin: "AWS_KMS"
                            }
            } )
        })
    })

    afterEach( () => {
        AWS.restore()
        cmkId = null
    })
    
    it('generateKey() fails if model not initialized', () => {
        kms.generateKey((err,data) => {
            expect(err).not.to.be.null  
        })
    })
    it('initModel() should cache key', () => {
        kms.initModel(getCmkId, putCmkId, (err, data) => {
            expect(err).to.be.null
            expect(data).to.equal("1234abcd-12ab-34cd-56ef-1234567890aa")
        })
    })
    it('generateKey() returns proper data', () => {
        AWS.mock('KMS', 'generateDataKey', (params, callback) => {
            callback(null, {
                CiphertextBlob: "0123456789abcdefghij9876543210zy",
                KeyId: "arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890aa",
                Plaintext: "zy9876543210abcdefghij0123456789"
            })
        })
        kms.initModel(getCmkId, putCmkId, (err, data) => {
            expect(err).to.be.null
            expect(data).to.equal("1234abcd-12ab-34cd-56ef-1234567890aa")
            kms.generateKey((err, data) => {
                expect(err).to.be.null
                expect(data.cmkId).to.equal("arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890aa")
                expect(data.encryptedDataKey).to.equal("0123456789abcdefghij9876543210zy")
                expect(data.dataKey).to.equal("zy9876543210abcdefghij0123456789")
            })
        })
    })
    it('decryptKey() returns proper data', () => {
        AWS.mock('KMS', 'decrypt', (params, callback) => {
            expect(params.CiphertextBlob).to.equal("0123456789abcdefghij9876543210zy")
            callback(null, {
                KeyId: "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890aa", 
                Plaintext: "zy9876543210abcdefghij0123456789"
            })
        })
        kms.initModel(getCmkId, putCmkId, (err, data) => {
            expect(err).to.be.null
            expect(data).to.equal("1234abcd-12ab-34cd-56ef-1234567890aa")
            kms.decryptKey("arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890aa", "0123456789abcdefghij9876543210zy", (err, data) => {
                expect(err).to.be.null
                expect(data.dataKey).to.equal("zy9876543210abcdefghij0123456789")    
            })
        })
    })
})

