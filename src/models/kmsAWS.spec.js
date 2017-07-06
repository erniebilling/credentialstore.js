// src/model/kmsAWS.spec.js

var chai = require('chai')
var expect = chai.expect
var AWS = require('aws-sdk-mock')
var fs = require('fs')
var fsMock = require('mock-fs')
var kms = require('./kmsAWS')

fsMock({
    '.': {}
})

describe('KmsAWS', () => {
    afterEach( () => {
        AWS.restore()
    })

    it('generateKey() fails if model not initialized', () => {
        kms.generateKey((err,data) => {
            expect(err).not.to.be.null  
        })
    })
    it('initModel() should cache key', () => {
        expect(fs.existsSync("./cmkid")).to.be.false
        AWS.mock('KMS', 'createKey', (params, callback) => {
            callback(null, { KeyMetadata: {
                                 AWSAccountId: "111122223333", 
                                 Arn: "arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab", 
                                 Description: "", 
                                 Enabled: true, 
                                 KeyId: "1234abcd-12ab-34cd-56ef-1234567890ab", 
                                 KeyState: "Enabled", 
                                 KeyUsage: "ENCRYPT_DECRYPT", 
                                 Origin: "AWS_KMS"
                            }
            } )
        })
        kms.initModel((err, data) => {
            expect(err).to.be.null
            expect(fs.existsSync("./cmkid")).to.be.true
            expect(data).to.equal("1234abcd-12ab-34cd-56ef-1234567890ab")
        })
    })
    it('generateKey() returns proper data', () => {
        AWS.mock('KMS', 'createKey', (params, callback) => {
            callback(null, { KeyMetadata: {
                                 AWSAccountId: "111122223333", 
                                 Arn: "arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab", 
                                 Description: "", 
                                 Enabled: true, 
                                 KeyId: "1234abcd-12ab-34cd-56ef-1234567890ab", 
                                 KeyState: "Enabled", 
                                 KeyUsage: "ENCRYPT_DECRYPT", 
                                 Origin: "AWS_KMS"
                            }
            } )
        })
        AWS.mock('KMS', 'generateDataKey', (params, callback) => {
            callback(null, {
                CiphertextBlob: "0123456789abcdefghij9876543210zy",
                KeyId: "arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
                Plaintext: "zy9876543210abcdefghij0123456789"
            })
        })
        kms.initModel((err, data) => {
            expect(err).to.be.null
            expect(data).to.equal("1234abcd-12ab-34cd-56ef-1234567890ab")
            kms.generateKey((err, data) => {
                expect(err).to.be.null
                expect(data.cmkId).to.equal("arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab")
                expect(data.encryptedDataKey).to.equal("0123456789abcdefghij9876543210zy")
                expect(data.dataKey).to.equal("zy9876543210abcdefghij0123456789")
            })
        })
    })
    it('decryptKey() returns proper data', () => {
        AWS.mock('KMS', 'createKey', (params, callback) => {
            callback(null, { KeyMetadata: {
                                 AWSAccountId: "111122223333", 
                                 Arn: "arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab", 
                                 Description: "", 
                                 Enabled: true, 
                                 KeyId: "1234abcd-12ab-34cd-56ef-1234567890ab", 
                                 KeyState: "Enabled", 
                                 KeyUsage: "ENCRYPT_DECRYPT", 
                                 Origin: "AWS_KMS"
                            }
            } )
        })
        AWS.mock('KMS', 'decrypt', (params, callback) => {
            expect(params.CiphertextBlob).to.equal("0123456789abcdefghij9876543210zy")
            callback(null, {
                KeyId: "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab", 
                Plaintext: "zy9876543210abcdefghij0123456789"
            })
        })
        kms.initModel((err, data) => {
            expect(err).to.be.null
            expect(data).to.equal("1234abcd-12ab-34cd-56ef-1234567890ab")
            kms.decryptKey("arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab", "0123456789abcdefghij9876543210zy", (err, data) => {
                expect(err).to.be.null
                expect(data.dataKey).to.equal("zy9876543210abcdefghij0123456789")    
            })
        })
    })
})

fsMock.restore()