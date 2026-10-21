import { grantProjectPlan } from "./communication-choice-fixture";
import { describe,it,expect } from "vitest";
import { creativeContract } from "@/lib/social-v2/creative-contract";
import type { PostBrief } from "@/lib/social-v2/deps";
import { videoIntent } from "@/lib/video-v2/intent";
import { videoStrategy } from "@/lib/video-v2/strategy";
import { localScript, scriptPrompt } from "@/lib/video-v2/script";
import { localScenePlan } from "@/lib/video-v2/three-scenes";
import { createUser } from "@/lib/auth";
import { loadProject } from "@/lib/projects";
import { seedImageFixture } from "./image-v2-fixtures";
import { videoContext } from "@/lib/video-v2/editorial";

const post:PostBrief={id:"isolated",network:"instagram",format:"reel",title:"Préparer la surface",caption:"Dépoussiérer. Laisser sécher.",pillar:"Conseil",objective:"aider",headline:"",scheduled_at:null,request:"Préserver ces étapes exactement.",editorial:{role:"Conseil pratique",structure:"tutorial",blocks:[{kind:"step",text:"Dépoussiérer."},{kind:"step",text:"Laisser sécher."}],sources:[{label:"Notice fournie",text:"Notice de test, non validée",url:"https://example.invalid/notice",verified:false}]}};
describe("Contrat éditorial vidéo commun, aucun appel fournisseur",()=>{
 it.each(["restaurant","hightech"] as const)("préserve textes, sources et identité %s dans les deux parcours",async kind=>{
  const u=await createUser(`video-contract-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Fixture");
  const p=loadProject(seedImageFixture(u.id,kind));grantProjectPlan(p.id,"dominer");
  const editorial=creativeContract(post,"organic");
  const intent=videoIntent(p,{kind:"social_content",text:post.request,editorial,durationS:30});
  const strategy=videoStrategy(p,intent);
  expect(strategy.cta).toBe(""); expect(strategy.style.narrative).toBe("educational");
  const script=localScript((await import("@/lib/ads-v2/insight")).adInsight(p),strategy,intent);
  expect(script.sections.map(s=>s.voice)).toEqual([post.title,"Dépoussiérer.","Laisser sécher."]);
  expect(script.issues).toEqual([]);
  const prompt=scriptPrompt((await import("@/lib/ads-v2/insight")).adInsight(p),strategy,intent,[]);
  expect(prompt).toContain("Notice fournie");expect(prompt).toContain(post.request!);
  const plan=localScenePlan(p,null,{as:"post",editorial,scenes:3});
  expect(plan.cta).toBe("");expect(plan.scenes.map(s=>s.voice)).toEqual(["Dépoussiérer.","Laisser sécher.",""]);
  expect(videoContext(p,"post",post.request,post.subject,editorial).editorial).toEqual(editorial);
 });
 it("accepte le scénario IA organique sans exiger un CTA ni repayer sa rédaction",async()=>{
  const u=await createUser(`organic-script-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Fixture");const p=loadProject(seedImageFixture(u.id,"hightech"));grantProjectPlan(p.id,"dominer");
  const {mockVideoDeps,shortVideoScript}=await import("./video-v2-mock");const {runVideoEngineV2}=await import("@/lib/video-v2/engine");
  const {deps,log}=mockVideoDeps({userId:p.userId,projectId:p.id,canWrite:true,generationAllowed:false,script:shortVideoScript});
  const r=await runVideoEngineV2(null,p.id,{ask:{purpose:"organic",text:"Expliquer un point à vérifier.",durationS:15},renderScale:.1,fps:2},deps);
  expect(r.script.by,JSON.stringify({notes:r.notes,issues:r.script.issues})).toBe("ai");expect(r.script.sections.some(s=>s.part==="cta")).toBe(false);expect(r.script.issues).toEqual([]);expect(log.scripts).toBe(1);
 },30000);
 it("ne raccourcit pas les blocs longs pour faire croire qu'ils tiennent",async()=>{
  const u=await createUser(`video-long-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Fixture");
  const p=loadProject(seedImageFixture(u.id,"hightech"));grantProjectPlan(p.id,"dominer");
  const editorial=creativeContract({...post,editorial:{blocks:[{kind:"paragraph",text:"Phrase complète à conserver. ".repeat(30)}]}},"organic");
  const intent=videoIntent(p,{editorial,durationS:6});const st=videoStrategy(p,intent);
  const script=localScript((await import("@/lib/ads-v2/insight")).adInsight(p),st,intent);
  expect(script.sections[1].voice).toBe(editorial.blocks[0].text);expect(script.issues.join(" ")).toContain("trop longue");
 });
});
