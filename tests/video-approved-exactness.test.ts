/** Scénarios approuvés natifs ; transport/médias simulés, aucun fournisseur ni débit. */
import {it,expect,vi} from 'vitest';
import {account,project} from './conversation209-fixtures';
import {validatedBrand} from './preparation-mission-fixtures';
import {loadProject} from '@/lib/projects';
import {latestVideo} from '@/lib/video-v2/store';
import {approveVideoScenario,sceneApprovalRequest} from '@/lib/video-v2/approval';
import {runThreeScenes,ScenePlanSchema,type ScenePlan,type ThreeScenesRequest,type ThreeScenesDeps} from '@/lib/video-v2/three-scenes';
import {videoByteFixture} from './video-byte-fixture';
async function fixture(){
 const u=await account(),pid=project(u);validatedBrand(pid);const p=loadProject(pid);
 const req:ThreeScenesRequest={as:'ad',generation:'direct',scenes:2,totalS:10,music:false,request:'Conserver mon scénario exact, sans voix ni bouton ajouté.'};
 const plan:ScenePlan={scenes:[0,1].map(k=>({still:`Objet immobile sur un fond clair, détail ${k+1}.`,motion:'La caméra avance lentement.',title:k===0?'Mon texte\nDeux  espaces.':'',place:'lower',titleColor:'#123456'})),line:'',cta:''};
 const deps:ThreeScenesDeps={keyframe:vi.fn(async()=>{throw Error('Image non demandée');}),clip:vi.fn(async()=>{throw Error('Clip intermédiaire non demandé');}),stock:vi.fn(async()=>{throw Error('Banque non demandée');}),directClip:vi.fn(async()=>videoByteFixture()),duration:async()=>5,frames:async()=>[Buffer.from('trame de contrôle fictive')],reviewMedia:vi.fn(async()=>({score:9,sameProduct:null,foreignBrands:[],productAltered:false,characterConsistent:null,offTopic:false,artifacts:false,personVisible:false,issues:[]})),spentMicro:()=>0,render:vi.fn(async()=> 'rendu-simule')};
 const launch=(scenario:ScenePlan)=>runThreeScenes(null,pid,{...req,approval:approveVideoScenario(p,sceneApprovalRequest(req),scenario,1000000).approval},deps);
 return {p,pid,plan,req,deps,launch};
}
it('ne complète pas les voix absentes et ne transforme pas un bouton vide en action commerciale',async()=>{
 const f=await fixture(),before=structuredClone(f.plan),r=await f.launch(f.plan),doc=latestVideo(f.pid,r.docKey)!.doc;
 expect(doc.subtitles.cues).toEqual([]);expect(doc.clips.flatMap(c=>c.overlays).filter(l=>l.kind==='button')).toEqual([]);
 expect(doc.clips[0].overlays.flatMap(l=>l.id==='ov-text'&&l.kind==='text'?[l.text]:[])).toEqual([f.plan.scenes[0].title]);
 expect(f.plan).toEqual(before);expect(f.deps.directClip).toHaveBeenCalledTimes(2);
});
it('conserve la couleur explicite dans le schéma partagé du scénario',async()=>{const f=await fixture();expect(ScenePlanSchema.parse(f.plan)).toEqual(f.plan);});
it('refuse une durée qui serait raccourcie de18à15secondes avant le premier clip',async()=>{
 const f=await fixture();f.req.scenes=1;f.req.totalS=18;f.plan.scenes.pop();f.deps.duration=async()=>20;
 await expect(f.launch(f.plan)).rejects.toThrow(/durée|scènes|scénario/i);expect(f.deps.directClip).not.toHaveBeenCalled();
});
for(const kind of ['third-party-cta','placeholder-title','placeholder-voice','missing-scene','extra-field'] as const)it(`refuse ${kind} avant le premier média au lieu de modifier le scénario accepté`,async()=>{
 const f=await fixture(),p=structuredClone(f.plan);
 if(kind==='third-party-cta')p.cta='Découvrir Nike';
 if(kind==='placeholder-title')p.scenes[0].title='[À compléter : titre]';
 if(kind==='placeholder-voice')p.scenes[0].voice='[À compléter : voix]';
 if(kind==='missing-scene')p.scenes.pop();
 if(kind==='extra-field')Object.assign(p.scenes[0],{unrepresentedInstruction:'Ne pas supprimer cette instruction'});
 await expect(f.launch(p)).rejects.toThrow(/scénario|scènes|texte|marque|représent/i);
 expect(f.deps.directClip).not.toHaveBeenCalled();expect(f.deps.keyframe).not.toHaveBeenCalled();expect(f.deps.render).not.toHaveBeenCalled();
});
