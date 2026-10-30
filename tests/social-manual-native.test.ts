/** Réemploi manuel natif : aucun fournisseur, aucune programmation ni validation implicite. */
import {it,expect,beforeEach,afterEach,vi}from 'vitest';
import {account,project}from './conversation209-fixtures';
import {createManualPost}from '@/lib/social-v2/manual';
import {loadProject}from '@/lib/projects';
import {all,one,run}from '@/lib/db';
import {seedCutout}from './image-v2-fixtures';
import {postView}from '@/lib/posts';
import {contentHash}from '@/lib/social-v2/approval';
beforeEach(()=>vi.stubGlobal('fetch',vi.fn(()=>{throw Error('No provider or publishing permitted');})));afterEach(()=>vi.unstubAllGlobals());
it.each(['products','services']as const)('brouillon %s : textes exacts, média réemployé, empreinte native et aucune tâche',async business=>{
 const u=await account(),pid=project(u,business),photo=await seedCutout(u.id,pid),p=loadProject(pid),caption='  Texte intégral du client\nDeux  espaces.\n'+('Une explication utile. '.repeat(240)),title='  Le titre exact.  ',before=all('SELECT id FROM jobs'),r=createManualPost(p,u.id,{network:'facebook',format:'image',title,caption,hashtags:'#Atelier',media:[photo],scheduledAt:Date.now()+86400000});
 const row=one<any>('SELECT * FROM posts WHERE id=?',r.id)!;expect(postView(row)).toMatchObject({title,caption,status:'review',publishedAt:null,approvedAt:null});expect(row.content_hash).toBe(contentHash(row));expect(row.user_edited).toBe(1);expect(row.engine).toBe('v2');expect(JSON.parse(row.media)).toEqual([photo]);expect(all('SELECT id FROM jobs')).toEqual(before);expect(all('SELECT id FROM ai_calls WHERE project_id=?',pid)).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
});
it('média étranger et compte social emprunté : aucune insertion partielle',async()=>{
 const a=await account(),b=await account();run("INSERT INTO connections (id,user_id,provider,external_id,name,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",'foreign',b.id,'facebook','fixture-'+b.id,'Compte étranger de recette',Date.now(),Date.now());const pid=project(a),other=project(b),photo=await seedCutout(b.id,other),p=loadProject(pid),input={network:'facebook' as const,format:'image' as const,title:'Titre',caption:'Texte',hashtags:'',media:[photo]},before=all('SELECT id FROM posts');expect(()=>createManualPost(p,a.id,input)).toThrow('étranger');expect(()=>createManualPost(p,a.id,{...input,media:[],connectionId:'foreign'})).toThrow('Compte');expect(all('SELECT id FROM posts')).toEqual(before);expect(fetch).not.toHaveBeenCalled();
});
