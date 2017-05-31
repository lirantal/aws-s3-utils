'use strict'

const fs = require('fs')
const path = require('path')
const AWS = require('aws-sdk')

class awsS3Util {
  /**
   * validate configuration options passed to class methods
   * @param   {Map} options - configuration options
   * @returns {Boolean|Error}
   */
  static validateBasicOptions (options) {
    if (options instanceof Map === false) {
      return new Error('parameter must be a Map with config and object keys')
    }

    const config = options.get('config')

    if (!config || !config.credentials) {
      return new Error('config is required with a credentials object')
    }

    if (!config.credentials.secretAccessKey || !config.credentials.accessKeyId) {
      return new Error('missing aws credentials for secret or access key')
    }

    const object = options.get('object')
    if (object === undefined || !object.Bucket || !object.Key) {
      return new Error('missing S3 object parameters with bucket and key')
    }

    return true
  }

  /**
   * create an instance of AWS service
   * @param   {Map} config - configuration to instantiate the service
   * @returns {AWS.S3} an instance of AWS.S3 from aws-sdk
   */
  static initAWS (config = new Map()) {
    return new AWS.S3(config.get('config'))
  }

  /**
   * downloads the content of an s3 object into a string
   * @param   {Map} options - configuration parameters for AWS service
   * @returns {Promise}
   */
  static downloadToString (options = new Map()) {
    let error = this.validateBasicOptions(options)
    if (error !== true) {
      return Promise.reject(error)
    }

    return new Promise((resolve, reject) => {
      let s3
      let s3Metadata = ''
      let fileStream = {}

      s3 = this.initAWS(options)

      const s3Params = options.get('object')

      fileStream = s3.getObject(s3Params).createReadStream()

      const maxSize = options.get('maxSize')
      const maxSizeEncoding = options.get('maxSizeEncoding')

      fileStream.on('data', data => {
        s3Metadata += data.toString()

        if (maxSize && Buffer.byteLength(s3Metadata, maxSizeEncoding || 'utf-8') >= +maxSize) {
          return reject(new Error('string size exceeded'))
        }
      })

      fileStream.on('end', () => {
        return resolve(s3Metadata)
      })

      fileStream.on('error', (error) => {
        return reject(error)
      })
    })
  }
}

module.exports = awsS3Util
