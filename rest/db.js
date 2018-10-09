const request = require('request');
let config, redis, logger;
if(process.env.NODE_ENV && process.env.NODE_ENV === 'dev') {
    config, redis, logger = null;
} else {
    config = require('./config.js'),
    redis = require('./redis.js');
    logger = config.logger;
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

Object.flatten = function(data) {
    var result = {};
    function recurse (cur, prop) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
            for(var i=0, l=cur.length; i<l; i++)
                recurse(cur[i], prop + "[" + i + "]");
            if (l == 0)
                result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop+"."+p : p);
            }
            if (isEmpty && prop)
                result[prop] = {};
        }
    }
    recurse(data, "");
    return result;
};
var populateSites =  function(data, hostdata) {
    try {
        const rootNode = data.data.network.siteTree,
            hostXmcId = hostdata.id;

        redis.client.hmset('siteId:' + hostXmcId + ':' + rootNode.id, ['location',
            rootNode.location, 'siteId', rootNode.id, 'siteIdKey', 'siteId:' + hostXmcId + ':' +
            rootNode.id, 'name', rootNode.name, 'leaf', rootNode.leaf, 'chartData', JSON.stringify(Object.flatten(rootNode.chartData))], function (err, resp) {
            if (err)
                logger.log(err);
        });
        redis.client.hset('xmchostid:' + hostXmcId, ['rootSite', 'siteId:' + hostXmcId + ':' + rootNode.id]);
        rootNode.devIdList.forEach((devId) => {
            redis.client.sadd('siteId:' + hostXmcId + ':' + rootNode.id +
                ':devList', 'devId:' + hostXmcId + ':' + devId);
        });
        processSiteChilren(hostXmcId, rootNode, rootNode.children);
    }catch(err) {
        logger.error("Error populateSites: " + err);
    }
};

var processSiteChilren = function (xmcSiteId,rootNode,children) {
    try {
        children.forEach((rootNodeChildren) => {
            redis.client.hmset('siteId:' + xmcSiteId + ':' + rootNodeChildren.id, ['location',
                    rootNodeChildren.location, 'siteId', rootNodeChildren.id, 'siteIdKey', 'siteId:' + xmcSiteId + ':' +
                    rootNodeChildren.id, 'rootNodeChildren', rootNodeChildren.name, 'leaf', rootNodeChildren.leaf],
                function (err, resp) {
                    if (err)
                        logger.log(err);
                }
            );
            rootNodeChildren.devIdList.forEach((devId) => {
                redis.client.sadd('siteId:' + xmcSiteId + ':' + rootNodeChildren.id +
                    ':devList', 'devId:' + xmcSiteId + ':' + devId);
            });

            redis.client.sadd('siteId:' + xmcSiteId + ':' + rootNode.id + ':children', 'siteId:' + xmcSiteId + ':' +
                rootNodeChildren.id);
            if (rootNodeChildren.children) {

                processSiteChilren(xmcSiteId, rootNodeChildren, rootNodeChildren.children);

            }
        });
    }catch(err) {
        logger.error("Error processSiteChilren: " + err);
    }
};
var populateDeviceData =  function(data,nodeInfo) {
    try {
        var devData = data.data.network.devices;
        /*
        {network {devices{ip status deviceId chassisId deviceDisplayFamily deviceName sysUpTime' +
                ' sysContact sysLocation sitePath siteId firmware deviceData {assetTag, archiveId, jsonVendorProfile}}
         */
        if (devData) {
            devData.forEach((elem) => {
                redis.client.hmset('devId:' + nodeInfo.id + ':' + elem.deviceId, ['ip',
                        elem.ip, 'status', elem.status, 'deviceId', elem.deviceId, 'chassisId', elem.chassisId ||'',
                        'deviceDisplayFamily', elem.deviceDisplayFamily, 'deviceName', elem.deviceName, 'sysUpTime',
                    elem.sysUpTime,'sysContact', elem.sysContact || '','sysLocation', elem.sysLocation || "",'siteId',elem.siteId,
                    'firmware',elem.firmware || '', 'imageurl', JSON.parse(elem.deviceData.jsonVendorProfile).imageurl,
                    'sitePath', elem.sitePath, 'deviceIdKey', 'devId:' + elem.deviceId],
                    function (err, resp) {
                        if (err)
                            logger.log(err);
                    });

            });
        }
    }catch(err) {
        logger.error("Error populateDeviceData: " + err);
    }

};
/*
        redis.client.hmset('xmchosts:id:' + data.xmchostid, ['xmchosttype', data.xmchosttype, 'xmchost',
            data.xmchost,'xmcport', data.xmcport, 'xmcuserpassword', data.xmcuserpassword, 'xmcuserid',data.xmcuserid]);
 */

