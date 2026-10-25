"use client";
import {useState} from 'react';
import {Button} from '../ui';
import {useT} from '../i18n';
import type {StrategyState,MarketingAngle,AngleId} from '@/lib/marketing-strategy/types';
export function MarketingAngleCards({data,busy,onPrepare}:{data:StrategyState;busy:boolean;onPrepare:(id:AngleId)=>void}){
 const t=useT(),[compare,setCompare]=useState<AngleId[]>([]);
 const title=(a:MarketingAngle)=>a.id==='generalist'?t('Présenter l’ensemble de votre offre','Present your entire offer'):a.title;
 const chosen=data.angles.filter(a=>compare.includes(a.id));
 return <>
  {chosen.length>0&&<section className="min-w-0 rounded-2xl border border-line p-4 sm:p-6" data-angle-comparison>
   <h3 className="font-display text-xl">{t('La même offre, plusieurs façons d’en parler','The same offer, different ways to talk about it')}</h3><p className="mt-2 text-sm text-muted">{data.offerLabel} · {t('Sélectionnez deux ou trois approches. Le produit, les prestations et les faits restent identiques.','Select two or three approaches. The product, services and facts stay the same.')}</p>
   {chosen.length===1?<p className="mt-4">{t('Ajoutez une deuxième approche pour comparer.','Add a second approach to compare.')}</p>:<div className="mt-4 overflow-x-auto" tabIndex={0} aria-label={t('Comparaison des approches, défilement horizontal','Approach comparison, scroll horizontally')}><table className="w-full min-w-[620px] border-collapse text-left text-sm"><thead><tr><th className="p-3">{t('Même offre','Same offer')}</th>{chosen.map(a=><th className="min-w-56 p-3" key={a.id}>{title(a)}</th>)}</tr></thead><tbody>{[[t('Client visé','Audience'),(a:MarketingAngle)=>a.audience],[t('Motivation','Motivation'),(a:MarketingAngle)=>a.motivation],[t('Exemple d’accroche','Example hook'),(a:MarketingAngle)=>a.examples.hero],[t('Ce qui change','What changes'),(a:MarketingAngle)=>a.communicationChange??'']].map(([label,value])=><tr key={label as string} className="border-t border-line"><th className="p-3 align-top font-medium">{label as string}</th>{chosen.map(a=><td key={a.id} className="p-3 align-top leading-relaxed">{(value as (a:MarketingAngle)=>string)(a)}</td>)}</tr>)}</tbody></table></div>}
  </section>}
  <div className="grid items-start gap-4 lg:grid-cols-2" data-angle-cards>{data.angles.map((a,index)=><article key={a.id} className={`flex min-w-0 break-words flex-col gap-4 rounded-2xl border border-line bg-paper p-5 sm:p-6 ${a.id==='generalist'?'lg:col-span-2':''}`} data-angle-card={a.id}>
   <div className="flex items-start justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-widest text-muted">{t('Approche','Approach')} {String(index+1).padStart(2,'0')}</span>{data.recommendation?.angleId===a.id&&<span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-semibold">{t('Piste expliquée','Reasoned suggestion')}</span>}</div>
   <h3 className="font-display text-2xl leading-tight">{title(a)}</h3>
   <p className="text-sm leading-relaxed" data-angle-audience><strong>{t('Pour qui, pourquoi','Who and why')} — </strong>{a.audience} — {a.motivation}</p>
   <blockquote className="border-l-2 border-signal pl-4 text-lg leading-snug" data-angle-hook>{a.examples.hero}</blockquote>
   <p className="text-sm leading-relaxed" data-angle-change><strong>{t('Dans votre communication','In your communication')} — </strong>{a.communicationChange}</p>
   <details className="text-sm" data-angle-details={a.id}><summary className="cursor-pointer font-medium underline underline-offset-4">{t('Justification et sources','Reasoning and sources')}</summary>
    <div className="mt-3 grid gap-3 leading-relaxed">{a.id==='generalist'&&<p>{data.generalistExplanation}</p>}<p>{a.rationale}</p>{data.recommendation?.angleId===a.id&&<p><strong>{t('Pourquoi cette piste','Why this suggestion')} : </strong>{data.recommendation.reason}</p>}
    {a.objections.map((o,i)=><p key={i}><strong>{o.objection}</strong> {o.answer}</p>)}
    <p className="text-xs text-muted">{t('Hypothèse de communication, pas un bénéfice prouvé ni une promesse de ventes.','Communication hypothesis, not a proven benefit or sales promise.')}</p>
    <ul className="grid gap-3">{a.sources.map((s,i)=><li key={i} className="rounded-xl bg-paper-2 p-3"><a className="font-medium underline" href={s.ref} target="_blank" rel="noreferrer">{s.label}</a><p className="mt-1 text-xs text-muted">{t('Consultée le','Read on')} {s.date?new Date(s.date).toLocaleDateString(t('fr-FR','en-GB')):t('date non établie','date unknown')}</p><details className="mt-2"><summary>{t('Extrait consulté','Read excerpt')}</summary><p className="mt-2 break-all whitespace-pre-wrap">{s.value}</p></details></li>)}</ul></div>
   </details>
   <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-line pt-4"><label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" aria-label={`${t('Comparer','Compare')} : ${title(a)}`} checked={compare.includes(a.id)} disabled={!compare.includes(a.id)&&compare.length>=3} onChange={()=>setCompare(ids=>ids.includes(a.id)?ids.filter(id=>id!==a.id):[...ids,a.id])}/>{t('Comparer','Compare')}</label>
   <Button className="ml-auto max-w-full whitespace-normal" disabled={busy||!!data.missingQuestions.length||(!data.usedAngleIds.includes(a.id)&&data.usedAngleIds.length>=data.limit)} onClick={()=>onPrepare(a.id)} data-prepare-angle={a.id}>{data.active?.angleId===a.id?t('Vérifier ce choix','Review this choice'):t('Préparer ce choix','Prepare this choice')}</Button></div>
  </article>)}</div>

 </>;
}
