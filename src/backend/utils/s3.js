// src/backend/utils/s3.js
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

let _s3 = null;

function normalizeEndpoint(ep) {
  if (!ep) return ep;
  return String(ep).replace(/\/+$/, ""); // ตัด / ท้าย
}

function getS3() {
  if (_s3) return _s3;

  const endpoint = normalizeEndpoint(process.env.R2_ENDPOINT || process.env.AWS_ENDPOINT);
  if (!endpoint) throw new Error("S3 endpoint is missing (set R2_ENDPOINT)");

  const isR2 = endpoint.includes("r2.cloudflarestorage.com");

  // ✅ ถ้าเป็น R2: บังคับ region = auto เสมอ
  const region = isR2 ? "auto" : (process.env.AWS_REGION || "us-east-1");

  // ✅ ถ้าเป็น R2: ใช้เฉพาะ R2 creds (กันไปหยิบ AWS_* ปน)
  const accessKeyId = isR2
    ? (process.env.R2_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID)
    : (process.env.AWS_ACCESS_KEY_ID);

  const secretAccessKey = isR2
    ? (process.env.R2_SECRET_ACCESS_KEY || process.env.ACCESS_KEY_SECRET)
    : (process.env.AWS_SECRET_ACCESS_KEY);

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      isR2
        ? "R2 credentials missing: set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY (or ACCESS_KEY_ID / ACCESS_KEY_SECRET)"
        : "AWS credentials missing: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    );
  }

  // ✅ ช่วยจับเคสมีช่องว่าง/ขึ้นบรรทัดใหม่
  if (accessKeyId.trim() !== accessKeyId || secretAccessKey.trim() !== secretAccessKey) {
    throw new Error("S3 credentials contain leading/trailing whitespace. Please re-paste them in Render.");
  }

  _s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  // log แบบไม่โชว์ secret
  console.log("[s3] init", {
    isR2,
    region,
    endpoint,
    accessKeyIdPrefix: accessKeyId.slice(0, 6) + "***",
  });

  return _s3;
}

async function uploadBufferToS3({ buffer, contentType, key, cacheControl }) {
  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3 bucket is missing (set R2_BUCKET or S3_BUCKET)");

  const s3 = getS3();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key, // ห้ามมี / นำหน้า
    Body: buffer,
    ContentType: contentType || "application/octet-stream",
    CacheControl: cacheControl || "public, max-age=31536000",
  });

  await s3.send(cmd);

  const endpoint = normalizeEndpoint(process.env.R2_ENDPOINT || process.env.AWS_ENDPOINT);
  const url = endpoint
    ? `${endpoint}/${bucket}/${key}`
    : `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { key, url };
}

async function getSignedGetObjectUrl(key, expiresIn = 3600) {
  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3 bucket is missing (set R2_BUCKET or S3_BUCKET)");
  const s3 = getS3();

  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return await getSignedUrl(s3, cmd, { expiresIn });
}

module.exports = { getS3, uploadBufferToS3, getSignedGetObjectUrl };
