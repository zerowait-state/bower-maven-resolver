#Create a Distribution Package with grunt-maven-tasks Plugin

Here is an example configuration of setting up a project to use the [grunt-maven-tasks](https://github.com/smh/grunt-maven-tasks) plugin to create a distribution file.

First, get your project started with Grunt.  See the [Getting Started](http://gruntjs.com/getting-started) guide if you are not familiar with this process. 

In this example we will use two Grunt plugins.  The first plugin is the [grunt-contrib-copy](https://github.com/gruntjs/grunt-contrib-copy/) plugin, which will be used to copy our source files into a 'dist' folder.  Then we will use the [grunt-maven-tasks](https://github.com/smh/grunt-maven-tasks) plugin to generate the package file from the dist folder contents and deploy it to your Maven respository of choice.

Install the plugins with the following command

``` sh
npm install grunt-contrib-copy --save-dev
npm install grunt-maven-tasks --save-dev
```

Then enable the plugins by adding the following to your Gruntfile.js:

``` javascript
	grunt.loadNpmTasks("grunt-contrib-copy");
	grunt.loadNpmTasks('grunt-maven-tasks')
```

Next, add the following configuration to your Gruntfile.js initConfig().

``` javascript
    
	grunt.initConfig({
            dir: {
                    webapp: "webapp",
                    dist: "dist"
            },
            copy: {
                dist: {
                    files: [ {
                        expand: true,
                        cwd: "<%= dir.webapp %>",
                        src: [
                            "**",
                            "!test/**"
                        ],
                        dest: "<%= dir.dist %>"
                    } ]
                }
            },
            maven: {
                options: {
                  groupId: 'com.mycompany.mymodule',
                  repositoryId: 'mymavenrepo.mycompany.com',
                },
                deploy_targz: {
                    options: {
                      goal: 'deploy',
                      injectDestFolder: false,
                      packaging: 'tgz',
                      file: pkgJson.name + '-' + pkgJson.version + '.tar.gz',
                      url: 'http://mymavenrepo.mycompany.com/artifactory/myrepository',
                      optionalParams: ['-Dpackaging=tar.gz']
                    },
                    files: [
                        {
                            expand: true, 
                            cwd: 'dist', 
                            src: ['**'], 
                            dest: '/resources'
                        },
                        { src: ['README.md', 'bower.json'] }
                    ]
                },
                deploy_zip: {
                    options: {
                      goal: 'deploy',
                      injectDestFolder: false,
                      packaging: 'zip',
                      url: 'http://mymavenrepo.mycompany.com/artifactory/myrepository',
                    },
                    files: [
                        {
                            expand: true, 
                            cwd: 'dist', 
                            src: ['**'], 
                            dest: '/resources'
                        },
                        { src: ['README.md', 'bower.json'] }
                    ]
                }
            }
	});
```

Finally, add the following to your Gruntfile.js to register a deploy task.

``` javascript
    
        grunt.registerTask('deploy', [ 'maven:deploy_targz' ]);
```

The **copy** task copies specified source files into a folder called 'dist'.  This task(s) of copying these files can be as simple as you see here, or be a 'build' task that lints files, runs unit tests, minifies code, and copies files as a final step.

The **deploy** task then takes the files that are copied into 'dist', creates a distribution package, and deploys them to your Maven repository.

Now you can generate the package and deploy it to your Maven repository as follows:

```sh
grunt copy deploy
```

That's it!  You should now have an artifact named '<package.name>-<package.version>.targz' generated in your project folder and  deployed to the Maven repository.
