// src/config/db.ts
import mongoose from "mongoose";
import { ENV } from "./env";



export async function connectDB() {
  if (!ENV.MONGO_URI) {
    throw new Error("MONGO_URI is not set in environment variables.");
  }

  console.log("🔌 Connecting to MongoDB at:", ENV.MONGO_URI);

  try {
    await mongoose.connect(ENV.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}
