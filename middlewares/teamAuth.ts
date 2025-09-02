import type { Request, Response, NextFunction } from "express";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers["x-user-id"];
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return res.status(401).json({ error: "Unauthorized: x-user-id header missing or invalid" });
  }
  (req as any).userId = userId;
  next();
};
