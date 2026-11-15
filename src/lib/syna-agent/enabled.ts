import { HttpError } from "../auth";
/** SINA est ouverte à tous. La variable STUDIO_SYNA_AGENT=0 ne sert qu'à la fermer en urgence sur une installation. */
export const synaAgentEnabled = () => process.env.STUDIO_SYNA_AGENT !== "0";
export function assertSynaAgent() { if (!synaAgentEnabled()) throw new HttpError(404, "syna_agent_disabled"); }
