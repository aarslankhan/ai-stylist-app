// src/services/todaysOutfit.service.ts
import { openaiClient, defaultOpenAIModel } from "../config/openai";
import { geminiModel } from "../config/gemini";
import { getActiveAiProvider } from "./aiProvider";
import type { AiProviderName } from "./aiProvider";

export interface TodaysOutfitPayload {
  occasionId: string;
  occasionLabel?: string;
  tops: string[]; // S3 URLs of tops
  bottoms: string[]; // S3 URLs of bottoms
  footwear: string[]; // S3 URLs of shoes
  accessories?: string[]; // optional S3 URLs of accessories
  styleProfileOverride?: {
    bodyType?: string;
    heightDisplay?: string;
    skinToneCategory?: string;
    undertone?: string;
    dos?: string[];
    donts?: string[];
    bestSilhouettes?: string[];
    trickyAreasTips?: string[];
  };
}

export interface TodaysOutfitResult {
  chosenOutfit: {
    top: string; // image URL
    topLabel: string;
    bottom: string; // image URL
    bottomLabel: string;
    footwear: string; // image URL
    footwearLabel: string;
    accessories?: string[]; // text descriptions
    accessoryImages?: string[];
  };
  explanation: string;
  tips: string[];
  alternate?: {
    highlights: string[];
  };
}

/**
 * Build the text instructions for the model.
 * We give labels and context so model can reason about the items.
 */
