/** Données synthétiques et fournisseurs simulés. Aucun réseau ni appel facturé. */
import sharp from "sharp";
import { createUser } from "@/lib/auth";
import { id, now, run } from "@/lib/db";
import { getSubscription, alignPeriod, syncAllowance } from "@/lib/billing";
import { loadProject } from "@/lib/projects";
import { emptyServiceProfile } from "@/lib/project-types";
import { saveAsset, type SaveAssetInput } from "@/lib/library";
import { realDependencies, type Dependencies } from "@/lib/preparation/deps";
import { researchProject } from "@/lib/preparation/research";
import { sitePlan } from "@/lib/preparation/plan";
import { localCopy } from "@/lib/engine/local-copy";
import { saveContentVersion, contentKey } from "@/lib/seo-v2/store";
import type { ContentDoc } from "@/lib/seo-v2/types";
import type { Input, Contents } from "@/lib/preparation/types";
export const CASES: Input[] = [
  {
    offerName: "Sillage",
    brandName: "Sillage",
    description: "Carnet de croquis à couverture en liège, pages sans lignes.",
    target: "Illustrateurs nomades",
    constraints:
      "Tutoiement interdit. Aucun avis ni origine certifiée à inventer. Ne jamais promettre une certification.",
    business: "products",
    photoIds: [],
    referenceUrls: ["https://reference.example/carnets"],
    price: "28,50",
    services: emptyServiceProfile(),
  },
  {
    offerName: "Respire Bureau",
    brandName: "Respire Bureau",
    description:
      "Accompagnement des petites entreprises pour organiser les espaces de travail. Diagnostic et atelier participatif.",
    target: "Responsables de petites entreprises",
    constraints: "Pas de chiffres de productivité, pas de panier.",
    business: "services",
    photoIds: [],
    referenceUrls: ["https://reference.example/espaces"],
    price: "",
    services: {
      ...emptyServiceProfile(),
      services: [
        { name: "Diagnostic", description: "Étudier les usages du bureau." },
        {
          name: "Atelier participatif",
          description: "Recueillir les besoins de l’équipe.",
        },
      ],
      area: "Nantes",
      email: "contact@example.test",
      contactMode: "quote",
    },
  },
  {
    offerName: "Clair Céramique",
    brandName: "Clair Céramique",
    description: "Tasse à thé en grès émaillé, fabrication en petites séries.",
    target: "Amateurs de thé",
    constraints: "Aucun label inventé.",
    business: "products",
    photoIds: [],
    referenceUrls: ["https://reference.example/ceramique"],
    price: "32",
    services: emptyServiceProfile(),
  },
  {
    offerName: "Accord Piano",
    brandName: "Accord Piano",
    description: "Cours de piano pour adultes débutants à domicile.",
    target: "Adultes découvrant le piano",
    constraints: "Aucune promesse de progression chiffrée.",
    business: "services",
    photoIds: [],
    referenceUrls: ["https://reference.example/cours"],
    price: "",
    services: {
      ...emptyServiceProfile(),
      services: [
        {
          name: "Cours découverte",
          description: "Découvrir le clavier et une première pratique.",
        },
      ],
      area: "Rennes",
      phone: "0102030405",
      contactMode: "call",
    },
  },
];
export async function fixture(
  business: "products" | "services" = "products",
  caseIndex?: number,
) {
  const uid = (
    await createUser(
      `preparation-${id()}@example.test`,
      "motdepasse-test-uniquement",
      "Vérification synthétique",
    )
  ).id;
  run("UPDATE users SET role='client' WHERE id=?", uid);
  getSubscription(uid);
  run(
    "UPDATE subscriptions SET status='active',plan='dominer',billing='monthly',owner_user_id=? WHERE user_id=?",
    uid,
    uid,
  );
  alignPeriod(uid, now());
  syncAllowance(uid);
  const pid = id();
  run(
    "INSERT INTO projects (id,user_id,name,status,platform,settings_json,business_type,created_at,updated_at) VALUES (?,?,?,'draft',?,'{\"language\":\"fr\"}',?,?,?)",
    pid,
    uid,
    "Projet de vérification",
    business === "services" ? "woocommerce" : "shopify",
    business,
    now(),
    now(),
  );
  const input = structuredClone(
    CASES[caseIndex ?? (business === "services" ? 1 : 0)],
  );
  const photo = await syntheticAsset(pid, "original", "upload");
  input.photoIds = [photo];
  return { pid, uid, input };
}
export async function syntheticAsset(
  pid: string,
  role = "scene",
  origin: SaveAssetInput["origin"] = "generated",
  meta: Record<string, unknown> = {},
) {
  const p = loadProject(pid);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="1000" height="700" fill="#ece7db"/><rect x="240" y="100" width="520" height="440" rx="24" fill="#28504a"/><text x="500" y="610" text-anchor="middle" font-size="25" fill="#182526">VÉRIFICATION — MÉDIA SYNTHÉTIQUE</text></svg>`;
  const data = await sharp(Buffer.from(svg)).png().toBuffer();
  return (
    await saveAsset({
      projectId: pid,
      userId: p.userId,
      data,
      name: `${role}-simulation.png`,
      mime: "image/png",
      role,
      origin,
      status: "approved",
      meta: {
        simulation: true,
        ...(origin === "generated"
          ? { gate: { verdict: "FINAL", fatal: false, checker: "simulation" } }
          : {}),
        ...meta,
      },
    })
  ).id;
}
export const simulatedDependencies: Dependencies = {
  ...realDependencies,
  simulation: true,
  async identity(p, ctx) {
    const b = await realDependencies.identity(p, ctx, false);
    return { ...b, provenance: "simulation" };
  },
  async inspect(_p, b) {
    return {
      ...b,
      provenance: "simulation",
      observations: ["Lecture simulée : aucun fournisseur réel."],
    };
  },
  async research(p, b) {
    const r = await researchProject(
      p,
      b,
      async (url) =>
        ({
          url,
          title: "Référence synthétique consultée par le double de test",
          description: "",
          text: `Une offre comparable à ${b.profile.name}. La page décrit les usages et conditions de présentation. Les modalités de contact sont visibles. Ceci est une source synthétique pour vérifier la persistance, pas une étude réelle.`,
          images: [],
          product: null,
          platform: null,
        }) as any,
    );
    return {
      ...r,
      sources: r.sources.map((s) => ({ ...s, provenance: "simulation" })),
    };
  },
  async contents(p, _ctx, _paid, options) {
    const plan = sitePlan(p);
    const documents: Contents["documents"] = options?.pageKey
      ? (options.previous?.documents.filter(
          (d) => d.doc.page.key !== options.pageKey,
        ) ?? [])
      : [];
    for (const pg of plan.pages.filter((x) => x.kind !== "contact")) {
      const old = options?.previous?.pages.find((x) => x.key === pg.key);
      if (options?.pageKey && pg.key !== options.pageKey) {
        pg.docKey = old?.docKey;
        continue;
      }
      const type =
        pg.kind === "home"
          ? "home_page"
          : pg.kind === "brand"
            ? "brand_page"
            : pg.kind === "service"
              ? "service_page"
              : "product_page";
      const key = contentKey(p.id, type, pg.key, "fr");
      const doc: ContentDoc = {
        version: 1,
        type,
        lang: "fr",
        page: {
          key: pg.key,
          title: pg.title,
          kind: pg.kind as any,
          status: "planned",
          url: null,
        },
        primaryKeyword: null,
        intent: "informational",
        meta: {
          seoTitle: `${pg.title} | ${p.brand!.name}`,
          metaDescription: `${pg.goal}. Découvrez les informations et les possibilités de contact.`,
          slug: pg.path.split("/").pop() || "",
          canonical: null,
          robots: "index,follow",
        },
        blocks: [
          { id: "h1", kind: "h1", text: pg.title },
          { id: "p", kind: "p", text: pg.goal },
          {
            id: "detail",
            kind: "p",
            text: `${p.brand!.name} s’adresse à ${p.brand!.audience}. ${options?.correction ? "Version corrigée selon votre demande." : ""}`,
          },
        ],
        links: [],
        schema: [],
        meta2: { source: "engine", by: "ai", createdFrom: null, runId: id() },
      } as unknown as ContentDoc;
      saveContentVersion(p.id, key, doc, {
        verdict: "FINAL",
        note: "Réponse fournisseur simulée — aucun appel IA",
      });
      documents.push({ docKey: key, doc, verdict: "FINAL" });
      pg.docKey = key;
    }
    return {
      copy: localCopy(p.product, p.brand!, p),
      ...plan,
      documents,
      notes: [
        "Fournisseurs simulés ; qualité de rédaction IA réelle non vérifiée.",
      ],
      provenance: "simulation",
    };
  },
  async logos(p) {
    return [await syntheticAsset(p.id, "logo-v2")];
  },
  async image(p) {
    return syntheticAsset(p.id);
  },
};
