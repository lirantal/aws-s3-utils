'use strict'

const stream = require('stream')
const fs = require('fs')
const AWS = require('aws-sdk')
const awsS3Util = require('../index.js')

describe('Download To File', () => {
  it('should download the contents of an s3 object to a file', (done) => {
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
    params.set('download', { tempDirectory: '/tmp' } )

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
