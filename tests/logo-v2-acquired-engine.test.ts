/** Moteur réel, dessins/relectures injectés : zéro fournisseur réel, aucune qualité créative qualifiée. */
import {it,expect,vi}from 'vitest';
vi.mock('@/lib/ai/config',async original=>({...await original()as object,activeProviderKey:()=>null}));
import {fixture}from './preparation-fixtures';
import {validatedBrand,directionIdentity}from './preparation-mission-fixtures';
import {draftsFor,mockAi}from './logo-v2-mock';
import {artFixture}from './logo-v2-fixtures';
import {brandDiscovery}from '@/lib/logo-v2/discovery';
import {loadProject}from '@/lib/projects';
import {enqueue,JobContext}from '@/lib/jobs';
import {runLogoEngineV2}from '@/lib/logo-v2/engine';
import {currentSeries,directionSeries}from '@/lib/logo-v2/direction-series';
import {REQUIRED_LOGO_PROVIDER,REQUIRED_LOGO_MODEL}from '@/lib/ai/logo-policy';
import {ART_CRITERIA}from '@/lib/logo-v2/types';
import {getAsset,assetData}from '@/lib/library';
import {createHash}from 'node:crypto';
it('réemploie les trois territoires déjà acquis dans le vrai moteur, sauvegarde chaque logo/planche et reprend sans redessiner',async()=>{
 const f=await fixture(),brand=validatedBrand(f.pid,f.input),brief=brandDiscovery(loadProject(f.pid)),drafts=draftsFor(brief).slice(0,3).map((t,i)=>({...t,identity:directionIdentity(i),typography:{...t.typography,rationale:'Hiérarchie propre à cette direction'},colorRole:{...t.colorRole,rationale:'Rôles cohérents'},style:(['typographic','monogram','gradient']as const)[i],symbolIdea:t.symbolIdea??null,descriptor:null,imageBrief:'Une marque dessinée avec une structure nette, un nom lisible et une composition précise.',colors:[directionIdentity(i).palette.primary],distinctive:'Composition et langage de cette direction'})),log={calls:[]as string[]};
 const ai={...mockAi(log),territories:vi.fn(async()=>{throw Error('Un concept déjà acquis ne doit pas être repayé');}),artworkRoute:()=>({provider:REQUIRED_LOGO_PROVIDER,model:REQUIRED_LOGO_MODEL}),drawArtwork:vi.fn(async(t:{id:string})=>artFixture(Number(t.id.slice(1)))),reviewArtwork:vi.fn(async(_b:Buffer,_t:unknown,_brief:unknown,expected:{name:string})=>({criteria:Object.fromEntries(ART_CRITERIA.map(k=>[k,9]))as Record<typeof ART_CRITERIA[number],number>,textRead:expected.name,nameExact:true,extraText:false,nameBox:null,clumsyCliche:false,resemblesKnownBrand:false,amateur:false,artifacts:false,person:false,genericConcept:false,issues:[],needsSimplifiedMark:true,fix:{target:'none'as const,instruction:''}}))};
 const ctx=new JobContext(enqueue({userId:f.uid,projectId:f.pid,type:'brand.logo.v2',payload:{projectId:f.pid},maxAttempts:1})),options={completeSeries:true,acceptedTerritories:drafts,ai,capMicro:2000000,instructions:'Aucune personne.\nGarde mes deux  espaces.'};
 await runLogoEngineV2(ctx,f.pid,options);expect(ai.territories).not.toHaveBeenCalled();expect(ai.drawArtwork).toHaveBeenCalledTimes(3);expect(ai.reviewArtwork).toHaveBeenCalledTimes(3);
 const s=currentSeries(f.pid)!;expect(s.status).toBe('complete');expect(s.directions).toHaveLength(3);expect(s.territories.map(t=>t.source)).toEqual(['ai','ai','ai']);expect(s.directions.every(d=>!!getAsset(d.logoId)&&!!getAsset(d.previewId!))).toBe(true);const hashes=s.directions.map(d=>createHash('sha256').update(assetData(getAsset(d.logoId)!)).digest('hex'));expect(new Set(hashes).size).toBe(3);expect(loadProject(f.pid).brand).toEqual(brand);
 await runLogoEngineV2(ctx,f.pid,options);expect(ai.drawArtwork).toHaveBeenCalledTimes(3);expect(ai.reviewArtwork).toHaveBeenCalledTimes(3);expect(directionSeries(f.pid)).toHaveLength(1);expect(currentSeries(f.pid)?.directions.map(d=>d.logoId)).toEqual(s.directions.map(d=>d.logoId));expect(loadProject(f.pid).brand).toEqual(brand);
},30000);
