/**
 * Outils SEO V2 simulés : AUCUN appel d'IA, aucune dépense. Le rédacteur simulé n'écrit qu'à partir des faits
 * vérifiés qu'il reçoit dans la consigne (comme le ferait un bon modèle) ; on peut lui imposer des réponses fautives
 * (affirmation inventée, source, prix) pour vérifier contrôles, reprises ciblées et refus.
 */
import type { SeoV2Deps, RewriteOut } from "@/lib/seo-v2/deps";
import type { AiDraft } from "@/lib/seo-v2/write";
import { EDITORIAL_CRITERIA, type EditorialReview } from "@/lib/seo-v2/types";

export const review = (score = 8.6, o: Partial<EditorialReview> = {}): EditorialReview => ({
  criteria: Object.fromEntries(EDITORIAL_CRITERIA.map((k) => [k, score])) as EditorialReview["criteria"],
  issues: [],
  invented: [],
  fix: { blockIds: [], instruction: "" },
  ...o,
});

/** Brouillon fidèle aux faits contenus dans la consigne (aucune information ajoutée). */
export function faithfulDraft(prompt: string): AiDraft {
  const facts = JSON.parse(prompt.match(/FAITS VÉRIFIÉS \(seule matière autorisée\) : (\{.*\})/)?.[1] ?? "{}");
  const kw = prompt.match(/Mot-clé visé \(hypothèse sémantique, sans donnée de volume\) : ([^.]+)\./)?.[1] ?? "";
  const type = prompt.match(/^Type : (\w+)/)?.[1] ?? "product_page";
  const cta = prompt.match(/Appel à l'action : ([^.\n]+)/)?.[1] ?? "Voir";
  const blocks: AiDraft["blocks"] = [];
  const offer = facts.offre ?? facts.marque ?? "Offre";
  const services: { name: string; description: string }[] = facts.prestations ?? [];
  if (type === "service_page" || (type === "home_page" && services.length)) {
    blocks.push({ kind: "h1", text: `${facts.categorie ?? offer}${facts.zone ? ` — ${facts.zone}` : ""}` });
    blocks.push({ kind: "p", text: `${facts.marque} propose ${services.map((s) => s.name.toLowerCase()).join(", ")}${facts.zone ? ` dans la zone ${facts.zone}` : ""}. Chaque demande commence par un échange sur votre projet.` });
    blocks.push({ kind: "h2", text: "Prestations" });
    blocks.push({ kind: "ul", items: services.map((s) => s.name) });
  } else {
    blocks.push({ kind: "h1", text: offer });
    blocks.push({ kind: "p", text: `${offer}, ${String(facts.categorie ?? "").toLowerCase()} de ${facts.marque}${facts.difference ? ` : ${facts.difference}` : ""}. ${kw && kw !== "aucun" ? `Pour qui cherche « ${kw} », voici ce qui est confirmé.` : ""}`.trim() });
    blocks.push({ kind: "h2", text: "Caractéristiques" });
    const items = (facts.faits ?? []).map((f: { label: string; value: string }) => (f.label ? `${f.label} : ${f.value}` : f.value));
    blocks.push(items.length ? { kind: "ul", items } : { kind: "p", text: "Les caractéristiques détaillées sont celles indiquées sur l'emballage." });
  }
  for (const a of facts.reponses ?? []) blocks.push({ kind: "faq", q: a.q, a: a.a });
  blocks.push({ kind: "cta", text: cta });
  return { seoTitle: `${offer} | ${facts.marque}`.slice(0, 60), metaDescription: `${offer} : informations confirmées par ${facts.marque}.`, blocks, unknowns: [] };
}

export type MockLog = { writes: string[]; reviews: number; rewrites: number; kinds: string[]; keys: string[] };

export function mockSeoDeps(o: { drafts?: (AiDraft | ((prompt: string, n: number) => AiDraft))[]; reviews?: (EditorialReview | Error)[]; rewrite?: RewriteOut; costMicro?: number; canWrite?: boolean; canReview?: boolean; estimate?: number } = {}): { deps: SeoV2Deps; log: MockLog } {
  const log: MockLog = { writes: [], reviews: 0, rewrites: 0, kinds: [], keys: [] };
  const cost = o.costMicro ?? 2_000;
  const deps: SeoV2Deps = {
    canWrite: o.canWrite ?? true,
    canReview: o.canReview ?? true,
    async write(_system, prompt, key, kind) {
      const n = log.writes.length;
      log.writes.push(prompt);
      log.kinds.push(kind);
      log.keys.push(key);
      const d = o.drafts?.[Math.min(n, (o.drafts?.length ?? 1) - 1)];
      const value = !d ? faithfulDraft(prompt) : typeof d === "function" ? d(prompt, n) : d;
      return { value, costMicro: cost };
    },
    async review() {
      const r = o.reviews?.[Math.min(log.reviews, (o.reviews?.length ?? 1) - 1)] ?? review();
      log.reviews++;
      if (r instanceof Error) throw r;
      return { value: r, costMicro: cost / 2 };
    },
    async rewrite() {
      log.rewrites++;
      return { value: o.rewrite ?? { blocks: [], note: "" }, costMicro: cost / 2 };
    },
    estimate: () => o.estimate ?? cost,
  };
  return { deps, log };
}
