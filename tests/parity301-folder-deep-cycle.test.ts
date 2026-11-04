import {it,expect,vi,afterEach} from 'vitest';
const jar=vi.hoisted(()=>({token:''}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import {PATCH} from '@/app/api/folders/[fid]/route';
import {account,project,emptySpend} from './conversation209-fixtures';
import {createFolder,isDescendant} from '@/lib/library';
import {all,id,now,run} from '@/lib/db';
import {sha256} from '@/lib/secrets';
afterEach(()=>{vi.unstubAllGlobals();});
async function fixture(){
 vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));
 const u=await account(),pid=project(u),root=createFolder(pid,'Racine fictive',null);let last=root;
 for(let k=0;k<70;k++)last=createFolder(pid,'Niveau '+k,last.id);
 jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),u.id,now()+3600000,now());
 const patch=(folderId:string,body:unknown)=>PATCH(new Request('http://localhost/api/folders/'+folderId,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({fid:folderId})});
 return{u,pid,root,last,patch};
}
it('detects a true descendant beyond 64 levels',async()=>{
 const f=await fixture();expect(isDescendant(f.pid,f.root.id,f.last.id)).toBe(true);expect(fetch).not.toHaveBeenCalled();
});
it('native PATCH refuses a deep cycle without a partial rename or other metadata write',async()=>{
 const f=await fixture(),before=all('SELECT * FROM folders WHERE project_id=? ORDER BY id',f.pid),spend=emptySpend();
 expect((await f.patch(f.root.id,{name:'Ne pas perdre le nom',parentId:f.last.id})).status).toBe(400);
 expect(all('SELECT * FROM folders WHERE project_id=? ORDER BY id',f.pid)).toEqual(before);expect(emptySpend()).toEqual(spend);expect(fetch).not.toHaveBeenCalled();
});
it('a valid move into a deep unrelated branch remains allowed',async()=>{
 const f=await fixture(),other=createFolder(f.pid,'Autre racine',null),before=all<any>('SELECT * FROM folders WHERE project_id=? ORDER BY id',f.pid);
 expect(isDescendant(f.pid,other.id,f.last.id)).toBe(false);expect((await f.patch(other.id,{name:'Nom manuel',parentId:f.last.id})).status).toBe(200);
 expect(all('SELECT * FROM folders WHERE project_id=? ORDER BY id',f.pid)).toEqual(before.map(r=>r.id===other.id?{...r,name:'Nom manuel',parent_id:f.last.id}:r));expect(fetch).not.toHaveBeenCalled();
});
it('ancestry traversal also terminates on a preexisting malformed cycle',async()=>{
 const f=await fixture(),other=createFolder(f.pid,'Autre',null);run('UPDATE folders SET parent_id=? WHERE id=?',f.last.id,f.root.id);
 expect(isDescendant(f.pid,other.id,f.last.id)).toBe(false);expect(isDescendant(f.pid,f.root.id,f.last.id)).toBe(true);expect(fetch).not.toHaveBeenCalled();
});
