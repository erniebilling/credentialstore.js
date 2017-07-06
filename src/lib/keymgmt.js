// src/lib/keymgmt.js
var kms = require('../models/kmsAWS')

module.exports = {
    // generate a new key
    // returns { cmkId, encryptedDataKey, dataKey }
    generateKey: function(callback) {
        kms.generateKey(callback)
    },
    // decrypt data key given cmkId and encyptedDataKey
    // returns { dataKey }
    decryptKey: function(cmkId, encyptedDataKey, callback) {
        kms.decryptKey(cmkId, encyptedDataKey, callback)
    }
}