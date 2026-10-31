/** Contrat natif vérifié : le formulaire et verifiedFacts utilisent les centimes. */
import {it,expect}from 'vitest';
import {account,project}from './conversation209-fixtures';
import {loadProject}from '@/lib/projects';
import {publicationCopyIssues}from '@/lib/social-v2/publication-copy-policy';
import {verifiedFacts}from '@/lib/seo-v2/facts';
it('1990 centimes confirme 19,90 €, jamais 1990 €',async()=>{
 const u=await account(),p=loadProject(project(u));p.product.price={amount:1990,currency:'EUR',status:'confirmed'};expect(verifiedFacts(p).price).toContain('19,90');
 expect(publicationCopyIssues(p,{headline:'19,90 €',subline:'',cta:''},'Mentionne 19.90 EUR.',[])).toEqual([]);
 expect(publicationCopyIssues(p,{headline:'1990 €',subline:'',cta:''},'Mentionne 1990 EUR.',[]).some(i=>i.code==='COMMERCIAL_NUMBER_UNCONFIRMED')).toBe(true);
});

it('le catalogue secondaire conserve aussi les centimes avant les mêmes contrôles',async()=>{
 const {projectForSubject}=await import('@/lib/social-v2/ai-post');const u=await account(),p=loadProject(project(u));p.catalog=[{key:'outil',name:'Outil de reliure',category:'Reliure',price:1990,compareAt:null,description:'Un outil manuel.',features:[],originalAssetId:null}];
 const q=projectForSubject(p,{kind:'product',key:'outil',name:'Outil de reliure',summary:'Un outil manuel.',referenceAssetId:null});
 expect(q.product.price.amount).toBe(1990);expect(verifiedFacts(q).price).toContain('19,90');
 expect(publicationCopyIssues(q,{headline:'19,90 €',subline:'',cta:''},'Mentionne 19.90 EUR.',[])).toEqual([]);
 expect(publicationCopyIssues(q,{headline:'1990 €',subline:'',cta:''},'Mentionne 1990 EUR.',[]).some(i=>i.code==='COMMERCIAL_NUMBER_UNCONFIRMED')).toBe(true);
});
