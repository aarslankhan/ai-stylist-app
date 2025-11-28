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
