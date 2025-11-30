// src/config/s3.ts
import AWS from "aws-sdk";
import { ENV } from "./env";

if (!ENV.S3_ACCESS_KEY_ID || !ENV.S3_SECRET_ACCESS_KEY || !ENV.S3_BUCKET_NAME) {
  console.warn("⚠️ S3 is not fully configured. Uploads will fail.");
}

AWS.config.update({
  accessKeyId: ENV.S3_ACCESS_KEY_ID,
  secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
  region: ENV.S3_REGION,
});

export const s3 = new AWS.S3();

export async function uploadBufferToS3(params: {
  buffer: Buffer;
  mimeType: string;
  key: string;
}): Promise<string> {
  const { buffer, mimeType, key } = params;

  const res = await s3
    .upload({
      Bucket: ENV.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
    .promise();

  return res.Location; // public HTTPS URL
}
export function getPublicS3UrlForKey(key: string): string {
  // standard virtual-hosted–style URL
  return `https://${ENV.S3_BUCKET_NAME}.s3.${ENV.S3_REGION}.amazonaws.com/${key}`;
}

export async function getPresignedUploadUrl(params: {
  key: string;
  mimeType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { key, mimeType, expiresInSeconds = 60 } = params;

  return await new Promise((resolve, reject) => {
    s3.getSignedUrl(
      "putObject",
      {
        Bucket: ENV.S3_BUCKET_NAME,
        Key: key,
        ContentType: mimeType,
        Expires: expiresInSeconds,
      },
      (err, url) => {
        if (err || !url) return reject(err || new Error("No URL from S3"));
        resolve(url);
      }
    );
  });
}
