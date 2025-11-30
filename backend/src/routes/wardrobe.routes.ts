// backend/src/routes/wardrobe.routes.ts
import { Router } from "express";
import {
  getWardrobeLooks,
  createWardrobeLook,
  deleteWardrobeLook,
} from "../controllers/wardrobe.controller";
import { firebaseAuth } from "../middleware/auth";

const router = Router();

router.get("/", firebaseAuth, getWardrobeLooks);
router.post("/", firebaseAuth, createWardrobeLook);
router.delete("/:id", firebaseAuth, deleteWardrobeLook);

export default router;
