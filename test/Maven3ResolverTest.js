
var Maven3Resolver = require('../src/Maven3Resolver.js');

var assert = require('assert');
var auth = require('http-auth');
var finalhandler = require('finalhandler');
var fs = require('fs');
var http = require('http');
var serveStatic = require('serve-static');


describe('Maven3Resolver', function() {
    var bower;
    var resolver;
    beforeEach(function() {
        bower = {};
    });

    describe('.match()', function() {
        beforeEach(function() {
            resolver = new Maven3Resolver(bower);
        });
        var maven3Urls = [
            'maven3+http://my.server:8180/my/url',
            'maven3+https://url',
            'maven3+https://url',
            'Maven3+https://url',
            'MAVEN3+https://url',
            'MAVEN3+HTTPS://url',
            'maven3+HTTPS://url',
            'maven3+http://www.server.com:9090/context/path/com/org/proj/projectId/artifactId/v1.1.0'
        ];
        var nonMaven3Urls = [
            'maven+http://url',
            'mvn+http://url',
            'svn+http://url',
            'http://url',
            'maven3+ftp://file/server'
        ];

        for (var i=0; i<maven3Urls.length; i++) {
            let sUrl = maven3Urls[i];
            //let resolver = new Maven3Resolver();
            it('should return true for '+sUrl, function() {
                assert.equal(true, resolver.match(sUrl));
            });
        }
        for (var i=0; i<nonMaven3Urls.length; i++) {
            let sUrl = nonMaven3Urls[i];
            //let resolver = new Maven3Resolver();
            it('should return false for ' + sUrl, function() {
                assert.equal(false, resolver.match(sUrl));
            });
        }
    });

    var metadataSource1 = 'http://localhost:9191/maven-metadata-samples/sample1';
    var versions1 = [{
            'target': '1.1',
            'version': '1.1'
        },{
            'target': '1.1.1',
            'version': '1.1.1'
        },{
            'target': '1.2.0',
            'version': '1.2.0'
        },{
            'target': '1.3.0',
            'version': '1.3.0'
        }];
    var fetchSource1 = 'http://localhost:9191/maven-package-samples/sample1';
    var endpoint1 = {
        source: fetchSource1,
        target: '1.0.0'
    };
    var fetchSource2 = 'http://localhost:9191/maven-package-samples/sample3';
    var endpoint2 = {
        source: fetchSource2,
        target: '1.0.0'
    };
    var expectedFiles1 = ['file1.1.0.0', 'file2.1.0.0'];
    var source1Conf1 = {
        username : 'user1',
        password : 'pass1'
    };
    var bower1a = {};
    bower1a.config = {};
    bower1a.config.maven = {};
    bower1a.config.maven[metadataSource1] = source1Conf1;
    bower1a.config.maven[fetchSource1] = source1Conf1;
    var bower1b = {};
    bower1b.config = {};
    bower1b.config.maven = {};
    bower1b.config.maven[metadataSource1] = source1Conf1;
    bower1b.config.maven[fetchSource2] = source1Conf1;

    describe('-requiring no authentication-', function() {
        var server;
        before(done => {
            var serveopts = {
                'index' : ['index.html']
            };
            var serve = serveStatic(__dirname, serveopts);
            server = http.createServer(function(req,res) {
                serve(req, res, finalhandler(req,res));
            });
            server.listen(9191);
            done();
        });
        after(function() {
            server.close();
        });
        describe('.releases()', function() {
            it('should return proper versions when no authentication is required for '+fetchSource1, function() {
                resolver = new Maven3Resolver(bower1a);
                return resolver.releases(metadataSource1)
                    .then(aReleases => {
                        assert.deepEqual(versions1, aReleases);
                    }, error => {
                        console.log('FAILED: '+error);
                        assert.fail(error);
                    });
                assert.deepEqual(1,1);
            });
        });
        describe('.fetch()', function() {
            it('should unpack proper files when no authentication is required for '+fetchSource1, function() {
                resolver = new Maven3Resolver(bower1a);
                return resolver.fetch(endpoint1, {})
                    .then(fetchResponse => {
                        var files = fs.readdirSync(fetchResponse.tempPath);
                        assert.deepEqual(expectedFiles1, files);
                    }, error => {
                        console.log('FAILED: '+error);
                        assert.fail(error);
                    });
                assert.deepEqual(1,1);
            });
            it('should unpack proper files when no authentication is required for '+fetchSource2, function() {
                resolver = new Maven3Resolver(bower1b);
                return resolver.fetch(endpoint2, {})
                    .then(fetchResponse => {
                        var files = fs.readdirSync(fetchResponse.tempPath);
                        assert.deepEqual(expectedFiles1, files);
                    }, error => {
                        console.log('FAILED: '+error);
                        assert.fail(error);
                    });
                assert.deepEqual(1,1);
            });
        });
    });

    // convenience function to get the auth header case insensitive
    var getAuthHeader = function(oHeaders) {
        if (!oHeaders) return '';
        for (var prop in oHeaders) {
            if ('AUTHORIZATION' === prop.toUpperCase()) {
                return oHeaders[prop];
            }
        }
    };

    describe('-requiring authentication-', function() {
        var server;
        before(done => {
            var serveopts = {
                'index' : ['index.html']
            };
            var serve = serveStatic(__dirname, serveopts);
            server = http.createServer(function(req,res) {
                if (req.headers && getAuthHeader(req.headers)) {
                    if (getAuthHeader(req.headers) === 'Basic dXNlcjE6cGFzczE=') {
                        serve(req, res, finalhandler(req,res));
                    } else {
                        res.setHeader('WWW-Authenticate', 'Basic realm="Unit Test"');
                        res.statusCode = 401;
                        res.end();
                    }
                } else {
                    res.setHeader('WWW-Authenticate', 'Basic realm="Unit Test"');
                    res.statusCode = 401;
                    res.end();
                }
            });
            server.listen(9191);
            done();
        });
        after(function() {
            server.close();
        });
        describe('.releases()', function() {
            it('should return proper versions when authentication *is* required for '+fetchSource1, function() {
                resolver = new Maven3Resolver(bower1a);
                return resolver.releases(metadataSource1)
                    .then(aReleases => {
                        assert.deepEqual(versions1, aReleases);
                    }, error => {
                        console.log('FAILED: '+error);
                        assert.fail(error);
                    });
                assert.deepEqual(1,1);
            });
        });
        describe('.fetch()', function() {
            it('should unpack proper files when authentication *is* required for '+fetchSource1, function() {
                resolver = new Maven3Resolver(bower1a);
                return resolver.fetch(endpoint1, {})
                    .then(fetchResponse => {
                        var files = fs.readdirSync(fetchResponse.tempPath);
                        assert.deepEqual(expectedFiles1, files);
                    }, error => {
                        console.log('FAILED: '+error);
                        assert.fail(error);
                    });
                assert.deepEqual(1,1);
            });
            it('should unpack proper files when authentication *is* required for '+fetchSource2, function() {
                resolver = new Maven3Resolver(bower1b);
                return resolver.fetch(endpoint2, {})
                    .then(fetchResponse => {
                        var files = fs.readdirSync(fetchResponse.tempPath);
                        assert.deepEqual(expectedFiles1, files);
                    }, error => {
                        console.log('FAILED: '+error);
                        assert.fail(error);
                    });
                assert.deepEqual(1,1);
            });
        });
    });

});

