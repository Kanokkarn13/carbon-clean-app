// src/backend/config/s3.js
require('dotenv').config();
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

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

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID || '',
    secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Upload a buffer to S3 and return the object URL (public URL style).
 * If your bucket is private, you may still use the signed URL helper below.
 */
async function uploadToS3(buffer, key, contentType = 'application/octet-stream') {
  if (!bucketName) {
    throw new Error('S3 bucket is not configured (missing S3_BUCKET/S3_BUCKET_NAME)');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3.send(command);

  const location = `https://${bucketName}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  let signedUrl = null;
  try {
    signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
      { expiresIn: 60 * 60 * 24 * 7 }, // 7 days
    );
  } catch (err) {
    console.warn('⚠️ Failed to generate signed URL, falling back to public location', err?.message || err);
  }
  return { location, key, url: signedUrl || location };
}

/**
 * Generate a signed URL to GET an object.
 * @param {string} key
 * @param {number} expiresSeconds
 * @returns {Promise<string>}
 */
async function getSignedUrlForKey(key, expiresSeconds = 60 * 60 * 24 * 7) {
  if (!bucketName) {
    throw new Error('S3 bucket is not configured (missing S3_BUCKET/S3_BUCKET_NAME)');
  }
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresSeconds });
}

module.exports = {
  s3,
  uploadToS3,
  getSignedUrlForKey,
};
