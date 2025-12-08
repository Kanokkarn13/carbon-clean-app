const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

let _s3 = null;
function getS3() {
  if (_s3) return _s3;

  // R2 is S3-compatible; accept either R2_* or AWS_* style env vars
  const region = process.env.R2_REGION || process.env.AWS_REGION || "auto";
  const endpoint = process.env.R2_ENDPOINT || process.env.AWS_ENDPOINT;
  const accessKeyId = process.env.ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.ACCESS_KEY_SECRET || process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) throw new Error("S3 credentials are missing (ACCESS_KEY_ID / ACCESS_KEY_SECRET)");
  if (!endpoint) throw new Error("S3 endpoint is missing (set R2_ENDPOINT)");

  _s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle: true, // R2 prefers path-style
    credentials: { accessKeyId, secretAccessKey },
  });
  return _s3;
}

/**
 * Upload buffer to S3 (no ACL)
 * @param {{buffer: Buffer, contentType?: string, key: string, cacheControl?: string}} params
 * @returns {{ key: string, url: string }} url เป็น path แบบ s3-url มาตรฐาน (อาจจะใช้ไม่ได้ถ้าบัคเก็ต private)
 */
async function uploadBufferToS3({ buffer, contentType, key, cacheControl }) {
  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3 bucket is missing (set R2_BUCKET or S3_BUCKET)");

  const s3 = getS3();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType || "application/octet-stream",
    // ❌ ห้ามใส่ ACL เพราะบัคเก็ตบังคับ owner-enforced
    CacheControl: cacheControl || "public, max-age=31536000",
  });

  await s3.send(cmd);

  const endpoint = process.env.R2_ENDPOINT || process.env.AWS_ENDPOINT;
  const url = endpoint ? `${endpoint.replace(/\/$/, "")}/${bucket}/${key}` : `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return { key, url };
}

/**
 * Create a signed GET URL for private object
 * @param {string} key
 * @param {number} expiresIn seconds (default 3600)
 */
async function getSignedGetObjectUrl(key, expiresIn = 3600) {
  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3 bucket is missing (set R2_BUCKET or S3_BUCKET)");
  const s3 = getS3();

  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return url;
}

module.exports = { getS3, uploadBufferToS3, getSignedGetObjectUrl };
