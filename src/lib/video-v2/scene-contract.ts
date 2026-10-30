/** Schémas purs partagés, sans base de données ni moteur dans le navigateur. */
import {z}from 'zod';
export const ScenePlanSchema = z.object({
  scenes: z.array(z.object({ still: z.string().min(10).max(20000), motion: z.string().min(10).max(400), title: z.string().max(40).default(""), place: z.enum(["top", "lower"]).optional(), titleSize: z.enum(["standard", "large"]).optional(),titleColor:z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),role:z.string().max(80).optional(),intent:z.string().max(1000).optional(),stock:z.object({queries:z.array(z.string().max(120)).max(6),must:z.array(z.string().max(80)).max(20),need:z.array(z.array(z.string().max(80))).max(10).optional()}).optional(), voice: z.string().max(200).optional() })).min(1).max(6),
  line: z.string().max(70).default(""),
  cta: z.string().max(80),
  endCard: z.enum(["standard", "large"]).optional(),
  voiceEnd: z.string().max(160).optional(),
});
/** Entrée d'un scénario que le client peut approuver : clés fermées, aucun défaut qui ajouterait du texte. */
export const ApprovedScenePlanSchema=ScenePlanSchema.extend({
 scenes:z.array(ScenePlanSchema.shape.scenes.element.extend({title:z.string().max(40)}).strict()).min(1).max(6),
 line:z.string().max(70),cta:z.string().max(80),
}).strict();

