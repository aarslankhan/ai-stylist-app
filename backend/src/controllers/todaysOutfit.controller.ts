// src/controllers/todaysOutfit.controller.ts
import { Request, Response } from "express";
import {
  TodaysOutfitPayload,
  generateTodaysOutfit,
} from "../services/todaysOutfit.service";

export async function handleTodaysOutfit(req: Request, res: Response) {
  try {
    const {
      occasionId,
      occasionLabel,
      tops,
      bottoms,
      footwear,
      accessories,
    } = req.body as Partial<TodaysOutfitPayload>;

    // Basic validation matching what Builder requires
    if (!occasionId) {
      return res.status(400).json({ error: "occasionId is required" });
    }
    if (!tops || !tops.length || !bottoms || !bottoms.length || !footwear || !footwear.length) {
      return res.status(400).json({
        error:
          "At least one top, one bottom, and one footwear image URL are required.",
      });
    }

    const payload: TodaysOutfitPayload = {
      occasionId,
      occasionLabel,
      tops,
      bottoms,
      footwear,
      accessories: accessories ?? [],
    };

    const result = await generateTodaysOutfit(payload);

    return res.json(result);
  } catch (err: any) {
    console.error("handleTodaysOutfit error:", err);
    return res.status(500).json({
      error: "Failed to generate today's outfit",
      detail: err?.message ?? "Unknown error",
    });
  }
}
