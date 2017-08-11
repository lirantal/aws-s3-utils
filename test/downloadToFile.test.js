'use strict'

const stream = require('stream')
const fs = require('fs')
const path = require('path')
const AWS = require('aws-sdk')
const awsS3Util = require('../index.js')

describe('Download To File', () => {
  it('should download the contents of an s3 object to a file in specified tmp directory', (done) => {
    const mockStr1 = 'hello 1'

    const spy = jest.spyOn(awsS3Util, 'validateBasicOptions')
    const origAWS = AWS.S3.prototype.getObject

    const AWSObjectMock = jest.fn().mockImplementation(() => {
      return {
        createReadStream: () => {
          const mockedStream = new stream.Readable()
          mockedStream._read = () => {}

          setTimeout(() => {
            mockedStream.emit('data', mockStr1)

            setTimeout(() => {
              mockedStream.emit('end', {})
            }, 200)
          }, 100)

          return mockedStream
        }
      }
    })

    AWS.S3.prototype.getObject = AWSObjectMock

    const params = new Map()
    params.set('config', {credentials: {accessKeyId: 'fake', secretAccessKey: 'key'}})
    params.set('object', {Bucket: 'somebucket', Key: 'filekey'})
    // params.set('download', { tempDirectory: '/tmp', destFile: 'fileout', destDirectory: '/temp/1' } )
    params.set('download', {tempDirectory: '/tmp'})

    awsS3Util.downloadToFile(params)
      // result is the path for the downloaded file
      .then(async (result) => {
        // confirm the directory we receive back is indeed in /tmp as we set
        expect(result.substring(0, 4)).toBe('/tmp')

        // confirm the contents of the file matches the mocked s3 object contents
        const fileContents = await readFileAsync(result)
        expect(fileContents.toString()).toEqual(mockStr1)

        expect(spy).toHaveBeenCalled()

        // restore stub to original object
        AWS.S3.prototype.getObject = origAWS

        AWSObjectMock.mockReset()
        AWSObjectMock.mockRestore()

        spy.mockReset()
        spy.mockRestore()

        done()
      })
  })

  it.only('should download the contents of an s3 object to a specified directory and filename', async (done) => {
    const mockStr1 = 'hello 1'

    // create a temporary directory to download files to
    await createTempDirectory('/tmp/1')

    const spy = jest.spyOn(awsS3Util, 'validateBasicOptions')
    const origAWS = AWS.S3.prototype.getObject

    const AWSObjectMock = jest.fn().mockImplementation(() => {
      return {
        createReadStream: () => {
          const mockedStream = new stream.Readable()
          mockedStream._read = () => {}

          setTimeout(() => {
            mockedStream.emit('data', mockStr1)

            setTimeout(() => {
              mockedStream.emit('end', {})
            }, 200)
          }, 100)

          return mockedStream
        }
      }
    })

    AWS.S3.prototype.getObject = AWSObjectMock

    const params = new Map()
    params.set('config', {credentials: {accessKeyId: 'fake', secretAccessKey: 'key'}})
    params.set('object', {Bucket: 'somebucket', Key: 'filekey'})
    params.set('download', {destFile: 'fileout', destDirectory: '/tmp/1'})

    awsS3Util.downloadToFile(params)
    // result is the path for the downloaded file
      .then(async (result) => {
        // confirm the directory we receive back is indeed in /tmp as we set
        expect(result.substring(0, 6)).toBe('/tmp/1')

        // confirm the contents of the file matches the mocked s3 object contents
        const fileContents = await readFileAsync(result)
        expect(fileContents.toString()).toEqual(mockStr1)

        expect(spy).toHaveBeenCalled()

        // restore stub to original object
        AWS.S3.prototype.getObject = origAWS

        AWSObjectMock.mockReset()
        AWSObjectMock.mockRestore()

        spy.mockReset()
        spy.mockRestore()

        await removeFile('/tmp/1/fileout')
        await removeDirectory('/tmp/1')

        done()
      })
  })

  it('should throw an exception when downloading to a file if directory isnt writable', (done) => {
    const mockStr1 = 'hello 1'

    const spy = jest.spyOn(awsS3Util, 'validateBasicOptions')
    const origAWS = AWS.S3.prototype.getObject

    const AWSObjectMock = jest.fn().mockImplementation(() => {
      return {
        createReadStream: () => {
          const mockedStream = new stream.Readable()
          mockedStream._read = () => {}

          setTimeout(() => {
            mockedStream.emit('data', mockStr1)

            setTimeout(() => {
              mockedStream.emit('end', {})
            }, 200)
          }, 100)

          return mockedStream
        }
      }
    })

    AWS.S3.prototype.getObject = AWSObjectMock

    const params = new Map()
    params.set('config', {credentials: {accessKeyId: 'fake', secretAccessKey: 'key'}})
    params.set('object', {Bucket: 'somebucket', Key: 'filekey'})
    params.set('download', {destFile: 'fileout', destDirectory: '/temp/non-existent-directory'})

    awsS3Util.downloadToFile(params)
    // result is the path for the downloaded file
      .then()
      .catch((error) => {
        expect(error.message.indexOf('no such file or directory')).not.toEqual(-1)
        expect(spy).toHaveBeenCalled()

        // restore stub to original object
        AWS.S3.prototype.getObject = origAWS

        AWSObjectMock.mockReset()
        AWSObjectMock.mockRestore()

        spy.mockReset()
        spy.mockRestore()

        done()
      })
  })

  it('should throw an exception when file download emits an error', (done) => {
    const mockStr1 = 'hello 1'
    const mockErrorStr = 'hello error str'

    const origAWS = AWS.S3.prototype.getObject

    const AWSObjectMock = jest.fn().mockImplementation(() => {
      return {
        createReadStream: () => {
          const mockedStream = new stream.Readable()
          mockedStream._read = () => {}

          setTimeout(() => {
            mockedStream.emit('data', mockStr1)

            setTimeout(() => {
              mockedStream.emit('error', mockErrorStr)
            }, 200)
          }, 100)

          return mockedStream
        }
      }
    })

    AWS.S3.prototype.getObject = AWSObjectMock

    const params = new Map()
    params.set('config', {credentials: {accessKeyId: 'fake', secretAccessKey: 'key'}})
    params.set('object', {Bucket: 'somebucket', Key: 'filekey'})
    params.set('download', {destFile: 'fileout', destDirectory: '/tmp'})

    awsS3Util.downloadToFile(params)
    // result is the path for the downloaded file
      .then()
      .catch((error) => {
        expect(error).toBe(mockErrorStr)

        // restore stub to original object
        AWS.S3.prototype.getObject = origAWS

        AWSObjectMock.mockReset()
        AWSObjectMock.mockRestore()

        done()
      })
  })

  it('should throw an exception when missing basic s3/aws configuration parameters', (done) => {
    const params = new Map()
    params.set('config', {credentials: {No: 'fake', Nono: 'key'}})
    params.set('object', {Bucket: 'somebucket', Key: 'filekey'})
    params.set('download', {destFile: 'fileout', destDirectory: '/temp/non-existent-directory'})

    awsS3Util.downloadToFile(params)
    // result is the path for the downloaded file
      .catch((error) => {
        expect(error.message.indexOf('missing aws credentials for secret or access key')).not.toEqual(-1)
        done()
      })
  })

  it('should throw an exception when file download to a temp directory fails creating the file there', (done) => {
    const mockStr1 = 'hello 1'
    const origAWS = AWS.S3.prototype.getObject

    const AWSObjectMock = jest.fn().mockImplementation(() => {
      return {
        createReadStream: () => {
          const mockedStream = new stream.Readable()
          mockedStream._read = () => {}

          setTimeout(() => {
            mockedStream.emit('data', mockStr1)

            setTimeout(() => {
              mockedStream.emit('end')
            }, 200)
          }, 100)

          return mockedStream
        }
      }
    })

    const temporaryDirectoryMock = jest.fn().mockImplementation(() => {
      return '/tteeeemmmmpppp'
    })

    const origAwsS3Util = awsS3Util.defaultTempDirectory
    awsS3Util.defaultTempDirectory = temporaryDirectoryMock

    AWS.S3.prototype.getObject = AWSObjectMock

    const params = new Map()
    params.set('config', {credentials: {accessKeyId: 'fake', secretAccessKey: 'key'}})
    params.set('object', {Bucket: 'somebucket', Key: 'filekey'})
    params.set('download', {destFile: 'fileout'})

    awsS3Util.downloadToFile(params)
    // result is the path for the downloaded file
      .then()
      .catch((error) => {
        expect(error.message.indexOf('no such file or directory')).not.toEqual(-1)

        // restore stub to original object
        AWS.S3.prototype.getObject = origAWS

        AWSObjectMock.mockReset()
        AWSObjectMock.mockRestore()

        awsS3Util.defaultTempDirectory = origAwsS3Util

        temporaryDirectoryMock.mockReset()
        temporaryDirectoryMock.mockRestore()

        done()
      })
  })
})

