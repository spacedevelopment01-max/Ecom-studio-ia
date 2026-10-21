"use client";
import { useRef, useState } from 'react';
import { api, Button, Card, useApi } from '../ui';
import { useT } from '../i18n';
import type { StrategyState, StrategyPreparation, AngleId } from '@/lib/marketing-strategy/types';
/** Consultation never activates an angle. Only the final explicit confirmation consumes a place. */
export function MarketingStrategy({projectId,onChange}:{projectId:string;onChange?:()=>void}){
 const t=useT(),url=`/api/projects/${projectId}/marketing-strategy`;
 const {data,reload,error:loadError}=useApi<StrategyState>(url);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[view,setView]=useState<AngleId|null>(null),[preparation,setPreparation]=useState<StrategyPreparation|null>(null),[retain,setRetain]=useState(false);
 const [reviews,setReviews]=useState<Record<string,string>>({});
 const working=useRef(false),key=useRef('');
 async function send(input:unknown){if(working.current)return;working.current=true;setBusy(true);setError('');try{return await api<any>(url,{body:input});}catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}}
 async function analyze(){const r=await send({action:'analyze'});if(r){await reload();setPreparation(null);}}
 async function prepare(angleId:AngleId){const r=await send({action:'prepare',angleId});if(r){setPreparation(r.preparation);setRetain(false);setReviews({});key.current=crypto.randomUUID();}}
 async function review(module:string,contentId:string,decision:string){if(!preparation)return;const r=await send({action:"review",module,contentId,decision,preparationId:preparation.id,confirmed:true});if(r)setReviews(v=>({...v,[`${module}:${contentId}`]:decision}));}
 async function activate(){if(!preparation)return;const r=await send({action:'activate',angleId:preparation.angleId,preparationId:preparation.id,idempotencyKey:key.current,confirmed:true,retainUnaligned:retain});if(r){setPreparation(null);await reload();onChange?.();}}
 const selected=data?.angles.find(a=>a.id===view);
 return <Card className="grid gap-4 p-5" data-marketing-strategy>
  <div><p className="text-sm text-muted">{t('La stratégie de votre projet','Your project strategy')}</p><h2 className="font-display text-2xl">{t('À qui voulez-vous parler ?','Who do you want to speak to?')}</h2><p className="mt-2 text-sm">{t('Comparez les cinq approches avant de choisir. Aucun angle n’est activé par une simple consultation. Votre identité et les faits restent inchangés.','Compare five approaches before choosing. Viewing a card never activates it. Your identity and facts stay unchanged.')}</p></div>
  {data?.active&&<p data-active-angle={data.active.angleId} className="rounded-xl bg-paper-2 p-3">{t('Angle actif','Active angle')} : <strong>{data.active.angle.title}</strong> · {t('version','version')} {data.active.version}</p>}
  {data&&<p className="text-sm">{t('Angles distincts déjà activés','Distinct angles activated')} : {data.usedAngleIds.length} / {data.limit || '—'}. {t('Historique conservé au renouvellement. Revenir à un angle autorisé déjà choisi ne consomme aucune nouvelle place.','History survives renewal. Returning to an allowed previously chosen angle consumes no new place.')}</p>}
  <Button variant="secondary" disabled={busy} onClick={analyze} data-analyze-strategy>{data?.angles.length?t('Actualiser l’analyse, sans activer','Refresh analysis without activating'):t('Analyser les cinq approches','Analyze five approaches')}</Button>
  {data?.missingQuestions.length? <div role="status"><p>{t('Avant de proposer une stratégie fiable :','Before proposing a grounded strategy:')}</p><ul className="list-disc pl-5">{data.missingQuestions.map(q=><li key={q.key}>{q.question}</li>)}</ul><a href={`/studio/${projectId}/produit`} className="underline">{t('Compléter les informations de l’offre','Complete the offer information')}</a></div>:null}
  {data?.analysis&&<p className="text-xs text-muted">{t('Analyse locale des informations du projet. Les cibles et motivations proposées sont des hypothèses créatives à valider ; aucune étude de marché externe ni promesse de conversion.','Local analysis of project information. Proposed audiences and motivations are creative hypotheses for review; no external market study or conversion promise.')}</p>}
  <div className="grid gap-3 md:grid-cols-2">{data?.angles.map(a=><article key={a.id} className="grid content-start gap-2 rounded-2xl border border-line p-4" data-angle-card={a.id}>
   <h3 className="text-lg font-semibold">{a.title}</h3><p className="text-sm">{a.audience}</p><p className="text-sm">{a.situation}</p><p className="text-sm">{a.motivation}</p>
   {data.recommendation?.angleId===a.id&&<p className="text-sm font-medium">{t('Recommandation du studio','Studio recommendation')} : {data.recommendation.reason}</p>}
   {a.id==='generalist'&&<p className="text-sm">{data.generalistExplanation}</p>}
   <Button variant="secondary" disabled={busy} onClick={()=>{setView(view===a.id?null:a.id);setPreparation(null);}} data-view-angle={a.id}>{t('Comprendre cet angle','Understand this angle')}</Button>
   <Button disabled={busy||data.active?.angleId===a.id||!!data.missingQuestions.length} onClick={()=>prepare(a.id)} data-prepare-angle={a.id}>{data.active?.angleId===a.id?t('Actif','Active'):t('Préparer ce choix','Prepare this choice')}</Button>
  </article>)}</div>
  {selected&&<section className="grid gap-3 rounded-2xl bg-paper-2 p-4" data-angle-details={selected.id}>
   <h3 className="text-xl font-semibold">{selected.title}</h3>
   {[[t('Pas la priorité','Not the priority'),selected.notPriority],[t('Désir et tension','Desire and tension'),selected.tension],[t('Bénéfice soutenable','Supportable benefit'),selected.benefit],[t('Promesse','Promise'),selected.promise],[t('Pourquoi cette offre','Why this offer'),selected.rationale],[t('Ton','Tone'),selected.tone],[t('Direction visuelle','Visual direction'),selected.visualDirection]].map(([label,value])=><p key={label}><strong>{label} : </strong>{value}</p>)}
   <p><strong>{t('Preuves disponibles','Available evidence')} : </strong>{selected.proofs.join(' · ')||t('À compléter','To complete')}</p>
   {selected.objections.map((o,i)=><p key={i}><strong>{o.objection}</strong> {o.answer}</p>)}
   <p>{selected.limits.join(' ')}</p><h4 className="font-semibold">{t('Exemples rédactionnels proposés','Proposed copy examples')}</h4><p>{selected.examples.hero}</p><p>{selected.examples.subtext}</p><p>{t('Bouton','Button')} : {selected.examples.cta}</p><p>{t('Publicité','Advertisement')} : {selected.examples.advertisement}</p>
   <details><summary>{t('Sources et hypothèses','Sources and hypotheses')}</summary>{selected.sources.map((s,i)=><p className="text-sm" key={i}>{s.kind} · {s.label} : {s.value} {s.date||''}</p>)}</details>
  </section>}
  {preparation&&<section className="grid gap-3 rounded-2xl border border-signal p-4" data-strategy-confirm>
   <h3 className="text-xl font-semibold">{t('Impact avant activation','Impact before activation')}</h3>
   <p>{preparation.cost.explanation}</p><p>{t('Préparation locale : 0 % de budget IA. Aucune génération payante n’est autorisée par ce choix ; toute création nécessaire conserve son devis et vos plafonds.','Local preparation: 0% AI budget. Choosing does not authorize paid generation; any necessary creation keeps its quote and budget caps.')}</p>
   {preparation.impact.map(m=><p key={m.module}>{m.module} : {m.total} {t('contenus','contents')}, {m.reusable} {t('réutilisables','reusable')}, {m.protected} {t('protégés','protected')}, {m.needsReview} {t('à réviser','to review')}</p>)}
   <p className="text-sm">{t('Les versions, retouches et archives sont conservées. Les éléments qui nécessitent une révision doivent être préparés avant la bascule ; les publications programmées de l’ancien angle seront bloquées avant envoi.','Versions, edits and archives are kept. Items requiring revision must be prepared before switching; scheduled posts from the former angle will be blocked before sending.')}</p>
   <div className="grid gap-3">{preparation.contents.filter(c=>!c.aligned&&!c.published&&c.module!=='theme').map((c,i)=><div key={`${c.module}:${c.contentId}`} className="grid gap-2 rounded-xl border border-line p-3" data-strategy-review-item>
    <p>{c.module} · {t('Élément','Item')} {i+1} · {c.protected?t('protégé','protected'):t('à contrôler','to review')}</p>
    <a className="underline" href={c.module==='asset'?`/api/files/${c.contentId}`:`/studio/${projectId}/${({seo:'blog',video:'videos',ad:'publicites',post:'publications',calendar:'calendrier',campaign:'publicites',blog:'blog'} as Record<string,string>)[c.module]??'fichiers'}`} target="_blank" rel="noreferrer">{t('Ouvrir le contenu pour le vérifier','Open content for review')}</a>
    <p className="text-xs">{t('Vérifiez sa cible, son message, ses faits et sa scène au regard du nouvel angle. Une photo factuelle peut rester compatible. Une retouche ne doit pas être certifiée sans lecture.','Check its audience, message, facts and scene against the new angle. A factual photo may remain compatible. An edit must not be certified without review.')}</p>
    <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={()=>review(c.module,c.contentId,'compatible')}>{t('Vérifié : compatible, réutiliser','Reviewed: compatible, reuse')}</Button><Button variant="secondary" disabled={busy} onClick={()=>review(c.module,c.contentId,'retain_unaligned')}>{t('Conserver, signalé non aligné','Keep, flagged unaligned')}</Button></div>
    {reviews[`${c.module}:${c.contentId}`]&&<p role="status">{reviews[`${c.module}:${c.contentId}`]==='compatible'?t('Compatibilité confirmée pour cet élément.','Compatibility confirmed for this item.'):t('Ancien élément conservé, non aligné ; une programmation doit être revue avant envoi.','Previous item kept, unaligned; scheduling must be reviewed before sending.')}</p>}
   </div>)}</div>
   <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={retain} onChange={e=>setRetain(e.target.checked)}/>{t('Conserver mes éléments protégés et signaler leur éventuel désalignement. Cela ne valide pas les autres contenus à réviser.','Keep my protected items and flag potential misalignment. This does not approve other contents requiring revision.')}</label>
   <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={activate} data-confirm-strategy>{t('Confirmer et activer cet angle','Confirm and activate this angle')}</Button><Button variant="secondary" onClick={()=>setPreparation(null)} disabled={busy}>{t('Annuler sans activer','Cancel without activating')}</Button></div>
  </section>}
  {data?.alignment.some(c=>!c.aligned&&!c.published)&&<details open data-strategy-misalignment><summary>{t('Contenus à préparer ou à contrôler','Contents to prepare or review')}</summary>{data.alignment.filter(c=>!c.aligned&&!c.published).map(c=><p key={`${c.module}:${c.contentId}`} className="text-sm">{c.module} · {c.protected?t('retouche protégée','protected edit'):t('révision nécessaire','revision needed')} · {c.reason}</p>)}</details>}
  {(error||loadError)&&<p role="alert" className="text-sm text-red-700">{error||loadError}</p>}
 </Card>;
}
