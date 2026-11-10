/**
 * Galerie produit de la fiche produit (décision du propriétaire du 10 novembre 2026, modèle : la galerie du pommeau
 * MIZU de Boku) : pour chaque produit, SINA crée une série d'images avec OpenAI (modèle des images des thèmes), à partir
 * de la VRAIE photo du produit : produit seul, flèches vers ses points forts, promesse, moment de vie, contenu,
 * explication, chez soi, liste de caractéristiques. Elles vont UNIQUEMENT dans le « Produit vedette » de la fiche produit
 * (thème sur mesure) ou dans la galerie de la fiche produit (thème du Studio) ; les cartes gardent la photo du client.
 *
 * Avant de créer, SINA explique pourquoi, demande combien d'images (7 au moins conseillées), si le client garde sa
 * propre photo dans la galerie, s'il veut une personne sur une ou plusieurs images, et pose les questions sur le
 * produit : les textes écrits sur les images ne viennent QUE de ses réponses (rien d'inventé). Chaque image est
 * contrôlée par l'IA (produit fidèle et entier, textes exacts, rien en trop) ; une image ratée n'est pas posée, elle est
 * signalée et n'est refaite qu'avec l'accord du client.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import { UserFacingError, type JobContext } from "../../jobs";
import { loadProject, notify } from "../../projects";
import { assetData, getAsset, saveAsset } from "../../library";
import { jsonCallMaxMicro, llmJson, type LlmCall } from "../../ai/llm";
import { withTrace } from "../../ai/trace";
import { aiSiteMockup, photoRequestMaxMicro, PUBLICATION_PROMPT_MAX_BYTES, withQuotedImageRoute } from "../../ai/media-providers";
import { listProducts, type StudioProduct } from "../../products/catalog";
import { loadGalleries, saveGallery, type GalleryImage } from "../../products/gallery-store";
import { mockupImageRoute } from "../mockup-code/tools";
import { CHECK_MODEL } from "../mockup-code/check";

export const GALLERY_JOB = "syna.product.gallery";

/** Les genres d'images de la galerie, dans l'ordre conseillé (les 7 premiers pour une galerie de 7). */
export const GALLERY_KINDS = {
  seul: { label: "le produit seul, mis en valeur dans un beau décor, sans texte", texts: "aucun" },
  fleches: { label: "le produit avec un titre et des flèches vers ses points forts", texts: "titre, sous-titre, 2 à 4 mentions courtes (ses points forts réels)" },
  promesse: { label: "un détail du produit avec une grosse promesse vraie", texts: "une promesse très courte (un fait vrai) et une ligne dessous" },
  moment: { label: "un moment de vie avec le produit, un titre et 3 bienfaits", texts: "titre, 3 bienfaits réels" },
  contenu: { label: "ce que contient le paquet, posé à plat, sans texte", texts: "aucun" },
  explique: { label: "une image qui explique (mode d'emploi en 3 temps, ou comparaison)", texts: "titre, 3 étapes courtes (son vrai mode d'emploi)" },
  liste: { label: "le produit avec la liste de ses caractéristiques", texts: "titre, 3 ou 4 blocs : intitulé et une ligne (ses vrais faits)" },
  "chez-soi": { label: "le produit chez soi, dans son vrai décor d'usage, sans texte", texts: "aucun" },
} as const;
export type GalleryKind = keyof typeof GALLERY_KINDS;
export const GALLERY_ORDER = Object.keys(GALLERY_KINDS) as GalleryKind[];
export const GALLERY_ADVISED = 7;

const short = (n: number) => z.string().trim().min(1).max(n);
export const GalleryImageSchema = z.object({
  kind: z.enum(GALLERY_ORDER as [GalleryKind, ...GalleryKind[]]),
  /** Décor ou moment (d'après la marque, l'angle et le produit) : lieu, surface, objets, lumière. */
  scene: z.string().trim().min(10).max(600),
  title: short(60).optional(), subtitle: short(90).optional(),
  labels: z.array(short(32)).min(2).max(4).optional(),
  promise: short(40).optional(),
  bullets: z.array(short(55)).min(2).max(3).optional(),
  steps: z.array(short(40)).length(3).optional(),
  features: z.array(z.object({ label: short(22), text: short(60) })).min(3).max(4).optional(),
  /** Une personne sur l'image : seulement si le client l'a demandé (sa réponse), jamais sinon. */
  person: z.boolean().optional(),
}).strict();
export type GalleryImageSpec = z.infer<typeof GalleryImageSchema>;

