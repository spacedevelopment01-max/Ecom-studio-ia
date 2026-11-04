import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import sharp from 'sharp';
import {account,project,sender} from './conversation209-fixtures';
import {openProjectConversation} from '@/lib/orchestrator/conversation';
import {saveAsset} from '@/lib/library';
import {now,run} from '@/lib/db';
import {ConversationLocalFileRestore} from '@/components/studio/conversation-local-file-restore';
beforeEach(()=>{for(const f of ['LOT_A','AI','CONTEXT','FILES'])vi.stubEnv('STUDIO_CONVERSATION_'+f,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
const confirmation={controller:null,state:{busy:false,error:null,uncertain:false,blocked:false}} as never;
const html=(view:any)=>renderToStaticMarkup(createElement(ConversationLocalFileRestore,{view,confirmation,busy:false,onSuggest:()=>{}}));
async function fixture(){const u=await account(),pid=project(u),c=openProjectConversation(u,pid),data=await sharp({create:{width:20,height:20,channels:3,background:'#285b46'}}).png().toBuffer();
 const a=await saveAsset({projectId:pid,userId:u.id,name:'Photo acquise.png',mime:'image/png',data,origin:'upload',role:'original'} as never),d=await saveAsset({projectId:pid,userId:u.id,name:'Document conservé.txt',mime:'text/plain',data:Buffer.from('DOC'),origin:'upload'} as never);
 run('UPDATE assets SET deleted_at=? WHERE project_id=?',now(),pid);const send=sender(u,c.id);return{pid,a,d,say:(text:string,tab:string)=>send({action:'message',text,context:{tab,target:null}})};}
it('depuis Images, la corbeille ne liste que les images et ses liens mènent à Images',async()=>{
 const f=await fixture(),v=await f.say('Montre la corbeille des images','images'),out=html(v);
 expect(v.localFileRestore?.nativeHref).toBe(`/studio/${f.pid}/images`);
 expect(out).toContain('Photo acquise.png');expect(out).not.toContain('Document conservé.txt');
 const p=await f.say(`Restaure l’image « ${f.a.id} » de la corbeille`,'images'),proposed=html(p);
 expect(p.localFileRestore?.state).toBe('proposed');expect(proposed).toContain('De retour dans les images');
});
it('depuis Fichiers, la carte reste celle des fichiers ; un lien inattendu n’est jamais affiché',async()=>{
 const f=await fixture(),v=await f.say('Montre la corbeille','fichiers'),out=html(v);
 expect(out).toContain('Document conservé.txt');
 expect(html({...v,localFileRestore:{...v.localFileRestore,hasMore:true,nativeHref:'https://exemple.test/'}})).not.toContain('exemple.test');
 expect(html({...v,localFileRestore:{...v.localFileRestore,hasMore:true}})).toContain('voir la suite dans Fichiers');
});
