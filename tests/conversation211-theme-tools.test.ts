/** D2 : vrai moteur d'opérations/versions, sélection IA simulée, aucun fournisseur ni réseau. */
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {account,project,sender} from './conversation209-fixtures';
import {openProjectConversation,conversationView} from '@/lib/orchestrator/conversation';
import {metaOf,ownedConversation} from '@/lib/orchestrator/conversation/store';
import {quoteThemeChange,confirmThemeChange,runThemeChange,themeChangeReceipt,quoteThemeUndo,themeToolsRegistry} from '@/lib/orchestrator/conversation/theme-tool-execution';
import {ThemeToolCommandSchema,ThemeToolPlanSchema,type ThemeToolPlan} from '@/lib/orchestrator/conversation/theme-tool-contract';
import {seedAgentUiSite} from '../scripts/agent211-ui-fixtures';
import {currentTheme,saveThemeVersion} from '@/lib/projects';
import {all,id,one,run} from '@/lib/db';
import {JobContext,claimNext,completeJob,type Job} from '@/lib/jobs';
import {balance} from '@/lib/billing';
import {themeToolContext,themeTargetPaths} from '@/lib/orchestrator/conversation/theme-tool-context';
import {saveAsset} from '@/lib/library';
import sharp from 'sharp';
beforeEach(()=>{for(const key of ['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_SPECIALISTS','STUDIO_CONVERSATION_TOOLS','STUDIO_CONVERSATION_THEME_TOOLS'])vi.stubEnv(key,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun réseau D2');}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function fixture(business:'products'|'services'='products'){
  const u=await account(),pid=project(u,business),c=openProjectConversation(u,pid),send=sender(u,c.id),replacement=business==='services'?'Un instrument confié, une réparation à préparer ensemble.':'Vos ruches, vos observations, vos décisions.';
  await send({action:'message',text:`Remplace le titre principal de l’accueil par « ${replacement} ».`});await seedAgentUiSite(pid,business);
  const cur=currentTheme(pid)!,target=themeToolContext(pid).targets!.find(s=>s.template==='index'&&s.fields.some(f=>f.key==='heading'))!;
  const plan:ThemeToolPlan={tool:'theme.edit',versionId:cur.version.id,summary:'Remplacer le titre par les mots exacts du client.',ops:[{op:'set_setting',template:'index',section:target.section,key:'heading',value:replacement}]};
  const propose=(value:ThemeToolPlan=plan)=>{const row=ownedConversation(u,c.id),m=metaOf(row),v=conversationView(u,c.id),receipt=id();m.intelligence={lastReceiptId:receipt,sourceRevision:row.revision,sourceProjectRevision:v.projectRevision,lastReply:{message:'Je propose cette retouche ; elle attend votre confirmation.',status:'answer',business:null,businessEvidence:null,question:null,proposedChanges:[],knowledgeSourceIds:[],proposedTools:['theme.edit'],themePlan:value,actionsExecuted:false}};run('UPDATE agent_conversations SET state_json=? WHERE id=?',JSON.stringify(m),c.id);return receipt;};
  const quote=(value:ThemeToolPlan=plan)=>{const receipt=propose(value),v=conversationView(u,c.id);return quoteThemeChange(u,c.id,{action:'quote',revision:v.revision,projectRevision:v.projectRevision!,proposalReceiptId:receipt});};
  const confirm=(qid:string)=>confirmThemeChange(u,c.id,{action:'confirm',quoteId:qid,confirmation:true,requestId:id()});
  return{u,pid,c,send,plan,quote,confirm,replacement,initial:cur};
}
async function finish(){const j=claimNext(['agent.theme.change'])!;const result=await runThemeChange(new JobContext(j));completeJob(j.id,result);return{j,result};}
describe('#211 D2 — retouche exacte et annulation depuis SYNA',()=>{
  it.each(['products','services']as const)('modifie une vraie version puis annule sans appel IA ni perte (%s)',async business=>{
    const f=await fixture(business),before=balance(f.u.id),q=f.quote();expect(q.costPct).toBe(0);expect(q.confirmationRequired).toBe(true);expect(q.changes[0].after).toBe(f.replacement);expect(currentTheme(f.pid)!.version.id).toBe(f.initial.version.id);
    const pending=f.confirm(q.id);expect(pending.delivered).toBe(false);expect(f.confirm(q.id).job!.id).toBe(pending.job!.id);await finish();
    const r=themeChangeReceipt(f.u,f.c.id,q.id);expect(r).toMatchObject({delivered:true,recorded:true,canUndo:true,version:{number:2,isCurrent:true}});expect(currentTheme(f.pid)!.spec.templates.index.sections[f.plan.ops[0].section].settings.heading).toBe(f.replacement);
    expect(themeToolsRegistry(f.u,f.c.id).receipts[0].id).toBe(q.id);const undo=quoteThemeUndo(f.u,f.c.id,{action:'quote-undo',receiptId:q.id,currentVersionId:r.version!.id});expect(undo.costPct).toBe(0);f.confirm(undo.id);await finish();
    const restored=currentTheme(f.pid)!;expect(restored.version.number).toBe(3);expect(restored.spec).toEqual(f.initial.spec);expect(all('SELECT id FROM theme_versions WHERE project_id=?',f.pid)).toHaveLength(3);expect(balance(f.u.id)).toEqual(before);expect(all('SELECT id FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0);
  });
  it('préserve la version après un crash entre sauvegarde et fermeture du job ; reprise idempotente',async()=>{
    const f=await fixture(),q=f.quote();f.confirm(q.id);const j=claimNext(['agent.theme.change'])!,first=await runThemeChange(new JobContext(j));
    expect(themeChangeReceipt(f.u,f.c.id,q.id)).toMatchObject({delivered:false,recorded:true,state:'version_recorded_job_unfinished'});const again=await runThemeChange(new JobContext(j));expect(again.versionId).toBe(first.versionId);expect(again.reused).toBe(true);expect(all('SELECT id FROM theme_versions WHERE project_id=?',f.pid)).toHaveLength(2);completeJob(j.id,again);expect(themeChangeReceipt(f.u,f.c.id,q.id).delivered).toBe(true);
  });
  it('ne confond pas un job done avec une modification effectivement enregistrée',async()=>{
    const f=await fixture(),q=f.quote(),r=f.confirm(q.id);run("UPDATE jobs SET status='done',result=? WHERE id=?",JSON.stringify({versionId:f.initial.version.id}),r.job!.id);expect(themeChangeReceipt(f.u,f.c.id,q.id)).toMatchObject({state:'result_missing',delivered:false,recorded:false});expect(currentTheme(f.pid)!.version.id).toBe(f.initial.version.id);
  });
  it('ne déverrouille pas une section validée, même explicitement ciblée par le modèle',async()=>{
    const f=await fixture(),spec=structuredClone(f.initial.spec);spec.locks.push(`index:${f.plan.ops[0].section}`);const v=saveThemeVersion(f.pid,spec,'Verrou client','user');f.plan.versionId=v.id;
    expect(()=>f.quote()).toThrow(/verrouill/);expect(currentTheme(f.pid)!.spec.locks).toContain(`index:${f.plan.ops[0].section}`);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
  });
  it('refuse le lot entier si une opération est invalide, sans version partielle',async()=>{
    const f=await fixture();const plan={...f.plan,ops:[...f.plan.ops,{op:'set_setting' as const,template:'index',section:'introuvable',key:'heading',value:f.replacement}]};expect(()=>f.quote(plan)).toThrow();expect(all('SELECT id FROM theme_versions WHERE project_id=?',f.pid)).toHaveLength(1);
  });
  it('refuse les inventions, scripts, changements de structure et cibles en double',async()=>{
    const f=await fixture();expect(()=>f.quote({...f.plan,ops:[{...f.plan.ops[0],op:'set_setting',value:'Garantie 10 ans et livraison sous 24 heures.'}]})).toThrow('texte exact');
    expect(ThemeToolPlanSchema.safeParse({...f.plan,ops:[{op:'custom_section',liquid:'<script>alert(1)</script>'}]}).success).toBe(false);expect(ThemeToolPlanSchema.safeParse({...f.plan,ops:[f.plan.ops[0],f.plan.ops[0]]}).success).toBe(false);
    expect(ThemeToolCommandSchema.safeParse({action:'confirm',quoteId:id(),confirmation:true,requestId:id(),ops:[],overrideLocks:true}).success).toBe(false);
    await f.send({action:'message',text:'Remplace le titre par <script>alert(1)</script>.'});expect(()=>f.quote({...f.plan,ops:[{...f.plan.ops[0],op:'set_setting',value:'<script>alert(1)</script>'}]})).toThrow('actif');
  });
  it('protège droits révoqués, autre compte et modification concurrente avant confirmation',async()=>{
    const f=await fixture(),other=await fixture(),q=f.quote();expect(()=>themeToolsRegistry(other.u,f.c.id)).toThrow('introuvable');expect(()=>confirmThemeChange(other.u,other.c.id,{action:'confirm',quoteId:q.id,confirmation:true,requestId:id()})).toThrow('introuvable');
    saveThemeVersion(f.pid,f.initial.spec,'Modification manuelle concurrente','user');expect(()=>f.confirm(q.id)).toThrow('changé');expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
    f.plan.versionId=currentTheme(f.pid)!.version.id;const fresh=f.quote();run("UPDATE subscriptions SET status='cancelled' WHERE project_id=?",f.pid);expect(()=>f.confirm(fresh.id)).toThrow();
  });
  it('vérifie encore la version dans le worker et refuse une annulation après modification manuelle',async()=>{
    const f=await fixture(),q=f.quote();f.confirm(q.id);const manual=saveThemeVersion(f.pid,f.initial.spec,'Changement pendant la file','user');const j=claimNext(['agent.theme.change'])!;await expect(runThemeChange(new JobContext(j))).rejects.toThrow('changé');expect(currentTheme(f.pid)!.version.id).toBe(manual.id);
    const next=await fixture(),q2=next.quote();next.confirm(q2.id);await finish();const r=themeChangeReceipt(next.u,next.c.id,q2.id);const changed=saveThemeVersion(next.pid,currentTheme(next.pid)!.spec,'Changement après retouche','user');expect(()=>quoteThemeUndo(next.u,next.c.id,{action:'quote-undo',receiptId:q2.id,currentVersionId:changed.id})).toThrow('préserver');expect(currentTheme(next.pid)!.version.id).toBe(changed.id);expect(r.delivered).toBe(true);
  });
  it('reste gratuit même si le budget IA est épuisé ; désactivation fermée par défaut',async()=>{
    const f=await fixture();run('UPDATE wallets SET monthly_used=monthly_allowance WHERE user_id=?',f.u.id);const before=balance(f.u.id),q=f.quote();f.confirm(q.id);await finish();expect(balance(f.u.id)).toEqual(before);expect(themeChangeReceipt(f.u,f.c.id,q.id).delivered).toBe(true);
    vi.stubEnv('STUDIO_CONVERSATION_THEME_TOOLS','0');expect(()=>themeToolsRegistry(f.u,f.c.id)).toThrow('indisponibles');
  });
  it('refuse un média étranger et revérifie sa disponibilité après devis',async()=>{
    const f=await fixture(),other=await fixture(),target=themeToolContext(f.pid).targets!.find(t=>t.fields.some(d=>d.type==='image_picker'))!,key=target.fields.find(d=>d.type==='image_picker')!.key;
    const mediaPlan=(assetId:string):ThemeToolPlan=>({...f.plan,ops:[{op:'use_media',template:target.template,section:target.section,key,assetId}]});
    expect(()=>f.quote(mediaPlan(Object.values(other.initial.spec.files)[0]))).toThrow('Image du projet');
    const own=await saveAsset({projectId:f.pid,userId:f.u.id,name:'image-de-test-sans-photo-client.png',mime:'image/png',data:await sharp({create:{width:32,height:32,channels:3,background:'#397453'}}).png().toBuffer(),origin:'upload',role:'hero'});
    const q=f.quote(mediaPlan(own.id));expect(q.changes[0].media?.afterAssetId).toBe(own.id);run('UPDATE assets SET deleted_at=? WHERE id=?',Date.now(),own.id);expect(()=>f.confirm(q.id)).toThrow('indisponible');expect(currentTheme(f.pid)!.version.id).toBe(f.initial.version.id);
  });
  it('ne crée pas une version inutile pour la même image sous un autre nom de fichier',async()=>{
    const f=await fixture(),target=themeToolContext(f.pid).targets!.find(t=>t.fields.some(d=>d.type==='image_picker'&&!!d.nativeMedia?.assetId))!,field=target.fields.find(d=>d.type==='image_picker'&&!!d.nativeMedia?.assetId)!;
    expect(()=>f.quote({...f.plan,ops:[{op:'use_media',template:target.template,section:target.section,key:field.key,assetId:field.nativeMedia!.assetId!}]})).toThrow('déjà en place');expect(all('SELECT id FROM theme_versions WHERE project_id=?',f.pid)).toHaveLength(1);
  });
  it('référence un champ long sans le tronquer et conserve son avant complet dans le devis',async()=>{
    const f=await fixture(),spec=structuredClone(f.initial.spec),long='Contenu natif intégral à conserver. '.repeat(150);spec.templates.index.sections[f.plan.ops[0].section].settings.heading=long;
    const v=saveThemeVersion(f.pid,spec,'Champ long de recette','user');f.plan.versionId=v.id;const context=themeToolContext(f.pid),field=context.targets!.find(t=>t.template==='index'&&t.section===f.plan.ops[0].section)!.fields.find(d=>d.key==='heading')!;
    expect(field.value).toBeUndefined();expect(field.valueRef).toMatchObject({versionId:v.id,characters:long.length,contentNotReadHere:true});const q=f.quote();expect(q.changes[0].before).toBe(long);expect(q.changes[0].after).toBe(f.replacement);
  });
  it('refuse un devis expiré sans écriture ni nouvelle tâche',async()=>{
    const f=await fixture(),q=f.quote();vi.spyOn(Date,'now').mockReturnValue(q.expiresAt+1);expect(()=>f.confirm(q.id)).toThrow('périmé');expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);expect(currentTheme(f.pid)!.version.id).toBe(f.initial.version.id);
  });
  it('n’active pas une version refusée au contrôle qualité par une annulation',async()=>{
    const f=await fixture(),q=f.quote();f.confirm(q.id);await finish();const r=themeChangeReceipt(f.u,f.c.id,q.id);run('UPDATE theme_versions SET qc=? WHERE id=?',JSON.stringify({gate:{verdict:'REJECTED'}}),f.initial.version.id);
    expect(()=>quoteThemeUndo(f.u,f.c.id,{action:'quote-undo',receiptId:q.id,currentVersionId:r.version!.id})).toThrow('pas utilisable');expect(currentTheme(f.pid)!.version.id).toBe(r.version!.id);
  });
  it('réutilise la proposition acquise après un échec local sans nouvel appel à SYNA',async()=>{
    const f=await fixture(),q=f.quote(),pending=f.confirm(q.id),source=conversationView(f.u,f.c.id);run("UPDATE jobs SET status='failed',error='Écriture locale interrompue avant application' WHERE id=?",pending.job!.id);
    const next=quoteThemeChange(f.u,f.c.id,{action:'quote',revision:source.revision,projectRevision:source.projectRevision!,proposalReceiptId:source.intelligence!.lastReceiptId!});expect(next.id).not.toBe(q.id);expect(next.costPct).toBe(0);f.confirm(next.id);await finish();expect(themeChangeReceipt(f.u,f.c.id,next.id).delivered).toBe(true);expect(all('SELECT id FROM theme_versions WHERE project_id=?',f.pid)).toHaveLength(2);expect(all('SELECT id FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0);
  });
  it('ne présente pas une section masquée ou un modèle orphelin comme une retouche visible',async()=>{
    const f=await fixture(),hidden=structuredClone(f.initial.spec);hidden.templates.index.sections[f.plan.ops[0].section].disabled=true;let v=saveThemeVersion(f.pid,hidden,'Masquer manuellement une section','user');f.plan.versionId=v.id;expect(()=>f.quote()).toThrow('masqué');
    const orphan=structuredClone(f.initial.spec);orphan.templates['page.orphelin']=structuredClone(orphan.templates.index);v=saveThemeVersion(f.pid,orphan,'Modèle sans page liée','user');f.plan.versionId=v.id;expect(()=>f.quote({...f.plan,ops:f.plan.ops.map(op=>({...op,template:'page.orphelin'}))})).toThrow('aucune page');expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
  });
  it('retrouve les vraies URL de fiches et de pages avec les affectations du renderer natif',async()=>{
    const f=await fixture(),spec=structuredClone(f.initial.spec);spec.store.product.template_suffix='detail';spec.templates['product.detail']=structuredClone(spec.templates.product);expect(themeTargetPaths(spec,'product.detail')).toContain(`/products/${spec.store.product.handle}`);
    spec.store.pages.push({handle:'offre-personnalisee',title:'Offre de recette',body_html:'<p>Contenu fictif.</p>',template_suffix:'offre-personnalisee'});spec.templates['page.offre-personnalisee']=structuredClone(spec.templates.index);expect(themeTargetPaths(spec,'page.offre-personnalisee')).toEqual(['/pages/offre-personnalisee']);expect(themeTargetPaths(spec,'group:header')).toEqual(['/']);
  });
  it('accepte un champ déjà correct avec une vraie modification, sans affaiblir le refus des lots invalides',async()=>{
    const f=await fixture(),op=f.plan.ops[0],eyebrow=String(f.initial.spec.templates.index.sections[op.section].settings.eyebrow);await f.send({action:'message',text:`Conserve exactement ce surtitre : ${eyebrow}. Remplace le titre par « ${f.replacement} ».`});
    const q=f.quote({...f.plan,ops:[{op:'set_setting',template:'index',section:op.section,key:'eyebrow',value:eyebrow},...f.plan.ops]});expect(q.changes).toHaveLength(2);f.confirm(q.id);await finish();expect(themeChangeReceipt(f.u,f.c.id,q.id).delivered).toBe(true);const actual=currentTheme(f.pid)!;expect(actual.spec.templates.index.sections[op.section].settings.eyebrow).toBe(eyebrow);expect(actual.spec.templates.index.sections[op.section].settings.heading).toBe(f.replacement);expect(actual.version.number).toBe(2);
  });
});