/** Textes que l'image doit porter, exactement (contrôle et consigne). */
export function galleryTexts(i: GalleryImageSpec): string[] {
  // Produit seul, contenu et chez soi : des photos sans texte (les textes éventuels sont ignorés).
  if (i.kind === "seul" || i.kind === "contenu" || i.kind === "chez-soi") return [];
  return [i.title, i.subtitle, ...(i.labels ?? []), i.promise, ...(i.bullets ?? []), ...(i.steps ?? []).map((s, k) => `${k + 1}. ${s}`), ...(i.features ?? []).flatMap((f) => [f.label, f.text])]
    .filter((x): x is string => !!x);
}

/** Ce qui manque à une image pour son genre (textes obligatoires), en mots simples ; vide si elle est complète. */
export function galleryGaps(i: GalleryImageSpec): string[] {
  const need: Partial<Record<GalleryKind, [boolean, string][]>> = {
    fleches: [[!!i.title, "un titre"], [!!i.labels?.length, "2 à 4 mentions pour les flèches"]],
    promesse: [[!!i.promise, "la promesse"]],
    moment: [[!!i.title, "un titre"], [!!i.bullets?.length, "2 ou 3 bienfaits"]],
    explique: [[!!i.title, "un titre"], [!!i.steps?.length, "3 étapes"]],
    liste: [[!!i.title, "un titre"], [!!i.features?.length, "3 ou 4 caractéristiques"]],
  };
  return (need[i.kind] ?? []).filter(([ok]) => !ok).map(([, what]) => what);
}

const q = (s: string) => `« ${s} »`;
/**
 * Consigne d'une image de galerie, écrite comme le propriétaire (docs/guide-images-ia.md) : type de photo et format,
 * décor, le produit (reproduit à l'identique de sa vraie photo), ce que contient la scène, les textes exacts, la lumière,
 * puis ce qu'il ne faut pas.
 */
export function galleryPrompt(i: GalleryImageSpec, o: { product: string; colors: string; people: boolean }): string {
  const PRODUCT = `le produit « ${o.product} » de l'image de référence, reproduit à l'identique : sa forme, ses couleurs, son étiquette et chaque texte imprimé dessus exactement comme sur la photo ; il est entier, ni déformé ni coupé`;
  const person = i.person && o.people;
  const texts = galleryTexts(i);
  const kind: Record<GalleryKind, string> = {
    seul: `Photographie produit éditoriale, format vertical 2:3, vue de face à hauteur du produit, cadrage centré avec de l'air autour. Décor : ${i.scene}. Au centre, ${PRODUCT}. Le produit est le seul sujet de l'image.`,
    fleches: `Photographie produit pour une fiche produit, format vertical 2:3, vue légèrement plongeante de trois quarts, cadrage centré. Décor : ${i.scene}. Au centre, ${PRODUCT}.
Textes écrits sur l'image, police sans empattement nette : en haut, centré, le titre ${q(i.title ?? "")}${i.subtitle ? ` et juste dessous, plus petit, ${q(i.subtitle)}` : ""} ; autour du produit, chaque mention reliée par un trait fin au détail du produit qu'elle désigne : ${(i.labels ?? []).map(q).join(", ")}.`,
    promesse: `Photographie de détail, format vertical 2:3, cadrage serré. Décor : ${i.scene}. Dans une moitié de l'image, ${PRODUCT}, en gros plan sur un détail. L'autre moitié reste calme pour le texte.
Textes écrits dans la partie calme, police sans empattement : en très grand ${q(i.promise ?? "")}${i.subtitle ? `, dessous en plus petit ${q(i.subtitle)}` : ""}.`,
    moment: `Photographie d'ambiance, format vertical 2:3, cadrage moyen, un vrai moment de vie. Décor et moment : ${i.scene}. ${PRODUCT.replace(/^le produit/, "Le produit")}, bien visible dans la scène. ${person ? "Une personne utilise le produit, naturellement, de façon élégante." : "Aucune personne : le moment se devine aux objets et à la lumière."} Un tiers de l'image reste calme pour le texte.
Textes écrits dans la partie calme, police sans empattement : le titre ${q(i.title ?? "")}, puis chaque ligne précédée d'un petit point : ${(i.bullets ?? []).map(q).join(", ")}.`,
    contenu: `Photographie à plat, vue de dessus à la verticale, format vertical 2:3, cadrage plein. Décor : ${i.scene}. ${PRODUCT.replace(/^le produit/, "Le produit")}, et à côté ce qu'il contient ou ce qui l'accompagne, tel que décrit, bien espacé ; rien ne touche les bords.`,
    explique: `Image explicative en trois temps, format vertical 2:3, vue de trois quarts. Décor : ${i.scene}. ${PRODUCT.replace(/^le produit/, "Le produit")} apparaît dans l'image.
Textes écrits sur l'image, police sans empattement : en haut le titre ${q(i.title ?? "")} ; trois temps de gauche à droite, chacun sous son image avec son numéro : ${(i.steps ?? []).map((s, k) => q(`${k + 1}. ${s}`)).join(", ")}.`,
    liste: `Photographie produit avec liste, format vertical 2:3, vue de trois quarts légèrement plongeante. Décor : ${i.scene}. Dans une moitié de l'image, ${PRODUCT}. L'autre moitié, sur un fond uni de la couleur de la marque, porte le texte.
Textes écrits dans cette moitié, police sans empattement : en haut le titre ${q(i.title ?? "")} ; dessous, des blocs bien espacés, chacun avec un petit intitulé en capitales et une ligne : ${(i.features ?? []).map((f) => `${q(f.label)} / ${q(f.text)}`).join(" ; ")}.`,
    "chez-soi": `Photographie d'intérieur, format vertical 2:3, prise à hauteur d'yeux, cadrage moyen. Le produit chez le client, dans son vrai décor d'usage : ${i.scene}. ${PRODUCT.replace(/^le produit/, "Le produit")}, posé naturellement à sa place.`,
  };
  return [
    kind[i.kind],
    `Couleurs de la marque dans le décor et les textes : ${o.colors || "tons naturels et doux"}. Lumière naturelle douce, ombres légères, profondeur, rendu de campagne haut de gamme.`,
    texts.length ? "Chaque texte écrit exactement ainsi, sans faute, sans lettre en trop. Aucun autre texte en dehors de ceux-ci et de ceux imprimés sur le produit." : "Aucun texte en dehors de celui imprimé sur le produit.",
    `Aucun chiffre ni logo inventé, aucun filigrane${person ? "" : ", aucune personne, aucune main"}. Aucun objet supplémentaire.`,
  ].join("\n");
}

