/**
 * Plan du studio pour le client : les espaces rangés dans l'ordre où l'on s'en sert (votre projet → créer → diffuser),
 * chacun avec UNE phrase qui dit à quoi il sert, et les outils avancés (prompts, fichiers, connexions) rangés à part,
 * repliés tant qu'on ne s'en sert pas. Toutes les fonctions restent accessibles : rien n'est supprimé, seulement rangé.
 */
export type SpaceId = "pilote" | "produit" | "marque" | "strategie" | "boutique" | "images" | "videos" | "publications" | "calendrier" | "publicites" | "blog" | "prompts" | "fichiers" | "connexions";
export type SpaceGroup = "projet" | "creer" | "diffuser" | "avance";
type Business = "products" | "services" | undefined;
type T2 = [fr: string, en: string];

export const SPACE_GROUPS: { id: SpaceGroup; label: T2; /** Groupe replié par défaut (outils avancés). */ folded?: boolean }[] = [
  { id: "projet", label: ["Votre projet", "Your project"] },
  { id: "creer", label: ["Créer", "Create"] },
  { id: "diffuser", label: ["Diffuser", "Publish"] },
  { id: "avance", label: ["Outils avancés", "Advanced tools"], folded: true },
];

export const SPACES: { id: SpaceId; group: SpaceGroup; purpose: T2; purposeServices?: T2; /** Espace regroupé dans un autre (sous-menu de celui-ci) : pas d'entrée propre dans le menu. */ within?: SpaceId }[] = [
  { id: "pilote", group: "projet", purpose: ["Où en est votre projet et la prochaine étape à faire.", "Where your project stands and the next step to take."] },
  { id: "produit", group: "creer", purpose: ["Les informations de votre produit : tout le reste s'en sert.", "Your product details: everything else builds on them."], purposeServices: ["Vos prestations, votre zone, vos horaires et vos coordonnées.", "Your services, area, hours and contact details."] },
  { id: "strategie", group: "creer", purpose: ["Comparer les cinq angles et choisir la stratégie commune au projet.", "Compare five angles and choose the strategy shared across the project."] },
  { id: "marque", group: "creer", purpose: ["Nom, logo, couleurs et polices : l'identité de toute la marque.", "Name, logo, colours and fonts: the identity of the whole brand."] },
  { id: "boutique", group: "creer", purpose: ["Votre boutique en ligne : aperçu, retouches et mise en ligne.", "Your online store: preview, edits and going live."], purposeServices: ["Votre site : aperçu, retouches et mise en ligne.", "Your website: preview, edits and going live."] },
  { id: "images", group: "creer", purpose: ["Votre banque d'images, sans texte : vos photos, photos libres et images créées.", "Your image bank, no text: your photos, royalty-free photos and created images."] },
  { id: "videos", group: "creer", purpose: ["Votre banque de vidéos, sans texte : vos plans, plans libres et plans créés.", "Your video bank, no text: your clips, royalty-free clips and created clips."] },
  { id: "publications", group: "diffuser", purpose: ["Stratégie, création, calendrier et validation de vos publications : rien ne part sans votre accord.", "Strategy, creation, calendar and approval of your posts: nothing goes out without your approval."] },
  { id: "calendrier", group: "diffuser", within: "publications", purpose: ["Quand chaque publication part, jour par jour.", "When each post goes out, day by day."] },
  { id: "publicites", group: "diffuser", purpose: ["Vos publicités image et vidéo et vos campagnes, séparées des publications organiques.", "Your image and video ads and campaigns, kept apart from organic posts."] },
  { id: "blog", group: "diffuser", purpose: ["Des articles pour être trouvé sur Google.", "Articles to be found on Google."] },
  { id: "prompts", group: "avance", purpose: ["Les consignes envoyées à l'IA, pour les utilisateurs avertis.", "The instructions sent to the AI, for advanced users."] },
  { id: "fichiers", group: "avance", purpose: ["Tous les fichiers du projet, rangés par dossier.", "All the project files, sorted into folders."] },
  { id: "connexions", group: "avance", purpose: ["Relier vos comptes (Shopify, réseaux sociaux…).", "Link your accounts (Shopify, social networks…)."] },
];

export const space = (id: string) => SPACES.find((s) => s.id === id);

/** Entrée du menu qui contient cet espace (le Calendrier est un sous-menu de Publications). */
export const navSpace = (id: string): string => space(id)?.within ?? id;

/** À quoi sert cet espace (une phrase), dans la langue de l'interface. */
export function spacePurpose(id: string, lang: "fr" | "en", business?: Business): string | null {
  const s = space(id);
  if (!s) return null;
  const p = business === "services" && s.purposeServices ? s.purposeServices : s.purpose;
  return lang === "en" ? p[1] : p[0];
}

/**
 * Le groupe « Outils avancés » est-il ouvert ? Ouvert si le client l'a ouvert lui-même (mémorisé sur l'appareil) ou
 * s'il se trouve dans l'un de ses espaces — on ne cache jamais l'endroit où l'on est.
 */
export function advancedOpen(current: string, remembered: boolean): boolean {
  return remembered || space(current)?.group === "avance";
}
