/** Vrai rendu React de Marque ; état d'API synthétique, aucune requête ni fournisseur. */
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect,vi} from 'vitest';
import type {DirectionSeries} from '@/lib/logo-v2/direction-series';
import type {Territory} from '@/lib/logo-v2/types';
import {directionIdentity} from './preparation-mission-fixtures';
const state=vi.hoisted(()=>({data:{}as Record<string,unknown>}));
vi.mock('@/components/studio/project-context',()=>({useProject:()=>({id:'synthetic-logo-project'})}));
vi.mock('@/components/ui',async original=>({...await original<object>(),useApi:()=>({data:state.data,reload:()=>{}}),useToast:()=>()=>{}}));
vi.mock('@/components/studio/common',async original=>({...await original<object>(),useActive:()=>[]}));
vi.mock('@/components/billing-client',()=>({useBudgetPct:()=>({label:()=> '1 %'})}));
import {LogoV2Panel} from '@/components/studio/logo-v2-panel';
function series(run:string,count:number):DirectionSeries{return{id:'series-'+run,projectId:'synthetic-logo-project',ordinal:1,name:'Une marque de recette',inputHash:'fixture',createdAt:1,requestKeys:[run],status:count===3?'complete':'partial',attempts:1,territories:[],directions:Array.from({length:count},(_,i)=>({id:'t'+i,logoId:'logo-'+run+'-'+i,label:'Direction '+(i+1),concept:'Concept de recette distinct',identity:directionIdentity(i),territory:{}as Territory,version:1}))};}
function render(currentRun:string,sets:DirectionSeries[]){state.data={run:{id:currentRun,ai:'used',stoppedByCostCap:false,territories:[],rejected:[],failures:[],notes:[]},series:sets,proposals:[],studio:[],discarded:[],selection:null,rights:{used:sets.length,canRenew:true,partial:sets.at(-1)?.status==='partial'}};return renderToStaticMarkup(createElement(LogoV2Panel,{}));}
for(const n of [2,3])it(`montre les ${n} directions natives acquises sans annoncer qu’aucune n’a atteint le niveau`,()=>{const html=render('current',[series('current',n)]);expect((html.match(/data-direction=/g)||[]).length).toBe(n);expect(html).not.toContain("Aucune direction n&#x27;a atteint le niveau attendu");expect(html).not.toContain("Aucune proposition : les images n&#x27;ont pas pu être produites");});
it('garde l’échec de la série courante visible malgré une ancienne série complète',()=>{const html=render('new',[series('old',3),series('new',0)]);expect((html.match(/data-direction=/g)||[]).length).toBe(3);expect(html).toContain("Aucune direction n&#x27;a atteint le niveau attendu");});
it('garde le diagnostic du parcours historique sans série acquise',()=>{expect(render('legacy',[])).toContain("Aucune direction n&#x27;a atteint le niveau attendu");});
