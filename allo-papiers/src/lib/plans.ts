import { env } from "./env";
import { FREE_DOCUMENTS_PER_MONTH, PARCOURS, type ParcoursId } from "./parcours";

export * from "./parcours";
export type Plan = "free" | "plus";

export function limits(plan: Plan) {
  if (plan === "plus") {
    return { document: env.plusDocumentLimit, chat: env.plusChatLimit, compare: env.plusCompareLimit, classement: Number(process.env.PLUS_CLASSEMENTS_PER_MONTH ?? 200) };
  }
  // Ranger ses justificatifs dans le coffre reste possible en gratuit (classement court et peu coûteux).
  return { document: FREE_DOCUMENTS_PER_MONTH, chat: 0, compare: 0, classement: Number(process.env.FREE_CLASSEMENTS_PER_MONTH ?? 20) };
}

export function canUseParcours(plan: Plan, parcours: ParcoursId): boolean {
  return plan === "plus" || !PARCOURS[parcours].plus;
}

