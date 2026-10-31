import {it,expect,vi,beforeEach,afterEach} from "vitest";
import {account,project,sender,emptySpend} from "./conversation209-fixtures";
import * as native from "@/lib/preparation/quote";
import {openProjectConversation} from "@/lib/orchestrator/conversation";
import {remember} from "@/lib/projects";
import {all,id} from "@/lib/db";
beforeEach(()=>vi.stubEnv("STUDIO_CONVERSATION_LOT_A","1"));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
it("ancien contrat de devis : détecte l'absence d'empreinte #208, retire le devis et n'offre pas une confirmation trompeuse",async()=>{
  const u=await account(),pid=project(u),c=openProjectConversation(u,pid),send=sender(u,c.id);await send({action:"message",text:"Je vends des lampes"});
  const spy=vi.spyOn(native,"createQuote").mockImplementation(()=>{const qid=id();remember(pid,{kind:"artifact",key:`preparation.quote.${qid}`,value:JSON.stringify({id:qid,capMicro:123}),source:"local"});return{id:qid,paid:true,maxBudgetPct:4.3,estimateBudgetPct:.2,mode:"provider",note:"SIMULATION"};});
  const before=emptySpend(),v=await send({action:"prepare-action",tool:"understand-offer",correction:"Conserver le contexte client"});
  expect(spy).toHaveBeenCalledWith(pid,"brief","analyze",undefined,"Conserver le contexte client");
  expect(v.action?.state).toBe("unavailable");expect(v.message).toContain("#208");expect(v.action?.quote).toBeUndefined();expect(all("SELECT * FROM memory WHERE project_id=? AND key LIKE 'preparation.quote.%'",pid)).toHaveLength(0);expect(emptySpend()).toEqual(before);
});
it("contrat futur simulé : seul le devis natif lié au contexte/correction est exposé, en %, sans exécution",async()=>{
  const u=await account(),pid=project(u),c=openProjectConversation(u,pid),send=sender(u,c.id);await send({action:"message",text:"Je vends des lampes"});
  vi.spyOn(native,"createQuote").mockImplementation((...args)=>{const qid=id(),correction=(args as unknown as unknown[])[4];remember(pid,{kind:"artifact",key:`preparation.quote.${qid}`,value:JSON.stringify({id:qid,analysisFingerprint:"simulation-bound-context",correction}),source:"local"});return{id:qid,paid:true,maxBudgetPct:4.3,estimateBudgetPct:.2,mode:"provider",note:"SIMULATION"};});
  const before=emptySpend(),v=await send({action:"prepare-action",tool:"understand-offer",correction:"Conserver le contexte client"});
  expect(v.action?.quote).toMatchObject({estimatePct:.2,maximumPct:4.3,executionEnabled:false,confirmationRequired:true});expect(v.action?.executed).toBe(false);expect(JSON.stringify(v.action)).not.toMatch(/Micro|Eur|USD|EUR/);expect(emptySpend()).toEqual(before);
});
it.each([{id:"x",estimateBudgetPct:null,maxBudgetPct:4.3},{id:"x",estimateBudgetPct:5,maxBudgetPct:4.3},{id:"x",estimateBudgetPct:NaN,maxBudgetPct:4.3}])("prix manquant ou incohérent : pas de confirmation implicite (%j)",async q=>{
  const u=await account(),pid=project(u),c=openProjectConversation(u,pid),send=sender(u,c.id,{quote:()=>q});await send({action:"message",text:"Je vends des lampes"});
  const v=await send({action:"prepare-action",tool:"understand-offer"});expect(v.action?.state).toBe("unavailable");expect(v.action?.quote).toBeUndefined();
});
