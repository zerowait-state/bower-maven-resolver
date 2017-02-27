![Zero Wait-State](https://www.zerowait-state.com/hs-fs/hubfs/ZWS_logotag_2016_H_GrayOrange_RGB.png)

# bower-maven-resolver

Allows you to serve Bower resources from a maven 3 repository.  Unlike resolvers for specific repository implementations, bower-maven-resolver does not need to have any special plugins installed in the server to locate and fetch packages.  This allows Bower packages deployed to a maven repository to be accessed anywhere in an enterprise for deployment or build.

The interactions with the repository are done without the use of the mvn command line utility.  Only http and https maven repository protocols are supported.

Credentials can be pulled from the bower configuration, or alternatively from the local maven settings.xml.  Placing the credentials in the settings.xml allows you to not have to publish the credentials for the repository in your source code.

Published under the Apache License 2.0.

## Set Up your Project

* Create your bower project, including specification of your bower.json

* Install this resolver into your project

  ``` npm install bower-maven-resolver --save-dev ```

* Add an entry for maven-bower-resolver to your .bowerrc configuration file.

  ```
    {
      "resolvers": [
        "maven-bower-resolver"
      ]
    }
  ```

* Add the dependency to your bower.json

  ``` 'maven3+http://myserver/hexus/repox/mygroup/myartifact' : '1.0.0' ```

## Publishing

All of the files of your Bower package are archived into a single file, for example dist.tar.gz, and published into the maven repository (Nexus, Artifactory, etc).  The format of the file that is uploaded to the repository must a gzipped tar package.  This file is then publised under a desired group ID, artifact ID, and version as any maven artifact would be.

* Generate package of your project.  Following is an example of creating this file assuming your build process puts files into a dist/ subdirectory in your project.

  ```
  cp file1 file2 ... dist/  # (i.e. putting the files into 'dist' directory)
  cd dist
  tar cvfz dist.tar.gz .
  ```
  
  **Note:** it is recommended **NOT** to name your package file 'package.tar.gz' so that, while cleaning up, you do not accidentally delete your package.json file.
  
  **Note:** you can probably also figure out a nifty way of getting your build process to create the dist.tar.gz file for you that will work across platforms.  The above gives you the idea how it should work.

* [Deploy](https://maven.apache.org/plugins/maven-deploy-plugin/deploy-file-mojo.html) the archive file into maven repository

  ```
    mvn deploy:deploy-file \
     -DgroupId=myGroup -DartifactId=myArtifact -Dversion=1.0 \
     -Dfile=dist.tar.gz \
     -Durl=http://myserver/hexus/repox \
     -DrepositoryId=MY_REPO
   ```

  Presumably you're using maven and know how to get artifacts into it.  You could use the command line given here, or deploy manually with the web client for your repository.

## Accessing your Package with Bower

Now anywhere you need to build the project, you can do so independently of maven utilities.

``` 
git clone http://github.com/my-kewl-repo.git
npm install
bower install
```

And your package will be added to bower_components.

## Configuration

### Repository Authentication

The main configuration is for the authentication to the maven repository server.  You can configure the credentials in one of two ways.  Only username / password authentication is supported.

1. First in order or precedence is to use the bower configuration.  Include a **maven** section in your bower configuration:

  ```
    {
      config: {
        maven: {
	        'http://myserver/hexus/repox/mygroup/myartifact/myversion': {
	          username: 'myusername',
	          password: 'mypassword'
	        }
        }
      }
    }
  ```

2. If there is no **maven** section in the configuration, bower-maven-resolver can also do some simple lookup in your maven configuration.  It will look for a ~/.m2 directory, then a directory from M2\_HOME environment variable, then a directory from MAVEN\_HOME environment variable - in that order.

  If a directory is found and contains a settings.xml file, settings.xml will be scanned for a settings.mirrors.mirror element with 'url' matching the URL of the bower package (just the URL to the repository: no **maven3+** prefix should go in the settings.xml).  If one is found, then the settings.servers.server with the matching ID is located to extract username and password sub-elements.  See maven documentation for more information on how these should be configured.  See the unit tests for an example of a settings.xml file that will work.
