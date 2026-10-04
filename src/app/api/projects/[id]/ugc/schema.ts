import { z } from "zod";

export const UgcOptionsSchema = z.object({
  format: z.enum(["9:16", "16:9"]),
  beats: z.number().int().min(1).max(5),
  presenter: z.enum(["femme", "homme", "auto"]),
  age: z.enum(["18-25", "25-35", "35-50", "50+"]),
  setting: z.enum(["salon", "cuisine", "salle-de-bain", "chambre", "bureau", "exterieur", "voiture", "activite"]),
  tone: z.enum(["enthousiaste", "naturel", "expert"]),
  angle: z.enum(["deballage", "demonstration", "presentation", "probleme"]),
  url: z.string().max(120).optional(),
  brief: z.string().max(600).optional(),
});

export const UgcScriptInput = z.object({
  concept: z.string().max(400),
  persona: z.string().max(400),
  setting: z.string().max(400),
  beats: z.array(z.object({ line: z.string().min(1).max(220), caption: z.string().max(220), action: z.string().min(1).max(400) })).min(1).max(5),
});
