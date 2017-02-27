'use strict';

var fs = require('fs');
var os = require('os');
var requestPromise = require('request-promise-native');
var request = require('request');
var targz = require('tar.gz');
var tmp = require('tmp');
var util = require('util');
var xml2js = require('xml2js');

const MAVEN_METADATA_FILENAME = 'maven-metadata.xml';
const MAVEN_ARTIFACT_FORMAT = '%s/%s-%s.tar.gz';

var _public = {}; // will be exported
var _private = {}; // will only be visible within the module

/**
 * Return a promise to the versions on the remote repository.
 * @param {String} sRepositoryUrl
 * @return {Promise} promise to array of strings
 */
_public.getRemoteVersions = function(bower, sRepositoryUrl) {
    var opts = _private.getAuthOption(bower, sRepositoryUrl);
    var sRepoUrl = _private.getRequestUrl(sRepositoryUrl)+'/'+MAVEN_METADATA_FILENAME;
    return _private.slurpUrlViaPromise(sRepoUrl, opts)
            .then(_public.getVersionsFromMavenMetadataXml);
};

/**
 * Parse the versions out of a mavenmetadata.xml file that exists on the
 * maven server at the base of the artifact path.
 * @param {String} sXmlString contents of the mavenmetadata.xml file
 * @return {Array} versions, or undefined if none could be parsed
 */
_public.getVersionsFromMavenMetadataXml = function(sXmlString) {
    var parser = new xml2js.Parser({'explicitArray':false});
    var versions = [];
    parser.parseString(sXmlString, function(err, data) {
        if ((typeof(err) !== 'undefined') && err) {
            throw new Error('error reading artifact metadata: '+err);
        }
        versions = _private.getObjectChildAt(data, 'metadata.versioning.versions.version');
        if (typeof(versions) === 'undefined') {
            versions = [];
        }
        versions = [].concat(versions);
    });
    return versions;
};

/**
 * Download and unpacka a .tgz package from maven.
 * @param {type} source the base URL of the artifact
 * @param {type} target the version part of the URL
 * @return {Promise} of final tmp dir name where the contents are downloaded to
 */
_public.downloadAndUnpackPackage = function(bower, source, target) {
    var opts = _private.getAuthOption(bower, source);
    var sRequestUrl = _private.getPackageUrl(source, target);
    return _private.unpackRemotePackageViaPromise(sRequestUrl, opts);
};

/**
 * Get credentials from one of two sources.<br/>
 * Highest source in order of precedence is the bower configuration.  
 * bower.config[/your URL here/] will be searched for username and password to
 * use.<br/>
 * Next source in order of precedence is the maven settings.  Users' home
 * directory, M2_HOME and MAVEN_HOME environment variables (in that order) will
 * be found.  In this directory, settings.xml will be searched, and from there
 * the mirror and server will be searched for the URL of the repository.  If
 * found, the username/password will be retrieved from that server.
 * @param {String} source URL of repository
 * @param {Object} bower
 * @return {Object} with username, password properties - or undefined if not 
 * found
 * @throws {Error} if an IO or parse exception occurred reading settings.xml
 */
_public.getRepoCredentials = function(source, bower) {
    var urls = [source, _private.getRequestUrl(source)];
    for (var i=0; i<urls.length; i++) {
        var url = urls[i];
        var maven = _private.getObjectChildAt(bower, 'config.maven');
        if (maven && (url in maven)) {
            var id = bower.config.maven[url];
            return { username:id.username, password:id.password||'' };
        }
        var settings = _private.getMavenSettings();
        if (settings) {
            var creds = _private.getRepoAuthFromSettings(url, settings);
            if (creds) {
                return creds;
            }
        }
    }
    return undefined;
};

exports.getRemoteVersions = _public.getRemoteVersions;
exports.getVersionsFromMavenMetadataXml = _public.getVersionsFromMavenMetadataXml;
exports.downloadAndUnpackPackage = _public.downloadAndUnpackPackage;
exports.getRepoCredentials = _public.getRepoCredentials;

//
//
//

/**
 * Trim the prefix from the URL if it is present.
 * @param {String} sSource source prefix
 * @return {String} prefix without the prefix indicating this is a maven-based
 * repository.
 */
_private.getRequestUrl = function(sSource) {
    var rePattern = new RegExp(/^maven3\+/i);
    return sSource.replace(rePattern, '');
};

/**
 * Get a value in an object.
 * @param {object} object javascript object to get value form
 * @param {String} sKeys key names separated by ".", for example.  So for
 * example 'person.children' would return object.person.children.
 * @return {object}
 * the value of the child of the object given by the key names
 */
_private.getObjectChildAt = function(object, sKeys) {
    var aKeys = sKeys.split('.');
    while (object && aKeys.length) {
        object = object[aKeys.shift()];
    }
    return object;
};

/**
 * Reads content of URL, with the results coming back in a promise object.
 * @param {String} sUrl
 * @param {object} options
 * @return {Promise returning resource content}
 */
