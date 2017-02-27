'use strict';

var mavenHelper = require('./MavenHelper.js');

const SOURCE_MATCH_REGEX = /^maven3\+https?/i;

module.exports = function (_bower) {
    return {

        // Match method tells whether resolver supports given source
        // It can return either boolean or promise of boolean
        match: function (source) {
            return SOURCE_MATCH_REGEX.test(source);
        },

        // Optional:
        // Can resolve or normalize sources, like:
        // "jquery" => "git://github.com/jquery/jquery.git"
        locate: function (source) {
            return source;
        },

        // Optional:
        // Allows to list available versions of given source.
        // Bower chooses matching release and passes it to "fetch"
        releases: function (source) {
            source = source.replace(/^[^\=]+=/, '');
            return mavenHelper.getRemoteVersions(_bower, source)
                .then(aVersions => {
                    return aVersions.map( version => { return {target:version,version:version}; });
                });
        },

        // It downloads package and extracts it to temporary directory
        // You can use npm's "tmp" package to tmp directories
        // See the "Resolver API" section for details on this method
        fetch: function (endpoint, cached) {
            // If cached version of package exists, re-use it
            if (cached && cached.version) {
                return;
            }

            // ... download package to temp dir
            var source = endpoint.source.replace(/^[^\=]+=/, '');
            return mavenHelper.downloadAndUnpackPackage(_bower, source, endpoint.target)
                .then(unpackDir => {
                    return {
                        tempPath: unpackDir,
                        removeIgnores: true
                    };
                });
        }
    };

};

