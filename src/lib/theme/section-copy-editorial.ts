/**
 * Rédaction des compositions éditoriales (sections « ed-* ») à partir du contexte du projet : chaque section a un rôle
 * et reçoit des textes différents — jamais le même slogan et le même résumé répétés d'une section à l'autre (défaut
 * constaté sur ORBE le 19 octobre). Rien n'est inventé : les textes viennent de la marque (signature, histoire,
 * positionnement), du produit (résumé, faits confirmés) et des rôles des visuels ; une donnée absente laisse le champ
 * vide, et la section se masque si elle en a besoin. Aucun nom de démonstration.
 */
import type { CopyFn } from "./section-content";
import { todo, tr } from "./section-content";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (s: string) => (s ? `<p>${esc(s)}</p>` : "");
/** Rôle d'un visuel du projet d'après le nom de fichier du thème (es-galerie-packshot…, es-scene-2…, es-en-situation-1…). */
const roleOf = (file: string): "packshot" | "detail" | "scene" | "lifestyle" | "other" =>
  /packshot|variante|variant|detoure|cutout/.test(file) ? "packshot" : /detail/.test(file) ? "detail" : /situation|lifestyle|hero/.test(file) ? "lifestyle" : /scene|banni|banner/.test(file) ? "scene" : "other";
const ROLE_LABEL = { packshot: ["Vue complète", "Full view"], detail: ["Détail", "Detail"], scene: ["En situation", "In its setting"], lifestyle: ["Chez vous", "At home"], other: ["", ""] } as const;

