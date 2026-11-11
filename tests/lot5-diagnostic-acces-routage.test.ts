import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { inspectPublicNetwork } from '../scripts/diagnostic-acces-routage';

// Only isolated, fabricated settings. Never read the developer's studio configuration.
const roots: string[] = [];
const script = path.resolve('scripts/diagnostic-acces-routage.ts');
const fake = 'pR9_fixture-only-credential-must-never-be-exported_7zQk';
const master = 'fixture-only-master-secret-over-thirty-two-characters';
function fixture(rows: [string, string, number][] = [], env: Record<string, string> = {}, database = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lot5-diagnostic-test-'));
  roots.push(root);
  fs.writeFileSync(path.join(root, '.env.local'), Object.entries(env).map(([k,v]) => `${k}=${v}`).join('\n'));
  if (database) {
    fs.mkdirSync(path.join(root, 'data'));
    const db = new Database(path.join(root, 'data/studio.db'));
    db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT,secret INTEGER,updated_at INTEGER)');
    for (const [key,value,secret] of rows) db.prepare('INSERT INTO settings VALUES (?,?,?,0)').run(key,value,secret);
    db.close();
  }
  return root;
}
function encrypted(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm',crypto.createHash('sha256').update(master).digest(),iv);
  const out = Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return ['v1',iv.toString('base64'),cipher.getAuthTag().toString('base64'),out.toString('base64')].join('.');
}
function inspect(root: string, loader = 'worker', extraEnv: Record<string,string> = {}) {
  const env = {...process.env};
  for (const k of Object.keys(env)) {
    if (/^(PROVIDER_|AI_|APP_SECRET$|.*API_KEY$|FAL_KEY$|DATA_DIR$|DATABASE_FILE$|KOKORO|__NEXT_PROCESSED_ENV$)/.test(k)) delete env[k];
  }
  Object.assign(env,{NODE_ENV:'production'},extraEnv);
  const run = spawnSync(process.execPath,['--import','tsx',script,'--config-root',root,'--loader',loader],{cwd:path.resolve('.'),env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  expect(run.error).toBeUndefined();
  expect(run.status).toBe(0);
  // Never include raw stdout/stderr in an assertion message.
  expect(run.stderr.length).toBe(0);
  const result = JSON.parse(run.stdout);
  expect(result.realProviderCalls).toBe(0);
  expect(result.networkCalls).toBe(0);
  expect(result.readOnly).toBe(true);
  return {result,serialized:run.stdout};
}
const provider = (result:any,p='openai') => result.providers.find((r:any)=>r.provider===p);
afterAll(()=>{for(const root of roots)fs.rmSync(root,{recursive:true,force:true});});

describe('Lot 5: native access diagnostic without generation or secret disclosure',()=>{
  it('does not create a missing database or master-secret file',()=>{
    const root=fixture([],{},false);
    const {result}=inspect(root);
    expect(result.nativeResolution.reason).toBe('DATABASE_ABSENT');
    expect(fs.readdirSync(root)).toEqual(['.env.local']);
  });
  it.each(['worker','next'])('resolves the real %s loader, decrypted key and defaults without authentication',loader=>{
    const root=fixture([['provider.openai.apiKey',encrypted(fake),1]],{APP_SECRET:master});
    const {result,serialized}=inspect(root,loader);
    expect(result.nativeResolution.available).toBe(true);
    expect(provider(result)).toMatchObject({encrypted:true,storedReadability:'accessible',effectiveSource:'settings',status:'accessible',authentication:'not_tested',modelAuthorization:'not_tested'});
    expect(result.mediaRoutes.find((r:any)=>r.usage==='logo').primary).toEqual({provider:'openai',model:'gpt-image-2.5-sunburst'});
    for(const secret of [fake,master,crypto.createHash('sha256').update(fake).digest('hex')]) expect(serialized.includes(secret)).toBe(false);
    expect(result.textRoutes.find((r:any)=>r.task==='copywriting').difficultyVariants.complex).toEqual({provider:'anthropic',model:'claude-opus-5-5'});
    expect(serialized.includes(fake.slice(0,4))).toBe(false);
    expect(serialized.includes(fake.slice(-4))).toBe(false);
  });
  it('distinguishes a stored but undecryptable key from an absent key',()=>{
    const root=fixture([['provider.openai.apiKey',encrypted(fake),1]],{APP_SECRET:'different-fixture-master-secret-over-thirty-two'});
    const {result}=inspect(root);
    expect(provider(result)).toMatchObject({storedPresent:true,storedReadability:'present_but_unusable',effectiveAccessible:false,status:'present_but_unusable'});
    expect(provider(result,'google').status).toBe('absent');
  });
  it('does not generate a development master secret while inspecting encrypted settings',()=>{
    const root=fixture([['provider.openai.apiKey',encrypted(fake),1]]);
    const {result,serialized}=inspect(root,'worker',{NODE_ENV:'development'});
    expect(provider(result).status).toBe('present_but_unusable');
    expect(fs.existsSync(path.join(root,'data/.app-secret'))).toBe(false);
    expect(serialized.includes(fake)).toBe(false);
  });
  it('distinguishes disabled access and keeps settings precedence over environment aliases',()=>{
    const root=fixture([['provider.openai.apiKey',encrypted(fake),1],['provider.openai.disabled','1',0]],{APP_SECRET:master,OPENAI_API_KEY:'different-fixture-key'});
    const {result}=inspect(root);
    expect(provider(result)).toMatchObject({effectiveSource:'settings',effectiveAccessible:true,disabled:true,status:'present_but_unusable'});
    expect(result.mediaRoutes.find((r:any)=>r.usage==='logo').resolved).toBeNull();
  });
  it('recognizes conventional and generated parameter aliases without printing them',()=>{
    const root=fixture([],{GOOGLE_API_KEY:fake,PROVIDER_ANTHROPIC_APIKEY:fake});
    const {result,serialized}=inspect(root);
    expect(provider(result,'google')).toMatchObject({effectiveSource:'conventional_environment',status:'accessible'});
    expect(provider(result,'anthropic')).toMatchObject({effectiveSource:'environment_parameter',status:'accessible'});
    expect(serialized.includes(fake)).toBe(false);
  });
  it('does not equate a gateway declaration with an accessible credential',()=>{
    const root=fixture([],{AI_GATEWAY_PROVIDERS:'openai'});
    const {result}=inspect(root);
    expect(provider(result)).toMatchObject({effectiveSource:'gateway_declared_not_verified',effectiveAccessible:false,status:'validity_not_verified'});
  });
  it('redacts arbitrary configured models and endpoint/workspace values',()=>{
    const root=fixture([['ai.routes',JSON.stringify({copywriting:{provider:'anthropic',model:fake}}),0],['provider.alibaba.endpoint',fake,0],['provider.alibaba.workspace',fake,0]]);
    const {result,serialized}=inspect(root);
    expect(result.textRoutes.find((r:any)=>r.task==='copywriting').configuredRoute.model).toBe('OUTSIDE_SOURCE_CATALOG');
    expect(serialized.includes(fake)).toBe(false);
    expect(result.alibaba.customEndpointPresent).toBe(true);
  });
  it('leaves database schema, settings and files unchanged; invokes no native migrations',()=>{
    const root=fixture([['provider.openai.apiKey',encrypted(fake),1]],{APP_SECRET:master});
    const file=path.join(root,'data/studio.db');
    const before=fs.readFileSync(file);
    const {result}=inspect(root);
    expect(result.nativeResolution.available).toBe(true);
    expect(fs.readFileSync(file).equals(before)).toBe(true);
    const db=new Database(file,{readonly:true});
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).toEqual([{name:'settings'}]);
    db.close();
    expect(fs.readdirSync(path.join(root,'data'))).toEqual(['studio.db']);
  });
  it('runs a downloaded temporary script against the existing checkout with both independent loaders',()=>{
    const root=fixture([['provider.openai.apiKey',encrypted(fake),1]],{APP_SECRET:master});
    const temp=path.join(root,'downloaded-diagnostic.mts');
    fs.copyFileSync(script,temp);
    const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:'production'};
    for(const k of Object.keys(env))if(/^(PROVIDER_|AI_|APP_SECRET$|.*API_KEY$|FAL_KEY$|DATA_DIR$|DATABASE_FILE$|KOKORO|__NEXT_PROCESSED_ENV$)/.test(k))delete (env as any)[k];
    const before=fs.readFileSync(path.join(root,'data/studio.db'));
    const run=spawnSync(process.execPath,['--import','tsx',temp,'--code-root',path.resolve('.'),'--config-root',root,'--both-loaders'],{cwd:path.resolve('.'),env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
    expect(run.status).toBe(0);expect(run.stderr.length).toBe(0);
    const result=JSON.parse(run.stdout);
    expect(result).toMatchObject({readOnly:true,realGenerationCalls:0,configurationChanged:false,servedVersion:'not_probed',network:[]});
    expect(result.loaders.map((r:any)=>r.configurationLoader)).toEqual(['next','worker']);
    for(const r of result.loaders){expect(r.nativeResolution.available).toBe(true);expect(provider(r).status).toBe('accessible');}
    expect(run.stdout.includes(fake)).toBe(false);expect(run.stdout.includes(master)).toBe(false);
    expect(fs.readFileSync(path.join(root,'data/studio.db')).equals(before)).toBe(true);
    expect(fs.readdirSync(path.join(root,'data'))).toEqual(['studio.db']);
  });
  it('reports a missing native checkout without disclosing child errors or treating it as verified access',()=>{
    const root=fixture([],{},false);
    const run=spawnSync(process.execPath,['--import','tsx',script,'--code-root',root,'--config-root',root,'--both-loaders'],{cwd:path.resolve('.'),env:process.env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
    const result=JSON.parse(run.stdout);
    expect(result.loaders.every((r:any)=>r.error==='CHILD_INSPECTION_FAILED_NO_RAW_ERROR')).toBe(true);
    expect(result.servedVersion).toBe('not_probed');
  });
  it.each([
    ['000 403',56,'PROXY_CONNECT_REFUSED'],['401 200',0,'HTTP_RESPONSE_RECEIVED'],['403 000',0,'HTTP_RESPONSE_RECEIVED'],['200 000',0,'HTTP_RESPONSE_RECEIVED'],['000 000',28,'NETWORK_FAILURE'],['private-free-error',1,'NETWORK_FAILURE'],
  ])('classifies public network metadata %s without claiming authentication',(stdout,status,network)=>{
    const calls:any[]=[];
    const rows=inspectPublicNetwork(((...args:any[])=>{calls.push(args);return {stdout,stderr:fake,status};}) as any);
    expect(rows).toHaveLength(7);
    expect(rows.every(r=>r.network===network&&r.authenticated===false&&r.authentication==='not_tested'&&r.modelAuthorization==='not_tested')).toBe(true);
    expect(JSON.stringify(rows).includes(fake)).toBe(false);
    for(const [command,args] of calls){expect(command).toBe('curl');expect(args[0]).toBe('--disable');expect(args).toContain('--head');expect(args).not.toContain('--location');expect(args.join(' ')).not.toMatch(/authorization|api.key|--insecure|--noproxy/i);}
  });
  it.each([false,true])('runs the exact temporary CLI authenticated path with five fake transports, independent loaders and unchanged data (summary=%s)',summary=>{
    const root=fixture(['anthropic','openai','google','fal','alibaba'].map(p=>[`provider.${p}.apiKey`,encrypted(fake),1] as [string,string,number]),{APP_SECRET:master});
    const temp=path.join(root,'downloaded.mts');fs.copyFileSync(script,temp);
    const bin=path.join(root,'bin');fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin,'curl'),`#!/usr/bin/env python3\nimport json,sys\nprivate_input=sys.stdin.read()\nu=sys.argv[-1]\nif 'api.anthropic.com' in u: j={'data':[{'id':'claude-opus-5-5','type':'model'}],'has_more':False}\nelif 'api.openai.com' in u: j={'object':'list','data':[{'id':'gpt-image-2.5-sunburst','object':'model'}]}\nelif 'googleapis.com' in u: j={'models':[{'name':'models/gemini-3.1-flash-image'}]}\nelif 'aliyuncs.com' in u: j={'success':True,'code':None,'output':{'models':[{'model':'qwen-image-3.0-pro'}],'total':1,'page_no':1}}\nelse: j={'models':[{'endpoint_id':'fal-ai/kling-video/v3/standard/image-to-video','metadata':{'is_favorited':False}}],'has_more':False}\nprint(json.dumps(j)+'\\nECOM_METADATA 200 000',end='')\n`,{mode:0o700});
    const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:'production',PATH:bin+path.delimiter+process.env.PATH};
    for(const k of Object.keys(env))if(/^(PROVIDER_|AI_|APP_SECRET$|.*API_KEY$|FAL_KEY$|DATA_DIR$|DATABASE_FILE$|KOKORO|__NEXT_PROCESSED_ENV$)/.test(k))delete (env as any)[k];
    const before=fs.readFileSync(path.join(root,'data/studio.db'));
    const run=spawnSync(process.execPath,['--import','tsx',temp,'--code-root',path.resolve('.'),'--config-root',root,'--both-loaders','--authenticate',...(summary?['--auth-summary']:[])],{cwd:path.resolve('.'),env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
    expect(run.status).toBe(0);expect(run.stderr.length).toBe(0);
    const result=JSON.parse(run.stdout),worker=result.loaders.find((r:any)=>r.configurationLoader==='worker'),next=result.loaders.find((r:any)=>r.configurationLoader==='next');
    expect(result.metadataReadAttempts).toBe(5);expect(result.realGenerationCalls).toBe(0);expect(result.authenticatedConfigurationLoader).toBe('worker');
    const checks=summary?result.authenticationChecks:worker.authenticationChecks;
    expect(checks).toHaveLength(5);expect(checks.every((r:any)=>r.authentication.startsWith('accepted_'))).toBe(true);
    expect(worker.masterSecret.validity).toBe('CURRENT_MASTER_AUTHENTICATED_EXISTING_PROVIDER_RECORD');
    expect(next.authenticationChecks).toBeUndefined();if(!summary)expect(next.providers.every((r:any)=>r.authentication==='not_tested')).toBe(true);
    expect(checks.every((r:any)=>r.generationTested===false)).toBe(true);
    expect(run.stdout.includes(fake)).toBe(false);expect(run.stdout.includes(master)).toBe(false);expect(run.stdout.includes(fake.slice(0,4))).toBe(false);expect(run.stdout.includes(fake.slice(-4))).toBe(false);
    expect(fs.readFileSync(path.join(root,'data/studio.db')).equals(before)).toBe(true);expect(fs.readdirSync(path.join(root,'data'))).toEqual(['studio.db']);
  });

  it('keeps native disable, gateway and endpoint/region barriers before every authenticated request',()=>{
    const root=fixture([
      ['provider.openai.apiKey',encrypted(fake),1],['provider.openai.disabled','1',0],
      ['provider.alibaba.apiKey',encrypted(fake),1],['provider.alibaba.region','us',0],['provider.fal.disabled','1',0],
    ],{APP_SECRET:master});
    const driver=path.join(root,'inspect-barriers.mts');
    fs.writeFileSync(driver,`import {inspectAccessAndRouting} from ${JSON.stringify(script)};\nconst r=await inspectAccessAndRouting(${JSON.stringify(root)},'worker',${JSON.stringify(path.resolve('.'))},{authenticate:true,catalogReader(){throw Error('MUST_NOT_SEND');}});console.log(JSON.stringify(r));`);
    const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:'production'};
    for(const k of Object.keys(env))if(/^(PROVIDER_|AI_|APP_SECRET$|.*API_KEY$|FAL_KEY$|DATA_DIR$|DATABASE_FILE$|KOKORO|__NEXT_PROCESSED_ENV$)/.test(k))delete (env as any)[k];
    Object.assign(env,{ANTHROPIC_API_KEY:fake,ANTHROPIC_BASE_URL:'https://untrusted.example.test',AI_GATEWAY_PROVIDERS:'google',FAL_KEY:fake});
    const run=spawnSync(process.execPath,['--import','tsx',driver],{cwd:path.resolve('.'),env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
    expect(run.status).toBe(0);expect(run.stderr.length).toBe(0);const result=JSON.parse(run.stdout);
    expect(result.nativeResolution.available).toBe(true);expect(result.metadataReadAttempts).toBe(0);
    const codes=Object.fromEntries(result.authenticationChecks.map((r:any)=>[r.provider,r.failureCode]));
    expect(codes).toEqual({anthropic:'CUSTOM_ENDPOINT_NOT_TESTED',openai:'NATIVE_ACTIVE_KEY_UNAVAILABLE',google:'NATIVE_ACTIVE_KEY_UNAVAILABLE',alibaba:'DOCUMENTED_METADATA_ENDPOINT_NOT_MATCHED',fal:'NATIVE_ACTIVE_KEY_UNAVAILABLE'});
    expect(run.stdout.includes(fake)).toBe(false);expect(run.stdout.includes(master)).toBe(false);
  });

});
