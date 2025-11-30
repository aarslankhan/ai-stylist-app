// backend/src/controllers/wardrobe.controller.ts
import { Request, Response } from "express";
import { createLook, listLooks, deleteLookById } from "../services/wardrobe.service";

export async function getWardrobeLooks(req: any, res: Response) {
  try {
    const userId = req.user.uid;
    const looks = await listLooks(userId);
    return res.status(200).json({ looks });
  } catch (err) {
    console.error("getWardrobeLooks error:", err);
    return res.status(500).json({ message: "Failed to load wardrobe" });
  }
}

export async function createWardrobeLook(req: any, res: Response) {
  try {
    const userId = req.user.uid;
    const { clientId, imageUrl, score, vibe, tags, notes } = req.body;

    if (!clientId) {
      return res.status(400).json({ message: "clientId is required" });
    }

    const look = await createLook({
      userId,
      clientId,
      imageUrl,
      score: score ?? null,
      vibe: vibe ?? null,
      tags: tags ?? [],
      notes: notes ?? [],
    });

    return res.status(201).json({ look });
  } catch (err) {
    console.error("createWardrobeLook error:", err);
    return res.status(500).json({ message: "Failed to create look" });
  }
}

export async function deleteWardrobeLook(req: any, res: Response) {
  try {
    const userId = req.user.uid;
    const { id } = req.params; // id = clientId
    await deleteLookById(userId, id);
    return res.status(204).end();
  } catch (err) {
    console.error("deleteWardrobeLook error:", err);
    return res.status(500).json({ message: "Failed to delete look" });
  }
}
