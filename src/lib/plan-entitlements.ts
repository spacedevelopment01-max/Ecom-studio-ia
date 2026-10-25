/** Public, deterministic plan catalogue. Does not enable an unreleased theme or mutate any project. */
import { PLANS, type PlanId } from './plans';
import { DEFAULT_THEME_RIGHTS, planOpensTheme, type ThemeRights } from './theme/theme-rights';
export type PlanFamily = 'specialty' | 'catalog' | 'services';
export const BASE_SECTIONS: Record<PlanFamily, readonly string[]> = {
  specialty: ['hero','benefits','details','specs','howto','purchase','faq','contact'],
  catalog: ['hero','collections','products','featured','finishes','dimensions','faq','contact'],
  services: ['hero','offers','detail','portfolio','method','pricing','faq','contact'],
};
export const ADVANCED_SECTIONS: Record<PlanFamily, readonly string[]> = {
  specialty: ['composition','situations','story','guarantees'],
  catalog: ['lookbook','care','uses','commitments'],
  services: ['needs','before-after','commitments','area'],
};
/**
 * Thèmes : droits réglés par thème et par forfait (theme-rights.ts, mission #190), plus aucun quota « par famille ».
 * Sans réglage transmis, la répartition par défaut s'applique (forfaits encore à choisir : tous les thèmes proposés).
 */
export function planAllowsTheme(plan: PlanId|null,themeId: string,rights: ThemeRights=DEFAULT_THEME_RIGHTS): boolean {
  return planOpensTheme(plan,themeId,rights);
}
export function planAllowsSection(plan:PlanId|null,family:PlanFamily,key:string):boolean {
  if(!plan||!key.startsWith(family+'.'))return false;
  if(PLANS[plan].librarySections===20)return true;
  const keys=[...BASE_SECTIONS[family],...(PLANS[plan].librarySections>=12?ADVANCED_SECTIONS[family]:[])];
  return keys.some(x=>key===`${family}.${x}`);
}
export const planAllowsAds=(plan:PlanId|null)=>!!plan&&PLANS[plan].ads!=='none';
