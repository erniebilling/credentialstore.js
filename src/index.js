var restify = require('restify')
var promisify = require('promisify-node')
var model = promisify(require('./models/credAWS'))
var keymgmt = promisify(require('./models/kmsAWS'))
var config = require('./config')
var logger = require('bunyan')
var fs = require('fs')
var path = require('path')

var log = new logger({name: 'server'})

var server = restify.createServer({log: log})

const mks_config_file = path.join(config.kms_config_dir, "cmkid")

var getCmkId = function(callback) {
    fs.readFile(mks_config_file, 'utf8', callback)
}

var putCmkId = function(cmkId, callback) {
    fs.writeFile(mks_config_file, cmkId, callback)
}

server.pre(restify.pre.userAgentConnection());

// default handler filters
server.use(restify.requestLogger())
server.use(restify.acceptParser(server.acceptable))
server.use(restify.queryParser())
server.use(restify.bodyParser())

// init the data model
// add our routes
require('./routes')(server)

// get things going
model.initModel()
.then(msg => {
    log.info("Initialized", msg)
    // init kms info
    return keymgmt.initModel(getCmkId, putCmkId)
})
.then(msg => {
    log.info("Using CMK", msg)
    // model initialized, start the server
    server.listen(config.server_port, () => {
        log.info('%s listening at %s', server.name, server.url);
    });
})
.catch(err => {
    log.error('failed to initialize:', err)
    exit(1)
})

