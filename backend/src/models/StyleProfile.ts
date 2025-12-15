// src/models/StyleProfile.ts
import { Schema, model, Document } from "mongoose";

export interface IStyleProfile extends Document {
  userId: string;
  gender: "male" | "female" | "unspecified";
  bodyType: string;
  heightDisplay: string;
  heightCm?: number;
  skinToneCategory: string;
  undertone?: string;
  palette?: {
    name: string;
    colors: { hex: string; label: string }[];
  };
  dos: string[];
  donts: string[];
  bestSilhouettes: string[];
  trickyAreasTips: string[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

const ColorSchema = new Schema(
  {
    hex: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const StyleProfileSchema = new Schema<IStyleProfile>(
  {
    userId: { type: String, required: true, index: true, unique: true },
    gender: {
      type: String,
      enum: ["male", "female", "unspecified"],
      default: "unspecified",
    },
    bodyType: { type: String, required: true },
    heightDisplay: { type: String, required: true },
    heightCm: { type: Number },
    skinToneCategory: { type: String, required: true },
    undertone: { type: String },
    palette: {
      name: { type: String },
      colors: { type: [ColorSchema], default: [] },
    },
    dos: { type: [String], default: [] },
    donts: { type: [String], default: [] },
    bestSilhouettes: { type: [String], default: [] },
    trickyAreasTips: { type: [String], default: [] },
    version: { type: String, default: "v1.0" },
  },
  { timestamps: true }
);

export const StyleProfile = model<IStyleProfile>(
  "StyleProfile",
  StyleProfileSchema
);
