'use strict'

const awsS3Util = require('../index.js')

describe('Download To String - AWS Exceptions', () => {
  it('should throw an error if AWS wasnt able to instantiate successfully', (done) => {
    const spy = jest.spyOn(awsS3Util, 'validateBasicOptions')

    const params = new Map()
    params.set('config', { credentials: { accessKeyId: {obj: 'a'}, secretAccessKey: 'key' } })
    params.set('object', { Bucket: 'somebucket', Key: 'filekey' })

    awsS3Util.downloadToString(params)
      .then()
      .catch((error) => {
        expect(error.message).toBe(`Authorization header is invalid -- one and only one ' ' (space) required`)
        expect(spy).toHaveBeenCalled()

        spy.mockReset()
        spy.mockRestore()
        done()
      })
  })
})
