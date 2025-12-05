// src/services/aiProvider.ts
import { ENV } from "../config/env";
import { openaiClient } from "../config/openai";
import { geminiModel } from "../config/gemini";

export type AiProviderName = "openai" | "gemini";

export type OutfitAnalysis = {
  score: number;        // 0–10 float
  vibe: string;         // short headline
  analysis: string[];   // what the stylist sees
  suggestions: string[];// what to improve / try
  tags: string[];       // style tags
  analysisShort: string[];     // short bullets for share card
  suggestionsShort: string[];  // short bullets for share card
};

const normalizeProvider = (raw: string | undefined): AiProviderName => {
  const lower = (raw || "").toLowerCase();
  if (lower === "gemini") return "gemini";
  return "openai";
};

const ACTIVE_PROVIDER: AiProviderName = normalizeProvider(ENV.AI_PROVIDER);

console.log(
  `🤖 AI provider selected: ${ACTIVE_PROVIDER.toUpperCase()} (set AI_PROVIDER=openai|gemini in .env)`
);

export const getActiveAiProvider = (): AiProviderName => ACTIVE_PROVIDER;

export async function analyzeOutfit(
  imageBase64: string,
  mimeType: string
): Promise<OutfitAnalysis> {
  if (!imageBase64) {
    throw new Error("imageBase64 is required");
  }

  if (ACTIVE_PROVIDER === "gemini") {
    return analyzeWithGemini(imageBase64, mimeType);
  } else {
    return analyzeWithOpenAI(imageBase64, mimeType);
  }
}

// ========== OPENAI ==========

async function analyzeWithOpenAI(
  imageBase64: string,
  mimeType: string
): Promise<OutfitAnalysis> {
  const safeMime =
    typeof mimeType === "string" && mimeType.startsWith("image/")
      ? mimeType
      : "image/jpeg";

  const dataUrl = `data:${safeMime};base64,${imageBase64}`;

  const completion = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `You are "AURA", a high-end personal stylist: confident, sharp, honest, witty, aesthetic, and detail-obsessed.`,
              `You analyze ONE person's outfit in the uploaded image only.`,

              `Your task:`,
              `- Identify the overall aesthetic.`,
              `- Use real fashion theory: color, silhouette, proportions, texture, layering, formality.`,
              `- Highlight strengths clearly.`,
              `- Call out mistakes directly but constructively.`,
              `- Give specific, practical improvement steps.`,

              `Fit philosophy:`,
              `- Do NOT assume tight or tailored = better; oversized/relaxed/boxy can be intentional and stylish.`,
              `- First classify intended fit: tailored / regular / relaxed / oversized.`,
              `- Judge proportions and balance within that intention.`,
              `- Criticize fit only if proportions break or clash with the intended style.`,
              `- If colors clash with visible skin tone, you may lower the score and mention it.`,
              `- Do NOT assume anything about body or outfit parts that are not visible.`,
              `- Respect different cultures and outfit traditions; do not guess randomly just to fill output.`,

              `Scoring (score is a 0–10 float):`,
              `- 9–10: editorial, intentional, extremely polished.`,
              `- 7–8.9: stylish everyday outfit.`,
              `- 5–6.9: decent but needs polish.`,
              `- <5: weak coherence or strong styling issues.`,

              `Output JSON:`,
              `Return ONLY a JSON object with EXACTLY these keys:`,
              `- score: number        // 0–10 float.`,
              `- vibe: string         // 5–12 word aesthetic line.`,
              `- analysis: string[]   // 3–5 detailed bullets on silhouette, proportions, fit intention, colors, textures, accessories/grooming if visible, and what works.`,
              `- suggestions: string[] // 3–5 detailed, practical tweaks: at least 1 color-based and 1 silhouette/fit-based (respecting intended style), plus swaps/add/remove items; if nothing obvious, you may replace one bullet with a sincere compliment.`,
              `- tags: string[]       // 3–6 short style tags (e.g. "Streetwear", "Oversized", "Smart casual", "Minimalist").`,
              `- analysisShort: string[]   // For EACH item in analysis, a SHORT version (max 8 words), same order, punchy, IG-ready, no numbering, no quotes.`,
              `- suggestionsShort: string[] // For EACH item in suggestions, a SHORT version (max 8 words), same order, punchy, IG-ready, no numbering, no quotes.`,

              `Output rules:`,
              `- Return VALID JSON ONLY.`,
              `- NO extra keys.`,
              `- NO markdown, NO commentary around the JSON.`,
              `- Describe ONLY what is actually visible in the outfit.`,
              `- analysisShort[i] must be the short form of analysis[i].`,
              `- suggestionsShort[i] must be the short form of suggestions[i].`

            ].join("\n"),
          },
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
            },
          },
        ],
      },
    ],
    max_tokens: 550,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw || typeof raw !== "string") {
    throw new Error("OpenAI response was empty or non-string");
  }

  return normalizeAiJson(raw);
}

// ========== GEMINI ==========

