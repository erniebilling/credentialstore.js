// src/models/cred.js

var AWS = require('aws-sdk')
var config = require('../config')
var uuid = require('uuid/v4')
var unmarshalItem = require('dynamodb-marshaler').unmarshalItem
var marshalItem = require('dynamodb-marshaler').marshalItem

AWS.config.update({
    region: config.aws_region,
});

var params = {
    TableName: "cred",
    KeySchema: [
        { AttributeName: "credentialID", KeyType: "HASH"} // partition key
    ],
    AttributeDefinitions: [
        { AttributeName: "credentialID", AttributeType: "S"},  // string (guid)
        { AttributeName: "name", AttributeType: "S"},
        { AttributeName: "credType", AttributeType: "S"}
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
    }
};

var unmarshalCred = function(dynamoItem) {
   let item = unmarshalItem(dynamoItem)
   return {
       credentialID: item.credentialID,
       name: item.name,
       type: item.credType,
       data: item.credentialData
   }
}

var scanCreds = function(query, callback) {
    var dynamodb = new AWS.DynamoDB();

    dynamodb.describeTable({TableName: params.TableName}, (err, data) => {
        if (err) {
            callback(err, null)
        } else {
            dynamodb.scan(query, (err, data) => {
                if (err) {
                    callback("Unable to scan table.  Error JSON: " + JSON.stringify(err, null, 2), null)
                } else {
                    callback(null, data.Items.map((item) => {
                        return unmarshalCred(item)
                    }))
                }
            })
        }
    })    
}

module.exports = {
    // initialize the model
    // makes sure the db is reachable and the table exists
    initModel: function(callback) {
        
        var dynamodb = new AWS.DynamoDB();
        // check for table
        dynamodb.describeTable({TableName: params.TableName}, (err, data) => {
            if (err) {
                if (err.code === "ResourceNotFoundException") {
                    // create table if doesn't currently exist
                    dynamodb.createTable(params, (err, data) => {
                        if (err) {
                            callback("Unable to create table.  Error JSON: " + JSON.stringify(err, null, 2), null)
                        } else {
                            callback(null, "Created table.  Table description JSON: " + JSON.stringify(data, null, 2))
                        }
                    })
                } else {
                    callback("Unable to describe table.  Error JSON: " + JSON.stringify(err, null, 2), null)
                }
            } else {
                callback(null, "Table exists.  Table description JSON: " + JSON.stringify(data, null, 2))
            }
        })
    },
    // create a new credential in the db
    // expects credData to be { type:, name:, data: }
    createCred: function(credData, callback) {
        var dynamodb = new AWS.DynamoDB();
        var newID = uuid();
        var cred = {
            TableName: params.TableName,
            Item: marshalItem({ 
                credentialID: newID, 
                credentialData: credData.data, 
                name: credData.name,
                credType: credData.type
            })
        }
    
        dynamodb.describeTable({TableName: params.TableName}, (err, data) => {
            if (err) {
                callback(err, null)
            } else {
                dynamodb.putItem(cred, (err, data) => {
                    if (err) {
                        callback("Unable to store credential.  Error JSON: " + JSON.stringify(err, null, 2), null)
                    } else {
                        callback(null, newID)
                    }
                })
            }
        })
    },
    // retrieve a credential from the store
    // returns { credentialID:, type:, name:, data  }
    readCred: function(credID, callback) {
        var dynamodb = new AWS.DynamoDB();
        
        var query = {
            TableName: params.TableName,
            Key: marshalItem({credentialID: credID})
        }
        
        dynamodb.describeTable({TableName: params.TableName}, (describeErr, describeData) => {
            if (describeErr) {
                callback(describeErr, null)
            } else {
                dynamodb.getItem(query, (getItemErr, getItemData) => {
                    if (getItemErr) {
                        callback(getItemErr, null)
                    } else {
                        if (getItemData.Item) {
                            callback(null, unmarshalCred(getItemData.Item))
                        } else {
                            // item not found
                            callback({error: "ENOENT"})
                        }
                    }
                })
            }
        })
    },
    // list the credentials in the store
    // returns [{ credentialID: , credentialData:  }]
    listCreds: function(callback) {
        var query = {
            TableName: params.TableName
        }
        
        scanCreds(query, callback)
    },
    // list the credentials in the store, filtered by type
    // returns [{ credentialID: , credentialData:  }]
    filterCredsByType: function(type, callback) {
        var query = {
            ExpressionAttributeValues: {
                ":t": {
                    S: type
                }  
            },
            FilterExpression: "credType = :t",
            TableName: params.TableName
        }
        
        scanCreds(query, callback)
    },
    deleteCred: function(credID, callback) {
        var dynamodb = new AWS.DynamoDB();
        
        var query = {
            TableName: params.TableName,
            Key: marshalItem({credentialID: credID})
        }
        
        dynamodb.describeTable({TableName: params.TableName}, (describeErr, describeData) => {
            if (describeErr) {
                callback(describeErr, null)
            } else {
                dynamodb.deleteItem(query, (err, data) => {
                    if (err) {
                        callback("Unable to delete.  Error JSON: " + JSON.stringify(err, null, 2), null)
                    } else {
                        callback(null, data)
                    }
                })
            }
        })
    }
}


