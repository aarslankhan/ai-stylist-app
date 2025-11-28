// src/controllers/wardrobe.controller.ts
import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { createLook, listLooks, deleteLookById } from "../services/wardrobe.service";

export async function getWardrobe(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const looks = await listLooks(userId);
    res.json({ looks });
  } catch (err) {
    console.error("getWardrobe error:", err);
    res.status(500).json({ error: "Failed to load wardrobe" });
  }
}

export async function createWardrobeLook(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { imageUrl, score, vibe, tags, notes } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    const look = await createLook({
      userId,
      imageUrl,
      score: score ?? null,
      vibe: vibe ?? null,
      tags: Array.isArray(tags) ? tags : [],
      notes: Array.isArray(notes) ? notes : [],
    });

    res.status(201).json({ look });
  } catch (err) {
    console.error("createWardrobeLook error:", err);
    res.status(500).json({ error: "Failed to create look" });
  }
}

export async function deleteWardrobeLook(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    await deleteLookById(userId, id);
    res.status(204).send();
  } catch (err) {
    console.error("deleteWardrobeLook error:", err);
    res.status(500).json({ error: "Failed to delete look" });
  }
}
