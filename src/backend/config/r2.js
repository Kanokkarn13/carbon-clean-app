// src/backend/config/r2.js
require('dotenv').config();
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const {
  // Preferred R2-style keys
  ACCESS_KEY_ID,
  SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT,
  R2_PUBLIC_BASE_URL,
  R2_ACCOUNT_ID,
  // Legacy AWS-style keys kept for compatibility
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  S3_BUCKET,
  S3_BUCKET_NAME,
} = process.env;

const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';

// Normalize credentials/bucket across R2 + legacy S3-compatible naming
const accessKeyId = ACCESS_KEY_ID || AWS_ACCESS_KEY_ID || '';
const secretAccessKey = SECRET_ACCESS_KEY || AWS_SECRET_ACCESS_KEY || '';
const bucketName = R2_BUCKET || S3_BUCKET || S3_BUCKET_NAME || '';

// Prefer explicit R2 endpoint; fall back to AWS S3-compatible host-style URL
const endpoint =
  R2_ENDPOINT ||
  (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

// Base URL used for returning public-ish locations
const publicBaseUrl = (() => {
  if (R2_PUBLIC_BASE_URL) return R2_PUBLIC_BASE_URL.replace(/\/+$/, '');
  if (endpoint && bucketName) return `${endpoint.replace(/\/+$/, '')}/${bucketName}`;
  if (bucketName) return `https://${bucketName}.s3.${AWS_REGION}.amazonaws.com`;
  return '';
})();

if (!accessKeyId || !secretAccessKey || !bucketName) {
  console.warn('Storage env vars are missing. Uploads will fail without credentials and bucket.');
}

const r2 = new S3Client({
  region: AWS_REGION || 'auto', // R2 accepts "auto"
  endpoint,
  forcePathStyle: Boolean(endpoint), // R2 requires path-style requests
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Upload a buffer to R2 (S3-compatible) and return the object URL (public URL style).
 * If your bucket is private, you may still use the signed URL helper below.
 */
async function uploadToR2(buffer, key, contentType = 'application/octet-stream') {
  if (!bucketName) {
    throw new Error('Storage bucket is not configured (set R2_BUCKET)');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3.send(command);

  const base = publicBaseUrl || `https://${bucketName}.s3.${AWS_REGION}.amazonaws.com`;
  const location = `${base.replace(/\/+$/, '')}/${key}`;
  let signedUrl = null;
  try {
    signedUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
      { expiresIn: 60 * 60 * 24 * 7 }, // 7 days
    );
  } catch (err) {
    console.warn('Failed to generate signed URL, falling back to public location', err?.message || err);
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
    throw new Error('Storage bucket is not configured (set R2_BUCKET)');
  }
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return getSignedUrl(r2, command, { expiresIn: expiresSeconds });
}

module.exports = {
  r2,
  uploadToR2,
  getSignedUrlForKey,
  bucketName,
  publicBaseUrl,
};