/** Contrôle d'une image de galerie par l'IA (lecture de l'image et de la vraie photo du produit). */
export const GalleryCheckSchema = z.object({
  productMatches: z.boolean(), productWhole: z.boolean(),
  texts: z.array(z.object({ expected: z.string().max(120), written: z.string().max(160), exact: z.boolean() })).max(16),
  extraText: z.array(z.string().max(120)).max(8), people: z.boolean(),
  notes: z.array(z.string().max(200)).max(6),
});
export type GalleryCheck = z.infer<typeof GalleryCheckSchema>;
const CHECK_IN = 7000, CHECK_OUT = 1200;
export const galleryCheckMaxMicro = () => jsonCallMaxMicro(CHECK_MODEL.provider, CHECK_MODEL.model, CHECK_IN, CHECK_OUT, CHECK_OUT, CHECK_MODEL.effort)?.maxMicro ?? 20_000;
export function galleryVerdict(c: GalleryCheck, o: { person: boolean }): string[] {
  const p: string[] = [];
  if (!c.productMatches) p.push("le produit n'est pas fidèle à sa vraie photo");
  if (!c.productWhole) p.push("le produit est coupé ou déformé");
  for (const t of c.texts) if (!t.exact) p.push(`texte ${q(t.expected)} écrit ${q(t.written || "absent")}`);
  if (c.extraText.length) p.push(`texte en trop : ${c.extraText.map(q).join(", ")}`);
  if (c.people && !o.person) p.push("une personne ou une main apparaît sans accord");
  return p;
}

/** Remplaçables par les tests (aucun appel réel). */
export const galleryDeps: { image?: (prompt: string, product: Buffer, usageKey: string) => Promise<Buffer>; check?: (image: Buffer, product: Buffer, texts: string[], usageKey: string) => Promise<GalleryCheck>; unit?: () => number | null } = {};

const unitCost = () => (galleryDeps.unit ?? (() => { try { return photoRequestMaxMicro(mockupImageRoute(), { prompt: "x".repeat(PUBLICATION_PROMPT_MAX_BYTES), references: 1, aspect: "2:3", quality: "high" }); } catch { return null; } }))();
/** Coût maximal et probable d'une galerie de n images (image + contrôle). */
export function galleryEstimate(n: number): { maxMicro: number; probableMicro: number } | null {
  const u = unitCost();
  if (u == null) return null;
  const c = galleryCheckMaxMicro();
  return { maxMicro: n * (u + c), probableMicro: Math.round(n * (u * 0.6 + c * 0.5)) };
}

export const productByTitle = (projectId: string, title: string): StudioProduct | undefined => {
  try { return listProducts(projectId).find((x) => x.data.title.trim().toLowerCase() === title.trim().toLowerCase()); } catch { return undefined; }
};

export type GalleryPayload = { projectId: string; productId: string; images: GalleryImageSpec[]; keepOwn: boolean; people: boolean; capMicro: number; add?: boolean; conversationId?: string | null };

