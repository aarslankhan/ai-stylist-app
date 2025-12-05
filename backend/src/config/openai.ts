// src/config/openai.ts
import OpenAI from "openai";
import { ENV } from "./env";

if (!ENV.OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY is not set. OpenAI analysis will fail.");
}

export const openaiClient = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});
