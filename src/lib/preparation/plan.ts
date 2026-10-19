import {projectRights} from "../plan-gates";
import type { Project } from "../projects";
import type { PlannedPage, VisualSlot } from "./types";
export function sitePlan(p: Project): {
  pages: PlannedPage[];
  slots: VisualSlot[];
} {
  const pages: PlannedPage[] = [
    {
      key: "home",
      path: "/",
      title: "Accueil",
      kind: "home",
      goal: `Présenter ${p.brand?.name || p.product.name} à ${p.brand?.audience || "sa cible"}`,
      sections: [
        {
          key: "hero",
          purpose: "Offre et promesse vérifiable",
          mediaSlot: "home:hero",
        },
        {
          key: "offer",
          purpose:
            p.business === "services"
              ? "Prestations et méthode"
              : "Usages et caractéristiques",
        },
        { key: "proofs", purpose: "Preuves disponibles uniquement" },
        { key: "faq", purpose: "Objections et réponses confirmées" },
        {
          key: "contact",
          purpose:
            p.business === "services"
              ? "Devis, contact ou rendez-vous"
              : "Choisir le produit",
        },
      ],
    },
  ];
  if (p.business === "services")
    p.services.services.forEach((s, i) =>
      pages.push({
        key: `service:${i}`,
        path: `/pages/prestation-${i + 1}`,
        title: s.name,
        kind: "service",
        goal: s.description,
        sections: [
          {
            key: "presentation",
            purpose: s.description,
            mediaSlot: `service:${i}:presentation`,
          },
          { key: "method", purpose: "Méthode et conditions connues" },
          { key: "contact", purpose: p.services.contactMode },
        ],
      }),
    );
  else
    pages.push({
      key: "product:main",
      path: "/products/produit-principal",
      title: p.product.name,
      kind: "product",
      goal: p.product.summary,
      sections: [
        {
          key: "detail",
          purpose: "Montrer le produit exact",
          mediaSlot: "product:main:detail",
        },
        { key: "facts", purpose: "Caractéristiques confirmées" },
        { key: "options", purpose: "Options et prix connus" },
        { key: "faq", purpose: "Questions utiles avant achat" },
      ],
    });
  pages.push(
    {
      key: "brand",
      path: "/pages/a-propos",
      title: "À propos",
      kind: "brand",
      goal: "Présenter la marque sans histoire inventée",
      sections: [
        { key: "intent", purpose: "Positionnement et engagements vérifiables" },
      ],
    },
    {
      key: "contact",
      path: "/pages/contact",
      title: "Contact",
      kind: "contact",
      goal:
        p.business === "services"
          ? p.services.contactMode
          : "Demande d’information",
      sections: [{ key: "contact", purpose: "Coordonnées et formulaire" }],
    },
  );
  // Emplacements finaux : aucun original, essai ou recadrage ne compte comme création distincte.
  const main = pages.find(pg => pg.kind === (p.business === "services" ? "service" : "product"))!;
  if (!main) throw new Error("Validez au moins une offre ou prestation avant de préparer les pages.");
  const brand = pages.find(pg => pg.kind === "brand")!;
  for (const pg of [pages[0], main, brand]) for (const [key, purpose] of [["gallery", "Galerie de scènes distinctes"], ["story", "Formats verticaux : lecture sans déformation"]]) if (!pg.sections.some(s => s.key === key)) pg.sections.push({ key, purpose });
  const placements = [
    [main.key, "detail"], [main.key, "gallery"], ["home", "offer"], ["brand", "gallery"],
    ["home", "offer"], [main.key, "gallery"], ["brand", "gallery"], ["home", "gallery"],
    [main.key, "story"], ["brand", "story"],
  ];
  if (p.business === "services") placements[0][1] = "presentation";
  const slots: VisualSlot[] = placements.map(([pageKey, sectionKey], i) => ({
    key: `final:image:${i + 1}`, pageKey, sectionKey, kind: "image", aspect: i < 4 ? "1:1" : i < 8 ? "16:9" : "9:16",
    source: p.business === "products" ? "ai" : "pixabay", purpose: `Composition ${i + 1} de ${p.product.name} : ${pageKey}/${sectionKey}`, required: true,
  }));
  const canGenerateVideo=!!projectRights(p.id)?.videos&&projectRights(p.id)?.videos!=="none";
  for (let i = 0; i < (p.business === "products" ? 1 : 2); i++) slots.push({ key: `final:video:${i + 1}`, pageKey: i === 0 ? "home" : main.key, sectionKey: i === 0 ? "hero" : "method", kind: "video", aspect: "16:9", source: canGenerateVideo?"ai":"pixabay", purpose: i === 0 ? "Ambiance hero pertinente, zone de texte lisible ; jamais une preuve sur le produit exact ou les locaux réels" : "Présentation du métier, illustration déclarée", required: true, playback: { muted: true, playsInline: true, loop: true, pauseControl: true, reducedMotion: "poster", mobileFallback: "poster" } });
  pages[0].sections[0].mediaSlot = "final:video:1";
  return { pages, slots };
}
