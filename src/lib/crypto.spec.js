// src/lib/crypto.spec.js

var chai = require('chai')
var expect = chai.expect
var crypto = require('./crypto')
var globalCrypto = require('crypto')

describe('Crypto', () => {
    it('data sent to encrypt() should come back from decrypt() ', () => {
        let testData = "this is some data"
        let key = globalCrypto.randomBytes(32)
        let testDataCipher = crypto.encrypt(key, testData)
        expect(testDataCipher).not.to.equal(testData)
        expect(crypto.decrypt(key,testDataCipher)).to.equal(testData)
    })
    it('encypting same data twice should result in different cipher text', () => {
        let testData = "this is some more data"
        let key = globalCrypto.randomBytes(32)
        expect(crypto.encrypt(key, testData)).not.to.equal(crypto.encrypt(key, testData))
    })
})