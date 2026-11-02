/** Le statut requis reste rouge si un contrôle manque, échoue ou est annulé. */
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
const workflow=()=>parse(fs.readFileSync('.github/workflows/ci.yml','utf8'));
const requiredJobs={tests:'TESTS_RESULT',natif:'NATIVE_RESULT','image-docker':'DOCKER_RESULT','confirmation-gratuite':'FREE_CONFIRMATION_RESULT'};
describe('#211 — CI séparée, verdict complet obligatoire',()=>{
 it('conserve le nom du statut requis et attend précisément les quatre contrôles indépendants',()=>{
  const w=workflow(),gate=w.jobs.verifications;
  expect(gate.name).toBe('Typecheck, tests, Theme Check, build');
  expect(gate.needs).toHaveLength(4);
  expect(new Set(gate.needs)).toEqual(new Set(Object.keys(requiredJobs)));
  expect(gate.if).toBe('${{ always() }}');
  expect(gate['continue-on-error']).toBeUndefined();
  const verdict=gate.steps.find((s:any)=>s.name==='Verdict obligatoire de tous les contrôles');
  expect(verdict['continue-on-error']).toBeUndefined();
  expect(verdict.env).toEqual(Object.fromEntries(Object.entries(requiredJobs).map(([job,variable])=>[variable,'${{ needs.'+job+'.result }}'])));
  for(const job of Object.keys(requiredJobs)){
   expect(w.jobs[job].needs).toBeUndefined();
   expect(w.jobs[job]['continue-on-error']).toBeUndefined();
  }
 });
 it('garde les tests complets, le garde réseau et un seul build hors Docker',()=>{const w=workflow(),unit=w.jobs.tests.steps,native=w.jobs.natif.steps;expect(unit.some((s:any)=>s.run==='npm run typecheck')).toBe(true);expect(unit.some((s:any)=>s.run?.includes('network-guard.mjs')&&s.run.endsWith(' npm test'))).toBe(true);expect(native.some((s:any)=>s.run==='JOBS=4 scripts/verify-theme.sh')).toBe(true);expect([...unit,...native].filter((s:any)=>s.run==='npm run build')).toHaveLength(1);for(const s of [...unit,...native])if(s.run)expect(s['continue-on-error']).toBeUndefined();});
 const runVerdict=(override:Record<string,string|undefined>={})=>{
  const gate=workflow().jobs.verifications.steps.find((s:any)=>s.name==='Verdict obligatoire de tous les contrôles');
  expect(gate?.run).toBeTruthy();
  if(!gate?.run)throw Error('Closed verdict gate missing; no workflow command executed');
  const expected=Object.values(requiredJobs).map(variable=>'test "$'+variable+'" = success');
  expect(gate.run.trim().split('\n')).toEqual(expected);
  // Execute only the exact four whitelisted commands, never arbitrary workflow code.
  const env:NodeJS.ProcessEnv={...process.env};
  for(const variable of Object.values(requiredJobs))env[variable]='success';
  for(const [variable,value] of Object.entries(override)){
   if(value===undefined)delete env[variable];else env[variable]=value;
  }
  const result=spawnSync('bash',['-e','-c',gate.run],{env});
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  return result.status;
 };
 it('accepte uniquement le succès des quatre contrôles (4/4)',()=>expect(runVerdict()).toBe(0));
 for(const [job,variable] of Object.entries(requiredJobs)){
  it.each(['failure','cancelled','skipped','',undefined,'unknown'])('refuse '+job+' avec résultat %s',result=>{
   expect(runVerdict({[variable]:result})).toBe(1);
  });
 }
});
