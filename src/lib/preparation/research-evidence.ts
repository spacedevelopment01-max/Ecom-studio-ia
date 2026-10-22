/** A title, a search snippet or a model's citation is not evidence of a read page. */
import type { Research } from './types';
export const RESEARCH_CATEGORIES=['offer','competitors','customers','sector'] as const;
export function sourceCoverage(r:Research){
 const accepted=r.sources.filter(s=>s.status==='consulted'&&s.relevance?.accepted&&s.excerpt.trim().length>=40&&s.contentHash&&Number.isFinite(s.consultedAt)&&s.consultedAt>0);
 const missing=RESEARCH_CATEGORIES.filter(c=>!accepted.some(s=>s.category===c));
 const hosts=new Set(accepted.filter(s=>s.category==='competitors').map(s=>{try{return new URL(s.url).hostname.replace(/^www\./,'');}catch{return '';}}).filter(Boolean));
 return {accepted,missing,complete:accepted.length>=5&&!missing.length&&hosts.size>=2};
}
export function assertSourcedResearch(r:Research){
 if(r.formatVersion!==3)throw new Error('Ancienne recherche conservée, non validée selon le nouveau contrat.');
 if(r.angles.some(a=>a.title.length>100||a.audience.length>220||(a.motivation?.length??0)>220||(a.message?.length??0)>180||(a.communicationChange?.length??0)>260||(a.tone?.length??0)>220||(a.visualDirection?.length??0)>400))throw new Error('Présentation trop longue pour les cartes : raccourcir la proposition sans tronquer les textes du client.');
 const coverage=sourceCoverage(r);
 if(!coverage.complete)throw new Error('Recherche incomplète : des pages pertinentes couvrant l’offre, les comparaisons, les clients et le secteur, les quatre familles de sources et deux concurrents indépendants sont nécessaires. Aucun angle nouveau publié.');
 const ids=new Set<string>(),hashes=new Set<string>(),urls=new Set<string>();
 for(const s of coverage.accepted){
  const u=new URL(s.url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw new Error('Lien de source non admissible.');u.hash='';
  if(ids.has(s.id)||hashes.has(s.contentHash!)||urls.has(u.href))throw new Error('Sources dupliquées, couverture à reprendre.');
  if(s.consultedAt>Date.now()+60000)throw new Error('Date de consultation non admissible.');
  ids.add(s.id);hashes.add(s.contentHash!);urls.add(u.href);
 }
 if(!r.observations.length||r.observations.some(o=>!coverage.accepted.some(s=>s.id===o.sourceId&&o.quote.length>=10&&s.excerpt.includes(o.quote))))throw new Error('Observation sans citation exacte consultée.');
 const evidenced=new Set(r.observations.map(o=>o.sourceId));
 if(r.angles.length!==5||new Set(r.angles.map(a=>a.id)).size!==5||r.angles.some(a=>!a.communicationChange?.trim()||!a.tone?.trim()||!a.visualDirection?.trim()||!a.sourceIds.length||a.sourceIds.some(id=>!ids.has(id))||!a.sourceIds.some(id=>evidenced.has(id))))throw new Error('Angle sans justification consultée ou comparaison exploitable.');
 if(!r.recommendation.trim()||!r.angles.some(a=>a.id===r.recommendedId)||!r.recommendationSourceIds?.length||r.recommendationSourceIds.some(id=>!ids.has(id)||!evidenced.has(id)))throw new Error('Recommandation sans observations sourcées.');
}