var loadXmcHostData = (data) => {
    try {
        let auth = "Basic " + new Buffer(data.userid + ":" + data.userpassword).toString("base64"),
            host = data.address,
            port = data.port;
        request.post({
            headers: {
                'content-type': 'application/json',
                'Authorization': auth
            },
            //rejectUnauthorized: false,
            url: 'https://' + host + ':' + port + '/nbi/graphql',
            body: '{"query" : "{network {siteTree}}"}'
        }, function (error, response, body) {
            try {
                var jsonResp = JSON.parse(body);
                populateSites(jsonResp, data);
            }catch(err) {
                logger.error('Error populating sites for node: ' + data.id + ' ' + err);
            }
            //console.log(jsonResp);
        });
    }catch(err) {
        logger.error("Error loadXmcHostData: " + err);
    }
};

var loadDeviceData = (data) => {
    try {
        let auth = "Basic " + new Buffer(data.userid + ":" + data.userpassword).toString("base64"),
            host = data.address,
            port = data.port;
        request.post({
            headers: {
                'content-type': 'application/json',
                'Authorization': auth
            },
            //rejectUnauthorized: false,
            url: 'https://' + host + ':' + port + '/nbi/graphql',
            body: '{"query" : "{network {devices{ip status deviceId chassisId deviceDisplayFamily deviceName sysUpTime' +
                ' sysContact sysLocation sitePath siteId firmware deviceData {assetTag, archiveId, jsonVendorProfile}}}}"}'
        }, function (error, response, body) {
            try {
                var jsonResp = JSON.parse(body);
                populateDeviceData(jsonResp, data);
            }catch(err) {
                logger.error('Error populating devices for node: ' + data.id + ' ' + err);
            }
            //console.log(jsonResp);
        });
    }catch(err) {
        logger.error("Error loadDeviceData: " + err);
    }
};
/*
{
    id: unique id
    type: node type
    address: fqdn or ip
    port : port
    userpassword : password
    userid : user id
}
 */
var addXmcHost = (data, refreshData) => {
    try {
        if (data) {
            /*
           redis.client.hmset('xmchosts:id:' + data.xmchostid, ['xmchosttype', data.xmchosttype, 'xmchost',
                data.xmchost, 'xmcport', data.xmcport, 'xmcuserpassword', data.xmcuserpassword, 'xmcuserid', data.xmcuserid]);*/
            if(!refreshData) {
                redis.client.hmset('xmchosts:id:' + data.id, ['xmchosttype', data.type, 'xmchost',
                    data.address, 'xmcport', data.port, 'xmcuserpassword', data.userpassword, 'xmcuserid', data.userid,
                    'xmchostid', data.id]);
                redis.client.sadd('xmchosts', data.id);
            }
        }
        loadXmcHostData(data);
        loadDeviceData(data);
    }catch(err) {
        logger.error("Error adding host: " + err);
    }finally {
        logger.info('Adding new host: ' + data.id);
    }
};

var getAllDomainNodes = () => {
    return redis.smembers('xmchosts');
};

var getDomainNodeInfo = (domainNodeId) => {
    return redis.hgetall('xmchosts:id:' + domainNodeId);
};

module.exports.addXmcHost = addXmcHost;
module.exports.getAllDomainNodes = getAllDomainNodes;
module.exports.getDomainNodeInfo = getDomainNodeInfo;




