import {describe,it,expect} from 'vitest';
import crypto from 'node:crypto';
import {readCatalog,filterCatalog,currentMasterEvidence,REFERENCE_CATALOG,REFERENCE_COMMITS} from '../scripts/diagnostic-acces-routage';
const secret='vF4_fixture-only-key-not-for-export_B8qZ';
const target=(provider:string,model:string)=>[{provider,model,functions:['media:product_image:primary']}];
const response=(data:any,status=200)=>({httpStatus:status,proxyStatus:null,transport:'HTTP_RESPONSE',data});

describe('authenticated metadata only, no generation or secret export',()=>{
 it.each(['anthropic','openai','google','alibaba','fal'] as const)('uses an exact documented GET for %s with secrets only on stdin',provider=>{
  const calls:any[]=[];
  const run=((...args:any[])=>{calls.push(args);return {status:0,stdout:JSON.stringify({private:secret})+'\nECOM_METADATA 200 000',stderr:secret};}) as any;
  const out=readCatalog(provider,secret,null,run);
  expect(out.httpStatus).toBe(200);
  expect(calls).toHaveLength(1);
  const [command,args,options]=calls[0];expect(command).toBe('curl');expect(args[0]).toBe('--disable');expect(args).toContain('GET');expect(args).toContain('--config');expect(args).not.toContain('--location');
  const url=new URL(args.at(-1));expect(url.protocol).toBe('https:');expect(url.pathname).toMatch(/models$/);expect(url.username+url.password).toBe('');
  expect(JSON.stringify(args).includes(secret)).toBe(false);expect(JSON.stringify(options.env).includes(secret)).toBe(false);expect(options.input.includes(secret)).toBe(true);
  expect(args).not.toContain('--insecure');expect(args).not.toContain('--retry');
  expect(JSON.stringify(filterCatalog(provider,out,[])).includes(secret)).toBe(false);
 });
 it('rejects unknown providers and credential/workspace header injection before transport',()=>{
  let calls=0;const run=(()=>{calls++;throw Error(secret);}) as any;
  expect(readCatalog('unknown' as any,secret,null,run).transport).toBe('INPUT_REJECTED');
  expect(readCatalog('openai',secret+'\r\nX-Other: injected',null,run).transport).toBe('INPUT_REJECTED');
  expect(readCatalog('alibaba',secret,'bad\nheader',run).transport).toBe('INPUT_REJECTED');expect(calls).toBe(0);
 });
 it.each([301,307,401,403,404,429,500,503])('does not follow or retry HTTP %s or export errors',status=>{
  let calls=0;const out=readCatalog('openai',secret,null,(()=>{calls++;return {status:0,stdout:secret+`\nECOM_METADATA ${status} 000`,stderr:secret};}) as any);
  expect(calls).toBe(1);expect(out.data).toBeUndefined();const filtered=filterCatalog('openai',out,target('openai','gpt-image-2.5-sunburst'));
  expect(filtered.authentication).toBe('not_verified');expect(JSON.stringify(filtered).includes(secret)).toBe(false);expect(filtered.generationRight).toBe('NOT_VERIFIABLE_WITH_THIS_METADATA_CONTROL');
  if(status===403)expect(filtered.failureCode).toBe('ACCESS_FORBIDDEN_NOT_PROOF_OF_INVALID_KEY');
 });
 it('distinguishes a proxy refusal from a provider response; suppresses malformed/oversized replies',()=>{
  const denied=readCatalog('openai',secret,null,(()=>({status:56,stdout:'\nECOM_METADATA 000 403',stderr:secret})) as any);
  expect(denied.transport).toBe('PROXY_CONNECT_REFUSED');expect(denied.httpStatus).toBeNull();
  const malformed=readCatalog('openai',secret,null,(()=>({status:0,stdout:secret+'\nECOM_METADATA 200 000',stderr:secret})) as any);
  expect(malformed.transport).toBe('INVALID_JSON');
  const large=readCatalog('openai',secret,null,(()=>({status:0,error:Error(secret),stdout:secret})) as any);
  expect(large.transport).toBe('UNAVAILABLE');expect(JSON.stringify([denied,malformed,large]).includes(secret)).toBe(false);
 });
 it('accepts a valid protected catalog but never claims a generation right',()=>{
  const t=target('openai','gpt-image-2.5-sunburst');
  const out=filterCatalog('openai',response({object:'list',data:[{object:'model',id:t[0].model,owned_by:secret}]}),t);
  expect(out.authentication).toBe('accepted_metadata_endpoint');expect(out.models[0].listed).toBe('LISTED');expect(out.generationTested).toBe(false);expect(JSON.stringify(out).includes(secret)).toBe(false);
 });
 it('does not equate a public fal catalog response with accepted authentication',()=>{
  const model='fal-ai/kling-video/v3/standard/image-to-video',t=target('fal',model);
  const out=filterCatalog('fal',response({models:[{endpoint_id:model,metadata:{is_favorited:null}}],has_more:false}),t);
  expect(out.catalogShapeVerified).toBe(true);expect(out.models[0].listed).toBe('LISTED');expect(out.authentication).toBe('not_verified_public_catalog');
  const personalized=filterCatalog('fal',response({models:[{endpoint_id:model,metadata:{is_favorited:false,private:secret}}],has_more:false}),t);
  expect(personalized.authentication).toBe('accepted_personalized_metadata');expect(JSON.stringify(personalized).includes(secret)).toBe(false);
 });
 it('keeps unknown configured values masked even when returned by the official catalog',()=>{
  const out=filterCatalog('alibaba',response({success:true,code:null,output:{models:[{model:secret}],total:1,page_no:1}}),target('alibaba',secret));
  expect(out.models[0]).toMatchObject({model:'OUTSIDE_SOURCE_CATALOG',listed:'LISTED',inOldCatalog:false,inIntegrationCatalog:false});expect(JSON.stringify(out).includes(secret)).toBe(false);
  expect(JSON.stringify(out).includes(secret.slice(0,4))).toBe(false);expect(JSON.stringify(out).includes(secret.slice(-4))).toBe(false);expect(JSON.stringify(out).includes(crypto.createHash('sha256').update(secret).digest('hex'))).toBe(false);
 });
 it('diagnoses normalization without revealing or modifying masked settings',()=>{
  const model='qwen-image-3.0-pro';
  const out=filterCatalog('alibaba',response({output:{models:[],total:0,page_no:1},code:null}),[...target('alibaba',' '+model+' '),...target('alibaba','alibaba:'+model)]);
  expect(out.models[0]).toMatchObject({model:'OUTSIDE_SOURCE_CATALOG',trimWouldMatch:true});expect(out.models[1]).toMatchObject({model:'OUTSIDE_SOURCE_CATALOG',providerPrefixWouldMatch:true});
 });
 it('never labels absence in an incomplete list as a missing model',()=>{
  const model='qwen-image-3.0-pro';const out=filterCatalog('alibaba',response({output:{models:[],total:168,page_no:1},code:null}),target('alibaba',model));
  expect(out.models[0].listed).toBe('NOT_SEEN_IN_PARTIAL_RESPONSE');
  const google=filterCatalog('google',response({models:[],nextPageToken:secret}),target('google','gemini-3.1-flash-image'));
  expect(google.models[0].listed).toBe('NOT_SEEN_IN_PARTIAL_RESPONSE');expect(JSON.stringify(google).includes(secret)).toBe(false);
 });
 it.each(['openai','anthropic','google','alibaba','fal'] as const)('does not accept unrelated successful JSON as a %s catalog',p=>{
  const out=filterCatalog(p,response({object:'account',data:[{id:secret}],private:secret}),[]);expect(out.authentication).toBe('not_verified');expect(out.catalogShapeVerified).toBe(false);expect(JSON.stringify(out).includes(secret)).toBe(false);
 });
 it('requires current-master GCM authentication and distinguishes native legacy readability',()=>{
  const key=crypto.randomBytes(32),iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv),bytes=Buffer.concat([c.update(secret),c.final()]);
  const rows=[{value:['v1',iv.toString('base64'),c.getAuthTag().toString('base64'),bytes.toString('base64')].join('.')}];
  expect(currentMasterEvidence(rows,key,1)).toMatchObject({currentMasterAuthenticatedRecords:1,validity:'CURRENT_MASTER_AUTHENTICATED_EXISTING_PROVIDER_RECORD'});
  expect(currentMasterEvidence(rows,crypto.randomBytes(32),1).validity).toBe('NATIVE_DECRYPTION_OBSERVED_CURRENT_MASTER_NOT_PROVEN');
  expect(currentMasterEvidence(rows,null,0).validity).toBe('ENCRYPTED_RECORDS_PRESENT_NO_VERIFIED_DECRYPTION');
  expect(currentMasterEvidence([],key,0).validity).toBe('NO_ENCRYPTED_PROVIDER_RECORD');
 });
 it('compares both pinned catalogs against documented public identifiers only',()=>{
  expect(REFERENCE_COMMITS.old).toBe('d97e0b9577128eeb39b403dae281da6bd835fc65');expect(REFERENCE_CATALOG.has('alibaba:qwen-image-3.0-pro')).toBe(true);expect(REFERENCE_CATALOG.has('openai:gpt-image-2.5-sunburst')).toBe(true);expect(REFERENCE_CATALOG.has(secret)).toBe(false);
 });
});
