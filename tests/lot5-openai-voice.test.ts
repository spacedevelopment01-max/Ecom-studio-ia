/** Fournisseur entièrement simulé ; base, stockage, réservation et outils audio réels isolés. */
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const mock=vi.hoisted(()=>({speech:vi.fn(),options:vi.fn()}));
vi.mock('@/lib/ai/openai-images',async original=>({...await original<any>(),openaiClient:()=>({withOptions:(options:unknown)=>{mock.options(options);return {audio:{speech:{create:mock.speech}}};}})}));
import {createUser} from '@/lib/auth';
import {seedImageFixture} from './image-v2-fixtures';
import {grantProjectPlan} from './communication-choice-fixture';
import {all,one,run} from '@/lib/db';
import {setSetting} from '@/lib/settings';
import {tmpDir,readFile,fileExists,storagePath} from '@/lib/storage';
import {assetData} from '@/lib/library';
import {acquiredVoice,voiceAcquisitionInfo,voiceQuote,OPENAI_VOICE_MODEL} from '@/lib/video-v2/openai-voice';
import {withTrace} from '@/lib/ai/trace';
import {loadProject} from '@/lib/projects';
import {rememberPreference,loadCreativeMemory} from '@/lib/video-v2/creative-memory';
import {addVoice,buildSceneDoc,localScenePlan,sceneTiming} from '@/lib/video-v2/three-scenes';
import {buildCreativeBrief} from '@/lib/video-v2/creative-brief';
import {saveVideoVersion,latestVideo} from '@/lib/video-v2/store';
import {projectVoice,voiceAvailable} from '@/lib/video-v2/voice';
import {sceneChainQuote} from '@/lib/video-v2/chain-quote';
import {quoteVoiceRevision,documentVoiceProfile,applyVoiceRevision}from '@/lib/video-v2/voice-revision';
import {remember}from '@/lib/projects';
import {mixAudio,measureAudio} from '@/lib/video-v2/audio';
let wave:Buffer;
const keys=["provider.openai.apiKey","provider.openai.disabled","ai.prices.checkedAt"];
let originalSettings:({key:string;value:string;secret:number;updated_at:number}|null)[]=[];
beforeEach(()=>{
 originalSettings=keys.map(key=>one<{key:string;value:string;secret:number;updated_at:number}>("SELECT key,value,secret,updated_at FROM settings WHERE key=?",key)??null);
 mock.speech.mockReset();mock.options.mockReset();
 setSetting('provider.openai.apiKey','fixture-only-not-a-secret');setSetting('provider.openai.disabled',null);
 const dir=tmpDir('voice-fixture');try{const file=path.join(dir,'tone.wav');execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','sine=frequency=330:duration=0.5',file]);wave=fs.readFileSync(file);}finally{fs.rmSync(dir,{recursive:true,force:true});}
 mock.speech.mockImplementation(async()=>({arrayBuffer:async()=>wave}));
 vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Real network forbidden');}));
});
afterEach(()=>{vi.unstubAllGlobals();for(const[key,row]of keys.map((key,i)=>[key,originalSettings[i]] as const)){if(row)run("INSERT INTO settings(key,value,secret,updated_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,secret=excluded.secret,updated_at=excluded.updated_at",row.key,row.value,row.secret,row.updated_at);else run("DELETE FROM settings WHERE key=?",key);}});
const options={voice:'openai:nova',speed:1,lang:'fr' as const};
async function fixture(){const u=await createUser(`voice-${crypto.randomUUID()}@test.invalid`,'motdepasse-test','Fixture');const projectId=seedImageFixture(u.id,'hightech');grantProjectPlan(projectId,'dominer');return {userId:u.id,projectId};}
it('réserve, acquiert, trace et réouvre la même voix sans la repayer, même après changement de job',async()=>{
 const ctx=await fixture(),text='Une phrase française, entière et fidèle.';
 const first=await acquiredVoice(ctx,text,options),second=await acquiredVoice({...ctx,jobId:'another-job'},text,options);
 expect(second.id).toBe(first.id);expect(assetData(second)).toEqual(wave);expect(mock.speech).toHaveBeenCalledTimes(1);
 expect(mock.speech.mock.calls[0][0]).toMatchObject({model:OPENAI_VOICE_MODEL,input:text,voice:'nova',response_format:'wav'});
 expect(mock.options).toHaveBeenCalledWith({baseURL:'https://api.openai.com/v1',timeout:60000,maxRetries:0});
 const usage=all<any>('SELECT * FROM usage_events WHERE project_id=?',ctx.projectId);expect(usage).toHaveLength(1);expect(usage[0].estimated).toBe(1);
 expect(usage[0].cost).toBe(voiceQuote(text).estimateMicro);
 expect(all<any>('SELECT * FROM ai_calls WHERE project_id=?',ctx.projectId)[0]).toMatchObject({status:'ok',usage_event_id:usage[0].id,served_model:null});
 expect(all<any>('SELECT * FROM ai_reservations WHERE project_id=?',ctx.projectId)[0]).toMatchObject({status:'settled'});
});
it('un plafond insuffisant bloque avant le fournisseur sans modifier le plafond',async()=>{
 const ctx=await fixture();await expect(withTrace({costCapMicro:1},()=>acquiredVoice(ctx,'Phrase à budget borné.',options))).rejects.toThrow(/plafond/);expect(mock.speech).not.toHaveBeenCalled();
});
it('un compte sans forfait, une clé désactivée et une voix non choisie bloquent avant envoi',async()=>{
 const ctx=await fixture();setSetting('provider.openai.disabled','1');await expect(acquiredVoice(ctx,'Bonjour.',options)).rejects.toThrow(/indisponible/);expect(mock.speech).not.toHaveBeenCalled();
 setSetting('provider.openai.disabled',null);await expect(acquiredVoice(ctx,'Bonjour.',{...options,voice:'arbitrary'})).rejects.toThrow(/non sélectionnée/);
 const u=await createUser(`voice-noplan-${crypto.randomUUID()}@test.invalid`,'motdepasse-test','Fixture');await expect(acquiredVoice({userId:u.id,projectId:seedImageFixture(u.id,'hightech')},'Bonjour.',options)).rejects.toThrow();expect(mock.speech).not.toHaveBeenCalled();
});
it.each([401,403,429,500,408])('échec %s : pas de retry caché, coût et statut explicites',async status=>{
 const ctx=await fixture();mock.speech.mockRejectedValueOnce(Object.assign(new Error('private provider body must never escape'),{status}));
 await expect(acquiredVoice(ctx,'Phrase de refus.',options)).rejects.toThrow(/aucune relance/);expect(mock.speech).toHaveBeenCalledTimes(1);
 expect(one<any>('SELECT status FROM ai_reservations WHERE project_id=?',ctx.projectId)?.status).toBe(status>=500||status===408?'uncertain':'released');
 expect(JSON.stringify(all('SELECT error_kind FROM ai_calls WHERE project_id=?',ctx.projectId))).not.toContain('private provider');
 if(status>=500||status===408){await expect(acquiredVoice(ctx,'Phrase de refus.',options)).rejects.toThrow();expect(mock.speech).toHaveBeenCalledTimes(1);}
});
it('des prix périmés empêchent le nouvel achat sans affecter les acquis',async()=>{
 const ctx=await fixture();const first=await acquiredVoice(ctx,'Phrase acquise.',options);
 setSetting('ai.prices.checkedAt',String(Date.now()-91*86400000));
 try{expect((await acquiredVoice(ctx,'Phrase acquise.',options)).id).toBe(first.id);await expect(acquiredVoice(ctx,'Nouvelle phrase.',options)).rejects.toThrow(/Tarifs|tarifs/);expect(mock.speech).toHaveBeenCalledTimes(1);}finally{setSetting('ai.prices.checkedAt',null);}
});
it('une baisse au forfait sans vidéo IA garde les acquis et bloque la nouvelle synthèse',async()=>{
 const ctx=await fixture(),first=await acquiredVoice(ctx,'Acquis conservé.',options);grantProjectPlan(ctx.projectId,'creer');
 expect((await acquiredVoice(ctx,'Acquis conservé.',options)).id).toBe(first.id);await expect(acquiredVoice(ctx,'Nouvel audio.',options)).rejects.toThrow(/vidéos IA/);expect(mock.speech).toHaveBeenCalledTimes(1);
});
it('deux demandes concurrentes ne déclenchent qu’une seule synthèse payante',async()=>{
 const ctx=await fixture();const out=await Promise.allSettled([acquiredVoice(ctx,'Concurrence contrôlée.',options),acquiredVoice(ctx,'Concurrence contrôlée.',options)]);expect(mock.speech).toHaveBeenCalledTimes(1);expect(out.filter(r=>r.status==='fulfilled')).toHaveLength(1);
});
it('audio illisible payé : original conservé et aucune répétition de l’appel',async()=>{
 const ctx=await fixture();mock.speech.mockResolvedValueOnce({arrayBuffer:async()=>Buffer.from('broken audio')});
 await expect(acquiredVoice(ctx,'Ne pas repayer.',options)).rejects.toThrow(/illisible/);await expect(acquiredVoice(ctx,'Ne pas repayer.',options)).rejects.toThrow(/illisible/);expect(mock.speech).toHaveBeenCalledTimes(1);
 const r=one<any>('SELECT result FROM ai_reservations WHERE project_id=?',ctx.projectId);expect(fileExists(JSON.parse(r.result).file)).toBe(true);
});
it('parcours guidé : choix, devis non gratuit, phrases acquises, sauvegarde/reprise et véritable mixage audio',async()=>{
 const ctx=await fixture(),p=loadProject(ctx.projectId);
 expect(projectVoice(loadCreativeMemory(p.id).preferences)).toBeNull();
 for(const[k,v]of Object.entries({voice:'on',voiceId:'openai:nova',voiceConsent:'synthetic'}))rememberPreference(p.id,k as 'voice'|'voiceId'|'voiceConsent',v);
 expect(projectVoice(loadCreativeMemory(p.id).preferences)).toBe('openai:nova');expect(voiceAvailable()).toBe(true);
 const quote=sceneChainQuote(p,{as:'post',mode:'stock',scenes:3,totalS:15});expect(quote.steps.find(s=>s.id==='voice')?.totalMicro).toBeGreaterThan(0);
 const plan=localScenePlan(p,null,{as:'post',scenes:3});plan.scenes.forEach((s,k)=>s.voice=`Phrase ${k+1} entière.`);plan.voiceEnd='Conclusion.';
 const brief=buildCreativeBrief(p,{durationS:15,width:1080,height:1920,platform:'reels'});brief.voice.kokoroVoice='openai:nova';
 const doc=buildSceneDoc(p,[0,1,2].map(k=>({assetId:`fixture-${k}`,generated:false,durationS:5})),plan,'9:16','post',sceneTiming(3,15));
 await addVoice(p.id,p.userId,doc,plan,brief,'job-a',[55,75]);expect(mock.speech).toHaveBeenCalledTimes(3);expect(doc.audio.voiceId).toBe('openai:nova');expect(doc.audio.voice.every(v=>v.durationS===.5)).toBe(true);
 saveVideoVersion(p.id,'voice-fixture',doc,{note:'Données de test isolées'});const reopened=latestVideo(p.id,'voice-fixture')!.doc;expect(reopened.audio.voice.map(v=>v.assetId)).toEqual(doc.audio.voice.map(v=>v.assetId));
 await addVoice(p.id,p.userId,reopened,plan,brief,'job-b',[55,75]);expect(mock.speech).toHaveBeenCalledTimes(3);
 expect(reopened.subtitles.cues.map(c=>c.text).join(' ')).toBe('Phrase 1 entière. Phrase 2 entière. Phrase 3 entière. Conclusion.');
 const dir=tmpDir('voice-mix');try{const output=path.join(dir,'mix.wav');await mixAudio(reopened,{voice:new Map(reopened.audio.voice.map(v=>[v.id,storagePath(one<any>('SELECT storage_key FROM assets WHERE id=?',v.assetId).storage_key)])),sfx:new Map(),music:null},output);const measured=await measureAudio(output);expect(measured.silent).toBe(false);expect(measured.durationS).toBeCloseTo(15,1);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
it('historique Kokoro et absence de voix ne sont jamais remplacés implicitement',()=>{
 expect(projectVoice({voice:'on',voiceId:'ff_siwis',voiceConsent:'synthetic'})).toBe('ff_siwis');expect(projectVoice({voice:'off',voiceId:'openai:nova',voiceConsent:'synthetic'})).toBeNull();expect(projectVoice({voice:'on',voiceId:'openai:nova'})).toBeNull();expect(mock.speech).not.toHaveBeenCalled();
});
it('parcours libre : branche voix native, montage MP4 avec audio, réouverture et nouveau rendu sans synthèse',async()=>{
 const ctx=await fixture(),p=loadProject(ctx.projectId);
 const {seedCutout}=await import('./image-v2-fixtures');await seedCutout(p.userId,p.id);
 for(const[k,v]of Object.entries({voice:'on',voiceId:'openai:nova',voiceConsent:'synthetic'}))rememberPreference(p.id,k as 'voice'|'voiceId'|'voiceConsent',v);
 const {realVideoDeps}=await import('@/lib/video-v2/deps');
 const {mockVideoDeps,shortVideoScript}=await import('./video-v2-mock');
 const {runVideoEngineV2,renderLatest}=await import('@/lib/video-v2/engine');
 const {getAsset}=await import('@/lib/library');
 const {deps}=mockVideoDeps({userId:p.userId,projectId:p.id,canWrite:true,script:shortVideoScript});
 const native=realVideoDeps(null,p,true);deps.voice=native.voice;deps.voiceId=native.voiceId;
 const result=await runVideoEngineV2(null,p.id,{ask:{text:'Publicité de 15 secondes'},approveGeneration:true,renderScale:.1,fps:3},deps);
 expect(result.videoAssetId).toBeTruthy();const calls=mock.speech.mock.calls.length;expect(calls).toBeGreaterThan(0);
 const saved=latestVideo(p.id,result.docKey!)!.doc;expect(saved.audio.voiceId).toBe('openai:nova');expect(saved.audio.voice.every(v=>v.assetId&&v.durationS===.5)).toBe(true);
 const dir=tmpDir('voice-final-probe');try{const file=path.join(dir,'result.mp4');fs.writeFileSync(file,assetData(getAsset(result.videoAssetId!)!));const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',file]).toString());expect(probe.streams.some((s:any)=>s.codec_type==='audio')).toBe(true);}finally{fs.rmSync(dir,{recursive:true,force:true});}
 await renderLatest(null,p.id,result.docKey!,{scale:.1,fps:3});expect(mock.speech).toHaveBeenCalledTimes(calls);
},120000);
it('ne coupe pas un texte long pour le faire passer',()=>{expect(()=>voiceQuote('x'.repeat(4097))).toThrow(/4096/);});

it('le devis lit le reçu acquis sans clé ni budget et ne réserve rien',async()=>{
 const ctx=await fixture(),text='Une seule phrase exacte.\nDeux  espaces.';expect(voiceAcquisitionInfo(ctx,text,options)).toMatchObject({state:'new'});expect(mock.speech).not.toHaveBeenCalled();
 const asset=await acquiredVoice(ctx,text,options);setSetting('provider.openai.disabled','1');run('UPDATE wallets SET monthly_used=monthly_allowance');const ledger=()=>['ai_reservations','ai_calls','usage_events'].map(t=>all('SELECT id FROM '+t+' WHERE project_id=?',ctx.projectId)),before=ledger();
 expect(voiceAcquisitionInfo(ctx,text,options)).toMatchObject({state:'asset',assetId:asset.id,version:asset.version});expect(ledger()).toEqual(before);expect(mock.speech).toHaveBeenCalledTimes(1);expect(fetch).not.toHaveBeenCalled();
});
it('un reçu incertain est bloqué en lecture seule au lieu de proposer un rachat',async()=>{
 const ctx=await fixture(),text='Phrase interrompue entière.';mock.speech.mockRejectedValueOnce(Object.assign(new Error('faux503 privé'),{status:503}));await expect(acquiredVoice(ctx,text,options)).rejects.toThrow('aucune relance');const before=all('SELECT id,status FROM ai_reservations WHERE project_id=?',ctx.projectId);
 expect(voiceAcquisitionInfo(ctx,text,options)).toMatchObject({state:'blocked',reason:'VOICE_RESULT_PENDING'});expect(all('SELECT id,status FROM ai_reservations WHERE project_id=?',ctx.projectId)).toEqual(before);expect(mock.speech).toHaveBeenCalledTimes(1);
});
it('un original vocal payé mais illisible reste acquis sans nouvel achat proposé',async()=>{
 const ctx=await fixture(),text='Garder cet original.';mock.speech.mockResolvedValueOnce({arrayBuffer:async()=>Buffer.from('faux audio cassé')});await expect(acquiredVoice(ctx,text,options)).rejects.toThrow('illisible');expect(voiceAcquisitionInfo(ctx,text,options)).toMatchObject({state:'blocked',reason:'VOICE_FILE_UNREADABLE'});expect(mock.speech).toHaveBeenCalledTimes(1);expect(all('SELECT id FROM ai_reservations WHERE project_id=?',ctx.projectId)).toHaveLength(1);
});

async function voicedRevisionFixture(){const ctx=await fixture(),p=loadProject(ctx.projectId);for(const[k,v]of Object.entries({voice:'on',voiceId:'openai:nova',voiceConsent:'synthetic'}))rememberPreference(p.id,k as 'voice'|'voiceId'|'voiceConsent',v);const plan=localScenePlan(p,null,{as:'post',scenes:2,totalS:10});plan.scenes.forEach((s,k)=>s.voice=`Phrase entière ${k+1}.`);plan.voiceEnd='';const brief=buildCreativeBrief(p,{durationS:10,width:1080,height:1920,platform:'reels'});brief.voice.kokoroVoice='openai:nova';const doc=buildSceneDoc(p,[0,1].map(k=>({assetId:'fixture-'+k,generated:false,durationS:5})),plan,'9:16','post',sceneTiming(2,10));await addVoice(p.id,p.userId,doc,plan,brief,'native-voice-source',[55,75]);const profile={id:'openai:nova',speed:brief.voice.speed,lang:'fr' as const};doc.meta.editorial={voiceProfile:profile};return{ctx,p,doc,profile};}
it('voix seule : devis limité à une phrase changée, sans modifier le document ni racheter les clips',async()=>{const f=await voicedRevisionFixture(),before=structuredClone(f.doc),ledger=all('SELECT id FROM ai_reservations WHERE project_id=?',f.p.id),q=quoteVoiceRevision(f.p.id,'native-source',f.doc,{changes:[{clipId:f.doc.clips[0].id,text:'Une phrase corrigée.'}],captions:'keep'});expect(q).toMatchObject({maximumCalls:1,clipsPurchased:0,profile:f.profile});expect(q.capMicro).toBeGreaterThan(0);expect(mock.speech).toHaveBeenCalledTimes(2);expect(all('SELECT id FROM ai_reservations WHERE project_id=?',f.p.id)).toEqual(ledger);expect(f.doc).toEqual(before);expect(fetch).not.toHaveBeenCalled();});
it('voix seule : phrase inchangée ou déjà acquise se chiffre à zéro, fournisseur fermé',async()=>{const f=await voicedRevisionFixture(),clipId=f.doc.clips[0].id,text='Correction déjà acquise.';await acquiredVoice(f.ctx,text,{voice:f.profile.id,speed:f.profile.speed,lang:f.profile.lang});setSetting('provider.openai.disabled','1');run('UPDATE wallets SET monthly_used=monthly_allowance');expect(quoteVoiceRevision(f.p.id,'native-source',f.doc,{changes:[{clipId,text:f.doc.audio.voice[0].text}],captions:'keep'})).toMatchObject({maximumCalls:0,capMicro:0,lines:[{state:'keep'}]});expect(quoteVoiceRevision(f.p.id,'native-source',f.doc,{changes:[{clipId,text}],captions:'follow_changed_voice'})).toMatchObject({maximumCalls:0,capMicro:0,lines:[{state:'acquired'}]});expect(mock.speech).toHaveBeenCalledTimes(3);});
it('un ancien profil B2 se retrouve sans adopter la langue actuelle du projet',async()=>{const f=await voicedRevisionFixture();delete f.doc.meta.editorial!.voiceProfile;remember(f.p.id,{kind:'artifact',key:'agent.video.generation.profile-fixture',value:JSON.stringify({docKey:'legacy-source',cost:{voice:f.profile},request:{key:'native-voice-source'}}),source:'local',origin:'system',status:'inferred'});run("UPDATE projects SET settings_json=json_set(settings_json,'$.language','en') WHERE id=?",f.p.id);expect(documentVoiceProfile(f.p.id,'legacy-source',f.doc)).toEqual(f.profile);expect(quoteVoiceRevision(f.p.id,'legacy-source',f.doc,{changes:[{clipId:f.doc.clips[0].id,text:'Phrase corrigée entière.'}],captions:'keep'}).profile.lang).toBe('fr');expect(mock.speech).toHaveBeenCalledTimes(2);});
it('un profil vocal original non prouvé ne bascule pas vers un nouveau timbre',async()=>{const f=await voicedRevisionFixture();delete f.doc.meta.editorial!.voiceProfile;expect(()=>quoteVoiceRevision(f.p.id,'unknown-source',f.doc,{changes:[{clipId:f.doc.clips[0].id,text:'Phrase précise.'}],captions:'keep'})).toThrow('profil original');expect(mock.speech).toHaveBeenCalledTimes(2);});

it('corrige une seule voix, garde l’autre audio, les clips, la musique et les sous-titres manuels',async()=>{const f=await voicedRevisionFixture();f.doc.audio.voice[1].gainDb=-3;f.doc.audio.voice[1].offsetS=.1;f.doc.audio.duckingDb=-9;const original=structuredClone(f.doc);run("UPDATE projects SET settings_json=json_set(settings_json,'$.language','en') WHERE id=?",f.p.id);const text='  La phrase entière.\nDeux  espaces.  ',q=quoteVoiceRevision(f.p.id,'native-source',f.doc,{changes:[{clipId:f.doc.clips[0].id,text}],captions:'keep'}),r=await withTrace({costCapMicro:q.capMicro},()=>applyVoiceRevision(f.p.id,'native-source',f.doc,q));expect(r.changed).toBe(true);expect(r.doc.clips).toEqual(original.clips);expect(r.doc.audio.voice[1]).toEqual(original.audio.voice[1]);expect(r.doc.audio.duckingDb).toBe(-9);expect(r.doc.audio.music).toEqual(original.audio.music);expect(r.doc.subtitles).toEqual(original.subtitles);expect(r.doc.audio.voice[0].text).toBe(text);expect(mock.speech.mock.calls.at(-1)?.[0].input).toBe(text);expect(q.lines[0].text).toBe(text);expect(f.doc).toEqual(original);expect(mock.speech).toHaveBeenCalledTimes(3);const a=await import('@/lib/library');expect(a.assetMeta<any>(a.getAsset(r.doc.audio.voice[0].assetId!)!).voice).toMatchObject({id:f.profile.id,speed:f.profile.speed,lang:'fr'});});
it('une voix inchangée n’entraîne ni synthèse ni modification même si les pistes sont rangées autrement',async()=>{const f=await voicedRevisionFixture();f.doc.audio.voice.reverse();const old=structuredClone(f.doc),clip=f.doc.clips[0],v=f.doc.audio.voice.find(v=>v.clipId===clip.id)!,q=quoteVoiceRevision(f.p.id,'native-source',f.doc,{changes:[{clipId:clip.id,text:v.text}],captions:'keep'});setSetting('provider.openai.disabled','1');const r=await applyVoiceRevision(f.p.id,'native-source',f.doc,q);expect(r).toMatchObject({changed:false,doc:old});expect(mock.speech).toHaveBeenCalledTimes(2);});
it('la mise à jour de sous-titres choisie explicitement garde ceux des autres plans',async()=>{const f=await voicedRevisionFixture(),original=structuredClone(f.doc),text='Sous-titre corrigé entier.',q=quoteVoiceRevision(f.p.id,'native-source',f.doc,{changes:[{clipId:f.doc.clips[0].id,text}],captions:'follow_changed_voice'}),r=await applyVoiceRevision(f.p.id,'native-source',f.doc,q);expect(r.doc.subtitles.cues.filter(c=>c.clipId===f.doc.clips[1].id)).toEqual(original.subtitles.cues.filter(c=>c.clipId===f.doc.clips[1].id));expect(r.doc.subtitles.cues.filter(c=>c.clipId===f.doc.clips[0].id).map(c=>c.text).join(' ')).toBe(text);expect(r.doc.subtitles.style).toEqual(original.subtitles.style);expect(f.doc).toEqual(original);expect(mock.speech).toHaveBeenCalledTimes(3);});
it('un échec vocal incertain ne modifie pas le document et ne peut pas être relancé automatiquement',async()=>{const f=await voicedRevisionFixture(),before=structuredClone(f.doc),q=quoteVoiceRevision(f.p.id,'native-source',f.doc,{changes:[{clipId:f.doc.clips[0].id,text:'Phrase de remplacement.'}],captions:'keep'});mock.speech.mockRejectedValueOnce(Object.assign(new Error('faux503'),{status:503}));await expect(applyVoiceRevision(f.p.id,'native-source',f.doc,q)).rejects.toThrow('aucune relance');expect(f.doc).toEqual(before);await expect(applyVoiceRevision(f.p.id,'native-source',f.doc,q)).rejects.toThrow('Aucun rachat');expect(mock.speech).toHaveBeenCalledTimes(3);expect(one<any>("SELECT COUNT(*) n FROM ai_reservations WHERE project_id=? AND status='uncertain'",f.p.id)?.n).toBe(1);});
