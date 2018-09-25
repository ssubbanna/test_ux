const opts = {
    //errorEventName:'error',
    logDirectory:'./logs', // NOTE: folder must exist and be writable...
    fileNamePattern:'server-<DATE>.log',
    dateFormat:'YYYY.MM.DD'
};
const log = require('simple-node-logger').createRollingFileLogger( opts );
log.setLevel('debug');
module.exports = {
    redis_host: 'redis',
    redis_port: 6379,
    logger: log
};
/*module.exports = {
  redis_host: '127.0.0.1',
  redis_port: 16379
}*/
