# aws-s3-utils

Node.js library providing high-level promise-based wrapper for convenient AWS S3 capabilities such as downloading an S3 object as a string or directly to a file. 

## Installation

```bash
yarn add aws-s3-utils
```

## Usage

### Download to String

Downloading an S3 object to a string is implementing streams behind the scenes, and works as simple as defining a Map for the options and invoking the `downloadToString` promise:

```js
const awsS3Util = require('aws-s3-utils')

const params = new Map()
params.set('config', { credentials: { accessKeyId: 'id', secretAccessKey: 'key' } })
params.set('object', { Bucket: 'somebucket', Key: 'filename' })

awsS3Util.downloadToString(params)
  .then((s3Contents) => {
  	console.log(`downloaded s3 object content is: ${s3Contents}`)
  })
```

You can also pass a key that sets a character byte limit on the length of the string:

```js
params.set('maxSize', 2)
```

### Download to File

Downloading an S3 object to a file is also implemented using streams and works by invoking the `downloadToFile` promise.

The `downloadToFile` supports the following `download` settings on the provided Map options:
* If `tempDirectory` is specified then the library will create a unique temporary directory inside the `tempDirectory` directory and download the file there.
* If `destFile` is specified then the downloaded file wil be named using this filename. 
* If `destDirectory` is specified then the downloaded file will be placed directly inside this directory without creating any upper level unique directory. If both this option and `tempDirectory` are specified then this option takes precedence.

```js
const awsS3Util = require('aws-s3-utils')

const params = new Map()
params.set('config', { credentials: { accessKeyId: 'id', secretAccessKey: 'key' } })
params.set('object', { Bucket: 'somebucket', Key: 'filename' })
params.set('download', { tempDirectory: '/tmp' })

awsS3Util.downloadToFile(params)
  .then((filepath) => {
  	console.log(`downloaded s3 object content is: ${s3Contents}`)
  })
```

## Tests

Project tests:

```bash
yarn test
```

Project linting:

```bash
yarn lint
yarn lint:fix
```

## View Coverage

```bash
yarn coverage:view
```