function buildTextPrompt(payload: TodaysOutfitPayload): string {
  const {
    occasionId,
    occasionLabel,
    tops,
    bottoms,
    footwear,
    accessories,
    styleProfileOverride,
  } = payload;

  const occasionLabelSafe =
    occasionLabel ||
    (occasionId === "date-night"
      ? "a date night"
      : occasionId === "wedding"
      ? "a wedding or formal event"
      : occasionId === "office"
      ? "a day at the office"
      : occasionId === "casual"
      ? "a casual day out"
      : "today's plans");

  const styleLines: string[] = [];

  if (styleProfileOverride) {
    const {
      bodyType,
      heightDisplay,
      skinToneCategory,
      undertone,
      dos,
      donts,
      bestSilhouettes,
      trickyAreasTips,
    } = styleProfileOverride;

    styleLines.push("STYLE PROFILE SNAPSHOT (use this as high-level guidance):");

    if (bodyType) {
      styleLines.push(`- Body type: ${bodyType}.`);
    }
    if (heightDisplay) {
      styleLines.push(`- Height context: ${heightDisplay}.`);
    }

    if (skinToneCategory || undertone) {
      styleLines.push(
        `- Color context: skin tone: ${skinToneCategory || "n/a"}, undertone: ${
          undertone || "n/a"
        }. Prefer colors that flatter this.`
      );
    }

    if (dos?.length) {
      styleLines.push(`- DO's (lean into these): ${dos.join("; ")}`);
    }
    if (donts?.length) {
      styleLines.push(`- DON'Ts (avoid these): ${donts.join("; ")}`);
    }
    if (bestSilhouettes?.length) {
      styleLines.push(
        `- Best silhouettes: ${bestSilhouettes.join(
          "; "
        )}. Favor these shapes.`
      );
    }
    if (trickyAreasTips?.length) {
      styleLines.push(
        `- Tricky areas / notes: ${trickyAreasTips.join("; ")}`
      );
    }
  }

  return [
    `You are "AURA", a confident, sharp, honest personal stylist.`,
    `Your job: pick ONE main outfit for ${occasionLabelSafe} from the wardrobe images below.`,
    ``,
    styleLines.length ? styleLines.join("\n") : null,
    ``,
    `WARDROBE ITEMS (S3 image URLs, they represent the garments):`,
    `- Tops: ${tops.length ? tops.join(", ") : "none"}`,
    `- Bottoms: ${bottoms.length ? bottoms.join(", ") : "none"}`,
    `- Footwear: ${footwear.length ? footwear.join(", ") : "none"}`,
    `- Accessories: ${
      accessories && accessories.length
        ? accessories.join(", ")
        : "optional / none"
    }`,
    ``,
    `TASK: For ${occasionLabelSafe}, pick ONE main outfit from the wardrobe items provided below.`,
    `Focus only on the outfit (no body critique).`,
    ``,
    `RULES:`,
    `- Respect the style profile above. If a combination goes against DO/DON'Ts or best silhouettes, explain and avoid it.`,
    `- Suggest a coherent combo that fits the occasion and profile.`,
    ``,
    `Return ONLY valid JSON in this exact shape:`,
    `{
  "chosenOutfit": {
    "top": "S3 URL of chosen top",
    "topLabel": "short text label for the top",
    "bottom": "S3 URL of chosen bottom",
    "bottomLabel": "short text label for the bottom",
    "footwear": "S3 URL of chosen footwear",
    "footwearLabel": "short text label for the footwear",
    "accessories": ["optional bullet text suggestions"],
    "accessoryImages": ["optional URLs of chosen accessory images"]
  },
  "explanation": "2–4 lines explaining why this combo works today",
  "tips": ["short styling tip 1", "short styling tip 2"],
  "alternate": {
    "highlights": ["optional alternate vibe or backup idea in bullets"]
  }
}`,
    ``,
    `Keep labels short and aesthetic.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Use the same env-driven provider as the main outfit analysis.
 */
function getTodaysOutfitProvider(): AiProviderName {
  return getActiveAiProvider(); // uses ENV.AI_PROVIDER under the hood
}

/**
 * Main entry – chooses provider based on ENV.AI_PROVIDER
 * and falls back to OpenAI if Gemini fails.
 */
export async function generateTodaysOutfit(
  payload: TodaysOutfitPayload
): Promise<TodaysOutfitResult> {
  const { tops, bottoms, footwear, accessories } = payload;
  const provider = getTodaysOutfitProvider();

  // Build rich content with text + image URLs (OpenAI will fetch images
  // if your S3 URLs are public).
  const userContent: any[] = [
    {
      type: "text",
      text: buildTextPrompt(payload),
    },
  ];

  tops.forEach((url) =>
    userContent.push({
      type: "image_url",
      image_url: { url, detail: "low" },
    })
  );
  bottoms.forEach((url) =>
    userContent.push({
      type: "image_url",
      image_url: { url, detail: "low" },
    })
  );
  footwear.forEach((url) =>
    userContent.push({
      type: "image_url",
      image_url: { url, detail: "low" },
    })
  );
  (accessories || []).forEach((url) =>
    userContent.push({
      type: "image_url",
      image_url: { url, detail: "low" },
    })
  );

  // GEMINI as primary if env says so
  if (provider === "gemini") {
    try {
      const raw = await generateTodaysOutfitWithGemini(payload);
      return normalizeTodaysOutfitJson(raw, { tops, bottoms, footwear });
    } catch (err) {
      console.warn(
        "[AI] todaysOutfit Gemini failed, falling back to OpenAI:",
        err
      );
      const raw = await generateTodaysOutfitWithOpenAI(userContent);
      return normalizeTodaysOutfitJson(raw, { tops, bottoms, footwear });
    }
  }

  // OPENAI
  const raw = await generateTodaysOutfitWithOpenAI(userContent);
  return normalizeTodaysOutfitJson(raw, { tops, bottoms, footwear });
}

// ────────────────── Provider-specific helpers ──────────────────

async function generateTodaysOutfitWithOpenAI(
  userContent: any[]
): Promise<string> {
  const completion = await openaiClient.chat.completions.create({
    model: defaultOpenAIModel || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'You are "AURA", a confident, sharp, honest stylist. Outfit-focused only, no body comments.',
      },
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return raw;
}

async function generateTodaysOutfitWithGemini(
  payload: TodaysOutfitPayload
): Promise<string> {
  const prompt = buildTextPrompt(payload);

  const result = await geminiModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
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

  return raw;
}

// ────────────────── Shared normalizer ──────────────────

function normalizeTodaysOutfitJson(
  raw: string,
  lists: { tops: string[]; bottoms: string[]; footwear: string[] }
): TodaysOutfitResult {
  const { tops, bottoms, footwear } = lists;

  let parsed: Partial<TodaysOutfitResult>;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse todays-outfit JSON:", err, raw);
    parsed = {};
  }

  const chosen = parsed.chosenOutfit ?? ({} as any);

  const safeResult: TodaysOutfitResult = {
    chosenOutfit: {
      top: chosen.top || (tops[0] ?? ""),
      topLabel: chosen.topLabel || "Top",
      bottom: chosen.bottom || (bottoms[0] ?? ""),
      bottomLabel: chosen.bottomLabel || "Bottom",
      footwear: chosen.footwear || (footwear[0] ?? ""),
      footwearLabel: chosen.footwearLabel || "Shoes",
      accessories: Array.isArray(chosen.accessories)
        ? chosen.accessories.slice(0, 6)
        : [],
      accessoryImages: Array.isArray(chosen.accessoryImages)
        ? chosen.accessoryImages.slice(0, 4)
        : [],
    },
    explanation:
      parsed.explanation ||
      "Your stylist combined these pieces based on the occasion and how they balance color, proportion and vibe.",
    tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 6) : [],
    alternate:
      parsed.alternate && Array.isArray(parsed.alternate.highlights)
        ? { highlights: parsed.alternate.highlights.slice(0, 6) }
        : undefined,
  };

  return safeResult;
}
