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
/**
 * Fonctions de la bibliothèque de sections ouvertes au forfait (mission #190 : sans famille). La fonction est repérée
 * par son nom (« hero », « faq »…, l'ancienne famille n'est qu'un espace de nommage) : Créer ouvre les fonctions
 * essentielles, Développer y ajoute les avancées, Dominer ouvre tout. Les sections propres au thème choisi (dessinées
 * d'après ses maquettes) sont toujours ouvertes : elles font partie du thème.
 */
export const BASE_FUNCTIONS = new Set(Object.values(BASE_SECTIONS).flat());
export const ADVANCED_FUNCTIONS = new Set(Object.values(ADVANCED_SECTIONS).flat());
export function planAllowsSection(plan:PlanId|null,key:string):boolean {
  if(!plan)return false;
  if(key.startsWith('own:'))return true;
  if(PLANS[plan].librarySections>=20)return true;
  const fn=key.replace(/^fam:/,'').split('~')[0].split('.').pop()??'';
  return BASE_FUNCTIONS.has(fn)||(PLANS[plan].librarySections>=12&&ADVANCED_FUNCTIONS.has(fn));
}
export const planAllowsAds=(plan:PlanId|null)=>!!plan&&PLANS[plan].ads!=='none';
