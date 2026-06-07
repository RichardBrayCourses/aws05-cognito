import { Router } from "express";
import { getPresignedUrl } from "../controllers/photoController";

export const photoRoutes = Router();

photoRoutes.post("/presigned-url", getPresignedUrl);
