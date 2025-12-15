// src/services/ai.body.service.ts
import { openaiClient } from "../config/openai";
import type { AiProviderName, OutfitAnalysis } from "./aiProvider";

/**
 * Generate outfit analysis for a look image.
 * Currently uses OpenAI even if provider is "gemini" (safe fallback).
 * Accepts an imageUrl (S3 URL) and optional mimeType.
 */
export async function generateLookAnalysis(input: {
  provider: AiProviderName;
  client: any; // kept for compatibility, but not used
  imageUrl?: string;
  mimeType?: string;
  userId?: string;
}): Promise<OutfitAnalysis> {
  const { provider, imageUrl, mimeType, userId } = input;

  if (!imageUrl) {
    throw new Error("imageUrl is required for generateLookAnalysis");
  }

  const safeMime =
    typeof mimeType === "string" && mimeType.startsWith("image/")
      ? mimeType
      : "image/jpeg";

  console.log(
    `[AI] generateLookAnalysis provider=${provider} userId=${userId} mime=${safeMime}`
  );

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
    `- suggestionsShort[i] must be the short form of suggestions[i].`,
  ].join("\n");

  const completion = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
    max_tokens: 550,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw || typeof raw !== "string") {
    throw new Error("OpenAI response for look analysis was empty or non-string");
  }

  return normalizeAiJson(raw);
}

// ---------- shared normalizer (same shape as aiProvider.ts) ----------

function normalizeAiJson(raw: string): OutfitAnalysis {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse AI JSON (look analysis):", err, raw);
    throw new Error("Failed to parse AI response as JSON");
  }

  // tolerate old shapes (notes instead of analysis/suggestions) – kept for backward compatibility
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
