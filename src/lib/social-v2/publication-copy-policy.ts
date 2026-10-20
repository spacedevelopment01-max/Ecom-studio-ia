/** Commercial assertions must be both confirmed for the selected subject and requested for this visual. */
import type { Project } from "../projects";
const terms = (s: string) =>
  [...s.matchAll(/(-?\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?)\s*(%|€|\$|EUR\b|USD\b)/gi)].map(
    (m) =>
      `${Number(m[1].replace(/[ \u00a0\u202f]/g, "").replace(",", "."))}:${/€|EUR/i.test(m[2]) ? "EUR" : /\$|USD/i.test(m[2]) ? "USD" : "%"}`,
  );
/** A keyword is not itself evidence of an assertion: keep questions and validated names intact.
 * Remove only these precise spans, never a complete sentence which could contain another claim. */
export function assertionText(text: string, names: string[] = []) {
  let s = text.trim();
  for (const name of names.filter(x=>x.trim().length)) {
    if (s === name || s === `Découvrir ${name}` || s === `Découvrez ${name}` || s === `Discover ${name}`) return "";
  }
  s = s.replace(/\b(?:votre|ton|vos|your)\s+(?:avis|reviews?)\b/gi, "")
    .replace(/\b(?:demander|demandez|donner|donnez|partager|partagez)\s+(?:un\s+)?avis\b/gi, "")
    .replace(/\b(?:le meilleur de (?:vos|votre|ton|tes)|de meilleurs moments|meilleurs moments|best of your|best moments)\b/gi, "");
  return s;
}
const claimPattern = /\b(?:n°\s?1|meilleur(?:e|s|es)?|best|garanti(?:e|s|es)?|guaranteed|avis|reviews?|stars)\b|(?:^|[^\p{L}])étoiles?(?=$|[^\p{L}])/iu;
export const copyNeedsEvidence = (text:string, names:string[] = []) => terms(text).length>0 || claimPattern.test(assertionText(text,names));
export type CopyIssue = {field:"headline"|"subline"|"cta";code:"COMMERCIAL_NUMBER_UNCONFIRMED"|"COMMERCIAL_NUMBER_NOT_REQUESTED"|"CLAIM_EVIDENCE_REQUIRED";clientText:boolean};
export function publicationCopyIssues(p:Project, copy:Record<"headline"|"subline"|"cta",string>, request:string, explicit:string[], extraConfirmed:string[]=[]):CopyIssue[] {
  const servicePrice=p.business==="services"&&p.services.services.length===1?p.services.services[0].price??"":"";
  const confirmed=[...p.product.facts.filter(f=>f.status==="confirmed").map(f=>`${f.label} ${f.value}`),p.product.price.status==="confirmed"?`${p.product.price.amount} ${p.product.price.currency}`:"",servicePrice,...extraConfirmed].join("\n");
  const wanted=[request,...explicit].join("\n"), verified=terms(confirmed),asked=terms(wanted);
  const names=[p.brand?.name??"",p.product.name];
  return (["headline","subline","cta"] as const).flatMap(field=>{
    const text=copy[field].trim(), numbers=terms(text),clientText=explicit.includes(text);
    const codes:CopyIssue["code"][]=[];
    if(numbers.some(n=>!verified.includes(n)))codes.push("COMMERCIAL_NUMBER_UNCONFIRMED");
    else if(numbers.some(n=>!asked.includes(n)))codes.push("COMMERCIAL_NUMBER_NOT_REQUESTED");
    if(claimPattern.test(assertionText(text,names)) && !(confirmed.includes(text)&&wanted.includes(text)))codes.push("CLAIM_EVIDENCE_REQUIRED");
    return codes.map(code=>({field,code,clientText}));
  });
}
export function authorizedPublicationTexts(
  p: Project,
  texts: string[],
  request: string,
  explicit: string[],
  extraConfirmed: string[] = [],
) {
  return texts.filter(x=>!publicationCopyIssues(p,{headline:x,subline:"",cta:""},request,explicit,extraConfirmed).length);
}
