#Deploment Shell Script Sample

Since I am a Un*x person I made a temporary shell script for the deployment.  When I have more time I'll make a grunt task.  This script makes it where I don't have to remember all the parameters for the maven command, and it pulls relevant information already specified in package.json (especially version).  I created a file called mavenInfo.json which is a JSON object with 3 keys: groupId, repoUrl, and repoName (repoName is Repository ID for deployment, used if authentication is needed to find auth info from your settings.xml).

Note the reading of values from package.json and mavenInfo.json meets my needs, but is rudimentary and does not actually parse the JSON as JSON.  YMMV.

Here is what mavenInfo.json looks like.

```json
{
  "groupId": "com.mycompany.js",
  "repoUrl": "http://myreposerver.mycompany.com/artifacts/myrepo",
  "repoName" : "COMPANY-MIRROR"
}
```

I initially had the values from mavenInfo.json in package.json, but decided to move them out so as to not pollute that file with data not needed by package manager.

```sh
#!/bin/sh

PACKAGE_JSON=package.json
MAVEN_JSON=mavenInfo.json
DIST_FILE=dist.tar.gz

getJsonAttribute () {
  grep '["'\'']'$2'["'\'']' $1 | sed -E 's/.*\:[ \t]*"(.*)"[ \t]*,*[ \t]*/\1/'
}
checkValue() {
  if [ "" = $2 ] ; then
    echo could not get $1 from $PACKAGE_JSON
  fi
}

DESC=`getJsonAttribute $PACKAGE_JSON description`
ARTIFACT=`getJsonAttribute $PACKAGE_JSON name`
VERSION=`getJsonAttribute $PACKAGE_JSON version`
GROUP=`getJsonAttribute $MAVEN_JSON groupId`
REPOURL=`getJsonAttribute $MAVEN_JSON repoUrl`
REPONAME=`getJsonAttribute $MAVEN_JSON repoName`

checkValue description $DESC
checkValue 'name (will be artifact ID)' $ARTIFACT
checkValue groupId $GROUP
checkValue version $VERSION
checkValue repoUrl REPOURL
checkValue repName REPONAME

if [ \! -f $DIST_FILE ] ; then
  echo name your file $DIST_FILE in current directory
  exit 2
fi

OPTS="deploy:deploy-file -DgroupId=$GROUP -DartifactId=$ARTIFACT -Dversion=$VERSION -Dfile=$DIST_FILE -Durl=$REPOURL -DrepositoryId=$REPONAME -Dpackaging=tar.gz"
echo $OPTS
mvn $OPTS
```


So the instructions to use this would be

1. Create mavenInfo.json as specified above.

2. Make sure your package.json has name, version, and description parameters.

3. Create this shell script, for example call it ```deploy.sh```.

4. Now to deploy, you would create the file dist.tar.gz and run the deploy script.  If the version changes, just change the version in your package.json, rebuild dist file, and redeploy with the script.

