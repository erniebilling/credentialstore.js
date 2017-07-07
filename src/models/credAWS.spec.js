// src/models/credAWS.spec.js

var chai = require('chai')
var expect = chai.expect
var AWS = require('aws-sdk-mock')
var cred = require('./credAWS')

describe('CredAWS', () => {

    afterEach( () => {
        AWS.restore()
    })
    
    it('initModel() should work when table does not exist', () => {
        AWS.mock('DynamoDB', 'describeTable', (params, callback) => {
            callback({ code: "ResourceNotFoundException" }, null)
        })
        AWS.mock('DynamoDB', 'createTable', (params, callback) => {
            callback(null, 'table created')
        })
        
        var res = cred.initModel((err, data) => {
            expect(data).to.equal('Created table.  Table description JSON: "table created"')
            expect(err).to.be.null
        })
    })
    it('initModel() should work when table does exist', () => {
        AWS.mock('DynamoDB', 'describeTable', (params, callback) => {
            callback(null, 'existing table')
        })
        cred.initModel((err, data) => {
            expect(err).to.be.null
            expect(data).to.equal('Table exists.  Table description JSON: "existing table"')
        })
    })
    it('CreateCred should complete with id', () => {
        AWS.mock('DynamoDB', 'describeTable', (params, callback) => {
            callback(null, 'existing table')
        })
        AWS.mock('DynamoDB', 'putItem', (params, callback) => {
            callback(null, 'a new object')
        })
        cred.createCred("my cred", (err, data) => {
            expect(err).to.be.null
            expect(data).not.to.be.null
        })
    })
    it('ReadCred should complete with credential', () => {
        AWS.mock('DynamoDB', 'describeTable', (params, callback) => {
            callback(null, 'existing table')
        })
        AWS.mock('DynamoDB', 'getItem', (params, callback) =>{
            data = { Item: { "credentialID": { S: "my cred id" }, "credentialData": { S: "my cred" } } }
            callback(null, data)
        })
        cred.readCred("my cred id", (err, data) => {
            expect(err).to.be.null
            expect(data.credentialData).to.equal("my cred")
        }) 
    })
    it('ListCreds should complete with credential list', () => {
        AWS.mock('DynamoDB', 'describeTable', (params, callback) => {
            callback(null, 'existing table')
        })
        AWS.mock('DynamoDB', 'scan', (params, callback) => {
            var data = { 
                Count: 2,
                Items: [
                    { "credentialID": { S: "my cred id" }, "credentialData": { S: "my cred" } },
                    { "credentialID": { S: "my cred2 id" }, "credentialData": { S: "my cred2" } }
                ],
                ScannedCount: 2
            }
            callback(null, data)
        })
        cred.listCreds((err, data) => {
            expect(err).to.be.null
            expect(data.length).to.equal(2)
        })
    })
    it('DeleteCred should complete with success', () => {
        AWS.mock('DynamoDB', 'describeTable', (params, callback) => {
            callback(null, 'existing table')
        })
        AWS.mock('DynamoDB', 'deleteItem', (params, callback) => {
            var data = {
                ConsumedCapacity: {
                    CapacityUnits: 2,
                    TableName: "cred"
                }
            }
            callback(null, data)
        })
        cred.deleteCred("some_id", (err, data) => {
            expect(err).to.be.null
            expect(data.ConsumedCapacity.TableName).to.equal("cred")
        })
    })
})