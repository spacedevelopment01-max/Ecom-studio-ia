/** Schémas de validation des faits et questions d'un projet (serveur : routes API et tâches IA). */
import { z } from "zod";
import type { Fact, Question } from "./project-types";

export const FactSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  status: z.enum(["confirmed", "inferred", "unknown"]),
  source: z.enum(["user", "photo", "link", "ai", "description"]),
}) satisfies z.ZodType<Fact>;

export const QuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  why: z.string(),
  required: z.boolean(),
  factKey: z.string(),
  answer: z.string().optional(),
}) satisfies z.ZodType<Question>;
