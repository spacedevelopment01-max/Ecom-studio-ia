import {it,expect} from 'vitest';
import {applyOps} from '@/lib/theme/ops';
import {contrast} from '@/lib/color';
import {serviceSpec} from './fixtures';
for(const background of ['#1D4ED8','#111111','#FFFFFF','#FDE047'])it(`section background ${background}: readable secondary text, accent and button without recolouring neighbours`,()=>{
 const spec=serviceSpec('atelier' as never),sid=spec.templates.index.order[1];
 const before=structuredClone(spec),r=applyOps(spec,[{op:'section_colors',template:'index',section:sid,colors:{background}}]);
 expect(r.rejected).toEqual([]);expect(spec).toEqual(before);
 const section=r.spec.templates.index.sections[sid],schemes=r.spec.settings.color_schemes as Record<string,{settings:Record<string,string>}>;
 const colors=schemes[String(section.settings.color_scheme)].settings;
 for(const fg of ['text','muted','accent'])for(const bg of ['background','surface'])expect(contrast(colors[fg],colors[bg]),`${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
 expect(contrast(colors.accent_text,colors.accent),'button text').toBeGreaterThanOrEqual(4.5);
 for(const [key,value] of Object.entries(before.settings.color_schemes as object))expect(schemes[key]).toEqual(value);
 for(const other of spec.templates.index.order.filter(s=>s!==sid))expect(r.spec.templates.index.sections[other]).toEqual(before.templates.index.sections[other]);
});
it('an explicit foreground colour remains the requested exact colour',()=>{
 const spec=serviceSpec('atelier' as never),sid=spec.templates.index.order[1];const r=applyOps(spec,[{op:'section_colors',template:'index',section:sid,colors:{background:'#FFFFFF',text:'#FFFF00',accent:'#FFFF00'}}]);
 const schemes=r.spec.settings.color_schemes as Record<string,{settings:Record<string,string>}>;
 expect(schemes[String(r.spec.templates.index.sections[sid].settings.color_scheme)].settings).toMatchObject({text:'#FFFF00',accent:'#FFFF00'});
});

it('natural request→before/after→explicit agreement→saved native contrast; no provider or extra section change',async()=>{
 const {vi}=await import('vitest');for(const flag of ['LOT_A','AI','CONTEXT','LOCAL_SITE'])vi.stubEnv('STUDIO_CONVERSATION_'+flag,'1');
 const forbidden=vi.fn(()=>{throw Error('NO_PROVIDER');});vi.stubGlobal('fetch',forbidden);
 try{
  const {localSiteFixture}=await import('./conversation284-b1-fixtures');const {submitConversation}=await import('@/lib/orchestrator/conversation');const {currentTheme}=await import('@/lib/projects');const {id}=await import('@/lib/db');const {emptySpend}=await import('./conversation209-fixtures');
  const f=await localSiteFixture('services');f.select(false);const before=currentTheme(f.pid)!,spend=emptySpend();
  const p=await submitConversation(f.u,f.c.id,f.message('Mets le fond de cette section en bleu'));
  expect(p.localSite).toMatchObject({state:'proposed',confirmationRequired:true,costEur:0,providerCalls:0});expect(p.localSite!.message).toMatch(/contraste/);expect(currentTheme(f.pid)).toEqual(before);
  const diff=JSON.parse(String(p.localSite!.diff!.after));for(const role of ['text','muted','accent'])expect(contrast(diff[role],diff.background)).toBeGreaterThanOrEqual(4.5);
  const saved=await submitConversation(f.u,f.c.id,{action:'confirm-local',proposalId:p.localSite!.proposalId!,confirmation:true,revision:p.revision,projectRevision:p.projectRevision,requestId:id()});
  expect(saved.localSite).toMatchObject({state:'applied',actionsExecuted:true});const after=currentTheme(f.pid)!,scheme=String(after.spec.templates.index.sections[f.section].settings.color_scheme);
  expect((after.spec.settings.color_schemes as any)[scheme].settings).toEqual(diff);expect(after.version.parent_id).toBe(before.version.id);expect(emptySpend()).toEqual(spend);expect(forbidden).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();vi.unstubAllEnvs();}
});
