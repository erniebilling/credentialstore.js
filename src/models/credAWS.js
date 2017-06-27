// src/models/cred.js

var AWS = require('aws-sdk')
var config = require('../config')
var uuid = require('uuid/v4')
var unmarshalItem = require('dynamodb-marshaler').unmarshalItem
var marshalItem = require('dynamodb-marshaler').marshalItem

AWS.config.update({
    region: config.aws_region,
    endpoint: config.dynamo_endpoint
});

var params = {
    TableName: "cred",
    KeySchema: [
        { AttributeName: "credentialID", KeyType: "HASH"} // partition key
    ],
    AttributeDefinitions: [
        { AttributeName: "credentialID", AttributeType: "S"}  // string (guid)
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
    }
};

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
    createCred: function(credData, callback) {
        var dynamodb = new AWS.DynamoDB();
        var newID = uuid();
        var cred = {
            TableName: params.TableName,
            Item: marshalItem({ credentialID: newID, credentialData: credData })
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
                        callback("Unable to fetch credential.  Error JSON: " + JSON.stringify(err, null, 2), null)
                    } else {
                        callback(null, unmarshalItem(getItemData.Item).credentialData)
                    }
                })
            }
        })
    },
    // list the credentials in the store
    listCreds: function(callback) {
        var dynamodb = new AWS.DynamoDB();
        
        var query = {
            TableName: params.TableName
        }
        
        dynamodb.describeTable({TableName: params.TableName}, (err, data) => {
            if (err) {
                callback(err, null)
            } else {
                dynamodb.scan(query, (err, data) => {
                    if (err) {
                        callback("Unable to scan table.  Error JSON: " + JSON.stringify(err, null, 2), null)
                    } else {
                        callback(null, data.Items.map((item) => {
                            return unmarshalItem(item)
                        }))
                    }
                })
            }
        })
    }
}


