// src/controllers/ai.controller.ts
import { Request, Response } from "express";
import {
  analyzeOutfit,
  getActiveAiProvider,
} from "../services/aiProvider";

export async function analyzeOutfitHandler(req: Request, res: Response) {
  try {
    const { imageBase64, mimeType } = req.body as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    const safeMime =
      typeof mimeType === "string" && mimeType.startsWith("image/")
        ? mimeType
        : "image/jpeg";

    const result = await analyzeOutfit(imageBase64, safeMime);

    return res.json({
      provider: getActiveAiProvider(),
      ...result,
    });
  } catch (err: any) {
    console.error("analyzeOutfitHandler error:", err);
    return res.status(500).json({
      error: "Failed to analyze outfit",
      detail: err?.message ?? "Unknown error",
    });
  }
}
