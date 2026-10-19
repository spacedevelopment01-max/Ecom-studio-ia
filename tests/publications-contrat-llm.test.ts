import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import { campaignConcept, campaignVerdict } from "./publication-fixtures";
const requests: any[] = [];
vi.mock("@/lib/ai/llm", () => ({
  llmConfigured: () => true,
  llmJson: async (call: any, schema: any) => {
    requests.push(call);
    return schema.parse(
      call.task === "quality_control"
        ? {
            ...campaignVerdict(),
            transcribed: ["Message exact"],
            person: false,
            anatomyOk: true,
            productFaithful: true,
            textsExact: true,
            legible: true,
            score: 9.2,
            issues: [],
            fix: "",
          }
        : {
            blocks:[{kind:"paragraph",text:"Explication SIMULÉE fondée sur la matière fournie."}],
            headline: "Message exact",
            subline: "",
            cta: "",
            scene:
              "A detailed working environment with coherent physical lighting",
            concept: campaignConcept(),
          },
    );
  },
}));
import { createUser } from "@/lib/auth";
import { loadProject } from "@/lib/projects";
import { seedImageFixture } from "./image-v2-fixtures";
import { realAiPostDeps } from "@/lib/social-v2/ai-post";
import { buildGenerationBrief } from "@/lib/image-v2/art-direction";
import { saveAsset } from "@/lib/library";
import { publicationIdentity } from "@/lib/image-v2/publication-identity";
it("concepteur et contrôleur réels : brief complet, identité, références préparées, mobile, avant/après et visuel récent — LLM simulé", async () => {
  const u = await createUser(
    `contract-${crypto.randomUUID()}@test.invalid`,
    "motdepasse-test",
    "Test",
  );
  const p = loadProject(seedImageFixture(u.id, "hightech"));
  const image = await sharp({
    create: { width: 1080, height: 1350, channels: 3, background: "#235766" },
  })
    .png()
    .toBuffer();
  const recent = await saveAsset({
    projectId: p.id,
    userId: p.userId,
    data: image,
    name: "recent-test.png",
    mime: "image/png",
    role: "ad",
    origin: "generated",
    status: "ready",
    meta: { simulation: true },
  });
  const request =
    "Demande détaillée. ".repeat(50) +
    "FIN OBLIGATOIRE : conserver la matière et le logo exacts";
  const post = {
    id: "contract",
    network: "instagram",
    format: "image",
    title: "Message exact",
    headline: "Message exact",
    caption: "",
    pillar: null,
    objective: "convert",
    scheduled_at: null,
    request,
  };
  const context = {
    aspect: "4:5" as const,
    mode: "two-step" as const,
    identity: publicationIdentity(p),
    strategy: p.strategy,
    facts: p.product.facts,
    request,
    recent: [
      {
        assetId: recent.id,
        composition: "diagonale",
        concept: "Une autre lumière et un lieu documenté",
      },
    ],
  };
  const d = realAiPostDeps({ userId: p.userId, projectId: p.id, jobId: null });
  const c = await d.copy!(
    p,
    post,
    { headline: "Message exact", subline: "", cta: "", brand: p.brand!.name },
    "copy-test",
    false,
    context,
  );
  expect(c?.concept).toBeTruthy();
  expect(requests[0].prompt).toContain("FIN OBLIGATOIRE");
  expect(requests[0].prompt).toContain("color");
  expect(requests[0].context).toContain("contexte_projet");
  expect(requests[0].prompt).toContain("diagonale");
  const brief = buildGenerationBrief(p, {
    purpose: "ad",
    aspect: "4:5",
    subject: "sujet documenté",
    texts: { hook: "Message exact" },
    scene: c!.scene,
  });
  await d.review(image, image, ["Message exact"], "review-test", false, image, {
    ...context,
    brief,
    native: image,
    scene: image,
    referenceManifest: { transmitted: ["product", "logo"] },
  });
  const call = requests[1];
  expect(call.prompt).toContain("FIN OBLIGATOIRE");
  expect(call.prompt).toContain("transmitted");
  const labels = call.images.map((i: any) => i.label).join(" | ");
  expect(labels).toContain("actual transmitted logo");
  expect(labels).toContain("actual transmitted product");
  expect(labels).toContain("360px");
  expect(labels).toContain("BEFORE");
  expect(labels).toContain("recent campaign");
  expect(
    await sharp(
      call.images.find((i: any) => i.label.includes("360px")).data,
    ).metadata(),
  ).toMatchObject({ width: 360 });
});

it("le concepteur et le contrôleur reçoivent les deux finalités et le contenu éditorial intégral — LLM simulé",async()=>{
 const {creativeContract}=await import('@/lib/social-v2/creative-contract');
 const u=await createUser(`purpose-llm-${crypto.randomUUID()}@test.invalid`,'motdepasse-test','Test');const p=loadProject(seedImageFixture(u.id,'artisan'));
 const d=realAiPostDeps({userId:u.id,projectId:p.id,jobId:null});
 for(const purpose of ['ad','organic'] as const){
  const post={id:`purpose-${purpose}`,network:'instagram',format:'image',title:'Message exact',headline:'Message exact',caption:'Un conseil complet et précis.',pillar:'conseils',objective:'educate',scheduled_at:null,editorial:{structure:'checklist' as const,blocks:[{kind:'check' as const,text:'Dernière vérification indispensable.'}],sources:[{label:'Document fourni',text:'Fait connu',verified:true}]},advertising:{direction:{layout:'diagonale'},proofs:['Fait confirmé']}};
  const creative=creativeContract(post,purpose),context={creative,aspect:'4:5' as const,mode:'one-step' as const,identity:publicationIdentity(p),strategy:p.strategy,facts:p.product.facts,request:null,recent:[]};
  const start=requests.length;await d.copy!(p,post,{headline:'Message exact',subline:'',cta:'',brand:p.brand!.name},`${purpose}:copy`,false,context);
  expect(requests[start].system).toContain(purpose==='ad'?'advertising creative director':'editorial art director');
  expect(requests[start].prompt).toContain(purpose==='ad'?'PUBLICITÉ COMMERCIALE':'PUBLICATION ORGANIQUE');expect(requests[start].prompt).toContain('Dernière vérification indispensable.');expect(requests[start].prompt).toContain('Document fourni');
  const img=await sharp({create:{width:1080,height:1350,channels:3,background:'#235766'}}).png().toBuffer();await d.review(img,null,['Message exact'],`${purpose}:review`,false,null,context);
  expect(requests.at(-1).prompt).toContain('never penalize absence of a commercial CTA');expect(requests.at(-1).prompt).toContain('Invented review, attribution, proof or diagram data is fatal');
 }
});
