/**
 * Sites de services FICTIFS pour l'hébergement (#232) : compte fictif avec forfait actif, projet de services composé par
 * le studio dans un thème de services existant, puis informations « à compléter » renseignées comme le ferait le client
 * (horaires, parcours, pages légales). Aucune donnée réelle, aucun appel réseau.
 */
import { createUser } from "@/lib/auth";
import { id, now, one, run } from "@/lib/db";
import { alignPeriod, getSubscription, syncAllowance } from "@/lib/billing";
import { composeShop } from "@/lib/engine/shop";
import { saveThemeVersion } from "@/lib/projects";
import { policyHtml } from "@/lib/sites/policies";
import type { ThemeSpec } from "@/lib/theme/spec";
import { seedHoldout } from "./lot1-holdout-fixtures";

/** Réponses fictives du client aux textes laissés à compléter par la composition. */
const FILLED: [RegExp, string][] = [
  [/horaires/i, "Du lundi au vendredi, de 9 h à 18 h."],
  [/parcours|façon de travailler/i, "Quinze ans de métier, chaque intervention est préparée après un échange."],
  [/tarifs/i, "Tarif communiqué sur devis, après échange."],
  [/modalités du devis/i, "Le devis est gratuit et valable un mois."],
  [/date/i, "29 octobre 2026"],
  [/^$/, "Information fictive renseignée pour la recette."],
];
const PLACEHOLDER = /\[(?:À|A) (?:compléter|définir|préciser|renseigner|confirmer)\s*:?\s*([^\]]*)\]/g;
const fill = (s: string) => s
  .replace(PLACEHOLDER, (_all, what: string) => FILLED.find(([re]) => re.test(what))?.[1] ?? "Information fictive renseignée pour la recette.")
  // Valeurs laissées « À renseigner » par certains thèmes (mentions légales) : renseignées par le client fictif.
  .replace(/(?:À|A) renseigner\s*:?/g, "Information fictive de recette");

const DAYS = ["hours_mon", "hours_tue", "hours_wed", "hours_thu", "hours_fri"];
/** Horaires et durées de séance d'un moteur de réservation, saisis comme le ferait le professionnel (fictifs). */
function bookingSetup(spec: ThemeSpec) {
  for (const t of [spec.groups?.header, ...Object.values(spec.templates ?? {})]) for (const sec of Object.values(t?.sections ?? {})) {
    const st = (sec.settings ??= {}) as Record<string, unknown>;
    if (DAYS.some((d) => d in st)) for (const d of DAYS) if (!String(st[d] ?? "").trim()) st[d] = "09:00-12:00, 14:00-18:00";
    for (const b of Object.values(sec.blocks ?? {})) if (b.type === "seance" && b.settings && !b.settings.duration) Object.assign(b.settings, { duration: 60, price: 55 });
  }
}

/** Remplace partout les textes à compléter (comme le client dans l'éditeur du site) et rédige les pages légales. */
export function completeSite(spec: ThemeSpec, business: string): ThemeSpec {
  const out = JSON.parse(JSON.stringify(spec, (_k, v) => (typeof v === "string" ? fill(v) : v))) as ThemeSpec;
  bookingSetup(out);
  out.store.policies = out.store.policies.map((p) => ({
    ...p,
    body_html: policyHtml(`${p.title} de ${business} (entreprise fictive de recette).\n\nÉditeur : ${business}, entreprise fictive, 1 rue de l'Exemple, 69000 Lyon.\n\nHébergement : E-com Studio IA (prototype de recette, hébergeur à désigner avant toute mise en service).`),
  }));
  return out;
}

export async function payingUser(label = "sites") {
  const u = await createUser(`${label}-${id()}@example.test`, "motdepasse-test-uniquement", "Compte fictif");
  run("UPDATE users SET role='client' WHERE id=?", u.id);
  getSubscription(u.id);
  run("UPDATE subscriptions SET status='active',plan='vendre',billing='monthly',owner_user_id=? WHERE user_id=?", u.id, u.id);
  alignPeriod(u.id, now());
  syncAllowance(u.id);
  return u;
}

