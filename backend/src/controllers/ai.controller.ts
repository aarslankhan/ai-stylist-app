// src/controllers/ai.controller.ts
import { Request, Response } from "express";
import { getActiveAiProvider, analyzeOutfit } from "../services/aiProvider";
import { StyleProfile } from "../models/StyleProfile";
import { generateLookAnalysis } from "../services/ai.body.service";
import { generateStyleProfile } from "../services/ai.bodyProfile.service";
import {
  generateTodaysOutfit,
  TodaysOutfitPayload,
} from "../services/todaysOutfit.service";

const getUserIdFromRequest = (req: Request): string => {
  // Firebase auth middleware should attach user to req
  const user = (req as any).user;
  if (user?.uid) return user.uid;
  // Fallback
  return (req as any).userId ?? "anonymous";
};

// ───────────────── outfit analysis ─────────────────

export async function analyzeLookHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromRequest(req);
    const { imageBase64, imageUrl, mimeType } = (req.body || {}) as {
      imageBase64?: string;
      imageUrl?: string;
      mimeType?: string;
    };

    if (!imageBase64 && !imageUrl) {
      return res.status(400).json({
        error: "Either imageBase64 or imageUrl is required for outfit analysis",
      });
    }

    const provider = getActiveAiProvider();
    let analysis;

    if (imageBase64) {
      // Use the shared aiProvider pipeline (base64)
      analysis = await analyzeOutfit(
        imageBase64,
        typeof mimeType === "string" ? mimeType : "image/jpeg"
      );
    } else {
      // Use the URL-based pipeline (rare case)
      analysis = await generateLookAnalysis({
        provider,
        client: null,
        imageUrl,
        mimeType,
        userId,
      });
    }

    return res.status(200).json(analysis);
  } catch (error: any) {
    console.error("analyzeLookHandler error:", error);
    return res.status(500).json({
      error: "Failed to analyze outfit",
      detail: error?.message ?? "Unknown error",
    });
  }
}

// ───────────────── find my style / body profile ─────────────────

export async function analyzeBodyProfileHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromRequest(req);

    const {
      gender,
      bodyTypeId,
      bodyTypeName,
      heightCm,
      heightDisplay,
      heightLabel,
      height,
      skinToneId,
      skinToneLabel,
      imageBase64,
      imageMimeType,
    } = req.body || {};

    if (!gender || !bodyTypeId || !skinToneId || !imageBase64) {
      return res.status(400).json({
        error:
          "Missing required fields: gender, bodyTypeId, skinToneId, and imageBase64 are required.",
      });
    }

    const finalHeightDisplay =
      heightDisplay ||
      heightLabel ||
      height ||
      (typeof heightCm === "number" ? `${heightCm} cm` : "Not provided");

    const profile = await generateStyleProfile({
      userId,
      gender,
      bodyTypeId,
      bodyTypeName,
      heightCm,
      heightDisplay: finalHeightDisplay,
      skinToneId,
      skinToneLabel,
      imageBase64,
      mimeType:
        typeof imageMimeType === "string" ? imageMimeType : "image/jpeg",
    });

    // Upsert into Mongo so profile can be reused
    const saved = await StyleProfile.findOneAndUpdate(
      { userId },
      {
        userId,
        gender: profile.gender,
        bodyType: profile.bodyType,
        heightDisplay: profile.heightDisplay,
        heightCm: profile.heightCm,
        skinToneCategory: profile.skinToneCategory,
        undertone: profile.undertone,
        palette: profile.palette,
        dos: profile.dos,
        donts: profile.donts,
        bestSilhouettes: profile.bestSilhouettes,
        trickyAreasTips: profile.trickyAreasTips,
        version: profile.version ?? "v1.0",
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.status(200).json(saved);
  } catch (error: any) {
    console.error("analyzeBodyProfileHandler error:", error);
    return res.status(500).json({
      error: "Failed to analyze body profile",
      detail: error?.message ?? "Unknown error",
    });
  }
}

export async function getStyleProfileHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromRequest(req);
    const profile = await StyleProfile.findOne({ userId }).lean();

    if (!profile) {
      return res.status(404).json({ error: "No style profile found" });
    }

    return res.status(200).json(profile);
  } catch (error: any) {
    console.error("getStyleProfileHandler error:", error);
    return res.status(500).json({
      error: "Failed to fetch style profile",
      detail: error?.message ?? "Unknown error",
    });
  }
}

// ───────────────── today’s outfit ─────────────────

export async function todaysOutfitHandler(req: Request, res: Response) {
  try {
    const {
      occasionId,
      occasionLabel,
      items,
      styleProfileOverride,
    } = req.body || {};

    if (!occasionId) {
      return res.status(400).json({
        error: "occasionId is required",
      });
    }

    const tops: string[] = items?.tops ?? [];
    const bottoms: string[] = items?.bottoms ?? [];
    const footwear: string[] = items?.footwear ?? [];
    const accessories: string[] | undefined = items?.accessories ?? undefined;

    const result = await generateTodaysOutfit({
      occasionId,
      occasionLabel,
      tops,
      bottoms,
      footwear,
      accessories,
      styleProfileOverride,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("todaysOutfitHandler error:", error);
    return res.status(500).json({
      error: "Failed to generate today’s outfit",
      detail: error?.message ?? "Unknown error",
    });
  }
}


// ───────────────── delete style profile ─────────────────

export async function deleteStyleProfileHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromRequest(req);

    await StyleProfile.deleteOne({ userId });

    // 204: successfully deleted (or nothing to delete)
    return res.status(204).send();
  } catch (error: any) {
    console.error("deleteStyleProfileHandler error:", error);
    return res.status(500).json({
      error: "Failed to delete style profile",
      detail: error?.message ?? "Unknown error",
    });
  }
}
