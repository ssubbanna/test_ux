const config = require('./config.js'),
      redis = require('redis');

let logger = config.logger;
let client;
try {
    client = redis.createClient(config.redis_port, config.redis_host);
}catch(error) {
    logger.error('Error connecting to db: ' + error);
}finally {
    logger.debug('Got DB connection');
}

var get = (key) => {
  return new Promise((resolve, reject) => {
    client.get(key, (err, data) => {
      if(err) reject(err);
      resolve(data);
    });
  });
};

var hgetall = (key) => {
  return new Promise((resolve, reject) => {
    if(key === null) reject();
    client.hgetall(key, (err, data) => {
      if(err) reject(err);
      resolve(data);
    });
  });
};

var hget = (key,field) => {
    return new Promise((resolve, reject) => {
        if(key === null || field === null) reject();
        client.hget(key, field, (err, data) => {
            if(err) reject(err);
            resolve(data);
        });
    });
};

var smembers = (key) => {
    return new Promise((resolve, reject) => {
        if(key === null) reject();
        client.smembers(key, (err, data) => {
            if(err) reject(err);
        resolve(data);
        });
    });
};

var lrange = (key) => {
  return new Promise((resolve, reject) => {
    client.lrange(key, [0, -1], (err, data) => {
      if(err) reject(err);
      resolve(data);
    });
  });
};

module.exports.get = get;
module.exports.hget = hget;
module.exports.hgetall = hgetall;
module.exports.smembers = smembers;
module.exports.lrange = lrange;
module.exports.client = client;

