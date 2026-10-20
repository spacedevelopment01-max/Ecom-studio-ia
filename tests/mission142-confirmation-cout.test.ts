import {expect,it} from "vitest";
import {costUsage} from "@/lib/ai/cost-confirm";

it.each(["image","images"] as const)("%s exige l’IA : ne pas proposer une création locale inexistante",action=>{
 expect(costUsage(action)?.local).toBe(false);
});
it("les actions qui disposent du moteur local conservent leur confirmation",()=>{
 expect(costUsage("edit")).toEqual({ask:true,local:true});
 expect(costUsage("pipeline","edited")).toBeNull();
 expect(costUsage("image")?.ask).toBe(false);
 expect(costUsage("images")?.ask).toBe(true);
});
