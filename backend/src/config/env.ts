// src/config/env.ts
import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  // Basic
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || "4000",

  // Database
  MONGO_URI: process.env.MONGO_URI || "",

  // Firebase / Auth / Admin (keep or extend as you already use)
  FIREBASE_SERVICE_ACCOUNT_PATH:
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "",

  // S3 / Storage
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || "",
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || "",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || "",
  S3_REGION: process.env.S3_REGION || "us-east-1",

  // Global AI (for outfit analysis, chatbot, etc.)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  AI_PROVIDER: (process.env.AI_PROVIDER || "gemini").toLowerCase(),

  // 🔥 Find My Style (FMS)-specific AI config
  // Provider: "openai" or "gemini"
  FMS_PROVIDER: (
    process.env.FMS_PROVIDER ||
    process.env.AI_PROVIDER ||
    "gemini"
  ).toLowerCase() as "openai" | "gemini",

  // Dedicated models for Find My Style
  FMS_OPENAI_MODEL:
    process.env.FMS_OPENAI_MODEL || "gpt-4.1-mini",
  FMS_GEMINI_MODEL:
    process.env.FMS_GEMINI_MODEL || "gemini-2.0-flash-001",

  // Dedicated Gemini key for Find My Style
  FMS_GEMINI_API_KEY: process.env.FMS_GEMINI_API_KEY || "",
};

// Convenience exports if you like
export const FMS_PROVIDER = ENV.FMS_PROVIDER;
export const FMS_OPENAI_MODEL = ENV.FMS_OPENAI_MODEL;
export const FMS_GEMINI_MODEL = ENV.FMS_GEMINI_MODEL;
export const FMS_GEMINI_API_KEY = ENV.FMS_GEMINI_API_KEY;
