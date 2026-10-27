/** Schémas de validation des faits et questions d'un projet (serveur : routes API et tâches IA). */
import { z } from "zod";
import { BRIEF_TOPICS, type BriefTopic, type Fact, type Question } from "./project-types";

/** Rubrique facultative : une valeur inattendue est ignorée plutôt que de faire échouer toute une analyse. */
const topic = z.enum(BRIEF_TOPICS as [BriefTopic, ...BriefTopic[]]).optional().catch(undefined);

export const FactSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  status: z.enum(["confirmed", "inferred", "unknown"]),
  source: z.enum(["user", "photo", "link", "ai", "description"]),
  topic,
  later: z.boolean().optional(),
}) satisfies z.ZodType<Fact>;

export const QuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  why: z.string(),
  required: z.boolean(),
  factKey: z.string(),
  answer: z.string().optional(),
  topic,
  label: z.string().optional(),
  later: z.boolean().optional(),
}) satisfies z.ZodType<Question>;
