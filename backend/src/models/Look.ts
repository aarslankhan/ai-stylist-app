// src/models/Look.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ILook extends Document {
  userId: string;
  imageUrl: string;
  score: number | null;
  vibe: string | null;
  tags: string[];
  notes: string[];
  createdAt: Date;
}

const LookSchema = new Schema<ILook>(
  {
    userId: { type: String, required: true },
    imageUrl: { type: String, required: true },
    score: { type: Number, default: null },
    vibe: { type: String, default: null },
    tags: { type: [String], default: [] },
    notes: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const Look = mongoose.model<ILook>("Look", LookSchema);
