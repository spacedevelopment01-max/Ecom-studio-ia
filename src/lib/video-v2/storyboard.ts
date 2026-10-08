/**
 * Storyboard professionnel : chaque section du script devient un ou plusieurs plans complets (sujet, action,
 * décor, cadrage, mouvement, lumière, référence, voix, texte, son, transition, objectif). Les plans suivent la
 * structure du script (pas de succession aléatoire d'images) et le langage visuel du projet.
 */
import type { AdInsight } from "../ads-v2/types";
import type { CameraMove, CreativeStrategy, Framing, ScriptPart, Shot, VideoIntent, VideoScript } from "./types";

/** Ce dont dispose le projet (bibliothèque) : décide de ce que l'on peut montrer sans rien générer. */
export type Inventory = {
  cutout: { id: string } | null;
  logo: { id: string } | null;
  /** Photos réelles ou validées : produit en situation, détails, scènes, activité (services). */
  photos: { id: string; role: string; origin: string }[];
  /** Vidéos réelles ou validées (plans, vidéos libres de droits avec crédit). */
  videos: { id: string; durationS: number; role: string }[];
  /** Captures d'écran (logiciel) importées par le client. */
  screens: { id: string }[];
};

type Beat = { subject: string; action: string; environment: string; framing: Framing; camera: CameraMove; purpose: string; showsProduct: boolean; character: boolean; sound: string };

const ENV: Record<CreativeStrategy["style"]["language"], string> = {
  craft_documentary: "chantier réel, pièce en cours de rénovation",
  premium_soft: "surface minérale claire, fond épuré aux couleurs de la marque",
  tech_precise: "studio sombre, surface mate, liseré de lumière",
  food_warm: "salle du restaurant, tables dressées, cuisine ouverte",
  digital_explainer: "écran d'ordinateur, interface du logiciel, aplats de la charte",
  lifestyle_natural: "intérieur lumineux du quotidien",
  local_trust: "lieu de l'activité, équipe au travail",
};

/** Découpe d'une section en temps (plans de durée proche du rythme visé, jamais sous 1,6 s). */
function beatsFor(part: ScriptPart, i: AdInsight, st: CreativeStrategy, intent: VideoIntent): Beat[] {
  const services = i.business === "services";
  const env = ENV[st.style.language];
  const product = services ? (i.services[0]?.name ?? i.category.label) : i.offerName;
  const ugc = intent.kind === "ugc";
  const digital = st.style.language === "digital_explainer";
  const sound = st.style.music === "none" ? "ambiance du lieu" : "musique, ambiance discrète";
  switch (part) {
    case "hook":
      if (ugc) return [{ subject: "personnage (synthétique, signalé)", action: "regarde la caméra et pose la question d'ouverture", environment: "pièce du quotidien crédible", framing: "medium", camera: "handheld", purpose: "arrêter le défilement en 2 secondes", showsProduct: false, character: true, sound: "voix naturelle" }];
      return [{ subject: services ? `le geste clé du métier : ${product}` : `${product}, détail qui intrigue`, action: services ? "geste précis en cours" : "révélation progressive", environment: env, framing: "close", camera: st.rhythm.energy === "calm" ? "push_in" : "handheld", purpose: "arrêter le défilement en 2 secondes", showsProduct: !services, character: false, sound }];
    case "development":
      return [
        { subject: services ? `l'équipe ou l'artisan, ${i.category.label}` : `${product} en situation d'usage`, action: services ? "présente son travail" : (i.usage[0] ?? "utilisé au quotidien"), environment: env, framing: "medium", camera: "pan_right", purpose: "dire ce que c'est et pour qui", showsProduct: !services, character: ugc, sound },
        ...(st.durationS >= 20 ? [{ subject: services ? "le lieu, la zone d'intervention" : `${product}, détail de fabrication`, action: services ? "plan d'ensemble" : "détail net", environment: env, framing: services ? ("wide" as Framing) : ("extreme_close" as Framing), camera: "static" as CameraMove, purpose: "ancrer dans le réel", showsProduct: !services, character: false, sound }] : []),
      ];
    case "demonstration":
      if (digital) return [{ subject: "interface du logiciel", action: "parcours d'une tâche, de la donnée au tableau de bord", environment: env, framing: "screen", camera: "push_in", purpose: "montrer le service rendu", showsProduct: false, character: false, sound }];
      if (ugc) return [{ subject: `personnage et ${product}`, action: "utilise le produit réel, geste naturel", environment: "même pièce que l'ouverture", framing: "close", camera: "handheld", purpose: "montrer l'usage réel", showsProduct: !services, character: true, sound: "voix naturelle" }];
      return [
        { subject: services ? "le travail en cours" : `${product} en action`, action: services ? "étape de la prestation" : "le geste d'usage", environment: env, framing: "close", camera: st.rhythm.energy === "dynamic" ? "orbit" : "push_in", purpose: "prouver par l'image", showsProduct: !services, character: false, sound },
        { subject: services ? "le résultat fini" : `${product}, résultat`, action: services ? "avant / après, finition" : "le résultat de l'usage", environment: env, framing: "medium", camera: "pull_out", purpose: "montrer le résultat", showsProduct: !services, character: false, sound },
      ];
    case "proof":
      return [{ subject: st.proofs[0] ?? "", action: "le fait confirmé s'affiche", environment: "aplat de la charte", framing: "medium", camera: "static", purpose: "appuyer sur une preuve confirmée", showsProduct: !services, character: false, sound }];
    case "conclusion":
      return [{ subject: services ? i.brand : `${product}, packshot`, action: "plan de signature", environment: "fond de la marque", framing: "medium", camera: "push_in", purpose: "mémoriser la marque", showsProduct: !services, character: false, sound }];
    case "cta":
      return [{ subject: "carte de fin : logo, appel à l'action", action: "apparition du bouton", environment: "fond de la marque", framing: "medium", camera: "static", purpose: "faire agir", showsProduct: false, character: false, sound: "fin de la musique" }];
  }
}

