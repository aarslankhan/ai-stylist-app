// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || "4000",
  MONGO_URI: process.env.MONGO_URI || "",
  FIREBASE_SERVICE_ACCOUNT_PATH:
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "",
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || "",
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || "",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || "",
  S3_REGION: process.env.S3_REGION || "us-east-1",
};