_private.slurpUrlViaPromise = function(sUrl, options) {
    return requestPromise.get(sUrl, options);
};

/**
 * Writes content of URL to a temporary directory (which will be created), and
 * returns the path to the directory via a promise which is fulfilled when the
 * process is completed.
 * @param {String} sUrl
 * @param {object} options
 * @return {Promise} returning directory the package was unpacked to
 */
_private.unpackRemotePackageViaPromise = function(sUrl, options) {
    var tmpDir = tmp.fileSync().name;
    var promise = new Promise(function(resolve, reject) {
        var readStream = request.get(sUrl, options);
        var writeStream = targz().createWriteStream(tmpDir);
        readStream.on('error', error => {reject(error);});
        writeStream.on('error', error => {reject(error);});
        writeStream.on('end', function() {resolve();});
        readStream.pipe(writeStream);
    });
    return promise.then(function() { return tmpDir; });
};

/**
 * Get repository credentials from settings.xml
 * @param {String} source 
 * @param {Object} settings parsed from settings.xml
 * @return {Object} properties are username, password - or undefined
 */
_private.getRepoAuthFromSettings = function(source, settings) {
    var serverId = '';
    var mirror = _private.getObjectChildAt(settings, 'settings.mirrors.mirror');
    if (mirror && Array.isArray(mirror)) {
        for (var i=0; i<mirror.length; i++) {
            if (source.startsWith(mirror[i].url)) {
                serverId = mirror[i].id;
            }
        }
    } else if (mirror && mirror.id && mirror.url && source.startsWith(mirror.url)) {
        serverId = mirror.id;
    }
    if (serverId === '') {
        return undefined;
    }

    var servers = _private.getObjectChildAt(settings, 'settings.servers.server');
    if (servers && Array.isArray(servers)) {
        for (var i=0; i<servers.length; i++) {
            var server = servers[i];
            if ((server.id === serverId) && server.username) {
                var username = server.username;
                var password = server.password || '';
                return { username:username, password:password };
            }
        }
    } else if (servers && servers.username && servers.id && servers.id === serverId) {
        return { username:servers.username, password:servers.password };
    }
    return undefined;
};

_private.getAuthOption = function(bower, source) {
    var creds = _public.getRepoCredentials(source, bower);
    var authOpts = {};
    if (creds && (typeof(creds) !== 'undefined') && creds.username) {
        var authOpts = {
            auth : {
                'user' : creds.username,
                'pass' : creds.password,
                'sendImmediately' : false
            }
        };
    }
    return authOpts;
};

/**
 * Attempt to reference M2_HOME and home .m2 directory conventions to find 
 * settings.xml, load this file, and return the contents.  Only retrieves user
 * or M2_HOME prefs, not the global prefs for an installed mvn app.
 * @return {object} parsed maven settings.xml or empty object if no settings.xml
 * was found
 * @throws {object} error if IO error or parse error occurs reading the settings 
 */
_private.getMavenSettings = function() {
    var m2dir = _private.getM2Dir();
    if ((typeof(m2dir) === undefined) || (!m2dir)) {
        return {};
    }
    var settingsPath = m2dir+'/settings.xml';
    if (!fs.existsSync(settingsPath) || fs.statSync(settingsPath).isDirectory()) {
        return {};
    }
    var settingsXmlContent = fs.readFileSync(settingsPath);
    var parser = new xml2js.Parser({'explicitArray':false});
    var settings;
    parser.parseString(settingsXmlContent, function(err, data) {
        if ((typeof(err) !== 'undefined') && err) {
            throw new Error('error reading settings metadata: '+err);
        }
        settings = data;
    });
    return settings;
};
_private.getM2Dir = function() {
    if (process.env.OVERRIDE_M2_DIR) {
        return process.env.OVERRIDE_M2_DIR; // for unit test
    }
    var m2dir = os.homedir()+'/.m2';
    if (m2dir === '/.m2') {
        m2dir = '~/.m2';
    }
    if (fs.existsSync(m2dir) && fs.statSync(m2dir).isDirectory()) {
        return m2dir;
    }
    if (process.env.M2_HOME && (typeof(process.env.M2_HOME) !== 'undefined')) {
        var m2env = process.env.M2_HOME;
        if (fs.existsSync(m2env) && fs.statSync(m2env).isDirectory()) {
            return m2env;
        }
    }
    return undefined;
};

_private.getPackageUrl = function(source, target) {
    var sRequestUrl = _private.getRequestUrl(source);
    sRequestUrl.replace(/\/+$/, '');
    target.replace(/^\/+/, '');
    target.replace(/\/+$/, '');
    sRequestUrl = sRequestUrl+'/'+target;
    var re = /([^\/]+)\/([^\/]+)$/;
    var aRes = re.exec(sRequestUrl);
    if (!aRes) {
        throw new Error('URL does not conform to standard: '+sRequestUrl);
    }
    sRequestUrl = util.format(MAVEN_ARTIFACT_FORMAT, sRequestUrl, aRes[1], aRes[2]);
    return sRequestUrl;
};
