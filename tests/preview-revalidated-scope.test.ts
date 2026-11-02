import {describe,it,expect} from 'vitest';
import {canAdoptRevalidatedPreviewScope as adopt} from '@/lib/preview-revalidated-scope';
type Input=Parameters<typeof adopt>[0];
const base=():Input=>({projectId:'project-a',versionId:'version-2',page:'/',selection:{template:'index',section:'hero',block:'title'},scope:{versionId:'version-1',page:'/'},focus:{projectId:'project-a',tab:'boutique',target:{kind:'theme-section',versionId:'version-2',template:'index',section:'hero',block:'title'}}});
describe('#292 — focus revalidé et scope local',()=>{
 it('adopte seulement la version affichée du même repère, sans mutation de données',()=>{const x=base(),before=structuredClone(x);expect(adopt(x)).toBe(true);expect(x).toEqual(before);});
 it('permet une section sans bloc, sans inventer une cible',()=>{const x=base();delete x.selection!.block;if(x.focus!.target.kind==='theme-section')delete x.focus!.target.block;expect(adopt(x)).toBe(true);});
 const cases:[string,(x:Input)=>void][]=[
  ['autre projet',x=>{x.focus!.projectId='project-b';}],
  ['autre onglet',x=>{x.focus!.tab='produit';}],
  ['autre page visible',x=>{x.page='/contact';}],
  ['focus périmé',x=>{if(x.focus!.target.kind==='theme-section')x.focus!.target.versionId='version-1';}],
  ['autre version affichée/historique',x=>{x.versionId='version-3';}],
  ['autre template',x=>{if(x.focus!.target.kind==='theme-section')x.focus!.target.template='page';}],
  ['autre section',x=>{if(x.focus!.target.kind==='theme-section')x.focus!.target.section='other';}],
  ['autre bloc',x=>{if(x.focus!.target.kind==='theme-section')x.focus!.target.block='other';}],
  ['bloc retiré du focus',x=>{if(x.focus!.target.kind==='theme-section')delete x.focus!.target.block;}],
  ['désignation de page',x=>{x.focus!.target={kind:'theme-page',versionId:'version-2',path:'/'};}],
  ['sélection explicitement retirée',x=>{x.selection=null;}],
  ['aucun scope local',x=>{x.scope=null;}],
  ['aucun focus revalidé',x=>{x.focus=null;}],
  ['scope déjà courant (ne remplace pas une nouvelle sélection)',x=>{x.scope!.versionId='version-2';}],
 ];
 for(const [name,change]of cases)it('refuse '+name,()=>{const x=base();change(x);expect(adopt(x)).toBe(false);});
});
