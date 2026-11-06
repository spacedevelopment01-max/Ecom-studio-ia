/** Registre commun : chaque module expose ses outils ; aucun aiguillage par formulation. */
import type { AgentTool } from "../types";
import { siteTools } from "./site";
import { catalogueTools } from "./catalogue";
import { projectTools } from "./project";
import { mediaTools } from "./media";
import { commerceTools } from "./commerce";

export const TOOL_LIST: AgentTool[] = [...projectTools, ...siteTools, ...catalogueTools, ...commerceTools, ...mediaTools];