async function analyzeWithGemini(
  imageBase64: string,
  mimeType: string
): Promise<OutfitAnalysis> {
  const safeMime =
    typeof mimeType === "string" && mimeType.startsWith("image/")
      ? mimeType
      : "image/jpeg";

  const prompt = [
    `You are "AURA", a high-end personal stylist: confident, sharp, honest, witty, aesthetic, and detail-obsessed.`,
    `You analyze ONE person's outfit in the uploaded image only.`,

    `Your task:`,
    `- Identify the overall aesthetic.`,
    `- Use real fashion theory: color, silhouette, proportions, texture, layering, formality.`,
    `- Highlight strengths clearly.`,
    `- Call out mistakes directly but constructively.`,
    `- Give specific, practical improvement steps.`,

    `Fit philosophy:`,
    `- Do NOT assume tight or tailored = better; oversized/relaxed/boxy can be intentional and stylish.`,
    `- First classify intended fit: tailored / regular / relaxed / oversized.`,
    `- Judge proportions and balance within that intention.`,
    `- Criticize fit only if proportions break or clash with the intended style.`,
    `- If colors clash with visible skin tone, you may lower the score and mention it.`,
    `- Do NOT assume anything about body or outfit parts that are not visible.`,
    `- Respect different cultures and outfit traditions; do not guess randomly just to fill output.`,

    `Scoring (score is a 0–10 float):`,
    `- 9–10: editorial, intentional, extremely polished.`,
    `- 7–8.9: stylish everyday outfit.`,
    `- 5–6.9: decent but needs polish.`,
    `- <5: weak coherence or strong styling issues.`,

    `Output JSON:`,
    `Return ONLY a JSON object with EXACTLY these keys:`,
    `- score: number        // 0–10 float.`,
    `- vibe: string         // 5–12 word aesthetic line.`,
    `- analysis: string[]   // 3–5 detailed bullets on silhouette, proportions, fit intention, colors, textures, accessories/grooming if visible, and what works.`,
    `- suggestions: string[] // 3–5 detailed, practical tweaks: at least 1 color-based and 1 silhouette/fit-based (respecting intended style), plus swaps/add/remove items; if nothing obvious, you may replace one bullet with a sincere compliment.`,
    `- tags: string[]       // 3–6 short style tags (e.g. "Streetwear", "Oversized", "Smart casual", "Minimalist").`,
    `- analysisShort: string[]   // For EACH item in analysis, a SHORT version (max 8 words), same order, punchy, IG-ready, no numbering, no quotes.`,
    `- suggestionsShort: string[] // For EACH item in suggestions, a SHORT version (max 8 words), same order, punchy, IG-ready, no numbering, no quotes.`,

    `Output rules:`,
    `- Return VALID JSON ONLY.`,
    `- NO extra keys.`,
    `- NO markdown, NO commentary around the JSON.`,
    `- Describe ONLY what is actually visible in the outfit.`,
    `- analysisShort[i] must be the short form of analysis[i].`,
    `- suggestionsShort[i] must be the short form of suggestions[i].`

  ].join("\n");

  const result = await geminiModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
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

  const raw = result.response.text();
  if (!raw || typeof raw !== "string") {
    throw new Error("Gemini response was empty or non-string");
  }

  return normalizeAiJson(raw);
}

// ========== SHARED NORMALIZER ==========

function normalizeAiJson(raw: string): OutfitAnalysis {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse AI JSON:", err, raw);
    throw new Error("Failed to parse AI response as JSON");
  }

  // tolerate old shapes (notes instead of analysis/suggestions)
  const analysisFromOld =
    Array.isArray(parsed.analysis) && parsed.analysis.length > 0
      ? parsed.analysis
      : Array.isArray(parsed.notes)
        ? parsed.notes
        : [];

  const suggestionsFromOld =
    Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
      ? parsed.suggestions
      : [];


  const tags: string[] = Array.isArray(parsed.tags)
    ? parsed.tags.map(String).slice(0, 8)
    : ["Everyday", "Casual"];

  const toShort = (line: string, maxWords = 8): string =>
  line.split(/\s+/).slice(0, maxWords).join(" ");

const analysis: string[] = Array.isArray(parsed.analysis)
  ? parsed.analysis.map(String)
  : [];

const suggestions: string[] = Array.isArray(parsed.suggestions)
  ? parsed.suggestions.map(String)
  : [];

const analysisShort: string[] = Array.isArray(parsed.analysisShort)
  ? parsed.analysisShort.map(String)
  : analysis.map((line) => toShort(line));

const suggestionsShort: string[] = Array.isArray(parsed.suggestionsShort)
  ? parsed.suggestionsShort.map(String)
  : suggestions.map((line) => toShort(line));

const normalized: OutfitAnalysis = {
  score:
    typeof parsed.score === "number"
      ? parsed.score
      : Number(parsed.score ?? 1) || 1,
  vibe: typeof parsed.vibe === "string" ? parsed.vibe : "Styled outfit",
  analysis: analysis.slice(0, 6),
  suggestions: suggestions.slice(0, 6),
  tags,
  analysisShort: analysisShort.slice(0, 6),
  suggestionsShort: suggestionsShort.slice(0, 6),
};

return normalized;

}
