// src/lib/crypto.js

var crypto = require('crypto')

const IV_LENGTH = 16; // For AES, this is always 16

// encrypt data with aes256-cbc and a randomly generated salt (IV)
module.exports = {
    // returns data encrypted with key
    // data should be a utf8 string
    // key must be 32 bytes
    encrypt: function(key, data) {
        let iv = crypto.randomBytes(IV_LENGTH)
        let cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
        let cipherData = cipher.update(data, 'utf8')

        cipherData = Buffer.concat([cipherData, cipher.final()])

        return iv.toString('hex') + ':' + cipherData.toString('hex')
    },
    // returns cypherData decrypted with key
    decrypt: function(key, cipherData) {
        let cipherParts = cipherData.split(':')
        let iv = new Buffer(cipherParts.shift(), 'hex')
        let encryptedText = new Buffer(cipherParts.join(':'), 'hex')
        let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
        let decrypted = decipher.update(encryptedText)
        
        decrypted = Buffer.concat([decrypted, decipher.final()])
        
        return decrypted.toString()
    }
}