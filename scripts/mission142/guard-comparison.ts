/** Execute the historical guard and preflight with synthetic data only. No provider/network request. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import vm from "node:vm";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import assert from "node:assert/strict";
import ts from "typescript";
const data=process.env.DATA_DIR;
if(!data||!path.basename(data).startsWith("ecs-parcours-test-142-"))throw Error("Isolated DATA_DIR required");
globalThis.fetch=async()=>{throw Error("No real provider/network allowed");};
const {createUser}=await import("../../src/lib/auth");
const {seedImageFixture}=await import("../../tests/image-v2-fixtures");
const {loadProject}=await import("../../src/lib/projects");
const {publicationCopyIssues}=await import("../../src/lib/social-v2/publication-copy-policy");
const {designPostWithAi}=await import("../../src/lib/social-v2/ai-post");
const {campaignConcept}=await import("../../tests/publication-fixtures");
const base="d97e0b9577128eeb39b403dae281da6bd835fc65",root=process.cwd();
const source=(file:string)=>execFileSync("git",["show",`${base}:${file}`],{encoding:"utf8"});
function evaluate(text:string){const context={exports:{}};vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return context.exports as any;}
const oldPolicy=evaluate(source("src/lib/social-v2/publication-copy-policy.ts"));
const oldSource=source("src/lib/social-v2/ai-post.ts"),ast=ts.createSourceFile("old.ts",oldSource,ts.ScriptTarget.Latest,true);
const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==="cleanAiCopy")!;
const oldClean=evaluate(fn.getText(ast)).cleanAiCopy;
const user=await createUser(`comparison-${crypto.randomUUID()}@example.invalid`,"isolated-password","Fictif");
const p=loadProject(seedImageFixture(user.id,"restaurant"));p.brand!.name="Best";
const fallback={headline:"Titre acquis",subline:"",cta:"",brand:p.brand!.name};
const cases=[{code:"NEUTRAL_OPINION",text:"Votre avis compte"},{code:"SUBJECTIVE_MOMENTS",text:"de meilleurs moments"},{code:"EXACT_BRAND",text:"Découvrez Best"},{code:"UNCONFIRMED_EUR",text:"1250 EUR"},{code:"UNCONFIRMED_PERCENT",text:"50 % de remise"}];
const results=cases.map(c=>{
 const copy={headline:c.text,subline:"",cta:"",scene:"Synthetic setting"};
 const allowed=oldPolicy.authorizedPublicationTexts(p,[c.text],"",[]),before=oldClean(copy,fallback,true,allowed).headline===c.text;
 const after=publicationCopyIssues(p,copy,"",[]).length===0;
 return {case:c.code,historicalAccepted:before,correctedAccepted:after};
});
assert.deepEqual(results.map(x=>[x.historicalAccepted,x.correctedAccepted]),[[false,true],[false,true],[false,true],[true,false],[false,false]]);
// Historical image-model check happens only after the synthetic copy operation.
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),"ecs-test-142-historical-"));
try {
 fs.symlinkSync(path.resolve("node_modules"),path.join(scratch,"node_modules"),"dir");
 fs.writeFileSync(path.join(scratch,"policy.ts"),source("src/lib/social-v2/publication-copy-policy.ts"));
 const rewrite=(s:string)=>s==="./publication-copy-policy"?pathToFileURL(path.join(scratch,"policy.ts")).href:s.startsWith(".")?pathToFileURL(path.resolve(root,"src/lib/social-v2",s)+".ts").href:s;
 fs.writeFileSync(path.join(scratch,"old-ai-post.ts"),oldSource.replace(/from\s+["']([^"']+)["']/g,(_m,s)=>`from "${rewrite(s)}"`).replace(/import\(["']([^"']+)["']\)/g,(_m,s)=>`import("${rewrite(s)}")`));
 const old=await import(pathToFileURL(path.join(scratch,"old-ai-post.ts")).href);
 const post={id:"synthetic-before",network:"meta",format:"image",title:"Présentation",caption:"",pillar:null,objective:"sell",headline:"Présentation",scheduled_at:null};
 let copies=0;const deps={copy:async()=>{copies++;return {headline:"Un projet à découvrir",subline:"",cta:"",scene:"Synthetic documented setting",concept:campaignConcept()};},generate:async()=>{throw Error("No image should be requested");},review:async()=>{throw Error("No review should be requested");},maxMicro:()=>null,spentMicro:()=>0};
 const before=await old.designPostWithAi(p,post,{as:"ad",aspect:"4:5",reference:null,maxCostEur:1},deps);assert.equal(before.assetId,null);assert.equal(copies,1);
 copies=0;const after=await designPostWithAi(p,{...post,id:"synthetic-after"},{as:"ad",aspect:"4:5",reference:null,maxCostEur:1},deps);assert.equal(after.assetId,null);assert.equal(copies,0);
 fs.writeFileSync(path.join(data,"guard-comparison.json"),JSON.stringify({historicalCommit:base,realProviderCalls:0,realProviderCost:0,synthetic:true,results,incompatibleImageModel:{historicalCopyCalls:1,correctedCopyCalls:0}},null,2));
 console.log("Comparaison historique reproduite : trois faux refus, EUR non contrôlé, rédaction achetée avant indisponibilité image ; corrections vérifiées, aucun appel réel.");
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
