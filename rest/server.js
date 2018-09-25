const express = require('express'),
      bodyParser = require('body-parser'),
      config = require('./config.js'),
      redis = require('./redis.js'),
      db = require('./db.js'),
      rest = '/rest'
      asyncPolling = require('async-polling')  ;

let logger = config.logger;
var app = express();
let stopPolling =  false;
// parse application/json
app.use(bodyParser.json());
app.use(function (req, res, next) {
    var origin = req.headers.origin;
    if (!origin) {
        origin = "*";
    }
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Authorization, Accept");

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    }
    else {
        next();
    }
});


app.get(rest+'/devicesInSite/:siteId', (req, res) => {
    var siteId = req.params.siteId + ':devList';
    redis.smembers(siteId).then((data)=>Promise.all(data.map((val)=>{
        return redis.hgetall(val);
    }))).then((data)=>{
        //nrconsole.log(data);
        res.send(JSON.stringify(data));
    });
    //redis.smembers(siteId).then((data)=>Promise.all(data.map(redis.hgetall))).then((data)=>res.send(data));

});

var getChildren = function(node) {

    return Promise.resolve().then(function() {
    node.children = [];
    return redis.smembers(node.siteIdKey + ':children').then(function (data) {
        return Promise.all(data.map(redis.hgetall)).then(function(data) {
            return Promise.all(data.map(function(val) {
                node.children.push(val);
                return getChildren(val);
            }));

        });
    })});
    //return node;
};

app.get(rest+'/image', (req, res) => {
    try {
        let imageurl = req.query.imageurl;
        let index = imageurl.indexOf("images") + 6;
        res.sendFile(__dirname + '/images' + imageurl.substring(index));
    }catch (err){
        //console.error("File not found: " + err);
        logger.debug("File not found: " + err);
    }finally{
        logger.debug("Got the file");
    }

});

app.get(rest+'/domainNode/all', (req, res) => {
    var hosts = [];
    redis.smembers('xmchosts').then((data)=>Promise.all(data.map((data)=>{
        let host = {domainNodeId : data};
        //return redis.hgetall(val);
        return redis.hget('xmchosts:id:' + data, 'xmchosttype').then(function (data) {
            host.domainNodeType = data;
            hosts.push(host);
        });
    }))).then((data)=>{
        //console.log(data);
        res.send(JSON.stringify(hosts));
    });
});

Object.unflatten = function(data) {
    "use strict";
    if (Object(data) !== data || Array.isArray(data))
        return data;
    var regex = /\.?([^.\[\]]+)|\[(\d+)\]/g,
        resultholder = {};
    for (var p in data) {
        var cur = resultholder,
            prop = "",
            m;
        while (m = regex.exec(p)) {
            cur = cur[prop] || (cur[prop] = (m[2] ? [] : {}));
            prop = m[2] || m[1];
        }
        cur[prop] = data[p];
    }
    return resultholder[""] || resultholder;
};
app.get(rest+'/sitesInDomainNode/:domainNodeId', (req, res) => {
    let returnData = {};
    var hostId = req.params.domainNodeId;
    redis.hget('xmchostid:' + hostId, 'rootSite').then(function (data) {
        redis.hgetall(data).then(function (data) {
            //returnData.push(getChildren(data));
            let node = data;
            node.chartData = (Object.unflatten(JSON.parse(node.chartData)));
            getChildren(node).then(function (data) {
                res.send(JSON.stringify(node));
            });
        });
    });
});

app.post(rest+'/domainNode', (req, res) => {
    var data = req.body;
    //console.log(data);
    db.addXmcHost(data);
    res.status(200).send('Adding the node. Please check the log for errors if site and device data is not found');
});
try {
    app.listen(6080, '0.0.0.0');
    logger.info("Now listening on port 6080");
} catch (err) {
    logger.error("Unable to bind to port " + err);
}

var polling = asyncPolling(function (end) {
    db.getAllDomainNodes().then((data) =>{
        data.forEach((node) => {
            db.getDomainNodeInfo(node).then((nodeInfo)=> {
        /*
                    redis.client.hmset('xmchosts:id:' + data.id, ['xmchosttype', data.type, 'xmchost',
                data.address, 'xmcport', data.port, 'xmcuserpassword', data.userpassword, 'xmcuserid', data.userid]);
         */
                if(nodeInfo) {
                    let nodeInfoObj = {
                        id : nodeInfo.xmchostid,
                        type: nodeInfo.xmchosttype,
                        address: nodeInfo.xmchost,
                        port : nodeInfo.xmcport,
                        userpassword : nodeInfo.xmcuserpassword,
                        userid : nodeInfo.xmcuserid
                    };
                    db.addXmcHost(nodeInfoObj,true);
                }
            });
        });
    });

    end(null, 'running');
    if(stopPolling) {
        this.stop();
    }
}, 5*60*1000); //mins*60secs*1000

polling.run();
