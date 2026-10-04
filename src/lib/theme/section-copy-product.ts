/**
 * Rédaction des sections du groupe « product » (voir section-content.ts) : fiches, comparatifs,
 * modes d'emploi, précautions, galeries et récits produit, écrits à partir du VRAI projet.
 *
 * Principe :
 * - vrais contenus d'abord (nom, résumé, faits confirmés, prix confirmé, variantes, marque, collections) ;
 * - sinon textes neutres et bien tournés qui n'affirment rien de vérifiable (titres, transitions, boutons) ;
 * - ce qui exige une vérité du marchand (consignes de notice, précautions, délais, paiement,
 *   caractéristiques non confirmées, sources d'un comparatif) : espace réservé court en ajout réel,
 *   exemple réaliste marqué « Exemple » dans l'aperçu de la bibliothèque (`ctx.sample`).
 * Seuls les champs vides, restés à leur valeur par défaut ou au préréglage sont remplacés.
 */
import type { CopyFn, ContentContext } from "./section-content";
import { tr, todo, exampleTag } from "./section-content";
import { SECTORS } from "../project-types";
import type { SectionSchema } from "./spec";

type Blk = { type: string; settings?: Record<string, unknown> };
type Base = { settings: Record<string, unknown>; blocks?: Blk[] };
type T = readonly [string, string];

/* ------------------------------------------------------------------ outils */

