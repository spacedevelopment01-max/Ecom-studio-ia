/** Existing SQLite migration, synthetic accounts, acquired versions/stamps/bytes untouched; no provider. */
import {it,expect} from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import sharp from 'sharp';
import {createUser} from '@/lib/auth';
import {db,all,id} from '@/lib/db';
import {saveVersion} from '@/lib/ad-doc/store';
import {saveAsset} from '@/lib/library';
import {storagePath} from '@/lib/storage';
import {seedImageFixture} from './image-v2-fixtures';
import type {AdDocument} from '@/lib/ad-doc/types';
const columns=()=>db().prepare('PRAGMA index_info(ad_documents_version)').all().map((r:any)=>r.name);
const reopen=()=>{db().close();delete (globalThis as any).__ecomDb;return db();};
it('fresh ad-document index uniquely scopes project/key/version',()=>{
 expect(columns()).toEqual(['project_id','doc_key','version']);
 expect((db().prepare('PRAGMA index_list(ad_documents)').all()as any[]).find(r=>r.name==='ad_documents_version')?.unique).toBe(1);
});
it('old index migrates atomically; histories/assets/stamps/acquired bytes survive two opens',async()=>{
 const a=await createUser(`migration-a-${crypto.randomUUID()}@example.invalid`,'synthetic-password','A'),b=await createUser(`migration-b-${crypto.randomUUID()}@example.invalid`,'synthetic-password','B'),pa=seedImageFixture(a.id,'cosmetic'),pb=seedImageFixture(b.id,'restaurant');
 const key='ad:migrate-'+id(),doc={version:1,meta:{source:'user'}}as AdDocument,stamp:import('@/lib/strategy-consumption').StrategyStamp={id:'synthetic-preserved-strategy',version:7,angleId:'usage',inputDigest:'synthetic-input-digest'};
 const acquired=await saveAsset({userId:a.id,projectId:pa,name:'acquired.png',mime:'image/png',origin:'upload',data:await sharp({create:{width:12,height:12,channels:3,background:'#a3f'}}).png().toBuffer()});
 const second=await saveAsset({userId:a.id,projectId:pa,name:'acquired-v2.png',mime:'image/png',origin:'upload',versionOf:acquired.id,data:await sharp({create:{width:12,height:12,channels:3,background:'#3fa'}}).png().toBuffer()});
 expect(second.version).toBe(2);expect(second.version_of).toBe(acquired.id);
 expect(saveVersion(pa,key,doc,{strategyStamp:stamp,note:'historical stamp'}).version).toBe(1);
 expect(saveVersion(pa,key,doc,{note:'second version retains stamp'}).version).toBe(2);
 // Reproduce the exact historical index on a real populated SQLite database.
 db().exec('DROP INDEX ad_documents_version; CREATE UNIQUE INDEX ad_documents_version ON ad_documents(doc_key,version)');
 expect(columns()).toEqual(['doc_key','version']);
 // A historical global sequence may already contain a second project's version3: never renumber it.
 db().prepare("INSERT INTO ad_documents(id,project_id,doc_key,version,source,note,doc_json,rendered_asset_id,created_at) SELECT ?,?,doc_key,3,source,'legacy B version3',doc_json,NULL,created_at FROM ad_documents WHERE project_id=? AND doc_key=? AND version=1").run(id(),pb,pa,key);
 const rows=all('SELECT * FROM ad_documents ORDER BY id'),assets=all('SELECT * FROM assets ORDER BY id'),stamps=all('SELECT * FROM marketing_strategy_contents ORDER BY project_id,module,content_id');
 expect(JSON.parse(rows.find(r=>r.version===1).doc_json).meta.marketingStrategy).toEqual(stamp);
 const files=assets.flatMap(a=>[a.storage_key,a.thumb_key].filter(Boolean)).map(key=>({key,bytes:fs.readFileSync(storagePath(key))}));
 const checkPreserved=()=>{expect(all('SELECT * FROM assets ORDER BY id')).toEqual(assets);for(const file of files)expect(fs.readFileSync(storagePath(file.key))).toEqual(file.bytes);};
 reopen();expect(columns()).toEqual(['project_id','doc_key','version']);expect(all('SELECT * FROM ad_documents ORDER BY id')).toEqual(rows);expect(all('SELECT * FROM marketing_strategy_contents ORDER BY project_id,module,content_id')).toEqual(stamps);checkPreserved();
 expect(saveVersion(pb,key,doc).version).toBe(4);expect(saveVersion(pa,key,doc).version).toBe(3);
 const after=all('SELECT * FROM ad_documents ORDER BY id'),afterStamps=all('SELECT * FROM marketing_strategy_contents ORDER BY project_id,module,content_id');reopen();expect(columns()).toEqual(['project_id','doc_key','version']);expect(all('SELECT * FROM ad_documents ORDER BY id')).toEqual(after);expect(all('SELECT * FROM marketing_strategy_contents ORDER BY project_id,module,content_id')).toEqual(afterStamps);checkPreserved();
 expect(()=>db().prepare('INSERT INTO ad_documents SELECT ?,project_id,doc_key,version,source,note,doc_json,rendered_asset_id,created_at FROM ad_documents WHERE project_id=? AND doc_key=? AND version=1').run(id(),pa,key)).toThrow(/UNIQUE/);
});
