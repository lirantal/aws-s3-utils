'use strict'

const stream = require('stream')
const AWS = require('aws-sdk')
const awsS3Util = require('../index.js')

describe('Download To String', () => {
  it('should download the contents of an s3 object to a string', (done) => {
    const mockStr1 = 'hello 1'
    const mockStr2 = 'hello 2'

    const spy = jest.spyOn(awsS3Util, 'validateBasicOptions')
    const origAWS = AWS.S3.prototype.getObject

    const AWSObjectMock = jest.fn().mockImplementation(() => {
      return {
        createReadStream: () => {
          const mockedStream = new stream.Readable()
          mockedStream._read = () => {}

          setTimeout(() => {
            mockedStream.emit('data', mockStr1)
            mockedStream.emit('data', mockStr2)

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
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'somebucket', Key: 'filekey' })

    awsS3Util.downloadToString(params)
      .then((result) => {
        expect(result).toBe(mockStr1 + mockStr2)
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

  it('should throw an error if stream throws an error', (done) => {
    const mockErrorMsg = 'made up test error'

    const spy = jest.spyOn(awsS3Util, 'validateBasicOptions')
    const origAWS = AWS.S3.prototype.getObject

    const AWSObjectMock = jest.fn().mockImplementation(() => {
      return {
        createReadStream: () => {
          throw new Error(mockErrorMsg)
        }
      }
    })

    AWS.S3.prototype.getObject = AWSObjectMock

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'somebucket', Key: 'filekey' })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        expect(error.message).toBe(mockErrorMsg)
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

  it('should throw an error if stream emits an error', (done) => {
    const mockStr1 = 'hello 1'
    const mockStr2 = 'hello 2'
    const mockErrorStr = 'hello error str'

    const origAWS = AWS.S3.prototype.getObject
    const AWSObjectMock = jest.fn().mockImplementation(() => {
      return {
        createReadStream: () => {
          const mockedStream = new stream.Readable()
          mockedStream._read = () => {}

          setTimeout(() => {
            mockedStream.emit('data', mockStr1)
            mockedStream.emit('data', mockStr2)

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
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'somebucket', Key: 'filekey' })

    awsS3Util.downloadToString(params)
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

  it('should not download the s3 object if its bigger than a set limit', (done) => {
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
              mockedStream.emit('end', {})
            }, 200)
          }, 100)

          return mockedStream
        }
      }
    })

    AWS.S3.prototype.getObject = AWSObjectMock

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'somebucket', Key: 'filekey' })
    params.set('maxSize', 2)

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        expect(error.message).toBe('string size exceeded')

        // restore stub to original object
        AWS.S3.prototype.getObject = origAWS

        AWSObjectMock.mockReset()
        AWSObjectMock.mockRestore()

        done()
      })
  })

  it('should throw an error if params object is missing config key', (done) => {
    const params = new Map()
    params.set('something', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        expect(error.message).toBe('config is required with a credentials object')
        done()
      })
  })

  it('should throw an error if params object is missing accessKeyId credentials', (done) => {
    const params = new Map()
    params.set('config', { credentials: { secretAccessKey: 'key' } })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        expect(error.message).toBe('missing aws credentials for secret or access key')
        done()
      })
  })

  it('should throw an error if params object is missing secretAccessKey credentials', (done) => {
    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'access' } })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        expect(error.message).toBe('missing aws credentials for secret or access key')
        done()
      })
  })

  it('should throw an error if params object is missing actual object keys', (done) => {
    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', {})

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        expect(error.message).toBe('missing S3 object parameters with bucket and key')
        done()
      })
  })

  it('should throw an error if params object is missing object bucket key', (done) => {
    const spy = jest.spyOn(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Key: 'filekey' })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        expect(error.message).toBe('missing S3 object parameters with bucket and key')
        expect(spy).toHaveBeenCalled()

        spy.mockReset()
        spy.mockRestore()
        done()
      })
  })

  it('should throw an error if params object is missing object Key key', (done) => {
    const spy = jest.spyOn(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'bucket' })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        expect(error.message).toBe('missing S3 object parameters with bucket and key')
        expect(spy).toHaveBeenCalled()

        spy.mockReset()
        spy.mockRestore()
        done()
      })
  })

  it('should throw an error if params object is missing', (done) => {
    const spy = jest.spyOn(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        expect(error.message).toBe('missing S3 object parameters with bucket and key')
        expect(spy).toHaveBeenCalled()

        spy.mockReset()
        spy.mockRestore()
        done()
      })
  })

  it('should throw an error if params object is completely missing', (done) => {
    const spy = jest.spyOn(awsS3Util, 'validateBasicOptions')

    awsS3Util.downloadToString()
      .then()
      .catch((error) => {
        expect(error.message).toBe('config is required with a credentials object')
        expect(spy).toHaveBeenCalled()

        spy.mockReset()
        spy.mockRestore()
        done()
      })
  })

  it('should throw an error if params object is an empty object', (done) => {
    const spy = jest.spyOn(awsS3Util, 'validateBasicOptions')

    awsS3Util.downloadToString({})
      .then()
      .catch((error) => {
        expect(error.message).toBe('parameter must be a Map with config and object keys')
        expect(spy).toHaveBeenCalled()

        spy.mockReset()
        spy.mockRestore()
        done()
      })
  })
})
