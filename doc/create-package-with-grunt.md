#Create a Distribution Package with Grunt

Here is an example configuration of setting up a project to use grunt to create a distribution file.

First, get your project started with Grunt.  See the [Getting Started](http://gruntjs.com/getting-started) guide if you are not familiar with this process. 

In this example we will use two Grunt plugins.  The first plugin is the [grunt-contrib-copy](https://github.com/gruntjs/grunt-contrib-copy/) plugin, which will be used to copy our source files into a 'dist' folder.  Then we will use the [grunt-contrib-compress](https://github.com/gruntjs/grunt-contrib-compress/) plugin to generate the package file from the dist folder contents.

Install the plugins with the following command

``` sh
npm install grunt-contrib-copy --save-dev
npm install grunt-contrib-compress --save-dev
```

Then enable the plugins by adding the following to your Gruntfile.js:

``` javascript
	grunt.loadNpmTasks("grunt-contrib-copy");
	grunt.loadNpmTasks('grunt-contrib-compress')
```

Finally, add the following configuration to your Gruntfile.js initConfig().

``` javascript
    dir: {
        webapp: "webapp",
        dist: "dist"
    },
	grunt.initConfig({
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
	    compress: {
	        main: {
	            options: {
	                archive: "dist.tar.gz",
	                mode: "tgz",
	                level: 9
	            },
	            files: [
	                { expand: true, cwd: 'dist/', src: ['**'], dest:'resources'},
	                { src: ['README.md', 'bower.json'] }
	            ]
	        }
	    }
	});
```

The **copy** task copies specified source files into a folder called 'dist'.  This task(s) of copying these files can be as simple as you see here, or be a 'build' task that lints files, runs unit tests, minifies code, and copies files as a final step.

The **compress** task then takes the files that are copied into 'dist' and creates a distribution package.

Now you can generate the package as follows:

```sh
grunt copy compress
```

That's it!  You should now have a file called 'dist.tar.gz' which can be distributed and/or deployed to the repository.