const PLACEHOLDER = /\[\s*(À compléter|A compléter|To complete|À définir|À préciser|To define|To specify|To be defined)/i;
const real = (s?: string | null) => (s && !PLACEHOLDER.test(s) ? s.trim() : "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (...lines: string[]) => lines.filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join("");
const sentence = (s: string) => { const t = s.trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?…]$/.test(t) ? "" : ".") : ""; };
const bare = (s: string) => s.trim().replace(/[.\s]+$/, "");
/** « T-shirt supporter » → « t-shirt supporter » (garde les sigles : « LED », « USB-C »). */
const lc = (s: string) => (/^[A-ZÀ-Ý](?![A-ZÀ-Ý0-9])/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
/** Nom cité dans une phrase sans article : « T-shirt Lavande » / “Lavender T-shirt”. */
const quote = (ctx: ContentContext, s: string) => tr(ctx, `«\u00a0${s}\u00a0»`, `“${s}”`);
const MEDIA_KEYS = ["image", "image_asset", "video", "video_asset", "poster_asset"];

const t = (ctx: ContentContext, v: T) => tr(ctx, v[0], v[1]);
/** Exemple d'aperçu marqué « Exemple » (texte suivi de la mention). */
const ex = (ctx: ContentContext, s: string) => `${bare(s)} · ${exampleTag(ctx)}`;
const exSentence = (ctx: ContentContext, s: string) => `${sentence(s)} (${exampleTag(ctx)})`;

/** Réglages de section : n'écrit que dans les champs libres (vides, par défaut ou espaces réservés). */
function writer(schema: SectionSchema, base: Base) {
  const out: Record<string, unknown> = { ...base.settings };
  const def = (id: string) => schema.settings.find((s) => s.id === id)?.default;
  const has = (id: string) => schema.settings.some((s) => s.id === id);
  const free = (id: string) => {
    if (!has(id)) return false;
    const v = out[id];
    return v === undefined || v === null || v === "" || v === def(id) || (typeof v === "string" && PLACEHOLDER.test(v));
  };
  const set = (id: string, v: unknown) => { if (v !== undefined && v !== null && v !== "" && free(id)) out[id] = v; };
  return { out, set, has };
}

/**
 * Blocs d'un type rédigés à partir de `items` : chaque bloc reprend les réglages de base au même rang
 * (médias, positions…), les textes libres sont remplacés, et les médias manquants sont repris en boucle
 * parmi ceux des autres blocs (pas de case grise quand le projet a moins de photos que de blocs).
 */
function blocksOf(schema: SectionSchema, base: Base, type: string, items: Record<string, unknown>[], cycle = true): Blk[] {
  const bs = schema.blocks.find((b) => b.type === type);
  if (!bs) return [];
  const ids = new Set((bs.settings ?? []).map((s) => s.id).filter(Boolean) as string[]);
  const defs = new Map((bs.settings ?? []).filter((s) => s.id).map((s) => [s.id as string, s.default]));
  const preset = (((schema.presets?.[0] as { blocks?: Blk[] } | undefined)?.blocks ?? []).filter((b) => b.type === type));
  const cur = (base.blocks ?? []).filter((b) => b.type === type);
  const media = cur.map((b) => Object.fromEntries(MEDIA_KEYS.filter((k) => b.settings?.[k]).map((k) => [k, b.settings![k]]))).filter((m) => Object.keys(m).length);
  return items.map((item, i) => {
    const s: Record<string, unknown> = { ...(cur[i]?.settings ?? {}) };
    const free = (id: string) => {
      const v = s[id];
      return v === undefined || v === null || v === "" || v === defs.get(id) || v === preset[i]?.settings?.[id] || (typeof v === "string" && PLACEHOLDER.test(v));
    };
    for (const [k, v] of Object.entries(item)) if (ids.has(k) && v !== undefined && v !== null && free(k)) s[k] = v;
    if (cycle && media.length && !MEDIA_KEYS.some((k) => s[k]) && (ids.has("image_asset") || ids.has("video_asset"))) Object.assign(s, media[i % media.length]);
    return { type, settings: s };
  });
}

/* ------------------------------------------------------------------ données du projet */

type Spec = { label: T; sample: T };
type Step = { title: T; sample: T };
type Prec = { icon: string; title: T; sample: T; important?: boolean };
type Moment = { emoji: string; title: T; text: T };
type Kit = { specs: Spec[]; steps: Step[]; prec: Prec[]; moments: Moment[] };

const KITS: Record<string, Kit> = {
  beaute: {
    specs: [
      { label: ["Texture", "Texture"], sample: ["Crème fondante", "Melting cream"] },
      { label: ["Contenance", "Size"], sample: ["50 ml", "50 ml"] },
      { label: ["Type de peau", "Skin type"], sample: ["Tous types de peau", "All skin types"] },
      { label: ["Parfum", "Scent"], sample: ["Sans parfum", "Fragrance-free"] },
    ],
    steps: [
      { title: ["Préparez la peau", "Prep your skin"], sample: ["Appliquez sur une peau propre et sèche.", "Apply to clean, dry skin."] },
      { title: ["Appliquez", "Apply"], sample: ["Une noisette suffit, en massant du centre vers l'extérieur.", "A pea-sized amount is enough; massage outward from the centre."] },
      { title: ["Laissez agir", "Let it work"], sample: ["Laissez pénétrer quelques instants avant de vous maquiller.", "Let it absorb for a moment before applying makeup."] },
    ],
    prec: [
      { icon: "book", title: ["Avant la première utilisation", "Before first use"], sample: ["Faites un test sur une petite zone de peau.", "Patch-test on a small area of skin."] },
      { icon: "eye", title: ["Contact avec les yeux", "Contact with eyes"], sample: ["Évitez le contour des yeux ; en cas de contact, rincez à l'eau claire.", "Avoid the eye area; if contact occurs, rinse with clean water."] },
      { icon: "child", important: true, title: ["Tenir hors de portée des enfants", "Keep out of reach of children"], sample: ["Rangez le produit dans un endroit inaccessible aux enfants.", "Store the product out of children's reach."] },
      { icon: "thermometer", title: ["Conservation", "Storage"], sample: ["À conserver à l'abri de la chaleur et de la lumière.", "Store away from heat and light."] },
    ],
    moments: [
      { emoji: "🌙", title: ["Le soir, vous voulez un rituel simple", "In the evening, you want a simple ritual"], text: ["Quelques minutes pour soi, sans multiplier les produits.", "A few minutes for yourself, without a crowded shelf."] },
      { emoji: "🧴", title: ["Vous ne savez plus quoi choisir", "You're not sure what to choose"], text: ["Trop d'options, trop de promesses : vous cherchez plus clair.", "Too many options, too many promises: you want something clearer."] },
      { emoji: "🎁", title: ["Vous cherchez une attention qui fait plaisir", "You're looking for a thoughtful gift"], text: ["Un cadeau utile, que l'on a vraiment envie d'utiliser.", "A useful present people actually want to use."] },
    ],
  },
  mode: {
    specs: [
      { label: ["Matière", "Material"], sample: ["100 % coton", "100% cotton"] },
      { label: ["Coupe", "Fit"], sample: ["Coupe droite", "Regular fit"] },
      { label: ["Entretien", "Care"], sample: ["Lavage en machine à 30 °C", "Machine wash at 30°C"] },
      { label: ["Tailles", "Sizes"], sample: ["Du S au XXL", "S to XXL"] },
    ],
    steps: [
      { title: ["Choisissez votre taille", "Pick your size"], sample: ["Prenez votre taille habituelle ; le guide des tailles vous aide en cas de doute.", "Take your usual size; the size guide helps if you're unsure."] },
      { title: ["Portez-le à votre façon", "Wear it your way"], sample: ["Seul ou superposé, il suit votre style au quotidien.", "On its own or layered, it follows your everyday style."] },
      { title: ["Prenez-en soin", "Take care of it"], sample: ["Lavez-le à 30 °C, sur l'envers, pour préserver les couleurs.", "Wash at 30°C, inside out, to keep the colours bright."] },
    ],
    prec: [
      { icon: "book", title: ["Avant le premier lavage", "Before the first wash"], sample: ["Lavez-le séparément la première fois.", "Wash it separately the first time."] },
      { icon: "drop", title: ["Lavage", "Washing"], sample: ["Lavage en machine à 30 °C, sur l'envers.", "Machine wash at 30°C, inside out."] },
      { icon: "sun", title: ["Séchage", "Drying"], sample: ["Séchez à l'air libre, à l'abri du soleil direct.", "Dry naturally, away from direct sunlight."] },
      { icon: "ban", important: true, title: ["Repassage", "Ironing"], sample: ["Ne repassez pas directement sur les impressions ou les broderies.", "Do not iron directly over prints or embroidery."] },
    ],
    moments: [
      { emoji: "👀", title: ["Vous cherchez une pièce qui vous ressemble", "You want a piece that feels like you"], text: ["Quelque chose de personnel, loin des basiques que tout le monde porte.", "Something personal, far from the basics everyone wears."] },
      { emoji: "📅", title: ["Un grand jour approche", "A big day is coming up"], text: ["Match, soirée, sortie : vous voulez la tenue juste, sans chercher des heures.", "A match, a party, a night out: you want the right outfit without hours of searching."] },
      { emoji: "🎁", title: ["Vous voulez offrir sans vous tromper", "You want a gift that lands"], text: ["Un cadeau qui fait plaisir et qui se porte vraiment.", "A present that delights and actually gets worn."] },
    ],
  },
  bijoux: {
    specs: [
      { label: ["Matière", "Material"], sample: ["Argent 925", "925 silver"] },
      { label: ["Finition", "Finish"], sample: ["Poli miroir", "Mirror polish"] },
      { label: ["Dimensions", "Dimensions"], sample: ["Pendentif de 12 mm", "12 mm pendant"] },
      { label: ["Fermoir", "Clasp"], sample: ["Mousqueton", "Lobster clasp"] },
    ],
    steps: [
      { title: ["Choisissez votre modèle", "Choose your piece"], sample: ["Comparez les finitions et les tailles avant de choisir.", "Compare finishes and sizes before you choose."] },
      { title: ["Portez-le au quotidien", "Wear it every day"], sample: ["Mettez-le en dernier, après parfum et crème.", "Put it on last, after perfume and lotion."] },
      { title: ["Rangez-le avec soin", "Store it with care"], sample: ["Rangez-le à l'abri de l'humidité, dans sa pochette.", "Keep it dry, in its pouch."] },
    ],
    prec: [
      { icon: "drop", title: ["Eau et parfum", "Water and perfume"], sample: ["Retirez le bijou avant la douche ou la baignade.", "Remove before showering or swimming."] },
      { icon: "hand", title: ["Entretien", "Care"], sample: ["Nettoyez-le avec un chiffon doux et sec.", "Clean with a soft, dry cloth."] },
      { icon: "package", title: ["Rangement", "Storage"], sample: ["Rangez chaque bijou séparément pour éviter les rayures.", "Store each piece separately to avoid scratches."] },
      { icon: "child", important: true, title: ["Petites pièces", "Small parts"], sample: ["Tenir hors de portée des jeunes enfants.", "Keep away from young children."] },
    ],
    moments: [
      { emoji: "✨", title: ["Vous cherchez le détail qui change tout", "You want the finishing touch"], text: ["Un bijou discret qui complète une tenue sans en faire trop.", "A subtle piece that completes an outfit without overdoing it."] },
      { emoji: "💝", title: ["Une date compte pour vous", "A date matters to you"], text: ["Anniversaire, fête, merci : vous voulez marquer le moment.", "A birthday, a celebration, a thank-you: you want to mark the moment."] },
      { emoji: "🔁", title: ["Vous voulez le porter tous les jours", "You want to wear it every day"], text: ["Une pièce que l'on garde, plutôt qu'un achat de passage.", "A piece to keep, not a passing purchase."] },
    ],
  },
  maison: {
    specs: [
      { label: ["Matière", "Material"], sample: ["Mousse à mémoire de forme", "Memory foam"] },
      { label: ["Dimensions", "Dimensions"], sample: ["60 × 40 cm", "60 × 40 cm"] },
      { label: ["Entretien", "Care"], sample: ["Housse lavable à 40 °C", "Cover washable at 40°C"] },
      { label: ["Coloris", "Colour"], sample: ["Blanc", "White"] },
    ],
    steps: [
      { title: ["Déballez", "Unpack"], sample: ["Laissez-le reprendre sa forme quelques heures après le déballage.", "Let it recover its shape for a few hours after unpacking."] },
      { title: ["Installez", "Set it up"], sample: ["Placez-le là où vous l'utiliserez le plus.", "Put it where you'll use it most."] },
      { title: ["Entretenez", "Look after it"], sample: ["Lavez la housse à 40 °C et aérez régulièrement.", "Wash the cover at 40°C and air it regularly."] },
    ],
    prec: [
      { icon: "book", title: ["À la réception", "On delivery"], sample: ["Retirez l'emballage et laissez aérer 24 h.", "Remove the packaging and let it air for 24 hours."] },
      { icon: "drop", title: ["Nettoyage", "Cleaning"], sample: ["Housse lavable à 40 °C ; ne lavez pas l'intérieur.", "Cover washable at 40°C; do not wash the inner core."] },
      { icon: "thermometer", title: ["Chaleur", "Heat"], sample: ["Tenir éloigné des sources de chaleur directe.", "Keep away from direct heat sources."] },
      { icon: "child", important: true, title: ["Emballage", "Packaging"], sample: ["Tenez les sacs plastiques hors de portée des enfants.", "Keep plastic bags away from children."] },
    ],
    moments: [
      { emoji: "🛋️", title: ["Votre intérieur mérite mieux", "Your home deserves better"], text: ["Un objet du quotidien qu'on a plaisir à voir et à utiliser.", "An everyday object you enjoy seeing and using."] },
      { emoji: "🌙", title: ["Vos soirées manquent de confort", "Your evenings lack comfort"], text: ["Vous voulez simplement vous sentir bien chez vous.", "You just want to feel good at home."] },
      { emoji: "🎁", title: ["Vous pendez la crémaillère", "A housewarming is coming up"], text: ["Un cadeau pratique et joli, qui trouve vite sa place.", "A practical, good-looking gift that quickly finds its place."] },
    ],
  },
  hightech: {
    specs: [
      { label: ["Autonomie", "Battery life"], sample: ["Jusqu'à 30 min", "Up to 30 min"] },
      { label: ["Poids", "Weight"], sample: ["249 g", "249 g"] },
      { label: ["Connectivité", "Connectivity"], sample: ["Wi-Fi et Bluetooth", "Wi-Fi and Bluetooth"] },
      { label: ["Recharge", "Charging"], sample: ["USB-C", "USB-C"] },
    ],
    steps: [
      { title: ["Chargez", "Charge"], sample: ["Chargez complètement avant la première utilisation.", "Charge fully before first use."] },
      { title: ["Connectez", "Connect"], sample: ["Associez l'appareil à votre téléphone en quelques secondes.", "Pair it with your phone in seconds."] },
      { title: ["Lancez-vous", "Get going"], sample: ["Suivez la prise en main guidée dans l'application.", "Follow the guided setup in the app."] },
    ],
    prec: [
      { icon: "book", title: ["Avant la première utilisation", "Before first use"], sample: ["Lisez la notice et chargez complètement la batterie.", "Read the manual and fully charge the battery."] },
      { icon: "thermometer", title: ["Batterie", "Battery"], sample: ["Ne pas exposer à plus de 40 °C.", "Do not expose to temperatures above 40°C."] },
      { icon: "alert", important: true, title: ["Réglementation", "Regulations"], sample: ["Respectez les règles d'usage en vigueur dans votre pays.", "Follow the rules that apply in your country."] },
      { icon: "recycle", title: ["Fin de vie", "End of life"], sample: ["Déposez l'appareil dans un point de collecte adapté.", "Take the device to a suitable collection point."] },
    ],
    moments: [
      { emoji: "🤯", title: ["La technique vous rebute", "Tech puts you off"], text: ["Vous voulez un appareil qui se prend en main sans manuel de 80 pages.", "You want a device you can use without an 80-page manual."] },
      { emoji: "🎒", title: ["Vous voyagez léger", "You travel light"], text: ["Vous cherchez un objet qui se glisse partout.", "You need something that fits anywhere."] },
      { emoji: "🎁", title: ["Vous cherchez un cadeau qui épate", "You want a gift that impresses"], text: ["Quelque chose qu'on a envie d'essayer tout de suite.", "Something people want to try right away."] },
    ],
  },
  sport: {
    specs: [
      { label: ["Matière", "Material"], sample: ["Tissu technique respirant", "Breathable technical fabric"] },
      { label: ["Poids", "Weight"], sample: ["320 g", "320 g"] },
      { label: ["Usage", "Use"], sample: ["Intérieur et extérieur", "Indoor and outdoor"] },
      { label: ["Entretien", "Care"], sample: ["Lavage à 30 °C", "Wash at 30°C"] },
    ],
    steps: [
      { title: ["Préparez-vous", "Get ready"], sample: ["Ajustez-le avant de commencer votre séance.", "Adjust it before your session starts."] },
      { title: ["Lancez-vous", "Get going"], sample: ["Commencez progressivement, puis augmentez l'intensité.", "Start gradually, then build up the intensity."] },
      { title: ["Récupérez", "Recover"], sample: ["Nettoyez-le et laissez-le sécher après chaque utilisation.", "Clean it and let it dry after each use."] },
    ],
    prec: [
      { icon: "book", title: ["Avant de commencer", "Before you start"], sample: ["Vérifiez l'état du produit avant chaque séance.", "Check the product before every session."] },
      { icon: "alert", important: true, title: ["Pratique", "Practice"], sample: ["Adaptez l'effort à votre condition physique.", "Match the effort to your fitness level."] },
      { icon: "sun", title: ["Séchage", "Drying"], sample: ["Laissez sécher à l'air libre, à l'abri du soleil.", "Air-dry away from direct sun."] },
      { icon: "package", title: ["Rangement", "Storage"], sample: ["Rangez-le dans un endroit sec.", "Store it somewhere dry."] },
    ],
    moments: [
      { emoji: "⏱️", title: ["Vous manquez de temps pour bouger", "You struggle to find time to move"], text: ["Vous cherchez un équipement simple, prêt quand vous l'êtes.", "You want simple gear that's ready when you are."] },
      { emoji: "🏃", title: ["Vous voulez progresser", "You want to improve"], text: ["Un équipement à la hauteur de votre motivation.", "Gear that matches your motivation."] },
      { emoji: "🌦️", title: ["Vous sortez par tous les temps", "You go out in any weather"], text: ["Vous voulez penser à l'effort, pas à l'équipement.", "You want to focus on the effort, not the gear."] },
    ],
  },
  alimentation: {
    specs: [
      { label: ["Contenance", "Size"], sample: ["33 cl", "33 cl"] },
      { label: ["Ingrédients", "Ingredients"], sample: ["Infusion de thé noir, jus de fruits", "Black tea infusion, fruit juice"] },
      { label: ["Conservation", "Storage"], sample: ["À conserver au frais", "Keep refrigerated"] },
      { label: ["Origine", "Origin"], sample: ["Fabriqué en France", "Made in France"] },
    ],
    steps: [
      { title: ["Rafraîchissez", "Chill"], sample: ["Placez au frais quelques heures avant de servir.", "Chill for a few hours before serving."] },
      { title: ["Servez", "Serve"], sample: ["Servez bien frais, avec des glaçons si vous aimez.", "Serve well chilled, over ice if you like."] },
      { title: ["Savourez", "Enjoy"], sample: ["À partager à l'apéritif ou en pique-nique.", "Lovely for sharing at aperitif time or on a picnic."] },
    ],
    prec: [
      { icon: "thermometer", title: ["Conservation", "Storage"], sample: ["À conserver dans un endroit frais et sec.", "Store in a cool, dry place."] },
      { icon: "drop", title: ["Après ouverture", "Once opened"], sample: ["À consommer rapidement après ouverture.", "Consume soon after opening."] },
      { icon: "info", important: true, title: ["Allergènes", "Allergens"], sample: ["Consultez la liste des ingrédients sur l'emballage.", "Check the ingredient list on the pack."] },
      { icon: "recycle", title: ["Emballage", "Packaging"], sample: ["Emballage recyclable : pensez au tri.", "Recyclable packaging: please sort it."] },
    ],
    moments: [
      { emoji: "☀️", title: ["Il fait chaud, vous avez soif", "It's hot and you're thirsty"], text: ["Vous cherchez quelque chose de bon et de rafraîchissant.", "You want something tasty and refreshing."] },
      { emoji: "🧺", title: ["Vous préparez un moment à partager", "You're planning a moment to share"], text: ["Apéritif, pique-nique, déjeuner : vous voulez faire plaisir.", "Aperitif, picnic, lunch: you want to treat everyone."] },
      { emoji: "🛒", title: ["Vous lisez les étiquettes", "You read the labels"], text: ["Vous aimez savoir ce que vous mettez dans votre panier.", "You like knowing what goes into your basket."] },
    ],
  },
  enfants: {
    specs: [
      { label: ["Âge", "Age"], sample: ["Dès 3 ans", "Ages 3+"] },
      { label: ["Matière", "Material"], sample: ["Coton biologique", "Organic cotton"] },
      { label: ["Dimensions", "Dimensions"], sample: ["30 × 20 cm", "30 × 20 cm"] },
      { label: ["Entretien", "Care"], sample: ["Lavable en machine à 30 °C", "Machine-washable at 30°C"] },
    ],
    steps: [
      { title: ["Découvrez-le ensemble", "Discover it together"], sample: ["Présentez-le à votre enfant et laissez-le explorer.", "Show it to your child and let them explore."] },
      { title: ["Adoptez-le au quotidien", "Make it part of the day"], sample: ["Il trouve sa place dans la routine de la journée.", "It finds its place in the daily routine."] },
      { title: ["Entretenez-le", "Look after it"], sample: ["Lavez-le en machine à 30 °C.", "Machine-wash it at 30°C."] },
    ],
    prec: [
      { icon: "child", important: true, title: ["Surveillance", "Supervision"], sample: ["À utiliser sous la surveillance d'un adulte.", "Use under adult supervision."] },
      { icon: "alert", title: ["Âge", "Age"], sample: ["Ne convient pas aux enfants de moins de 3 ans.", "Not suitable for children under 3."] },
      { icon: "eye", title: ["Vérification", "Checks"], sample: ["Vérifiez régulièrement l'état du produit.", "Check the product's condition regularly."] },
      { icon: "drop", title: ["Entretien", "Care"], sample: ["Lavable en machine à 30 °C.", "Machine-washable at 30°C."] },
    ],
    moments: [
      { emoji: "🧸", title: ["Vous voulez le meilleur pour lui", "You want the best for them"], text: ["Un objet choisi avec soin, pour les petits moments du quotidien.", "A carefully chosen object for everyday little moments."] },
      { emoji: "🕰️", title: ["Les journées filent", "The days fly by"], text: ["Vous cherchez ce qui simplifie la vie de famille.", "You want what makes family life simpler."] },
      { emoji: "🎁", title: ["Une naissance, un anniversaire", "A birth, a birthday"], text: ["Un cadeau qui plaît aux enfants comme aux parents.", "A gift that pleases children and parents alike."] },
    ],
  },
  animaux: {
    specs: [
      { label: ["Dimensions", "Dimensions"], sample: ["20 × 15 cm", "20 × 15 cm"] },
      { label: ["Matière", "Material"], sample: ["Silicone souple", "Soft silicone"] },
      { label: ["Entretien", "Care"], sample: ["Rinçage à l'eau claire", "Rinse with clean water"] },
      { label: ["Pour", "Suitable for"], sample: ["Chats et chiens", "Cats and dogs"] },
    ],
    steps: [
      { title: ["Présentez-le", "Introduce it"], sample: ["Laissez votre animal le découvrir à son rythme.", "Let your pet discover it at their own pace."] },
      { title: ["Utilisez-le", "Use it"], sample: ["Passez-le en douceur, dans le sens du poil.", "Use it gently, in the direction of the fur."] },
      { title: ["Nettoyez-le", "Clean it"], sample: ["Rincez-le à l'eau claire et laissez-le sécher.", "Rinse with clean water and let it dry."] },
    ],
    prec: [
      { icon: "eye", title: ["Premières utilisations", "First uses"], sample: ["Observez la réaction de votre animal les premières fois.", "Watch how your pet reacts the first few times."] },
      { icon: "alert", important: true, title: ["Surveillance", "Supervision"], sample: ["Ne laissez pas votre animal le mâchonner sans surveillance.", "Do not leave your pet chewing it unattended."] },
      { icon: "drop", title: ["Entretien", "Care"], sample: ["Rincez à l'eau claire après usage.", "Rinse with clean water after use."] },
      { icon: "package", title: ["Rangement", "Storage"], sample: ["Rangez-le au sec, hors de portée de l'animal.", "Store it dry, out of your pet's reach."] },
    ],
    moments: [
      { emoji: "🐾", title: ["Les poils sont partout", "There's fur everywhere"], text: ["Canapé, vêtements, coussins : vous cherchez une solution simple.", "Sofa, clothes, cushions: you want a simple fix."] },
      { emoji: "❤️", title: ["Vous voulez prendre soin de lui", "You want to look after them"], text: ["Un moment agréable pour votre compagnon, et pour vous.", "A pleasant moment for your companion, and for you."] },
      { emoji: "🏠", title: ["Vous voulez un intérieur net", "You want a tidy home"], text: ["Sans y passer toutes vos soirées.", "Without spending all your evenings on it."] },
    ],
  },
  artisanat: {
    specs: [
      { label: ["Matière", "Material"], sample: ["Papier recyclé 120 g", "120 gsm recycled paper"] },
      { label: ["Format", "Size"], sample: ["A5", "A5"] },
      { label: ["Fabrication", "Making"], sample: ["Façonné à la main", "Handmade"] },
      { label: ["Finition", "Finish"], sample: ["Reliure cousue", "Sewn binding"] },
    ],
    steps: [
      { title: ["Choisissez", "Choose"], sample: ["Sélectionnez le format et la finition qui vous ressemblent.", "Pick the size and finish that suit you."] },
      { title: ["Créez", "Create"], sample: ["Laissez libre cours à vos idées, page après page.", "Let your ideas flow, page after page."] },
      { title: ["Conservez", "Keep"], sample: ["Rangez-le à plat, à l'abri de l'humidité.", "Store it flat, away from moisture."] },
    ],
    prec: [
      { icon: "sun", title: ["Lumière", "Light"], sample: ["Évitez l'exposition prolongée au soleil.", "Avoid prolonged sun exposure."] },
      { icon: "drop", title: ["Humidité", "Moisture"], sample: ["Conservez à l'abri de l'humidité.", "Keep away from moisture."] },
      { icon: "hand", title: ["Pièce artisanale", "Handmade piece"], sample: ["De légères variations d'une pièce à l'autre sont normales.", "Slight variations from one piece to another are normal."] },
      { icon: "child", important: true, title: ["Petits éléments", "Small parts"], sample: ["Tenir hors de portée des jeunes enfants.", "Keep away from young children."] },
    ],
    moments: [
      { emoji: "✍️", title: ["Vous aimez faire les choses à la main", "You love making things by hand"], text: ["Vous cherchez un support à la hauteur de vos idées.", "You want materials worthy of your ideas."] },
      { emoji: "🎁", title: ["Vous voulez offrir quelque chose de personnel", "You want to give something personal"], text: ["Un cadeau qui a une histoire.", "A present with a story."] },
      { emoji: "🗂️", title: ["Vous voulez vous organiser joliment", "You want to get organised, beautifully"], text: ["Le pratique et le beau, enfin réunis.", "Practical and beautiful, at last."] },
    ],
  },
  default: {
    specs: [
      { label: ["Matière", "Material"], sample: ["Matière durable", "Durable material"] },
      { label: ["Dimensions", "Dimensions"], sample: ["30 × 20 cm", "30 × 20 cm"] },
      { label: ["Entretien", "Care"], sample: ["Nettoyage avec un chiffon doux", "Wipe clean with a soft cloth"] },
      { label: ["Origine", "Origin"], sample: ["Conçu en France", "Designed in France"] },
    ],
    steps: [
      { title: ["Découvrez-le", "Discover it"], sample: ["Déballez-le et prenez quelques minutes pour le découvrir.", "Unpack it and take a few minutes to get to know it."] },
      { title: ["Utilisez-le", "Use it"], sample: ["Suivez les consignes de la notice pour un usage optimal.", "Follow the manual for the best results."] },
      { title: ["Entretenez-le", "Look after it"], sample: ["Nettoyez-le avec un chiffon doux après usage.", "Wipe it with a soft cloth after use."] },
    ],
    prec: [
      { icon: "book", title: ["Avant la première utilisation", "Before first use"], sample: ["Lisez attentivement la notice.", "Read the manual carefully."] },
      { icon: "hand", title: ["Utilisation", "Use"], sample: ["Utilisez le produit uniquement pour l'usage prévu.", "Only use the product for its intended purpose."] },
      { icon: "child", important: true, title: ["Sécurité", "Safety"], sample: ["Tenir hors de portée des enfants.", "Keep out of reach of children."] },
      { icon: "recycle", title: ["Entretien et recyclage", "Care and recycling"], sample: ["Déposez l'emballage dans le bac de tri.", "Put the packaging in the recycling bin."] },
    ],
    moments: [
      { emoji: "🔎", title: ["Vous cherchez la bonne option", "You're looking for the right option"], text: ["Vous voulez un produit clair, sans promesses inutiles.", "You want a clear product, without empty promises."] },
      { emoji: "⏳", title: ["Vous manquez de temps", "You're short on time"], text: ["Vous voulez ce qui simplifie le quotidien.", "You want what makes everyday life simpler."] },
      { emoji: "🎁", title: ["Vous voulez faire plaisir", "You want to treat someone"], text: ["Un cadeau utile, que l'on garde.", "A useful present people keep."] },
    ],
  },
};

function data(ctx: ContentContext) {
  const P = ctx.product.name;
  const brand = real(ctx.brand?.name) || ctx.shopName;
  const sector = SECTORS.find((s) => s.label === ctx.product.sector || s.labelEn === ctx.product.sector)?.id ?? "default";
  const kit = KITS[sector] ?? KITS.default;
  const facts = ctx.product.facts.map((f) => ({ label: real(f.label), value: bare(real(f.value)) })).filter((f) => f.label && f.value);
  const variants = ctx.product.variants.filter((v) => real(v.name) && v.values.length);
  const priceText = ctx.product.price !== null
    ? new Intl.NumberFormat(ctx.lang === "en" ? "en-US" : "fr-FR", { style: "currency", currency: ctx.product.currency || "EUR" }).format(ctx.product.price / 100).replace(/ /g, " ")
    : "";
  const handle = ctx.products.find((x) => x.title === P)?.handle ?? "";
  const collection = ctx.collections[0];
  return {
    P,
    lcP: lc(P),
    brand,
    tagline: real(ctx.brand?.tagline),
    story: real(ctx.brand?.story),
    summary: sentence(real(ctx.product.summary)),
    kit,
    facts,
    variants,
    values: (ctx.brand?.values ?? []).map((v) => ({ title: real(v.title), text: real(v.text) })).filter((v) => v.title && v.text),
    messages: (ctx.strategy?.keyMessages ?? []).map((m) => real(m)).filter(Boolean),
    priceText,
    productUrl: handle ? `/products/${handle}` : "",
    collection,
    collectionUrl: collection?.handle ? `/collections/${collection.handle}` : "",
  };
}

/** Caractéristiques : faits confirmés, variantes, puis libellés du secteur (valeur à compléter ou exemple). */
function specRows(ctx: ContentContext, d: ReturnType<typeof data>, min: number) {
  const rows: { label: string; value: string; sample: boolean }[] = d.facts.map((f) => ({ label: f.label, value: f.value, sample: false }));
  for (const v of d.variants) rows.push({ label: v.name, value: v.values.join(", "), sample: false });
  const seen = new Set(rows.map((r) => r.label.toLowerCase()));
  for (const s of d.kit.specs) {
    if (rows.length >= min) break;
    const label = t(ctx, s.label);
    if (seen.has(label.toLowerCase())) continue;
    rows.push(ctx.sample ? { label, value: ex(ctx, t(ctx, s.sample)), sample: true } : { label, value: todo(ctx, label.toLowerCase(), label.toLowerCase()), sample: false });
  }
  return rows;
}

const ordinal = (ctx: ContentContext, i: number, n: number) =>
  i === 0 ? tr(ctx, "Le premier geste", "First step") : i === n - 1 ? tr(ctx, "Le dernier geste", "Final step") : tr(ctx, "Le geste suivant", "Next step");

/* ------------------------------------------------------------------ sections */

export const COPY: Record<string, CopyFn> = {
  "comparison-table": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("eyebrow", tr(ctx, "Comparatif", "Comparison"));
    w.set("heading", tr(ctx, `${d.P},`, `${d.P},`));
    w.set("heading_accent", tr(ctx, "face aux alternatives.", "against the alternatives."));
    w.set("text", p(tr(ctx, "Les points qui comptent avant de choisir, réunis côte à côte.", "The points that matter before you choose, side by side.")));
    w.set("note", ctx.sample ? tr(ctx, "Comparatif d'exemple : remplacez-le par vos critères vérifiés.", "Example comparison: replace it with your verified criteria.") : todo(ctx, "sources du comparatif", "comparison sources"));
    w.set("button_label", tr(ctx, "Découvrir le produit", "Discover the product"));
    w.set("button_link", d.productUrl);
    const colsBase = (base.blocks ?? []).filter((b) => b.type === "column");
    const cols = blocksOf(schema, { ...base, blocks: colsBase }, "column", [
      { label: d.brand, subtitle: d.priceText || "", highlight: true },
      { label: tr(ctx, "Option classique", "Standard option") },
      { label: tr(ctx, "Autres alternatives", "Other alternatives") },
    ].slice(0, Math.max(colsBase.length, 3)), false);
    const patterns = [["oui", "partiel", "non"], ["oui", "non", "partiel"], ["oui", "oui", "non"], ["oui", "non", "non"]];
    const yes = (v: string) => (ctx.lang === "en" ? ({ oui: "yes", non: "no", partiel: "partial" } as Record<string, string>)[v] : v);
    let rows: Record<string, unknown>[];
    if (ctx.sample) {
      rows = d.kit.specs.map((s, i) => {
        const fact = d.facts.find((f) => f.label.toLowerCase() === t(ctx, s.label).toLowerCase());
        return { label: t(ctx, s.label), note: fact ? fact.value : exampleTag(ctx), v1: yes(patterns[i][0]), v2: yes(patterns[i][1]), v3: yes(patterns[i][2]), v4: "" };
      });
    } else {
      rows = specRows(ctx, d, 4).map((r) => ({ label: r.label, note: "", v1: PLACEHOLDER.test(r.value) ? "" : r.value, v2: "", v3: "", v4: "" }));
    }
    rows.push({ label: tr(ctx, "Prix", "Price"), note: "", v1: d.priceText || (ctx.sample ? ex(ctx, tr(ctx, "29,90 €", "€29.90")) : ""), v2: ctx.sample ? tr(ctx, "Variable", "Varies") : "", v3: ctx.sample ? tr(ctx, "Variable", "Varies") : "", v4: "" });
    const rowBlocks = blocksOf(schema, { ...base, blocks: [] }, "row", rows);
    return { settings: w.out, blocks: [...cols, ...rowBlocks], samples: ctx.sample };
  },

  "exploded-view": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("eyebrow", tr(ctx, "Vue éclatée", "Exploded view"));
    w.set("heading", `${d.P},`);
    w.set("heading_accent", tr(ctx, "dans le détail.", "in detail."));
    w.set("text", tr(ctx, "Faites défiler : chaque détail se dévoile à son tour.", "Scroll: each detail reveals itself in turn."));
    const rows = specRows(ctx, d, 4).slice(0, 4);
    const points = blocksOf(schema, base, "point", rows.map((r) => ({ title: r.label, text: r.value })));
    const layers = (base.blocks ?? []).filter((b) => b.type === "layer");
    return { settings: w.out, blocks: [...points, ...layers], samples: ctx.sample && rows.some((r) => r.sample) };
  },

  "featured-product": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("eyebrow", d.collection?.title || d.brand);
    w.set("text", p(d.summary || tr(ctx, `${d.P}, signé ${d.brand}.`, `${d.P}, by ${d.brand}.`)));
    const items: Record<string, unknown>[] = d.facts.slice(0, 3).map((f, i) => ({ icon: i === 0 ? "sparkle" : "check", text: `${f.label} : ${f.value}`.replace(" : ", ctx.lang === "en" ? ": " : " : ") }));
    for (const v of d.variants) if (items.length < 2) items.push({ icon: "check", text: tr(ctx, `${v.name} : ${v.values.join(", ")}`, `${v.name}: ${v.values.join(", ")}`) });
    let sample = false;
    const known = new Set([...d.facts.map((f) => f.label.toLowerCase()), ...d.variants.map((v) => v.name.toLowerCase())]);
    for (const s of d.kit.specs.filter((x) => !known.has(t(ctx, x.label).toLowerCase()))) {
      if (items.length >= 2) break;
      if (ctx.sample) { items.push({ icon: items.length ? "check" : "sparkle", text: ex(ctx, `${t(ctx, s.label)}${ctx.lang === "en" ? ":" : " :"} ${lc(t(ctx, s.sample))}`) }); sample = true; }
      else items.push({ icon: items.length ? "check" : "sparkle", text: todo(ctx, "point fort", "key feature") });
    }
    if (ctx.sample) sample = true;
    items.push({ icon: "truck", text: ctx.sample ? ex(ctx, tr(ctx, "Livraison en 2 à 4 jours ouvrés", "Delivered in 2 to 4 working days")) : todo(ctx, "délai de livraison", "delivery time") });
    return { settings: w.out, blocks: blocksOf(schema, base, "highlight", items), samples: sample };
  },

  "features-grid": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("eyebrow", d.brand);
    w.set("heading", tr(ctx, "Ce qu'il faut savoir,", "What to know,"));
    w.set("heading_accent", tr(ctx, "en un coup d'œil.", "at a glance."));
    w.set("heading_align", "center");
    w.set("style", "cards");
    const items: { icon: string; title: string; text: string }[] = [];
    if (d.summary) items.push({ icon: "sparkle", title: tr(ctx, "En bref", "In short"), text: d.summary });
    for (const f of d.facts) items.push({ icon: "check", title: f.label, text: sentence(f.value) });
    for (const v of d.values) items.push({ icon: "heart", title: v.title, text: sentence(v.text) });
    for (const m of d.messages) items.push({ icon: "star", title: d.P, text: sentence(m) });
    const neutral = [
      { icon: "hand", title: tr(ctx, "Choisi avec soin", "Carefully chosen"), text: tr(ctx, `${d.brand} a retenu ce produit pour sa place naturelle dans votre quotidien.`, `${d.brand} picked this product for the natural place it takes in your everyday life.`) },
      { icon: "heart", title: tr(ctx, "Facile à adopter", "Easy to adopt"), text: tr(ctx, "Pensé pour s'intégrer simplement à vos habitudes.", "Designed to fit simply into your habits.") },
      { icon: "globe", title: tr(ctx, "Une équipe à l'écoute", "A team that listens"), text: tr(ctx, "Une question avant ou après votre commande ? Écrivez-nous, nous vous répondons.", "A question before or after your order? Write to us and we'll get back to you.") },
    ];
    for (const n of neutral) if (items.length < 3) items.push(n);
    const list = items.slice(0, Math.max(3, Math.min(items.length, 4)));
    w.set("columns", list.length === 4 ? 4 : 3);
    return { settings: w.out, blocks: blocksOf(schema, base, "feature", list.map((x) => ({ icon: x.icon, title: x.title, text: p(x.text) }))) };
  },

  "how-to": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("eyebrow", tr(ctx, "Mode d'emploi", "How to use"));
    w.set("heading", tr(ctx, `Bien utiliser votre ${d.lcP}`, `Getting the most from your ${d.lcP}`));
    w.set("text", p(tr(ctx, "Les bons gestes, étape par étape.", "The right steps, one at a time.")));
    const steps = d.kit.steps.map((s) => ({ title: t(ctx, s.title), text: p(ctx.sample ? exSentence(ctx, t(ctx, s.sample)) : todo(ctx, "consigne de la notice", "instruction from the manual")) }));
    return { settings: w.out, blocks: blocksOf(schema, base, "step", steps), samples: ctx.sample };
  },

  "image-with-text": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("eyebrow", d.brand);
    w.set("heading", d.tagline || d.P);
    w.set("text", p(d.summary || tr(ctx, `${d.P}, imaginé par ${d.brand} pour votre quotidien.`, `${d.P}, created by ${d.brand} for your everyday life.`), d.story && d.story.length < 320 ? d.story : ""));
    w.set("button_label", tr(ctx, "Découvrir le produit", "Discover the product"));
    w.set("button_link", d.productUrl || "/collections/all");
    return { settings: w.out, blocks: base.blocks };
  },

  precautions: (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("text", p(tr(ctx, `Pour profiter de votre ${d.lcP} en toute sérénité, voici les recommandations à garder en tête.`, `To enjoy your ${d.lcP} with complete peace of mind, here are the recommendations to keep in mind.`)));
    const items = d.kit.prec.map((x) => ({ icon: x.icon, level: x.important ? "important" : "normal", title: t(ctx, x.title), text: p(ctx.sample ? exSentence(ctx, t(ctx, x.sample)) : todo(ctx, "mention de la notice", "wording from the manual")) }));
    return { settings: w.out, blocks: blocksOf(schema, base, "item", items), samples: ctx.sample };
  },

  "product-360": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("heading", tr(ctx, `${d.P}, sous tous les angles`, `${d.P}, from every angle`));
    w.set("text", p(tr(ctx, "Faites glisser l'image pour le tourner et l'observer de près, comme en boutique.", "Drag the image to turn it and take a close look, just like in store.")));
    return { settings: w.out, blocks: base.blocks };
  },

  situations: (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("eyebrow", tr(ctx, "Vous vous reconnaissez ?", "Sound familiar?"));
    w.set("heading", tr(ctx, "Ces moments où l'on cherche la bonne solution", "Those moments when you need the right answer"));
    w.set("conclusion", tr(ctx, `C'est pour ces moments-là que ${d.brand} a imaginé ${quote(ctx, d.P)}.`, `${d.brand} created ${quote(ctx, d.P)} for exactly these moments.`));
    const items = d.kit.moments.map((m) => ({ emoji: m.emoji, title: t(ctx, m.title), text: t(ctx, m.text) }));
    return { settings: w.out, blocks: blocksOf(schema, base, "situation", items) };
  },

  "specs-list": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("eyebrow", tr(ctx, "Fiche technique", "Specifications"));
    w.set("heading", d.P);
    w.set("text", p(d.summary));
    const rows = specRows(ctx, d, 4);
    if (d.priceText) rows.push({ label: tr(ctx, "Prix", "Price"), value: d.priceText, sample: false });
    return { settings: w.out, blocks: blocksOf(schema, base, "spec", rows.map((r) => ({ label: r.label, value: r.value }))), samples: rows.some((r) => r.sample) };
  },

  timeline: (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("eyebrow", d.brand);
    w.set("heading", tr(ctx, "Votre commande,", "Your order,"));
    w.set("heading_accent", tr(ctx, "étape par étape.", "step by step."));
    const v = d.variants[0];
    const steps = [
      { title: tr(ctx, "Vous choisissez", "You choose"), text: p(tr(ctx, `Sélectionnez votre ${d.lcP}${v ? ` et votre ${lc(v.name)}` : ""}, puis ajoutez-le au panier.`, `Select your ${d.lcP}${v ? ` and your ${lc(v.name)}` : ""}, then add it to your cart.`)) },
      { title: tr(ctx, "Nous préparons votre colis", "We prepare your parcel"), text: p(tr(ctx, `Votre commande est préparée par l'équipe ${d.brand}.`, `Your order is prepared by the ${d.brand} team.`)) },
      { title: tr(ctx, "Vous le recevez", "It arrives"), text: p(ctx.sample ? exSentence(ctx, tr(ctx, "Livraison en 2 à 4 jours ouvrés, avec suivi", "Delivered in 2 to 4 working days, with tracking")) : tr(ctx, `Livraison : ${todo(ctx, "délai", "delivery time")}`, `Delivery: ${todo(ctx, "délai", "delivery time")}`)) },
      { title: tr(ctx, "Vous en profitez", "You enjoy it"), text: p(tr(ctx, `Il ne reste plus qu'à profiter de votre ${d.lcP}.`, `All that's left is to enjoy your ${d.lcP}.`)) },
    ];
    return { settings: w.out, blocks: blocksOf(schema, base, "step", steps), samples: ctx.sample };
  },

  "horizontal-gallery": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("eyebrow", d.brand);
    w.set("heading", tr(ctx, `${d.P}, en images`, `${d.P}, in pictures`));
    const caps = [
      { title: tr(ctx, "Vue d'ensemble", "The full picture"), text: tr(ctx, "Un premier regard.", "A first look.") },
      { title: tr(ctx, "En situation", "In context"), text: tr(ctx, "Dans son décor.", "In its setting.") },
      { title: tr(ctx, "Dans le détail", "Up close"), text: tr(ctx, "Les finitions, de près.", "The finish, up close.") },
      { title: tr(ctx, "Au quotidien", "Every day"), text: tr(ctx, "Tel qu'on le vit.", "As you'll live with it.") },
    ];
    const n = Math.max((base.blocks ?? []).filter((b) => b.type === "slide").length, 3);
    return { settings: w.out, blocks: blocksOf(schema, base, "slide", Array.from({ length: n }, (_, i) => caps[i % caps.length])) };
  },

  "routine-steps": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    const n = d.kit.steps.length;
    w.set("eyebrow", tr(ctx, "Mode d'emploi", "How to use"));
    w.set("heading", tr(ctx, `Votre ${d.lcP}, en ${n === 3 ? "trois" : n} gestes.`, `Your ${d.lcP}, in ${n === 3 ? "three" : n} steps.`));
    if (d.brand.length <= 9) w.set("watermark", d.brand);
    const chips = d.facts.map((f) => f.value).filter((v) => v.length <= 22);
    if (!chips.length && d.variants[0]) chips.push(`${d.variants[0].values.length} ${lc(d.variants[0].name)}`);
    let sample = false;
    if (ctx.sample && chips.length < 2) for (const s of d.kit.specs.filter((x) => !d.facts.some((f) => f.label.toLowerCase() === t(ctx, x.label).toLowerCase()))) { if (chips.length >= 2) break; chips.push(ex(ctx, t(ctx, s.sample))); sample = true; }
    w.set("chip1", chips[0]);
    w.set("chip2", chips[1]);
    const steps = d.kit.steps.map((s, i) => ({ eyebrow: ordinal(ctx, i, n), title: sentence(t(ctx, s.title)), text: p(ctx.sample ? exSentence(ctx, t(ctx, s.sample)) : todo(ctx, "consigne de la notice", "instruction from the manual")) }));
    return { settings: w.out, blocks: blocksOf(schema, base, "step", steps), samples: ctx.sample || sample };
  },

  "scroll-steps": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("eyebrow", tr(ctx, "Comment ça marche", "How it works"));
    w.set("heading", tr(ctx, "De la commande", "From order"));
    w.set("heading_accent", tr(ctx, "à chez vous.", "to your door."));
    const v = d.variants[0];
    const steps = [
      { eyebrow: tr(ctx, "Choisir", "Choose"), title: tr(ctx, "Trouvez votre modèle.", "Find your favourite."), text: p(tr(ctx, `Parcourez la boutique et choisissez ${v ? `votre ${lc(v.name)}` : "ce qui vous ressemble"}, en quelques clics.`, `Browse the shop and choose ${v ? `your ${lc(v.name)}` : "what suits you"} in a few clicks.`)) },
      { eyebrow: tr(ctx, "Commander", "Order"), title: tr(ctx, "Commandez en ligne.", "Order online."), text: p(ctx.sample ? exSentence(ctx, tr(ctx, "Paiement sécurisé par carte bancaire ou PayPal", "Secure payment by card or PayPal")) : tr(ctx, `Paiement : ${todo(ctx, "moyens de paiement", "payment methods")}`, `Payment: ${todo(ctx, "moyens de paiement", "payment methods")}`)) },
      { eyebrow: tr(ctx, "Recevoir", "Receive"), title: tr(ctx, "Recevez votre commande.", "Receive your order."), text: p(ctx.sample ? exSentence(ctx, tr(ctx, "Livraison en 2 à 4 jours ouvrés, avec suivi", "Delivered in 2 to 4 working days, with tracking")) : tr(ctx, `Livraison : ${todo(ctx, "délai", "delivery time")}`, `Delivery: ${todo(ctx, "délai", "delivery time")}`)) },
    ];
    return { settings: w.out, blocks: blocksOf(schema, base, "step", steps), samples: ctx.sample };
  },

  "scroll-story": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("heading", tr(ctx, `${d.P}, de plus près`, `${d.P}, up close`));
    const rows = specRows(ctx, d, 3);
    const items: { title: string; text: string; sample: boolean }[] = [];
    if (d.summary) items.push({ title: tr(ctx, "En un coup d'œil", "At a glance"), text: d.summary, sample: false });
    for (const r of rows) if (items.length < 3) items.push({ title: r.label, text: r.sample || PLACEHOLDER.test(r.value) ? r.value : sentence(r.value), sample: r.sample });
    return { settings: w.out, blocks: blocksOf(schema, base, "step", items.map((x) => ({ title: x.title, text: p(x.text) }))), samples: items.some((x) => x.sample) };
  },

  "stack-cards": (ctx, base, schema) => {
    const d = data(ctx);
    const w = writer(schema, base);
    w.set("heading", tr(ctx, "Trois bonnes raisons", "Three good reasons"));
    w.set("heading_accent", tr(ctx, "de craquer.", "to fall for it."));
    const f = d.facts[0];
    const val = d.values[0];
    const cards = [
      { eyebrow: tr(ctx, "Le produit", "The product"), title: d.P, text: p(d.summary || tr(ctx, `Découvrez ${quote(ctx, d.P)}, signé ${d.brand}.`, `Discover ${quote(ctx, d.P)}, by ${d.brand}.`)), button_label: tr(ctx, "Découvrir", "Discover"), link: d.productUrl },
      f
        ? { eyebrow: tr(ctx, "Dans le détail", "In detail"), title: f.label, text: p(sentence(f.value)), button_label: tr(ctx, "Voir le produit", "View product"), link: d.productUrl }
        : val
          ? { eyebrow: tr(ctx, "Nos valeurs", "Our values"), title: val.title, text: p(val.text), button_label: tr(ctx, "Découvrir", "Discover"), link: d.productUrl }
          : { eyebrow: tr(ctx, "Au quotidien", "Every day"), title: tr(ctx, "Pensé pour votre quotidien", "Made for your everyday"), text: p(tr(ctx, `${d.P} trouve naturellement sa place dans vos habitudes.`, `${d.P} fits naturally into your routine.`)), button_label: tr(ctx, "Voir le produit", "View product"), link: d.productUrl },
      { eyebrow: tr(ctx, "La marque", "The brand"), title: d.tagline || d.brand, text: p(d.story || tr(ctx, `Découvrez l'univers ${d.brand}${d.collection ? ` et la collection ${d.collection.title}` : ""}.`, `Explore the ${d.brand} world${d.collection ? ` and the ${d.collection.title} collection` : ""}.`)), button_label: d.collection ? tr(ctx, "Voir la collection", "View the collection") : tr(ctx, "Voir la boutique", "Visit the shop"), link: d.collectionUrl || "/collections/all" },
    ];
    return { settings: w.out, blocks: blocksOf(schema, base, "card", cards.map((c) => ({ ...c, link: c.link || undefined }))) };
  },
};
