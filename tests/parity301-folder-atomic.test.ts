import {it,expect,vi,afterEach} from 'vitest';
const jar=vi.hoisted(()=>({token:''}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import {PATCH} from '@/app/api/folders/[fid]/route';
import {account,project,emptySpend} from './conversation209-fixtures';
import {createFolder} from '@/lib/library';
import {id,now,run,one} from '@/lib/db';
import {sha256} from '@/lib/secrets';
afterEach(()=>{vi.unstubAllGlobals();});
async function fixture(){
 vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));
 const u=await account(),pid=project(u),folder=createFolder(pid,'Nom initial',null);
 jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),u.id,now()+3600000,now());
 const patch=(body:unknown)=>PATCH(new Request('http://localhost/api/folders/'+folder.id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({fid:folder.id})});
 return{u,pid,folder,patch};
}
it('invalid destination never partially renames the native folder',async()=>{
 const f=await fixture(),before=one('SELECT * FROM folders WHERE id=?',f.folder.id),spend=emptySpend();
 for(const parentId of [f.folder.id,'nonexistent']){
  const response=await f.patch({name:'Renommage interdit',parentId});
  expect(response.status).toBe(parentId===f.folder.id?400:404);
  expect(one('SELECT * FROM folders WHERE id=?',f.folder.id)).toEqual(before);
 }
 expect(emptySpend()).toEqual(spend);expect(fetch).not.toHaveBeenCalled();
});
it('descendant and foreign project destinations retain the complete original row',async()=>{
 const f=await fixture(),child=createFolder(f.pid,'Enfant',f.folder.id),other=await account(),foreign=createFolder(project(other),'Autre',null),before=one('SELECT * FROM folders WHERE id=?',f.folder.id);
 for(const [parentId,status] of [[child.id,400],[foreign.id,404]] as const){expect((await f.patch({name:'Perdu',parentId})).status).toBe(status);expect(one('SELECT * FROM folders WHERE id=?',f.folder.id)).toEqual(before);}
 expect(fetch).not.toHaveBeenCalled();
});
it('valid rename and move are saved together, including explicit return to root',async()=>{
 const f=await fixture(),parent=createFolder(f.pid,'Parent',null);
 expect((await f.patch({name:'Nouveau',parentId:parent.id})).status).toBe(200);
 expect(one('SELECT * FROM folders WHERE id=?',f.folder.id)).toMatchObject({name:'Nouveau',parent_id:parent.id});
 expect((await f.patch({parentId:null})).status).toBe(200);
 expect(one('SELECT * FROM folders WHERE id=?',f.folder.id)).toMatchObject({name:'Nouveau',parent_id:null});
 expect(fetch).not.toHaveBeenCalled();
});
