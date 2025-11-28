// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { firebaseAdmin } from "../config/firebaseAdmin";

export interface AuthedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export async function firebaseAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = await firebaseAdmin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}
