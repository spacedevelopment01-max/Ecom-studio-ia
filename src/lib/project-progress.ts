/**
 * Où en est le projet ? Étapes concrètes (informations, logo, boutique ou site, visuels, vidéo, publications
 * relues, publications programmées) calculées à partir de ce que le studio a déjà, et la PROCHAINE étape conseillée,
 * avec l'onglet où la faire. Aucune donnée inventée : une étape est faite seulement si son résultat existe.
 */
export type ProgressInput = {
  business?: "products" | "services";
  product: { name?: string; questions?: { required?: boolean; answer?: string }[] };
  /** Nombre d'éléments manquants dans la fiche d'activité (services). */
  missingActivity?: number;
  brand: { logo?: { assetId?: string | null; status?: string; provisional?: boolean } } | null;
  theme: unknown | null;
  counts: Record<string, number>;
  posts: Record<string, number>;
};

export type ProgressStep = { id: string; label: [fr: string, en: string]; /** Ce qu'il faut faire (bouton « Prochaine étape »). */ action: [fr: string, en: string]; hint: [fr: string, en: string]; tab: string; done: boolean };

export function projectProgress(d: ProgressInput): { steps: ProgressStep[]; done: number; next: ProgressStep | null } {
  const svc = d.business === "services";
  const n = (k: string) => d.counts[k] ?? 0;
  const p = (k: string) => d.posts[k] ?? 0;
  const visuals = n("social") + n("scene") + n("lifestyle") + n("packshot") + n("packshot-v2") + n("banner") + n("ad");
  const posts = Object.values(d.posts).reduce((a, b) => a + b, 0);
  const required = (d.product.questions ?? []).filter((q) => q.required && !q.answer).length;
  const steps: ProgressStep[] = [
    {
      id: "info",
      action: svc ? ["Compléter l'activité", "Complete the business details"] : ["Compléter le produit", "Complete the product details"],
      label: svc ? ["Activité renseignée", "Business details"] : ["Produit renseigné", "Product details"],
      hint: svc ? ["Prestations, zone, contact et horaires.", "Services, area, contact and hours."] : ["Nom du produit et réponses aux questions importantes.", "Product name and answers to the key questions."],
      tab: "produit",
      done: svc ? (d.missingActivity ?? 0) === 0 : !!d.product.name?.trim() && required === 0,
    },
    {
      id: "logo",
      action: ["Choisir le logo", "Choose the logo"],
      label: ["Logo choisi", "Logo chosen"],
      hint: ["Choisissez une proposition : elle devient le logo de toute la marque.", "Pick a proposal: it becomes the logo of the whole brand."],
      tab: "marque",
      done: !!d.brand?.logo?.assetId && !d.brand.logo.provisional,
    },
    {
      id: "site",
      action: svc ? ["Composer le site", "Build the website"] : ["Composer la boutique", "Build the store"],
      label: svc ? ["Site composé", "Website built"] : ["Boutique composée", "Store built"],
      hint: svc ? ["Le studio compose votre site à partir de la marque.", "The studio builds your website from the brand."] : ["Le studio compose votre boutique à partir de la marque.", "The studio builds your store from the brand."],
      tab: "boutique",
      done: !!d.theme,
    },
    {
      id: "visuals",
      action: ["Créer des visuels", "Create visuals"],
      label: ["Visuels créés", "Visuals created"],
      hint: ["Au moins trois visuels (photos de mise en scène, publications).", "At least three visuals (staged photos, posts)."],
      tab: "images",
      done: visuals >= 3,
    },
    {
      id: "video",
      action: ["Créer une vidéo", "Create a video"],
      label: ["Vidéo créée", "Video created"],
      hint: ["Une première vidéo pour les réseaux sociaux.", "A first video for social media."],
      tab: "videos",
      done: n("video") > 0,
    },
    {
      id: "review",
      action: ["Relire les publications", "Review the posts"],
      label: ["Publications relues", "Posts reviewed"],
      hint: ["Rien n'est publié sans votre accord : relisez et approuvez.", "Nothing is posted without your approval: review and approve."],
      tab: "publications",
      done: posts > 0 && p("review") + p("planned") + p("draft") === 0,
    },
    {
      id: "scheduled",
      action: ["Programmer les publications", "Schedule the posts"],
      label: ["Publications programmées", "Posts scheduled"],
      hint: ["Connectez vos comptes et programmez les publications approuvées.", "Connect your accounts and schedule the approved posts."],
      tab: "calendrier",
      done: p("scheduled") + p("published") > 0,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, done, next: steps.find((s) => !s.done) ?? null };
}
