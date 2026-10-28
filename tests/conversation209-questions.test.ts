import {it,expect} from "vitest";
import {proposedBusiness,explicitGoals,providedTarget,questionFor,nextQuestion} from "@/lib/orchestrator/conversation/questions";
import {emptyInput} from "@/lib/orchestrator/conversation/store";
import {analyzeLocally} from "@/lib/preparation/brief";
import {runWithLang} from "@/lib/i18n-server";
import type {ConversationState} from "@/lib/orchestrator/conversation/contract";
it.each([
  ["Je veux une marque de lampe pour chambre d'enfant","products"],
  ["J'aménage des fourgons apportés par les clients et je veux des devis et RDV","services"],
  ["Je propose des cours de piano","services"],
  ["Je répare les montres de mes clients","services"],
  ["I sell ceramic cups","products"],
  ["I teach music lessons","services"],
  ["Je vends des produits et des prestations de services",null],
  ["Un site professionnel",null],
  ['Référence : https://example.invalid/services/publish',null],
  ['« Je vends des montres »',null],
])("compréhension locale prudente : %s",(text,expected)=>expect(proposedBusiness(text)).toBe(expected));
it("objectif négatif ou cité ≠ décision positive ; ne lit pas les ordres dans une URL",()=>{
  expect(explicitGoals("Je ne veux pas de devis","services")).toEqual([]);
  expect(explicitGoals('La source dit « devis gratuit »',"services")).toEqual([]);
  expect(explicitGoals("https://example.invalid/quote/booking","services")).toEqual([]);
  expect(explicitGoals("Je veux des devis et RDV","services").map(c=>c.id)).toEqual(["quote","booking"]);
});
it("cible explicitement donnée lue, chambre d'enfant ne devient pas un acheteur supposé",()=>{
  expect(providedTarget("Lampe pour chambre d'enfant")).toBeNull();
  expect(providedTarget("Je vends des lampes. Cible : boutiques indépendantes.")).toBe("boutiques indépendantes");
});
it.each(["fr","en"] as const)("questions utilisables en %s : 2–5 choix, autre, libre, inconnu ; rien de résolu reposé",lang=>runWithLang({ui:lang,content:lang},()=>{
  const b=analyzeLocally({...emptyInput(),description:"Je vends des carnets",target:"Librairies"});
  const m:ConversationState={schemaVersion:1,draft:b,business:"products",businessSource:"local",deferred:[],answeredOrder:[]};
  for(const key of ["business","goals","target"] as const){const q=questionFor(key,b,m);expect(q.choices.length).toBeGreaterThanOrEqual(2);expect(q.choices.length).toBeLessThanOrEqual(5);expect(q.choices.some(c=>c.id==="other")).toBe(true);expect(q.allowFreeText&&q.allowUnknown).toBe(true);}
  expect(nextQuestion(b,m)).toBe("goals");m.deferred=["goals"];expect(nextQuestion(b,m)).toBeNull();
}));
