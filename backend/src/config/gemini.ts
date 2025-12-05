// src/config/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "./env";

if (!ENV.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is not set. Gemini analysis will fail.");
}

const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);

// Model that supports images + JSON mode.
// You can swap to another model later if you prefer.
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-001",
});
