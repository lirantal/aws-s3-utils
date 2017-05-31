'use strict'

const fs = require('fs')
const stream = require('stream')
const sinon = require('sinon')
const AWS = require('aws-sdk')
const awsS3Util = require('../index.js')

const test = global.test
const expect = global.expect

describe('Download To String', () => {

  it('should download the contents of an s3 object to a string', (done) => {
    const mockStr1 = 'hello 1'
    const mockStr2 = 'hello 2'
    const myStub = sinon.stub()
    myStub.returns({
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
    })
    let getObjectOrig = AWS.S3.prototype.getObject
    AWS.S3.prototype.getObject = myStub

    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'somebucket', Key: 'filekey' })

    awsS3Util.downloadToString(params)
      .then((result) => {
        expect(result).toBe(mockStr1 + mockStr2)

        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        // restore stub to original object
        AWS.S3.prototype.getObject = getObjectOrig
        validateOptionsSpy.restore()

        done()
      })
  })

  it('should throw an error if stream throws an error', (done) => {
    const mockErrorMsg = 'made up test error'
    const myStub = sinon.stub()
    myStub.returns({
      createReadStream: () => {
        throw new Error(mockErrorMsg)
      }
    })
    let getObjectOrig = AWS.S3.prototype.getObject
    AWS.S3.prototype.getObject = myStub

    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'somebucket', Key: 'filekey' })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        // restore stub to original object
        AWS.S3.prototype.getObject = getObjectOrig
        validateOptionsSpy.restore()

        expect(error.message).toBe(mockErrorMsg)
        done()
      })
  })

  it('should throw an error if stream emits an error', (done) => {
    const mockStr1 = 'hello 1'
    const mockStr2 = 'hello 2'
    const mockErrorStr = 'hello error str'
    const myStub = sinon.stub()
    myStub.returns({
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
    })
    let getObjectOrig = AWS.S3.prototype.getObject
    AWS.S3.prototype.getObject = myStub

    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'somebucket', Key: 'filekey' })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        // restore stub to original object
        AWS.S3.prototype.getObject = getObjectOrig
        validateOptionsSpy.restore()

        expect(error).toBe(mockErrorStr)
        done()
      })
  })

  it('should not download the s3 object if its bigger than a set limit', (done) => {
    const mockStr1 = 'hello 1'
    const myStub = sinon.stub()
    myStub.returns({
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
    })
    let getObjectOrig = AWS.S3.prototype.getObject
    AWS.S3.prototype.getObject = myStub

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'somebucket', Key: 'filekey' })
    params.set('maxSize', 2)

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        // restore stub to original object
        AWS.S3.prototype.getObject = getObjectOrig

        expect(error.message).toBe('string size exceeded')
        done()
      })
  })

  it('should throw an error if params object is missing config key', (done) => {
    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('something', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        expect(error.message).toBe('config is required with a credentials object')

        validateOptionsSpy.restore()
        done()
      })
  })

  it('should throw an error if params object is missing accessKeyId credentials', (done) => {
    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { secretAccessKey: 'key' } })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        expect(error.message).toBe('missing aws credentials for secret or access key')

        validateOptionsSpy.restore()
        done()
      })
  })

  it('should throw an error if params object is missing secretAccessKey credentials', (done) => {
    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'access' } })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        expect(error.message).toBe('missing aws credentials for secret or access key')

        validateOptionsSpy.restore()
        done()
      })
  })

  it('should throw an error if params object is missing actual object keys', (done) => {
    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', {})

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        expect(error.message).toBe('missing S3 object parameters with bucket and key')

        validateOptionsSpy.restore()
        done()
      })
  })

  it('should throw an error if params object is missing object bucket key', (done) => {
    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Key: 'filekey' })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        expect(error.message).toBe('missing S3 object parameters with bucket and key')

        validateOptionsSpy.restore()
        done()
      })
  })

  it('should throw an error if params object is missing object Key key', (done) => {
    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'bucket' })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        expect(error.message).toBe('missing S3 object parameters with bucket and key')

        validateOptionsSpy.restore()
        done()
      })
  })

  it('should throw an error if params object is missing', (done) => {
    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: 'fake', secretAccessKey: 'key' } })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        expect(error.message).toBe('missing S3 object parameters with bucket and key')

        validateOptionsSpy.restore()
        done()
      })
  })

  it('should throw an error if params object is completely missing', (done) => {
    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    awsS3Util.downloadToString()
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        expect(error.message).toBe('config is required with a credentials object')

        validateOptionsSpy.restore()
        done()
      })
  })

  it('should throw an error if params object is an empty object', (done) => {
    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    awsS3Util.downloadToString({})
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        expect(error.message).toBe('parameter must be a Map with config and object keys')

        validateOptionsSpy.restore()
        done()
      })
  })
})
