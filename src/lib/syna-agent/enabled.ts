import { HttpError } from "../auth";
/** Un seul drapeau serveur pour le fil SINA agent (#492) ; fermé par défaut. */
export const synaAgentEnabled = () => process.env.STUDIO_SYNA_AGENT === "1";
export function assertSynaAgent() { if (!synaAgentEnabled()) throw new HttpError(404, "syna_agent_disabled"); }
