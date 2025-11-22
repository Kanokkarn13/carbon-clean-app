// src/backend/config/s3.js
require('dotenv').config();
const AWS = require('aws-sdk');

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION = 'ap-southeast-2',
  S3_BUCKET,
  S3_BUCKET_NAME,
} = process.env;

const bucketName = S3_BUCKET || S3_BUCKET_NAME;

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !bucketName) {
  console.warn('⚠️  AWS S3 env vars are missing. Upload will fail without credentials.');
}

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

const s3 = new AWS.S3();

/**
 * Upload a buffer to S3 and return the public URL.
 */
async function uploadToS3(buffer, key, contentType = 'application/octet-stream') {
  if (!bucketName) {
    throw new Error('S3 bucket is not configured (missing S3_BUCKET)');
  }

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  };

  const result = await s3.upload(params).promise();
  return result.Location;
}

module.exports = {
  uploadToS3,
};
