/** Strictly isolated UI proof. Never a live provider or real creative-quality demonstration. */
import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';
const dir=process.env.DATA_DIR;if(!dir||!path.isAbsolute(dir)||!path.basename(dir).startsWith('ecs-publication-test-initial-'))throw Error('Dossier isolé requis');
globalThis.fetch=async()=>{throw Error('Réseau interdit — simulation des vingt créations');};
const {loadProject,saveBrand}=await import('../../src/lib/projects');
const {prepareInitialCreatives,realInitialDeps,runInitialCreatives,initialCreativesView}=await import('../../src/lib/social-v2/initial');
const {claimNext,JobContext,completeJob,failJob}=await import('../../src/lib/jobs');
const {all,one}=await import('../../src/lib/db');
const {designPostWithAi}=await import('../../src/lib/social-v2/ai-post');
const {campaignConcept,campaignVerdict}=await import('../../tests/publication-fixtures');
const {makeInitialPlan,injectedInitial}=await import('../../tests/initial-fixtures');
const {FORMATS}=await import('../../src/lib/image-v2/formats');
const {runWithLang}=await import('../../src/lib/i18n-server');
const cases=JSON.parse(fs.readFileSync(path.join(dir,'private.json'),'utf8'));
if(process.argv[2]==='prepare'){
 const {creditTopup}=await import('../../src/lib/billing');const {accountKeyFor}=await import('../../src/lib/project-billing');
 for(const f of cases){const p=loadProject(f.pid);saveBrand(f.pid,{...p.brand!,logo:{...p.brand!.logo,provisional:false}});prepareInitialCreatives(f.pid);creditTopup(accountKeyFor(f.uid,f.pid),500,`synthetic-initial-proof:${f.pid}`);}
 console.log('Deux suivis synthétiques préparés. Recharge factice isolée via les règles natives 50% HT ; aucun paiement réel. Accord client encore requis.');
}else if(process.argv[2]==='worker'){
 const failed=new Set<string>();
 for(;;){const j=claimNext(['social.initial']);if(!j){await new Promise(r=>setTimeout(r,250));continue;}
  try{const ctx=new JobContext(j);let n=0;const deps=realInitialDeps(),simulation=injectedInitial();deps.plan=async()=>makeInitialPlan();deps.reviewPlan=simulation.deps.reviewPlan;deps.repairPlan=simulation.deps.repairPlan;deps.reviewVisual=simulation.deps.reviewVisual;
   deps.render=async(p,post,aspect,cap,_ctx,attemptLimit)=>{n++;if(p.business==='services'&&n===4&&!failed.has(p.id)){failed.add(p.id);throw Error('INTERRUPTION SIMULÉE après trois résultats : preuve de reprise partielle.');}
    const ref=p.business==='products'?all<{id:string}>("SELECT id FROM assets WHERE project_id=? AND role='original' AND deleted_at IS NULL",p.id)[0]?.id??null:null;
    return designPostWithAi(p,post,{as:post.entryPoint==='ads-campaign'?'ad':'post',aspect,reference:ref,maxCostEur:cap/1e6,maxAttempts:attemptLimit},{copy:async(_p,_post,f)=>({...f,cta:'',scene:'Composition synthétique du concept pour vérifier le parcours uniquement',concept:{...campaignConcept(),ctaStyle:'none'}}),generate:async()=>{const d=FORMATS[aspect];return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}" height="${d.height}"><rect width="100%" height="100%" fill="#264e5b"/><text x="50%" y="35%" text-anchor="middle" fill="white" font-size="34">SIMULATION — PAS UNE CRÉATION IA</text><text x="50%" y="48%" text-anchor="middle" fill="white" font-size="28">${post.entryPoint==='ads-campaign'?'PUBLICITÉ':'ORGANIQUE'} · ${aspect}</text><text x="50%" y="58%" text-anchor="middle" fill="white" font-size="25">${post.title.replace(/[<&>]/g,'')}</text><text x="50%" y="70%" text-anchor="middle" fill="white" font-size="24">Parcours uniquement — qualité non validée</text></svg>`)).png().toBuffer();},review:async(_i,_r,texts)=>({...campaignVerdict(),person:false,anatomyOk:true,productFaithful:true,textsExact:true,legible:true,score:9.2,transcribed:texts,issues:[],fix:''}),maxMicro:()=>0,spentMicro:()=>0});
   };
   const out=await runWithLang({ui:'fr',content:'fr'},()=>runInitialCreatives(ctx,deps));completeJob(j.id,out);
  }catch(e){failJob(j,e,{permanent:true});console.log(String(e));}
 }
}else if(process.argv[2]==='evidence'){
 const rows=cases.map((f:any)=>({business:f.business,initial:initialCreativesView(f.pid),posts:all('SELECT id,title,caption,format,status,scheduled_at,connection_id,media,brief FROM posts WHERE project_id=?',f.pid),assets:all("SELECT id,role,origin,status,width,height,json_extract(meta,'$.initialCreative') initial,json_extract(meta,'$.finalImage.creative') creative,json_extract(meta,'$.finalImage.contract') contract,json_extract(meta,'$.finalImage.quality') quality FROM assets WHERE project_id=? AND json_extract(meta,'$.initialCreative') IS NOT NULL",f.pid)}));
 fs.writeFileSync(path.join(dir,'initial-evidence.json'),JSON.stringify({simulation:true,actualProviderCalls:one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n,actualProviderCostMicro:0,themes:one<{n:number}>('SELECT COUNT(*) n FROM theme_versions')!.n,projects:rows},null,2));console.log('Preuve synthétique expurgée enregistrée.');
}else throw Error('prepare | worker | evidence');
