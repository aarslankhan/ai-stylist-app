// src/config/openai.ts
import OpenAI from "openai";
import { ENV, FMS_OPENAI_MODEL } from "./env";

if (!ENV.OPENAI_API_KEY) {
 
}

export const openaiClient = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});

// Global default model (for other features if you want)
export const defaultOpenAIModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";

// 🔥 Dedicated model for Find My Style
export const fmsOpenAIModel = FMS_OPENAI_MODEL;