const copy = (type: string): CopyFn => (ctx, base) => {
  const settings = { ...base.settings };
  const set = (key: string, value: unknown) => { if (!settings[key] && value !== undefined && value !== "") settings[key] = value; };
  const brand = ctx.brand;
  const tagline = brand?.tagline || ctx.product.name || ctx.shopName;
  const real = (s: string | undefined) => (s && !/\[(À (définir|compléter)|To (define|complete))/i.test(s) ? s.trim() : "");
  const story = real(brand?.story);
  const positioning = real(brand?.positioning);
  const facts = ctx.business === "services" ? [] : ctx.product.facts;
  const media = (ctx.mediaFiles?.length ? ctx.mediaFiles : ctx.galleryFiles ?? []).filter((f) => roleOf(f) !== "other");
  const label = (fr: string, en: string) => tr(ctx, fr, en);
  const roleLabel = (file: string) => { const r = ROLE_LABEL[roleOf(file)]; return label(r[0], r[1]); };
  set("image_alt", ctx.product.name);
  let blocks = base.blocks;
  switch (type) {
    case "ed-opening":
      // Ouverture : la signature de la marque et le résumé du produit, une seule fois sur la page.
      set("label", brand?.name || ctx.shopName); set("heading", tagline); set("text", p(ctx.product.summary)); set("heading_tag", "h2"); set("layout", ctx.business === "services" ? "journal" : "immersive");
      // Boutique : un accès direct à la collection dès l'ouverture (demande du 19 octobre) ; site de services : rien (lien vers le contact posé par le thème).
      if (ctx.business !== "services") { set("button_label", label("Découvrir la collection", "Discover the collection")); set("button_link", "/collections/all"); }
      break;
    case "ed-statement":
      // Déclaration : l'histoire ou le positionnement (jamais la signature déjà en ouverture) ; repères = faits confirmés.
      set("label", label("L'objet", "The object"));
      // Titre : l'histoire courte, sinon le positionnement ; pas de texte sous le titre (le positionnement est réservé à la scène).
      set("heading", story && story.length <= 160 ? story : positioning || ctx.product.summary || tagline);
      set("text", "");
      if (!blocks?.length || blocks.every((b) => !b.settings?.title)) {
        const points = ctx.business === "services" ? (brand?.values ?? []).map((v) => ({ title: v.title, text: v.text })) : facts.map((f) => ({ title: f.label, text: f.value }));
        blocks = points.slice(0, 4).map((f) => ({ type: "point", settings: { title: f.title, text: p(f.text) } }));
      }
      break;
    case "ed-diptych": {
      // Diptyque : deux regards différents sur le produit (vue complète, puis détail ou situation), chacun légendé par son rôle.
      // Composition « côte à côte » : deux usages (scènes) différents de la scène principale, sans légende répétée.
      const side = settings.layout === "side";
      set("label", side ? label("Usages", "Uses") : label("Regards", "Views")); set("heading", side ? label("Au fil de la journée", "Through the day") : label("Vue complète et détail", "Full view and detail"));
      // Cadres déjà pourvus d'une image (choix du client) ou d'un rôle de média attendu (cadre à remplir, signalé dans l'aperçu) :
      // gardés, légendés par le rôle du visuel ou le nom du produit ; sinon deux regards pris dans les visuels du produit.
      if (blocks?.length && blocks.every((b) => b.settings?.image_asset || b.settings?.image || b.settings?.media_role)) { if (!side) blocks = blocks.map((b) => ({ ...b, settings: { ...b.settings, title: b.settings?.title || (b.settings?.image_asset ? roleLabel(String(b.settings.image_asset)) : ctx.product.name) } })); }
      else if (side) {
        // La première scène sert à la section « en situation » : les deux suivantes forment la paire (sinon les deux premières).
        const scenes = media.filter((f) => roleOf(f) === "scene").sort();
        const pair = scenes.length >= 3 ? scenes.slice(1, 3) : scenes.slice(0, 2);
        blocks = pair.map((file) => ({ type: "frame", settings: { title: "", image_asset: file, image_alt: ctx.product.name, ratio: "portrait" } }));
      } else {
        const first = media.find((f) => roleOf(f) === "packshot") ?? media[0];
        // Second regard : le second détail quand il y en a deux (le premier sert déjà à la section « finitions »), sinon une scène.
        const details = media.filter((f) => f !== first && roleOf(f) === "detail");
        const second = details[1] ?? details[0] ?? media.find((f) => f !== first && roleOf(f) === "scene") ?? media.find((f) => f !== first);
        blocks = [first, second].filter((f): f is string => !!f).map((file) => ({ type: "frame", settings: { title: roleLabel(file), image_asset: file, image_alt: ctx.product.name, ratio: roleOf(file) === "packshot" ? "portrait" : "landscape" } }));
      }
      break;
    }
    case "ed-scene":
      // Scène : le produit chez vous ; le texte dit la place qu'il prend (positionnement), pas le résumé répété.
      set("label", label("En situation", "In its setting")); set("heading", label("Chez vous", "At home")); set("text", p(positioning || story));
      break;
    case "ed-finishes": {
      // Finitions : d'après le fait « finitions / coloris » quand il existe, sinon un titre neutre.
      const finish = facts.find((f) => /finition|coloris|couleur|finish|colou?r/i.test(f.label));
      set("label", label("Finitions", "Finishes")); set("heading", finish ? finish.value : label("Les finitions", "The finishes")); set("text", "");
      if (ctx.business !== "services") { set("product_target", ctx.product.target); set("product", ctx.product.handle); if (settings.button_label && ctx.product.handle) set("button_link", `/products/${ctx.product.handle}`); }
      break;
    }
    case "ed-study":
      // Site de services (« Avant / après ») : une vraie transformation seulement. Deux photos quelconques du projet ne
      // forment pas un avant / après : cadres à remplir par le client, légendés « Avant » et « Après » (issue #145).
      if (ctx.business === "services" && !ctx.sample) {
        set("label", label("Avant / après", "Before / after")); set("heading", todo(ctx, "la transformation montrée", "the transformation shown")); set("text", "");
        set("first_label", label("Avant", "Before")); set("second_label", label("Après", "After"));
        set("media_role", label("Photo avant les travaux", "Photo before the work")); set("second_role", label("Photo après les travaux", "Photo after the work"));
        // Photos posées d'office à l'insertion (pas un vrai couple avant / après) : retirées, cadres à remplir.
        settings.image_asset = ""; settings.second_asset = "";
        break;
      }
      // Étude : deux vues à comparer, légendées par leur rôle.
      set("label", label("Deux regards", "Two views")); set("heading", label("D'une pièce à l'autre", "From one room to the next")); set("text", "");
      if (media[0]) { set("image_asset", media[0]); set("first_label", roleLabel(media[0])); }
      if (media[1]) { set("second_asset", media[1]); set("second_label", roleLabel(media[1])); }
      break;
    case "ed-contact":
      set("label", brand?.name || ctx.shopName); set("heading", tr(ctx, "Parlons de votre projet.", "Let’s discuss your project.")); set("text", p(ctx.product.summary));
      break;
  }
  return { settings, blocks, samples: false };
};
export const EDITORIAL_COPY: Record<string, CopyFn> = Object.fromEntries(["ed-finishes", "ed-opening", "ed-statement", "ed-diptych", "ed-scene", "ed-study", "ed-contact"].map((t) => [t, copy(t)]));