/** Coordonnées publiques fictives du professionnel (adresse, téléphone, horaires), comme saisies dans le studio. */
export function fictiveContact(pid: string) {
  const services = JSON.parse(one<{ business_json: string }>("SELECT business_json FROM projects WHERE id = ?", pid)!.business_json);
  run("UPDATE projects SET business_json = ? WHERE id = ?", JSON.stringify({ ...services, address: "1 rue de l'Exemple, 69000 Lyon", phone: "04 00 00 00 00", hours: "Du lundi au vendredi, 9 h – 18 h" }), pid);
}

/** Projet de services fictif composé dans `direction`, prêt à publier (textes renseignés). */
export async function servicesSite(userId: string, direction: "aplat" | "rive" | "maison-horizon" = "aplat", name = "Atelier musical", holdout = 2) {
  const pid = seedHoldout(userId, holdout, name);
  fictiveContact(pid);
  const { spec } = await composeShop(pid, direction, null, false);
  const version = saveThemeVersion(pid, completeSite(spec, name), "Site fictif de recette", "user");
  return { pid, version, spec: completeSite(spec, name) };
}

/** Formats et tailles variés des images FICTIVES générées (aucune photo réelle ni privée). */
const MEDIA_SHAPES: [number, number, "jpeg" | "png" | "webp"][] = [[480, 320, "png"], [1600, 1067, "jpeg"], [3200, 2133, "webp"], [900, 1600, "jpeg"], [2400, 2400, "png"], [1200, 800, "webp"], [640, 960, "webp"], [2000, 1125, "jpeg"]];
const MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

/**
 * Site riche en médias : `count` images générées (dégradés et numéro, sans personne ni lieu réel), enregistrées dans la
 * bibliothèque du projet comme un client les téléverserait, puis placées dans TOUTES les cases d'image des sections.
 */
export async function withRichMedia(pid: string, userId: string, count = 24) {
  const sharp = (await import("sharp")).default;
  const { saveAsset } = await import("@/lib/library");
  const { currentTheme } = await import("@/lib/projects");
  const spec = structuredClone(currentTheme(pid)!.spec) as ThemeSpec;
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const [w, h, fmt] = MEDIA_SHAPES[i % MEDIA_SHAPES.length];
    const hue = (i * 47) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,62%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},45%,32%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="52%" font-family="sans-serif" font-size="${Math.round(Math.min(w, h) / 6)}" fill="#fff" text-anchor="middle">Image fictive ${i + 1}</text></svg>`;
    const data = await sharp(Buffer.from(svg))[fmt]({ quality: 82 }).toBuffer();
    const a = await saveAsset({ projectId: pid, userId, data, mime: MIME[fmt], name: `fictive-${i + 1}.${fmt === "jpeg" ? "jpg" : fmt}`, origin: "upload", role: "scene", status: "approved", meta: { width: w, height: h, alt: `Image fictive ${i + 1}` } });
    const name = `rich-${i + 1}.${fmt === "jpeg" ? "jpg" : fmt}`;
    spec.files[name] = a.id;
    names.push(name);
  }
  let n = 0;
  const fill = (settings: Record<string, unknown> | undefined) => { if (settings) for (const k of Object.keys(settings)) if (/_asset$/.test(k)) settings[k] = names[n++ % names.length]; };
  for (const t of [spec.groups?.header, spec.groups?.footer, ...Object.values(spec.templates ?? {})]) for (const sec of Object.values(t?.sections ?? {})) {
    fill(sec.settings as Record<string, unknown>);
    for (const b of Object.values(sec.blocks ?? {})) fill(b.settings as Record<string, unknown>);
  }
  saveThemeVersion(pid, spec, "Site fictif riche en médias", "user");
  return { names, slots: n };
}
