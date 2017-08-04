/**
 * src/service/credentialService.spec.js
 * unit test for credentialService.js
 */

var chai = require('chai')
var expect = chai.expect
var proxyquire = require('proxyquire')
var sinon = require('sinon')

//

/*
 * create stubs for service
 */

var modelStub = {
    readCredResults: {},
    listCredResults: [],
    createdCreds: [],
    initModel: function(callback) {
        console.log('initModel')
        callback('failure')
    },
    // create a new credential in the db
    // expects credData to be { type:, name:, data: }
    createCred: function(credData, callback) {
        credData.credentialID = "some key id"
        this.createdCreds.push(credData)
        callback(null, credData.credentialID)
    },
    // retrieve a credential from the store
    // returns { credentialID:, type:, name:, data  }
    readCred: function(credID, callback) {
        if (this.readCredResults.credentialID === credID) {
            callback(null, this.readCredResults)
        } else {
            let foundItem = this.createdCreds.find((item) => {
                return item.credentialID === credID
            })
            
            if (foundItem) {
                callback(null, foundItem)
            } else {
                callback({error: "ENOENT"})
            }
        }
    },
    // list the credentials in the store
    // returns [{ credentialID: , credentialData:  }]
    listCreds: function(callback) {
        console.log('listCreds')
        callback(null, listCredResults)
    },
    // list the credentials in the store, filtered by type
    // returns [{ credentialID: , credentialData:  }]
    filterCredsByType: function(type, callback) {
        console.log('filterCredsByType')
        callback('failure')
    },
    deleteCred: function(credID, callback) {
        console.log('deleteCred')
        callback('failure')
    }    
}

var keymgmtStub = {
    initModel: function(getCmkId, putCmkId, callback) {
        console.log('initModel')
        callback('failure')
    },
    /**
     * generate a key
     * @param {requestCallback} callback 
     *
     * on success, data will be {cmkId, encryptedDataKey, dataKey}
     */
    generateKey: function(callback) {
        callback(null,  { 
                            cmkId: "keyId", 
                            encryptedDataKey: "0123456789abcdef", 
                            dataKey: "0123456789abcdfghijklm9876543210"
                        })
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
        //console.log('decryptKey')
        callback(null, { dataKey: "0123456789abcdfghijklm9876543210" })
    }
}

describe('credentialService', () => {
    var service
    
    before(function() {
        service = proxyquire('./credentialService', {
            '../models/credAWS': modelStub,
            '../models/kmsAWS': keymgmtStub
        }) 
    })
    
    afterEach(() => {
        modelStub.readCredResults = {}
        modelStub.listCredResults = []
        modelStub.createdCreds = []
    })
    
    it('storeCredential should store credential and return id', () => {

        let credential = {
            type: 'user',
            name: 'testKey',
            data: {
                userName: 'user1',
                password: 'some password'
            }
        }
        
        let createCredSpy = sinon.spy(modelStub, 'createCred')
        let generateKeySpy = sinon.spy(keymgmtStub, 'generateKey')

        return service.storeCredential(credential)
        .then(function(data) {
            expect(data).to.equal("some key id")
            expect(createCredSpy.calledOnce).to.be.true
            expect(generateKeySpy.calledOnce).to.be.true
        })
        .catch(function(e) {
            expect(e).to.be.null
        })
    })
    
    it('getCredential should handle badly formed items', () => {
        modelStub.readCredResults = { credentialID: "a bad credential" }
        
        let readCredSpy = sinon.spy(modelStub, 'readCred')
        
        return service.getCredential("a bad credential")
        .then((cred) => {
            expect(cred.id).to.equal("a bad credential")
            expect(readCredSpy.calledOnce).to.be.true
        })
        .catch(function(e) {
            expect(e).to.be.null
        })
    })
    
    it('getCredential should return store(d)Credential', () => {

        let credential = {
            type: 'user1',
            name: 'testKey1',
            data: {
                userName: 'user1',
                password: 'some password1'
            }
        }        
        
        return service.storeCredential(credential)
        .then((credentialId) => {
            return service.getCredential(credentialId)  
        })
        .then((returnedCredential) => {
            expect(returnedCredential.name).to.equal(credential.name)
        })
        .catch((err) => {
            console.log(err)
            expect(err).to.be.null  
        })
    })
})