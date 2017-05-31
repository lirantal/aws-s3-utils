'use strict'

const sinon = require('sinon')
const awsS3Util = require('../index.js')

describe('Download To String - AWS Exceptions', () => {
  it('should throw an error if AWS wasnt able to instantiate successfully', (done) => {
    const validateOptionsSpy = sinon.spy(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: {obj: 'a'}, secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'somebucket', Key: 'filekey' })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        // assert validateOptions method was called
        sinon.assert.called(validateOptionsSpy)

        // console.log(error)
        expect(error.message).toBe(`Authorization header is invalid -- one and only one ' ' (space) required`)

        validateOptionsSpy.restore()
        done()
      })
  })
})
