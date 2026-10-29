/** Vrai moteur et vrais fichiers ; interruption/IA injectées, aucun fournisseur. */
import {it,expect,vi}from 'vitest';
import {createHash}from 'node:crypto';
vi.mock('@/lib/ai/config',async original=>({...await original<object>(),activeProviderKey:()=>null}));
import {fixture}from './preparation-fixtures';
import {validatedBrand,directionIdentity}from './preparation-mission-fixtures';
import {draftsFor,mockAi}from './logo-v2-mock';
import {artFixture}from './logo-v2-fixtures';
import {brandDiscovery}from '@/lib/logo-v2/discovery';
import {loadProject}from '@/lib/projects';
import {enqueue,JobContext,PermanentError,JobPaused,JobCancelled}from '@/lib/jobs';
import {runLogoEngineV2}from '@/lib/logo-v2/engine';
import {currentSeries}from '@/lib/logo-v2/direction-series';
import {REQUIRED_LOGO_PROVIDER,REQUIRED_LOGO_MODEL}from '@/lib/ai/logo-policy';
import {getAsset,assetData}from '@/lib/library';
import {all}from '@/lib/db';
import {reserve,settleUncertain}from '@/lib/billing';
import {routeFor}from '@/lib/ai/config';
for(const mode of ['uncertain','pause','cancel']as const)it(`conserve image acquise et original non livrables après ${mode}, sans autre dessin`,async()=>{
 const f=await fixture(),brand=validatedBrand(f.pid,f.input),brief=brandDiscovery(loadProject(f.pid)),drafts=draftsFor(brief).slice(0,3).map((t,i)=>({...t,identity:directionIdentity(i),typography:{...t.typography,rationale:'Hiérarchie de recette'},colorRole:{...t.colorRole,rationale:'Rôles cohérents'},style:(['typographic','monogram','gradient']as const)[i],symbolIdea:t.symbolIdea??null,descriptor:null,imageBrief:'Un dessin de marque lisible et précis, avec une composition propre à cette direction.',colors:[directionIdentity(i).palette.primary],distinctive:'Une structure propre à la direction'})),raw=await artFixture(1),ctx=new JobContext(enqueue({userId:f.uid,projectId:f.pid,type:'brand.logo.v2',payload:{projectId:f.pid},maxAttempts:1}));
 const failure=mode==='uncertain'?Object.assign(new PermanentError('Résultat incertain de contrôle simulé.'),{uncertain:true}):mode==='pause'?new JobPaused():new JobCancelled();
 const ai={...mockAi({calls:[]}),artworkRoute:()=>({provider:REQUIRED_LOGO_PROVIDER,model:REQUIRED_LOGO_MODEL}),drawArtwork:vi.fn(async()=>raw),reviewArtwork:vi.fn(async()=>{if(mode==='uncertain'){const rid=reserve(f.uid,1000,{task:'quality_control',provider:'anthropic',model:routeFor('quality_control').model,jobId:ctx.job.id,projectId:f.pid});settleUncertain(rid,'interruption de recette injectée');}throw failure;})};
 const options={completeSeries:true,acceptedTerritories:drafts,ai,capMicro:2000000,instructions:'Aucune personne.'};await expect(runLogoEngineV2(ctx,f.pid,options)).rejects.toBe(failure);expect(ai.drawArtwork).toHaveBeenCalledTimes(1);expect(ai.reviewArtwork).toHaveBeenCalledTimes(1);
 const rows=all<{id:string;role:string;meta:string;source_asset_id:string|null}>('SELECT id,role,meta,source_asset_id FROM assets WHERE project_id=? AND role LIKE ? ORDER BY created_at',f.pid,'logo-v2%'),trial=rows.find(a=>a.role==='logo-v2-trial'),original=rows.find(a=>a.role==='logo-v2-original');expect(trial).toBeDefined();expect(original).toBeDefined();expect(rows.filter(a=>a.role==='logo-v2')).toHaveLength(0);expect(JSON.parse(trial!.meta)).toMatchObject({diagnosticOnly:true,unreviewed:true,gate:{verdict:'REJECTED',score:null}});expect(original!.source_asset_id).toBe(trial!.id);expect(createHash('sha256').update(assetData(getAsset(original!.id)!)).digest('hex')).toBe(createHash('sha256').update(raw).digest('hex'));expect(currentSeries(f.pid)?.directions).toHaveLength(0);expect(loadProject(f.pid).brand).toEqual(brand);
 if(mode==='uncertain'){expect(all('SELECT id FROM ai_reservations WHERE job_id=? AND status=?',ctx.job.id,'uncertain')).toHaveLength(1);await expect(runLogoEngineV2(ctx,f.pid,options)).rejects.toThrow(/incertain/);expect(ai.drawArtwork).toHaveBeenCalledTimes(1);expect(ai.reviewArtwork).toHaveBeenCalledTimes(1);expect(all('SELECT id FROM assets WHERE project_id=? AND role=?',f.pid,'logo-v2-trial')).toHaveLength(1);}
});
