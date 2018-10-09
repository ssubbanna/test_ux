"use strict";

const chai = require('chai'),
      expect = chai.expect,
      sinon = require('sinon'),
      rewire =  require('rewire'),
      sandbox = sinon.createSandbox();

describe('db test', () => {
    context('getDomainNodeInfo', () => {

        let dbMock, redisMock;
        before(() => {
            dbMock = rewire('../db.js');
            //mocking the redis object in db.js
            redisMock = {
               hgetall: sinon.spy(function(domainNodeId){
                   return new Promise((resolve, reject) => {
                       setTimeout(() =>{
                           resolve({
                               xmchosttype : 'xmc server',
                               xmchost: '10.177.222.84',
                               xmcport: 8443,
                               xmcuserpassword: 'Extreme_123',
                               xmcuserid: 'root',
                               xmchostid: 'xmc_84'
                           });
                       }, 50); //mimicking delay

                   });
               })
            };

           dbMock.__set__('redis', redisMock);
        });
        after(() =>{
            sandbox.restore();
        });

        it('call getDomainNodeInfo with domainNodeId xmc_84 and check if return obj matches mockDomain',(done) => {
            dbMock.getDomainNodeInfo('xmc_84').then((result) => {
                //expect(dbMock.getDomainNodeInfo).to.have.been.calledOnce;
                expect(result).to.be.a('object');
                expect(result).to.deep.equal({
                    xmchosttype : 'xmc server',
                    xmchost: '10.177.222.84',
                    xmcport: 8443,
                    xmcuserpassword: 'Extreme_123',
                    xmcuserid: 'root',
                    xmchostid: 'xmc_84'
                });
                done();
            });
        });
    });
});