const LIGHT_FOR: Record<CreativeStrategy["style"]["language"], string> = {
  craft_documentary: "lumière naturelle du chantier",
  premium_soft: "lumière douce et diffuse",
  tech_precise: "studio contrasté",
  food_warm: "lumière chaude",
  digital_explainer: "aplats lumineux",
  lifestyle_natural: "lumière du jour",
  local_trust: "lumière naturelle",
};

export function buildStoryboard(i: AdInsight, st: CreativeStrategy, intent: VideoIntent, script: VideoScript, inv: Inventory): Shot[] {
  const shots: Shot[] = [];
  let photo = 0;
  const transitions = st.style.transitions;
  for (const section of script.sections) {
    const beats = beatsFor(section.part, i, st, intent);
    // Nombre de plans : selon la durée de la section et le rythme visé (au plus autant de temps décrits).
    const n = Math.max(1, Math.min(beats.length, Math.round(section.durationS / st.rhythm.avgShotS)));
    const used = beats.slice(0, n);
    const each = Math.round((section.durationS / used.length) * 10) / 10;
    // La voix de la section est répartie sur ses plans (au prorata de leur durée, coupée entre les mots).
    const words = section.voice.trim().split(/\s+/).filter(Boolean);
    // Coupures aux pauses naturelles (point, virgule, deux-points) les plus proches de la répartition au prorata.
    const cuts = [0];
    for (let k = 1; k < used.length; k++) {
      const ideal = Math.round((k * words.length) / used.length);
      let best = ideal;
      for (let d = 0; d <= 3; d++) {
        if (ideal - d > cuts[cuts.length - 1] && /[.,;:!?]$/.test(words[ideal - d - 1] ?? "")) {
          best = ideal - d;
          break;
        }
        if (ideal + d < words.length && /[.,;:!?]$/.test(words[ideal + d - 1] ?? "")) {
          best = ideal + d;
          break;
        }
      }
      cuts.push(Math.max(cuts[cuts.length - 1], Math.min(words.length, best)));
    }
    cuts.push(words.length);
    const voiceParts = used.map((_, k) => words.slice(cuts[k], cuts[k + 1]).join(" "));
    used.forEach((b, k) => {
      const ref = b.showsProduct && inv.cutout ? { assetId: inv.cutout.id, note: "détourage du produit réel (référence de fidélité)" } : inv.photos[photo % Math.max(1, inv.photos.length)] ? { assetId: inv.photos[photo++ % inv.photos.length].id, note: "photo réelle de la bibliothèque" } : { assetId: null, note: "aucune référence : composition locale ou recherche" };
      const last = k === used.length - 1;
      shots.push({
        id: `s${shots.length + 1}`,
        durationS: last ? Math.round((section.durationS - each * (used.length - 1)) * 10) / 10 : each,
        part: section.part,
        subject: b.subject,
        action: b.action,
        environment: b.environment,
        framing: b.framing,
        camera: b.camera,
        lighting: LIGHT_FOR[st.style.language],
        reference: ref,
        voice: voiceParts[k] ?? "",
        onScreen: k === 0 ? section.onScreen : "",
        sound: b.sound,
        transition: shots.length === 0 ? "cut" : transitions[shots.length % transitions.length],
        purpose: b.purpose,
        showsProduct: b.showsProduct && !!inv.cutout,
        character: b.character,
      });
    });
  }
  return shots;
}

/** Contrôle du storyboard : durée respectée, chaque plan complet, histoire dans l'ordre du script. */
export function storyboardIssues(shots: Shot[], targetS: number): string[] {
  const issues: string[] = [];
  const total = Math.round(shots.reduce((s, x) => s + x.durationS, 0) * 10) / 10;
  if (Math.abs(total - targetS) > Math.max(1, targetS * 0.05)) issues.push(`durée ${total} s au lieu de ${targetS} s`);
  for (const s of shots) {
    if (s.durationS < 1.2) issues.push(`${s.id} : plan trop court (${s.durationS} s)`);
    for (const k of ["subject", "action", "environment", "lighting", "purpose"] as const) if (!String(s[k]).trim()) issues.push(`${s.id} : ${k} manquant`);
  }
  const order: ScriptPart[] = ["hook", "development", "demonstration", "proof", "conclusion", "cta"];
  for (let k = 1; k < shots.length; k++) if (order.indexOf(shots[k].part) < order.indexOf(shots[k - 1].part)) issues.push(`${shots[k].id} : ordre du récit rompu`);
  return issues;
}
