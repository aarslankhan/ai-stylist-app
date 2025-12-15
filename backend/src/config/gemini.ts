// src/config/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV, FMS_GEMINI_MODEL, FMS_GEMINI_API_KEY } from "./env";

// Global Gemini client (for outfit analysis / other features)
if (!ENV.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is not set. Global Gemini features may fail.");
}
const globalGenAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
export const geminiModel = globalGenAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
});

// 🔥 FMS-dedicated Gemini client
if (!FMS_GEMINI_API_KEY) {
  console.warn(
    "⚠️ FMS_GEMINI_API_KEY is not set. Find My Style Gemini analysis will fail."
  );
}
const fmsGenAI = new GoogleGenerativeAI(FMS_GEMINI_API_KEY);
export const fmsGeminiModel = fmsGenAI.getGenerativeModel({
  model: FMS_GEMINI_MODEL,
});
