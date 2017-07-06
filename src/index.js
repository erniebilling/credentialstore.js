var restify = require('restify')
var promisify = require('promisify-node')
var model = promisify(require('./models/credAWS'))
var keymgmt = promisify(require('./models/kmsAWS'))
var config = require('./config')

var server = restify.createServer()

server.pre(restify.pre.userAgentConnection());

// default handler filters
server.use(restify.acceptParser(server.acceptable))
server.use(restify.queryParser())
server.use(restify.bodyParser())

// init the data model
// add our routes
require('./routes')(server)

// get things going
model.initModel()
.then(msg => {
    console.log("Initialized " + msg)
    // init kms info
    return keymgmt.initModel()
})
.then(msg => {
    console.log("Using CMK " + msg)
    // model initialized, start the server
    server.listen(config.server_port, () => {
        console.log('%s listening at %s', server.name, server.url);
    });
})
.catch(err => {
    console.log('failed to initialize: ' + JSON.stringify(err, null, 2))
    exit(1)
})

