import { Schema, model, Document } from "mongoose";

export interface ILook extends Document {
  userId: string;
  clientId: string; // 🔥 this is the frontend card ID (e.g. "dyr51ijx60l")
  imageUrl: string;
  score: number | null;
  vibe: string | null;
  tags: string[];
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LookSchema = new Schema<ILook>(
  {
    userId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true }, // ✅ NEW
    imageUrl: { type: String, required: true },
    score: { type: Number, default: null },
    vibe: { type: String, default: null },
    tags: { type: [String], default: [] },
    notes: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Look = model<ILook>("Look", LookSchema);
