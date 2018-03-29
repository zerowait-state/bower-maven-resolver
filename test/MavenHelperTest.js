

var mavenHelper = require('../src/MavenHelper.js');

var assert = require('assert');
var finalhandler = require('finalhandler');
var fs = require('fs');
var http = require('http');
var serveStatic = require('serve-static');



describe('MavenHelper', function() {
    describe('.getVersionsFromMavenMetadataXml()', function() {
        describe('(with proper input)', function() {
            let metadataTests = [
                { file: 'xml/versions-1.xml', versions: ['1.1','1.1.1','1.2.0','1.3.0'] },
                { file: 'xml/versions-2.xml', versions: ['1.3.0'] },
                { file: 'xml/versions-3.xml', versions: ['1.1','1.1.1','1.2.0','1.3.0','1.3.1','1.3.3'] }
            ];
            for (var i=0; i<metadataTests.length; i++) {
                let oTest = metadataTests[i];
                let sFilename = oTest.file;
                let aExpectedVersions = oTest.versions;
                //let helper = new MavenHelper();
                let versions = [];
                fs.readFile(__dirname+'/'+sFilename, function(err, data) {
                    versions = mavenHelper.getVersionsFromMavenMetadataXml(data);
                });
                it('should return '+aExpectedVersions.length+' correct versions for '+sFilename, function() {
                    assert.deepEqual(aExpectedVersions, versions);
                });
            }
        });
        describe('(with missing elements)', function() {
            let metadataTests = [
                { file: 'xml/missing-versions_1.xml', versions: [] },
                { file: 'xml/missing-versions_2.xml', versions: [] },
                { file: 'xml/missing-versions_3.xml', versions: [] }
            ];
            for (var i=0; i<metadataTests.length; i++) {
                let oTest = metadataTests[i];
                let sFilename = oTest.file;
                let aExpectedVersions = oTest.versions;
                //let helper = new MavenHelper();
                let versions = [];
                fs.readFile(__dirname+'/'+sFilename, function(err, data) {
                    versions = mavenHelper.getVersionsFromMavenMetadataXml(data);
                });
                it('should return '+aExpectedVersions.length+' correct versions for '+sFilename, function() {
                    assert.deepEqual(aExpectedVersions, versions);
                });
            }
        });
    });

    describe('.getRemoteVersions()', function() {
        var server;
        before(function(done) {
            var serveopts = {
                'index' : ['index.html']
            };
            var serve = serveStatic(__dirname, serveopts);
            server = http.createServer(function onRequest(req,res) {
                serve(req, res, finalhandler(req,res));
            });
            server.listen(9191);
            done();
        });
        after(function() {
            server.close();
        });
        describe('(successful response)', function() {
            let metadataTests = [
                { url: 'http://localhost:9191/maven-metadata-samples/sample1', versions: ['1.1','1.1.1','1.2.0','1.3.0'] },
                { url: 'http://localhost:9191/maven-metadata-samples/sample2', versions: ['1.3.0'] },
                { url: 'http://localhost:9191/maven-metadata-samples/sample3', versions: ['1.1','1.1.1','1.2.0','1.3.0','1.3.1','1.3.3'] },
                { url: 'maven3+http://localhost:9191/maven-metadata-samples/sample1', versions: ['1.1','1.1.1','1.2.0','1.3.0'] },
                { url: 'maven3+http://localhost:9191/maven-metadata-samples/sample2', versions: ['1.3.0'] },
                { url: 'maven3+http://localhost:9191/maven-metadata-samples/sample3', versions: ['1.1','1.1.1','1.2.0','1.3.0','1.3.1','1.3.3'] }
            ];
            for (var i=0; i<metadataTests.length; i++) {
                let oTest = metadataTests[i];
                let sUrl = oTest.url;
                let aExpectedVersions = oTest.versions;
                //let helper = new MavenHelper();
                it('should return '+aExpectedVersions.length+' correct versions for '+sUrl, function() {
                    return mavenHelper.getRemoteVersions({}, sUrl)
                        .then(versions => {
                            assert.deepEqual(aExpectedVersions, versions);
                        }, error => {
                            console.log('FAILED: '+error);
                            assert.fail(error);
                        });
                });
            }
        });
    });

    describe('.downloadAndUnpackPackage()', function() {
        var server;
        before(function(done) {
            var serveopts = {
                'index' : ['index.html']
            };
            var serve = serveStatic(__dirname, serveopts);
            server = http.createServer(function onRequest(req,res) {
                serve(req, res, finalhandler(req,res));
            });
            server.listen(9191);
            done();
        });
        after(function() {
            server.close();
        });
        describe('(successful response)', function() {
            let metadataTests = [
                { url: 'http://localhost:9191/maven-package-samples/sample1', version: '1.0.0', files: ['file1.1.0.0', 'file2.1.0.0'] },
                { url: 'http://localhost:9191/maven-package-samples/sample1', version: '2.0.0', files: ['file1.2.0.0', 'file2.2.0.0'] },
                { url: 'maven3+http://localhost:9191/maven-package-samples/sample1', version: '1.0.0', files: ['file1.1.0.0', 'file2.1.0.0'] },
                { url: 'maven3+http://localhost:9191/maven-package-samples/sample1', version: '2.0.0', files: ['file1.2.0.0', 'file2.2.0.0'] },
                { url: 'http://localhost:9191/maven-package-samples/sample3', version: '1.0.0', files: ['file1.1.0.0', 'file2.1.0.0'] },
                { url: 'http://localhost:9191/maven-package-samples/sample3', version: '2.0.0', files: ['file1.2.0.0', 'file2.2.0.0'] },
                { url: 'maven3+http://localhost:9191/maven-package-samples/sample3', version: '1.0.0', files: ['file1.1.0.0', 'file2.1.0.0'] },
                { url: 'maven3+http://localhost:9191/maven-package-samples/sample3', version: '2.0.0', files: ['file1.2.0.0', 'file2.2.0.0'] }            
            ];
            for (var i=0; i<metadataTests.length; i++) {
                let oTest = metadataTests[i];
                let sUrl = oTest.url;
                let sTarget = oTest.version;
                let aExpectedFiles = oTest.files;
                it('should return '+aExpectedFiles.length+' correct extracted files for '+sUrl, function() {
                    return mavenHelper.downloadAndUnpackPackage({}, sUrl, sTarget)
                        .then(tmpdirName => {
                            var aExtractedFiles = fs.readdirSync(tmpdirName);
                            for (var j=0; j<aExpectedFiles.length; j++) {
                                assert.equal(true, aExtractedFiles.indexOf(aExpectedFiles[j]) > -1);
                            }
                        }, error => {
                            console.log('FAILED: '+error);
                            assert.fail(error);
                        });
                });
            }
        });
    });

    describe('.getRepoCredentials()', function() {
        var bower;
        var bowerMavenConfig1 = {
            'maven3+http://host:1234/artifactory/repo1' : {
                username : 'bwruser1',
                password : 'bwrpass1'
            }
        };
        var bowerMavenConfig1b = {
            'http://host:1234/artifactory/repo1' : {
                username : 'bwruser1',
                password : 'bwrpass1'
            }
        };
        var bowerMavenConfig2 = {
            'maven3+http://host:1234/artifactory/repo1' : {
                username : 'bwruser1',
                password : 'bwrpass1'
            },
            'maven3+http://host:1234/artifactory/repo2' : {
                username : 'bwruser2',
                password : 'bwrpass2'
            },
            'maven3+http://host:1234/artifactory/repo3' : {
                username : 'bwruser3',
                password : 'bwrpass3'
            }
        };
        var sampleDir = __dirname+'/maven-settings-samples';
        var source1 = 'maven3+http://host:1234/artifactory/repo1';
        var source2 = 'http://host:1234/artifactory/repo1';
        var source3 = 'http://host:1234/artifactory/repoZ';
        var expectedCreds = { username:'myuser', password:'mypass' };
        var expectedCreds2 = { username:'bwruser1', password: 'bwrpass1' };
        beforeEach(function() {
            bower = { config : {} };
            if (process.env.HOME) {
                delete process.env.HOME;
            }
            if (process.env.M2_HOME) {
                delete process.env.M2_HOME;
            }
            if (process.env.MAVEN_HOME) {
                delete process.env.MAVEN_HOME;
            }
        });
        describe('(successful maven settings)', function() {
            it('should return proper credentials with no bower auth and single elements in settings exist for '+source1, function() {
                process.env.OVERRIDE_M2_DIR = sampleDir+'/settings-xml-single';
                var creds = mavenHelper.getRepoCredentials(source1, bower);
                assert.deepEqual(expectedCreds, creds);
            });
            it('should return proper credentials with no bower auth and multiple elements in settings exist for '+source1, function() {
                process.env.OVERRIDE_M2_DIR = sampleDir+'/settings-xml-multi';
                var creds = mavenHelper.getRepoCredentials(source1, bower);
                assert.deepEqual(expectedCreds, creds);
            });
            it('should return proper credentials with no bower auth and single elements in settings exist for '+source2, function() {
                process.env.OVERRIDE_M2_DIR = sampleDir+'/settings-xml-single';
                var creds = mavenHelper.getRepoCredentials(source2, bower);
                assert.deepEqual(expectedCreds, creds);
            });
            it('should return proper credentials with no bower auth and multiple elements in settings exist for '+source2, function() {
                process.env.OVERRIDE_M2_DIR = sampleDir+'/settings-xml-multi';
                var creds = mavenHelper.getRepoCredentials(source2, bower);
                assert.deepEqual(expectedCreds, creds);
            });
        });
        describe('(failed maven settings)', function() {
            it('should return undefined with no bower auth and settings XML single element with different server', function() {
                process.env.OVERRIDE_M2_DIR = sampleDir+'/settings-xml-single';
                var creds = mavenHelper.getRepoCredentials(source3, bower);
                assert(!creds);
            });
            it('should return undefined with no bower auth and settings XML multiple elements but missing mirror '+source1, function() {
                process.env.OVERRIDE_M2_DIR = sampleDir+'/settings-xml-missing-mirror';
                var creds = mavenHelper.getRepoCredentials(source1, bower);
                assert(!creds);
            });
            it('should return undefined with no bower auth and settings XML multiple elements but missing server '+source1, function() {
                process.env.OVERRIDE_M2_DIR = sampleDir+'/settings-xml-missing-server';
                var creds = mavenHelper.getRepoCredentials(source1, bower);
                assert(!creds);
            });
            it('should return undefined with no bower auth and no settings XML', function() {
                process.env.OVERRIDE_M2_DIR = sampleDir+'/no-settings-xml';
                var creds = mavenHelper.getRepoCredentials(source1, bower);
                assert(!creds);
            });
            it('should return undefined with no bower auth and settings dir not a directory', function() {
                process.env.OVERRIDE_M2_DIR = sampleDir+'/not-a-directory';
                var creds = mavenHelper.getRepoCredentials(source1, bower);
                assert(!creds);
            });
            it('should return undefined with no bower auth and settings XML has no mirrors element', function() {
                process.env.OVERRIDE_M2_DIR = sampleDir+'/settings-xml-no-mirrors';
                var creds = mavenHelper.getRepoCredentials(source1, bower);
                assert(!creds);
            });
            it('should return undefined with no bower auth and settings XML has no servers element', function() {
                process.env.OVERRIDE_M2_DIR = sampleDir+'/settings-xml-no-servers';
                var creds = mavenHelper.getRepoCredentials(source1, bower);
                assert(!creds);
            });
        });
        describe('(successful from bower)', function() {
            it('should find bower credentials with single repo specified for '+source1, function() {
                bower.config.maven = bowerMavenConfig1;
                var creds = mavenHelper.getRepoCredentials(source1, bower);
                assert.deepEqual(expectedCreds2, creds);
            });
            it('should find bower credentials with single repo specified for '+source2, function() {
                bower.config.maven = bowerMavenConfig1b;
                var creds = mavenHelper.getRepoCredentials(source2, bower);
                assert.deepEqual(expectedCreds2, creds);
            });
            it('should find bower credentials with multiple config repos specified for '+source1, function() {
                bower.config.maven = bowerMavenConfig2;
                var creds = mavenHelper.getRepoCredentials(source1, bower);
                assert.deepEqual(expectedCreds2, creds);
            });
        });
        describe('(failed from bower)', function() {
            it('should not find bower credentials with single config repo specified for '+source3, function() {
                bower.config.maven = bowerMavenConfig1;
                var creds = mavenHelper.getRepoCredentials(source3, bower);
                assert(!creds);
            });
            it('should not find bower credentials with multiple config repos specified for '+source3, function() {
                bower.config.maven = bowerMavenConfig2;
                var creds = mavenHelper.getRepoCredentials(source3, bower);
                assert(!creds);
            });
        });
    });

});

