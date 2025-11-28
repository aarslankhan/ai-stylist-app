// src/routes/wardrobe.routes.ts
import { Router } from "express";
import { firebaseAuth } from "../middleware/auth";
import {
  getWardrobe,
  createWardrobeLook,
  deleteWardrobeLook,
} from "../controllers/wardrobe.controller";

const router = Router();

// All routes here require Firebase auth
router.use(firebaseAuth);

router.get("/", getWardrobe);
router.post("/", createWardrobeLook);
router.delete("/:id", deleteWardrobeLook);

export default router;