/**
 *
 * @param filepath
 * @returns {Promise}
 */
function readFileAsync (filepath) {
  // a pre node ver8 shim as we can't use promisify on older node versions
  return new Promise((resolve, reject) => {
    fs.readFile(filepath, (err, data) => {
      if (err) {
        return reject(err)
      }

      return resolve(data)
    })
  })
}

/**
 *
 * @param tempDirectory
 * @returns {Promise}
 */
function createTempDirectory (tempDirectory = '') {
  return new Promise((resolve, reject) => {
    fs.mkdir(`${String(tempDirectory)}${path.sep}`, (err, directory) => {
      if (err) {
        return reject(err)
      }

      return resolve(directory)
    })
  })
}

/**
 *
 * @param directoryName
 * @returns {Promise}
 */
function removeDirectory (directoryName = '') {
  return new Promise((resolve, reject) => {
    fs.rmdir(`${String(directoryName)}${path.sep}`, (err, directory) => {
      if (err) {
        return reject(err)
      }

      return resolve(directory)
    })
  })
}

/**
 *
 * @param directoryName
 * @returns {Promise}
 */
function removeFile (fileName = '') {
  return new Promise((resolve, reject) => {
    fs.unlink(`${String(fileName)}`, (err) => {
      if (err) {
        return reject(err)
      }

      return resolve()
    })
  })
}
