// src/services/wardrobe.service.ts
import { Look, ILook } from "../models/Look";

export async function createLook(input: {
  userId: string;
  imageUrl: string;
  score: number | null;
  vibe: string | null;
  tags: string[];
  notes: string[];
}): Promise<ILook> {
  const look = await Look.create({
    userId: input.userId,
    imageUrl: input.imageUrl,
    score: input.score,
    vibe: input.vibe,
    tags: input.tags,
    notes: input.notes,
  });

  return look;
}

export async function listLooks(userId: string): Promise<ILook[]> {
  return Look.find({ userId }).sort({ createdAt: -1 }).exec();
}

export async function deleteLookById(userId: string, id: string): Promise<void> {
  await Look.deleteOne({ _id: id, userId }).exec();
}
