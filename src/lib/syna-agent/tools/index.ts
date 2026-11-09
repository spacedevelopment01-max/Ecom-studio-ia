/** Registre commun : chaque module expose ses outils ; aucun aiguillage par formulation. */
import type { AgentTool } from "../types";
import { siteTools } from "./site";
import { catalogueTools } from "./catalogue";
import { projectTools } from "./project";
import { mediaTools } from "./media";
import { commerceTools } from "./commerce";
import { startTools } from "./start";
import { identityTools } from "./identity";
import { logoTools } from "./logo";
import { brandKitTools } from "./brand-kit";
import { angleTools } from "./angles";
import { activityTools } from "./activity";
import { themeTools } from "./themes";
import { calendarTools } from "./calendar";
import { mockupCodeTools } from "../mockup-code/tools";
import { offersTools } from "./offers";
import { familyTools } from "./families";

export const TOOL_LIST: AgentTool[] = [...startTools, ...identityTools, ...logoTools, ...brandKitTools, ...angleTools, ...activityTools, ...themeTools, ...projectTools, ...siteTools, ...catalogueTools, ...commerceTools, ...mediaTools, ...calendarTools, ...mockupCodeTools, ...offersTools, ...familyTools];
