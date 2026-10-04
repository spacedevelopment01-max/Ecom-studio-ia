import { env } from "./env";
import { FREE_DOCUMENTS_PER_MONTH, PARCOURS, type ParcoursId } from "./parcours";

export * from "./parcours";
export type Plan = "free" | "plus";

export function limits(plan: Plan) {
  if (plan === "plus") {
    return { document: env.plusDocumentLimit, chat: env.plusChatLimit, compare: env.plusCompareLimit };
  }
  return { document: FREE_DOCUMENTS_PER_MONTH, chat: 0, compare: 0 };
}

export function canUseParcours(plan: Plan, parcours: ParcoursId): boolean {
  return plan === "plus" || !PARCOURS[parcours].plus;
}

