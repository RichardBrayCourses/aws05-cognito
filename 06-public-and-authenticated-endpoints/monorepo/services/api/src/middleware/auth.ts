import { getCurrentInvoke } from "@codegenie/serverless-express";
import type { NextFunction, Request, Response } from "express";

export type AuthUser = {
  sub: string;
  email?: string;
};

type Claims = {
  sub?: string;
  email?: string;
};

export function attachAuth(req: Request, _res: Response, next: NextFunction) {
  const invoke = getCurrentInvoke?.();
  const claims: Claims | undefined =
    invoke?.event?.requestContext?.authorizer?.claims;

  if (claims?.sub) {
    (req as any).auth = {
      sub: claims.sub,
      email: claims.email,
    } as AuthUser;
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = (req as any).auth as AuthUser | undefined;

  if (!auth?.sub) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  next();
}
