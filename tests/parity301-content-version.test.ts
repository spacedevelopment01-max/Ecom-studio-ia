/** #301 C21 : versions natives sous horloge fixe/reculée, vrais moteurs et SQL, aucun fournisseur. */
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {account,project} from './conversation209-fixtures';
import {adapter,updateContent,setContentStatus,type ContentType} from '@/lib/contenus/api';
import {createBien} from '@/lib/biens';
import {addCategory,createItem} from '@/lib/contenus/carte';
import {createRealisation} from '@/lib/contenus/realisations';
import {tx} from '@/lib/db';
type Type=Exclude<ContentType,'prestations'>;
const clock=2000000000000,types:Type[]=['biens','plats','realisations'];
beforeEach(()=>vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun fournisseur pendant les tests C21');})));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
async function fixture(type:Type){const u=await account(),pid=project(u,'services'),time=vi.spyOn(Date,'now').mockReturnValue(clock),category=type==='plats'?addCategory(pid,'Carte fictive').id:null;
 const create=(title:string)=>type==='biens'?createBien(u.id,pid,{transaction:'vente',data:{title,summary:'Maison fictive à Lyon.'}}).id:type==='plats'?createItem(pid,{categoryId:category!,name:title,price:18,description:'Plat fictif.'}).id:createRealisation(pid,{title,summary:'Aménagement de van fictif.'}).id;
 const id=create('Élément fictif'),read=()=>adapter(type).get(pid,id),patch=type==='plats'?{description:'Description corrigée.'}:{summary:'Résumé corrigé.'};return{pid,id,read,patch,create,time};}
describe('#301 C21 — versions de contenus strictement croissantes',()=>{
 for(const type of types){
  it(type+' : modification dans la même milliseconde, champs conservés et ancienne version refusée',async()=>{const f=await fixture(type),before=f.read(),after=updateContent(f.pid,type,f.id,f.patch,before.version);expect(after.title).toBe(before.title);expect.soft(Number(after.version)).toBe(Number(before.version)+1);expect(()=>updateContent(f.pid,type,f.id,f.patch,before.version)).toThrow('modifié');expect(f.read()).toEqual(after);});
  it(type+' : changement d’état dans la même milliseconde exige toujours accord et invalide la version',async()=>{const f=await fixture(type),before=f.read();expect(()=>setContentStatus(f.pid,type,f.id,'withdraw',{ifVersion:before.version,confirm:false})).toThrow('Confirmation');expect(f.read()).toEqual(before);const after=setContentStatus(f.pid,type,f.id,'withdraw',{ifVersion:before.version,confirm:true});expect(after.status).toBe('withdrawn');expect.soft(Number(after.version)).toBe(Number(before.version)+1);expect(()=>updateContent(f.pid,type,f.id,f.patch,before.version)).toThrow('modifié');});
  it(type+' : réordonnancement dans la même milliseconde invalide la version de chaque élément déplacé',async()=>{const f=await fixture(type),before=f.read(),other=f.create('Deuxième élément fictif');adapter(type).reorder!(f.pid,[other,f.id]);const after=f.read();expect((after.data as {position:number}).position).toBe(1);expect.soft(Number(after.version)).toBe(Number(before.version)+1);expect(()=>updateContent(f.pid,type,f.id,f.patch,before.version)).toThrow('modifié');});
  it(type+' : une horloge reculée ne réutilise jamais une ancienne version',async()=>{const f=await fixture(type),before=f.read();f.time.mockReturnValue(clock-1000);const after=updateContent(f.pid,type,f.id,f.patch,before.version);expect(Number(after.version)).toBe(Number(before.version)+1);});
  it(type+' : un rollback conserve exactement données et version initiales',async()=>{const f=await fixture(type),before=f.read();expect(()=>tx(()=>{updateContent(f.pid,type,f.id,f.patch,before.version);throw Error('rollback fictif');})).toThrow('rollback fictif');expect(f.read()).toEqual(before);});
 }
});
