/**
 * Outils SINA de la galerie produit (décision du propriétaire du 10 novembre 2026) : gallery.plan (gratuit : pourquoi,
 * combien, les genres d'images et les questions à poser au client) puis gallery.create (payant, carte d'accord : la
 * série créée, contrôlée et posée dans la fiche produit). Voir src/lib/syna-agent/custom-theme/gallery.ts.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import { enqueue, pendingJob } from "../../jobs";
import { listProducts } from "../../products/catalog";
import { loadGalleries } from "../../products/gallery-store";
import { peopleAllowed } from "../../people-policy";
import type { AgentTool } from "../types";
import { project } from "./common";
import { GALLERY_ADVISED, GALLERY_JOB, GALLERY_KINDS, GALLERY_ORDER, galleryEstimate, galleryGaps, GalleryImageSchema, productByTitle, type GalleryImageSpec } from "../custom-theme/gallery";

const planTool: AgentTool<Record<string, never>> = {
  name: "gallery.plan", module: "site", kind: "read", needsProject: true,
  description: "Étape 6 (gratuit), JUSTE APRÈS le choix du thème (Studio ou sur mesure) : prépare la GALERIE de la fiche produit de CHAQUE produit (série d'images créées d'après sa vraie photo : produit seul, flèches vers ses points forts, promesse, moment de vie, contenu, explication, liste de caractéristiques, chez soi), posée uniquement dans le « Produit vedette » de la fiche produit. Donne pour chaque produit ses photos, les genres d'images et les questions à poser au client.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx);
    const products = (() => { try { return listProducts(p.id).filter((x) => x.status === "active"); } catch { return []; } })();
    if (!products.length) return { ok: false, summary: L("Aucun produit dans le catalogue : la galerie se fait pour chaque produit, d'après sa vraie photo.", "No products yet.") };
    const galleries = loadGalleries(p.id);
    const est = galleryEstimate(GALLERY_ADVISED);
    return {
      ok: true,
      summary: L(`${products.length} produit(s) à mettre en valeur à parts égales, ${GALLERY_ADVISED} images conseillées par produit.`, "Gallery plan ready."),
      hint: [
        "Explique d'abord au client, en deux phrases, POURQUOI : « sur la fiche produit, une galerie de plusieurs images fait comprendre et désirer ton produit avant l'achat : il est montré seul, ses points forts sont expliqués, on le voit dans un moment de vie… ».",
        `Puis pose-lui, dans un même message clair, ces questions (jamais à sa place) : 1) combien d'images par produit (conseille au moins ${GALLERY_ADVISED}, jusqu'à 9) ; 2) garde-t-il SA photo dans la galerie (en première image) ou seulement les images créées ; 3) veut-il une personne sur une ou plusieurs images (laquelle) ou aucune ; 4) les questions sur CHAQUE produit qui serviront aux textes écrits sur les images : ses 3 points forts, sa composition ou sa matière, comment l'utiliser ou le préparer, ce que contient le paquet, un label ou une certification réels, un bienfait qu'il peut affirmer. Ce qu'il ne sait pas n'est JAMAIS écrit sur une image.`,
        "Tous les produits sont mis en valeur à parts égales (même nombre d'images), sauf demande contraire du client.",
        "Ensuite, avec SES réponses, gallery.create pour chaque produit (payant : la carte d'accord donne le prix) ; les textes de chaque image sont courts, dans la voix de la marque, uniquement ses faits.",
      ].join(" "),
      data: {
        produits: products.map((x) => ({ titre: x.data.title, photos: x.data.images.length, galerieExistante: galleries[x.id] ? galleries[x.id].images.filter((i) => i.ok).length : 0 })),
        conseille: GALLERY_ADVISED,
        genres: GALLERY_ORDER.map((k) => ({ genre: k, image: GALLERY_KINDS[k].label, textes: GALLERY_KINDS[k].texts })),
        personnesDejaAutorisees: peopleAllowed(p.id),
        prixParProduit: est ? `${GALLERY_ADVISED} images : au plus ${Math.round(est.maxMicro / 1e4) / 100} € (outil de devis du Studio)` : null,
      },
    };
  },
};

type CreateArgs = { product: string; images: GalleryImageSpec[]; keepOwn: boolean; people: boolean; add?: boolean };
const createTool: AgentTool<CreateArgs> = {
  name: "gallery.create", module: "site", kind: "generate", needsProject: true,
  description: "Étape 6 (PAYANT : prix annoncé par la carte d'accord, accord écrit du client d'abord), APRÈS gallery.plan et les réponses du client : crée la galerie d'UN produit (product = son titre exact) : images = une entrée par image voulue (kind parmi les genres de gallery.plan ; scene = le décor ou le moment, d'après la marque, l'angle et le produit ; les textes de l'image : title, subtitle, labels, promise, bullets, steps, features, UNIQUEMENT avec les faits donnés par le client ; person: true seulement sur l'image où le client veut une personne). keepOwn : sa photo garde-t-elle la première place dans la galerie. people : le client a dit oui à une personne. add: true pour ajouter des images à sa galerie (une image ratée refaite), sinon la galerie est remplacée. Chaque image est contrôlée ; une image ratée n'est pas posée et elle est signalée.",
  args: z.object({ product: z.string().min(1).max(160), images: z.array(GalleryImageSchema).min(1).max(9), keepOwn: z.boolean(), people: z.boolean(), add: z.boolean().optional() }).strict(),
  estimate: (_ctx, a) => {
    // Galerie incomplète refusée AVANT la carte d'accord (essai réel du 10 novembre 2026 : refusée après le clic).
    const gaps = a.images.flatMap((i, n) => galleryGaps(i).map((g) => `image ${n + 1} (${i.kind}) : il manque ${g}`));
    if (gaps.length) throw new Error(`Galerie incomplète : ${gaps.join(" ; ")}. Complète avec les réponses du client (jamais un fait inventé), ou change le genre de l'image.`);
    const e = galleryEstimate(a.images.length);
    if (!e) throw new Error(L("Aucun modèle d'images utilisable pour la galerie.", "No usable image model."));
    return { ...e, label: L(`galerie de « ${a.product} » : ${a.images.length} image(s) créée(s) d'après sa vraie photo, chacune contrôlée`, `gallery of ${a.product}`) };
  },
  run: async (ctx, a) => {
    const p = project(ctx);
    const prod = productByTitle(p.id, a.product);
    if (!prod) return { ok: false, summary: L(`Produit « ${a.product} » introuvable dans le catalogue (titre exact attendu).`, "Product not found."), internal: true };
    if (!prod.data.images[0]?.assetId) return { ok: false, summary: L(`« ${prod.data.title} » n'a pas de photo : la galerie se fait d'après sa vraie photo. Demande-la au client.`, "No product photo.") };
    const gaps = a.images.flatMap((i, n) => galleryGaps(i).map((g) => `image ${n + 1} (${i.kind}) : il manque ${g}`));
    if (gaps.length) return { ok: false, internal: true, summary: `Galerie incomplète : ${gaps.join(" ; ")}. Rien n'est lancé.`, hint: "Complète avec les réponses du client (jamais un fait inventé), ou change le genre de l'image." };
    if (a.images.some((i) => i.person) && !a.people) return { ok: false, internal: true, summary: "Une image demande une personne alors que le client ne l'a pas accepté : rien n'est lancé.", hint: "Demande-lui s'il veut une personne ; sans son oui, person: false partout." };
    if (pendingJob(p.id, "syna.product.gallery")) return { ok: false, summary: L("Une galerie est déjà en cours de création : attends-la.", "A gallery is already running.") };
    const est = galleryEstimate(a.images.length)!;
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: GALLERY_JOB, label: L(`Galerie de « ${prod.data.title} » (SINA)`, `Gallery of ${prod.data.title}`), payload: { projectId: p.id, productId: prod.id, images: a.images, keepOwn: a.keepOwn, people: a.people, capMicro: est.maxMicro, add: !!a.add, conversationId: ctx.conversationId }, maxAttempts: 2, idempotencyKey: `syna:${ctx.runId}:gallery:${prod.id}` });
    return {
      ok: true, jobs: [job.id],
      summary: L(`Galerie de « ${prod.data.title} » lancée : ${a.images.length} image(s) créée(s) d'après sa vraie photo, chacune contrôlée.`, "Gallery started."),
      hint: "Quand la tâche est finie, montre au client les images posées (fiche produit) et dis honnêtement celles qui sont à revoir (défaut relevé par le contrôle) ; n'en refais aucune sans son accord écrit (gallery.create avec add: true).",
    };
  },
};

export const galleryTools: AgentTool[] = [planTool, createTool];
