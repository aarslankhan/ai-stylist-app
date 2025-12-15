// src/services/ai.bodyProfile.service.ts
import { ENV } from "../config/env";
import { openaiClient, fmsOpenAIModel } from "../config/openai";
import { fmsGeminiModel } from "../config/gemini";

export type GenderChoice = "male" | "female" | "unspecified";
export type AiProvider = "openai" | "gemini";

export interface GenerateStyleProfileInput {
  provider?: AiProvider; // optional override, default from ENV.FMS_PROVIDER
  userId: string;
  gender: GenderChoice;
  bodyTypeId: string;
  bodyTypeName?: string;
  heightCm?: number;
  heightDisplay: string;
  skinToneId: string;
  skinToneLabel?: string;
  imageBase64: string;
  mimeType: string;
}

export interface StyleProfileAIResult {
  gender: GenderChoice;
  bodyType: string;
  heightDisplay: string;
  heightCm?: number;
  skinToneCategory: string;
  undertone?: string;
  palette?: {
    name: string;
    colors: { hex: string; label: string }[];
  };
  dos: string[];
  donts: string[];
  bestSilhouettes: string[];
  trickyAreasTips: string[];
  version?: string;
}

// ---------------------
// Helper: robust JSON parse
// ---------------------
function safeJsonParse(text: string): any {
  try {
    if (!text) return {};
    return JSON.parse(text);
  } catch (e1) {
    try {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const trimmed = text.substring(start, end + 1);
        return JSON.parse(trimmed);
      }
    } catch (e2) {
      console.log("[FindMyStyle] safeJsonParse second attempt failed:", e2);
    }
    console.log("[FindMyStyle] safeJsonParse failed:", e1, "\nText was:", text);
    return {};
  }
}

// Detect rate-limit style errors
function isRateLimitError(err: any): boolean {
  const status =
    err?.status ??
    err?.response?.status ??
    err?.statusCode ??
    undefined;

  const msgRaw =
    err?.response?.data?.error?.message ??
    err?.error ??
    err?.message ??
    "";
  const msg = typeof msgRaw === "string" ? msgRaw : String(msgRaw);

  return (
    status === 429 ||
    /rate limit/i.test(msg) ||
    /TPM/i.test(msg) ||
    /RPM/i.test(msg)
  );
}

// ---------------------
// Core: generateStyleProfile
// ---------------------
export async function generateStyleProfile(
  input: GenerateStyleProfileInput
): Promise<StyleProfileAIResult> {
  const {
    provider,
    gender,
    bodyTypeId,
    bodyTypeName,
    heightCm,
    heightDisplay,
    skinToneId,
    skinToneLabel,
    imageBase64,
    mimeType,
  } = input;

  const genderLabel =
    gender === "male"
      ? "male"
      : gender === "female"
      ? "female"
      : "unspecified / not shared";

  const bodyTypeLabel = bodyTypeName || bodyTypeId;
  const skinLabel = skinToneLabel || skinToneId;

  const systemPrompt = `
You are a body-positive, kind, and practical fashion stylist.
You NEVER comment on attractiveness, weight, or size.
You ONLY talk about clothes, proportions, silhouettes, colors, and fit.
Your job is to create a reusable style blueprint (do's and don'ts) for this person.
Use clear, simple sentences. Avoid shaming or negative language.
`;

  const userPrompt = `
User overview:
- Gender: ${genderLabel}
- Self-chosen body type: ${bodyTypeLabel}
- Height (display): ${heightDisplay}
- Height (cm, if provided): ${heightCm ?? "not provided"}
- Skin tone: ${skinLabel}

Task:
Create a JSON object describing their personal style blueprint. Focus on:
1) bodyType: short human-readable name, based on their selection.
2) heightDisplay: copy from user or refine slightly if needed.
3) heightCm: number (use user input if available).
4) skinToneCategory: a short label like "Fair cool", "Medium warm", "Deep neutral".
5) undertone: one of "Cool", "Warm", "Neutral", "Olive" if you can tell, otherwise "Unknown".
6) palette: object with:
   - name: name of a palette like "Soft Autumn neutrals", "Cool winter basics".
   - colors: array of { hex, label } with 4–8 colors that suit them.
7) dos: array of 6–10 specific DO rules.
8) donts: array of 6–10 gentle DON'T rules, phrased kindly.
9) bestSilhouettes: 4–8 phrases about the silhouettes that flatter them.
10) trickyAreasTips: 3–6 tips for common tricky areas.
11) version: "v1.0"

Return STRICT JSON ONLY with the following shape:

{
  "gender": "male" | "female" | "unspecified",
  "bodyType": "string",
  "heightDisplay": "string",
  "heightCm": number | null,
  "skinToneCategory": "string",
  "undertone": "string",
  "palette": {
    "name": "string",
    "colors": [
      { "hex": "#RRGGBB", "label": "string" }
    ]
  },
  "dos": ["string"],
  "donts": ["string"],
  "bestSilhouettes": ["string"],
  "trickyAreasTips": ["string"],
  "version": "string"
}
`;

  // 🔥 Default FMS provider: GEMINI, with fallback to OpenAI on 429
  const baseProvider: AiProvider =
    provider ||
    (ENV.FMS_PROVIDER?.toLowerCase() === "openai" ? "openai" : "gemini");

  let text = "";

  if (baseProvider === "gemini") {
    try {
      text = await callGemini(systemPrompt, userPrompt, imageBase64, mimeType);
    } catch (err: any) {
      if (isRateLimitError(err)) {
        console.warn(
          "[FMS] Gemini rate-limited, falling back to OpenAI for style profile"
        );
        text = await callOpenAI(systemPrompt, userPrompt);
      } else {
        throw err;
      }
    }
  } else {
    // OpenAI as base, Gemini fallback
    try {
      text = await callOpenAI(systemPrompt, userPrompt);
    } catch (err: any) {
      if (isRateLimitError(err)) {
        console.warn(
          "[FMS] OpenAI rate-limited, falling back to Gemini for style profile"
        );
        text = await callGemini(systemPrompt, userPrompt, imageBase64, mimeType);
      } else {
        throw err;
      }
    }
  }

  const parsed = safeJsonParse(text) || {};

  const normalized: StyleProfileAIResult = {
    gender,
    bodyType: parsed.bodyType || bodyTypeLabel || "Balanced silhouette",
    heightDisplay: parsed.heightDisplay || heightDisplay,
    heightCm: typeof parsed.heightCm === "number" ? parsed.heightCm : heightCm,
    skinToneCategory: parsed.skinToneCategory || skinLabel || "Unknown",
    undertone: parsed.undertone || undefined,
    palette: parsed.palette || undefined,
    dos: Array.isArray(parsed.dos) ? parsed.dos : [],
    donts: Array.isArray(parsed.donts) ? parsed.donts : [],
    bestSilhouettes: Array.isArray(parsed.bestSilhouettes)
      ? parsed.bestSilhouettes
      : [],
    trickyAreasTips: Array.isArray(parsed.trickyAreasTips)
      ? parsed.trickyAreasTips
      : [],
    version: parsed.version || "v1.0",
  };

  return normalized;
}

// ---------------------
// Provider-specific calls
// ---------------------

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const raw = await openaiClient.chat.completions.create({
    model: fmsOpenAIModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0,
  });

  return raw.choices[0]?.message?.content ?? "";
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const safeMime =
    typeof mimeType === "string" && mimeType.startsWith("image/")
      ? mimeType
      : "image/jpeg";

  const result = await fmsGeminiModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt },
          { text: userPrompt },
          {
            inlineData: {
              mimeType: safeMime,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  return result.response.text() || "";
}
