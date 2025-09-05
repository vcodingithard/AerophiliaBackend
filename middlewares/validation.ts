// Validation using Zod removed express logic

import type { Request, Response, NextFunction } from "express";
import { z, type ZodSchema, type ZodIssue } from "zod";

export const validate =
  <T extends ZodSchema>(schema: T, location: "body" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const data = location === "body" ? req.body : req.params;
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.issues.map((e: ZodIssue) => ({
        path: e.path?.join?.(".") ?? "",
        message: e.message,
      }));
      return res.status(400).json({ errors });
    }

    if (location === "body") {
      req.body = result.data as any;
    } else {
      req.params = result.data as any;
    }

    next();
  };

export const teamCreationBodySchema = z.object({
  teamName: z
    .string()
    .trim()
    .min(1, "Team name is required")
    .min(3, "Team name must be between 3 and 50 characters.")
    .max(50, "Team name must be between 3 and 50 characters."),
  members: z
    .array(z.string().email("Each member must be a valid email."))
    .min(1, "Members must be an array with at least one email."),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().trim().min(1, "Event ID is required."),
});

export const requestIdParamSchema = z.object({
  id: z.string().trim().min(1, "Request ID is required."),
});

export const validateTeamCreation = [
  validate(eventIdParamSchema, "params"),
  validate(teamCreationBodySchema, "body"),
];

export const validateRequestAction = [validate(requestIdParamSchema, "params")];

export const validateEventIdParam = [validate(eventIdParamSchema, "params")];

export type TeamCreationBody = z.infer<typeof teamCreationBodySchema>;
export type EventIdParams = z.infer<typeof eventIdParamSchema>;
export type RequestIdParams = z.infer<typeof requestIdParamSchema>;
