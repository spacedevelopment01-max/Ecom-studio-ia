/** Exact three platform groups from Claude's 18-creation probe. All images/copy/reviews synthetic. */
import sharp from 'sharp';
import {account} from './conversation209-fixtures';
import {seedImageFixture,seedCutout} from './image-v2-fixtures';
import {mockAdDeps} from './ads-v2-mock';
import {createProjectWithSubscription} from '@/lib/project-billing';
import {runAdEngineV2} from '@/lib/ads-v2/engine';
import {runWithLang} from '@/lib/i18n-server';
import {saveAsset,getAsset,assetData} from '@/lib/library';
import {all} from '@/lib/db';
import {loadProject} from '@/lib/projects';
import {initialize} from '@/lib/preparation/engine';
import {emptyInput} from '@/lib/orchestrator/conversation/store';
import {openProjectConversation} from '@/lib/orchestrator/conversation';
export async function freshV2Ads(platforms:string[]){
 const u=await account(),pid=createProjectWithSubscription(u.id,null,()=>{const p=seedImageFixture(u.id,'cosmetic');return{projectId:p,result:p};}),cutId=await seedCutout(u.id,pid),bytes=await sharp({create:{width:400,height:120,channels:3,background:'#fff'}}).png().toBuffer(),logo=await saveAsset({projectId:pid,userId:u.id,data:bytes,name:'Logo fictif.png',mime:'image/png',role:'logo',origin:'generated'});
 const {deps,log}=mockAdDeps({userId:u.id,projectId:pid,cutout:{id:cutId,data:assetData(getAsset(cutId)!)},logo:{id:logo.id,data:bytes}});
 await runWithLang({ui:'fr',content:'fr'},()=>runAdEngineV2(null,pid,{count:3,platforms:platforms as never},deps));
 const p=loadProject(pid);initialize(pid,{...emptyInput(),business:p.business,offerName:p.product.name,description:p.product.summary,services:p.services});
 const c=openProjectConversation(u,pid),docs=all<{doc_key:string}>('SELECT DISTINCT doc_key FROM ad_documents WHERE project_id=? ORDER BY doc_key',pid).map(r=>r.doc_key);return{u,pid,c,docs,log};
}
