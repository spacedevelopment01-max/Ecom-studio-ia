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
  const slots: VisualSlot[] = pages.flatMap((pg) =>
    pg.sections
      .filter((s) => s.mediaSlot)
      .map((s) => ({
        key: s.mediaSlot!,
        pageKey: pg.key,
        sectionKey: s.key,
        purpose: s.purpose,
        required: true,
      })),
  );
  return { pages, slots };
}
