/** Public, deterministic plan catalogue. Does not enable an unreleased theme or mutate any project. */
import { PLANS, type PlanId } from './plans';
export type PlanFamily = 'specialty' | 'catalog' | 'services';
/** Order within each family; null slots reserve capacity, never represent selectable themes. */
export const PLAN_THEME_ORDER: Record<PlanFamily, readonly (string | null)[]> = {
  // ONDE est un thème E-commerce depuis sa refonte (issue #158) ; HEUREN, ALCÔVE et SOUPLE y entrent aussi (#155, #158),
  // MUSEAU CLUB est une boutique spécialisée (décision du 21 octobre, 12 h 58).
  specialty: ['fraise','sillon','noctil','traverse','museau-club'],
  catalog: ['orbe','onde','heuren','alcove','souple'],
  // MAISON & HORIZON (issue #172) : deuxième thème de la famille, ouvert à partir du forfait Vendre (à confirmer par Thomas).
  // APLAT (PR #187) : troisième thème de la famille, ouvert à partir du forfait Vendre comme MAISON & HORIZON (à confirmer).
  services: ['rive','maison-horizon','aplat','table-saison','atelier-nuance','parenthese','phase'],
};
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
export function planAllowsTheme(plan: PlanId|null,themeId: string): boolean {
  return !!plan && Object.values(PLAN_THEME_ORDER).some(order=>order.slice(0,PLANS[plan].themes).includes(themeId));
}
export function planAllowsSection(plan:PlanId|null,family:PlanFamily,key:string):boolean {
  if(!plan||!key.startsWith(family+'.'))return false;
  if(PLANS[plan].librarySections===20)return true;
  const keys=[...BASE_SECTIONS[family],...(PLANS[plan].librarySections>=12?ADVANCED_SECTIONS[family]:[])];
  return keys.some(x=>key===`${family}.${x}`);
}
export const planAllowsAds=(plan:PlanId|null)=>!!plan&&PLANS[plan].ads!=='none';