/** Tâche de fond : chaque image créée (une reprise par image), contrôlée, posée si elle est bonne. */
export async function runGalleryJob(ctx: JobContext) {
  const a = ctx.payload as GalleryPayload;
  const p = loadProject(a.projectId);
  const prod = listProducts(p.id).find((x) => x.id === a.productId);
  const refId = prod?.data.images[0]?.assetId;
  const ref = refId ? getAsset(refId) : null;
  if (!prod || !ref) throw new UserFacingError(L("Produit ou photo du produit introuvable : la galerie se fait d'après sa vraie photo.", "Product or its photo not found."));
  const refData = assetData(ref);
  const colors = [p.brand?.palette?.dark, p.brand?.palette?.primary, p.brand?.palette?.accent].filter(Boolean).join(", ");
  const done: GalleryImage[] = [];
  for (const [n, spec] of a.images.entries()) {
    ctx.progress(n / a.images.length, L(`Galerie « ${prod.data.title} » : image ${n + 1} sur ${a.images.length}`, `Gallery image ${n + 1} of ${a.images.length}`));
    const person = !!spec.person && a.people;
    const prompt = galleryPrompt(spec, { product: prod.data.title, colors, people: a.people });
    const texts = galleryTexts(spec);
    try {
      const img = await ctx.step(`gallery:${n}`, async () => {
        const usageKey = `${ctx.job.id}:gallery:${n}`;
        const data = galleryDeps.image ? await galleryDeps.image(prompt, refData, usageKey)
          : await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "gallery-image", costCapMicro: a.capMicro }, () => withQuotedImageRoute(mockupImageRoute(), () => aiSiteMockup({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey }, { prompt, product: refData })));
        const asset = await saveAsset({ projectId: p.id, userId: p.userId, data, name: `galerie-${prod.handle}-${n + 1}-${spec.kind}.png`, mime: "image/png", role: "site", origin: "generated", meta: { synaGallery: { productId: prod.id, kind: spec.kind, texts } } });
        return asset.id;
      });
      const check = await ctx.step(`gallery-check:${n}`, async () => {
        const usageKey = `${ctx.job.id}:gallery-check:${n}`;
        const data = assetData(getAsset(img)!);
        return galleryDeps.check ? galleryDeps.check(data, refData, texts, usageKey)
          : GalleryCheckSchema.parse(await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "gallery-check", costCapMicro: a.capMicro }, () => llmJson({
              task: "quality_control", userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey, promptKey: "syna-gallery-check-1",
              system: "Tu contrôles une image de galerie produit avant qu'elle soit montrée à un client. Tu compares avec la vraie photo du produit et tu décris seulement ce que tu vois réellement. Tu réponds en JSON.",
              prompt: [`Première image : l'image créée. Seconde image : la vraie photo du produit « ${prod.data.title} ».`,
                "productMatches : true si le produit de l'image créée est bien le même que sur la vraie photo (forme, couleurs, étiquette, textes imprimés).",
                "productWhole : true si le produit est entier (rien de coupé par le cadre) et non déformé.",
                `texts : pour chacun de ces textes attendus, ce qui est réellement écrit sur l'image et s'il est écrit exactement (sans faute ni lettre en trop) : ${texts.length ? texts.map(q).join(", ") : "(aucun texte attendu)"}.`,
                "extraText : tout autre texte écrit sur l'image, en dehors des textes attendus et de ceux imprimés sur le produit (vide sinon).",
                "people : true si une personne, un visage ou une main est visible.", "notes : autre défaut net (vide sinon)."].join("\n"),
              images: [{ data, label: "image créée" }, { data: refData, label: "vraie photo du produit" }],
              maxTokens: CHECK_OUT, maxOutputTokens: CHECK_OUT, routing: { difficulty: "standard", prefer: CHECK_MODEL },
            } as LlmCall, GalleryCheckSchema)));
      });
      const problems = galleryVerdict(check, { person });
      done.push({ assetId: img, kind: spec.kind, ok: !problems.length, problems });
    } catch (e) { done.push({ assetId: "", kind: spec.kind, ok: false, problems: [`image non créée (${(e as Error).message.slice(0, 120)})`] }); }
  }
  const before = loadGalleries(p.id)[prod.id];
  const images = [...(a.add && before ? before.images : []), ...done.filter((x) => x.assetId)];
  saveGallery(p.id, { productId: prod.id, title: prod.data.title, keepOwn: a.keepOwn, images, at: Date.now() });
  const ok = done.filter((x) => x.ok).length, bad = done.filter((x) => !x.ok);
  notify(p.userId, p.id, bad.length ? L(`Galerie « ${prod.data.title} » : ${ok} image(s) posée(s), ${bad.length} à revoir`, "Gallery done with issues") : L(`Galerie « ${prod.data.title} » prête`, "Gallery ready"), L("Elle est dans la fiche produit.", "It is on the product page."), `/studio/${p.id}/boutique`);
  return { product: prod.data.title, posees: ok, aRevoir: bad.map((x) => ({ genre: x.kind, image: x.assetId || null, defauts: x.problems })) };
}
