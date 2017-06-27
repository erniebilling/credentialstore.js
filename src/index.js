var restify = require('restify')
var promisify = require('promisify-node')
var model = promisify(require('./src/models/credAWS'))
var config = require('./src/config')

var server = restify.createServer()

// init the data model
// add our routes
require('routes')(server)

// get things going
model.initModel()
.then(msg => {
    // model initialized, start the server
    server.listen(config.server_port, () => {
        console.log('%s listening at %s', server.name, server.url);
    });
})
.catch(err => {
    console.log('failed to initialized data store: ' + JSON.stringify(err, null, 2))
    exit(1)
})

