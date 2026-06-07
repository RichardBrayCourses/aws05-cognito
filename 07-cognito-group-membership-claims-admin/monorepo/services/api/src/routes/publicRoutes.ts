import { Router } from "express";
import { getHealth } from "../controllers/healthController";
import { getPhotos } from "../controllers/photoController";

export const publicRoutes = Router();

publicRoutes.get("/health", getHealth);
publicRoutes.get("/gallery-photos", getPhotos);
