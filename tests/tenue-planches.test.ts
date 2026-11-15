/**
 * Planches de contrôle des sections à tenue (thème sur mesure, 13 novembre 2026).
 *
 * 1) Toujours : chaque section à tenue est contrôlée sans IA ni navigateur (une seule racine, aucun script, photos
 *    d'exemple présentes, constructions décrites dans une feuille, aucun chiffre ni promesse d'exemple, une famille).
 *    Règles : docs/sina-savoir/sections-a-tenue.md.
 * 2) À la demande, TENUE_OUT=<dossier> : chaque section est rendue seule, dans chacune de ses constructions et dans
 *    trois tenues très différentes (calme, brute, vive), sur téléphone (et sur ordinateur avec TENUE_BUREAU=1). Rien ne
 *    doit dépasser de l'écran en largeur. TENUE_ONLY=tn-a,tn-b ou TENUE_ONLY=produit|services|recit|socle limite le
 *    rendu. Les images s'assemblent avec scripts/tenue-planche.py.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUIT_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue-produit";
import { SERVICES_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue-services";
import { RECIT_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue-recit";
import { TENUE_FILES, TENUE_SECTIONS, type TenueSection } from "@/lib/syna-agent/custom-theme/tenue";
import * as F from "./tenue-fauteuil-fixtures";
import * as K from "./tenue-sac-fixtures";

const DIR = path.join(process.cwd(), "public", "sections");
const css = TENUE_FILES.css.map((f) => { try { return fs.readFileSync(path.join(DIR, f), "utf8"); } catch { return ""; } }).join("\n");
const moduleOf = (s: TenueSection) => (PRODUIT_SECTIONS.includes(s) ? "produit" : SERVICES_SECTIONS.includes(s) ? "services" : RECIT_SECTIONS.includes(s) ? "recit" : "socle");
/** Texte visible d'une section, sans ce qui est annoncé comme manquant. */
const visible = (html: string) => html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/\[À compléter[^\]]*\]/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
/**
 * Un exemple ne montre jamais un chiffre ni une promesse comme s'ils étaient vrais : un prix, un délai, un pourcentage,
 * une note, un nombre d'avis, un label s'écrivent « [À compléter : …] ». Exceptions du socle, réécrites à chaque montage.
 */
const CLAIM = /\d+(?:[.,]\d+)?\s?(?:€|%|h\b|heures?\b|jours?\b|mois\b|ans?\b|min\b|minutes?\b|g\b|kg\b|ml\b|cl\b|l\b|cm\b|mm\b|m²|km\b|étoiles?\b|avis\b|clients?\b)|★|n°\s?1|garanti[es]?\b|certifié[es]?\b|satisfait ou remboursé|livr(?:é|aison) (?:en|sous|gratuite|offerte)/i;
const CLAIM_ALLOWED: Record<string, RegExp> = { "tn-achat": /Sachet de 100 g/ };

describe("sections à tenue : règles d'écriture (sans IA, sans navigateur)", () => {
  it("chaque module range ses sections, sans doublon d'identifiant ni de titre", () => {
    expect(TENUE_SECTIONS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(TENUE_SECTIONS.map((s) => s.id)).size).toBe(TENUE_SECTIONS.length);
    expect(new Set(TENUE_SECTIONS.map((s) => s.title)).size).toBe(TENUE_SECTIONS.length);
  });

  for (const s of TENUE_SECTIONS) {
    it(`${s.id} (${moduleOf(s)}) respecte les règles`, async () => {
      const { sectionGroup } = await import("@/lib/syna-agent/custom-theme/section-groups");
      expect(s.id).toMatch(/^tn-[a-z0-9]+(?:-[a-z0-9]+)*$/);
      // Une seule racine, de classe « tn tn-… » : c'est elle que la tenue habille.
      const root = /^<(section|footer|aside|div)\s+class="tn (tn-[a-z0-9-]+)[^"]*"[^>]*>/.exec(s.html);
      expect(root, "racine « <section class=\"tn tn-…\"> »").not.toBeNull();
      expect(s.html.endsWith(`</${root![1]}>`), "une seule racine, refermée").toBe(true);
      // Aucun script, aucune adresse extérieure ; les seuls gestes en ligne sont neutres.
      expect(s.html).not.toMatch(/<script|<iframe|<link|javascript:|https?:\/\//i);
      for (const m of s.html.matchAll(/\son[a-z]+="([^"]*)"/g)) expect(m[1], "geste en ligne").toBe("return false");
      for (const m of s.html.matchAll(/\sstyle="([^"]*)"/g)) expect(m[1], "style en ligne : seulement une photo de fond ou une variable").toMatch(/^(?:background-image:url\(photos\/[\w.-]+\)|--[a-z-]+:[^;"]+)(?:;--[a-z-]+:[^;"]+)*;?$/);
      // Photos d'exemple : celles de la bibliothèque, présentes dans le dépôt.
      const photos = [...s.html.matchAll(/photos\/([\w.-]+)/g)].map((m) => m[1]);
      for (const f of photos) expect(fs.existsSync(path.join(DIR, "photos", f)), `photo ${f}`).toBe(true);
      if (s.trait.photos > 0) expect(photos.length, "une section à photos montre au moins une photo d'exemple").toBeGreaterThan(0);
      // La feuille connaît la section et chacune de ses constructions.
      expect(css.includes(`.${root![2]}`), `feuille : .${root![2]}`).toBe(true);
      expect(new Set(s.constructions.map((c) => c.key)).size).toBe(s.constructions.length);
      for (const c of s.constructions) {
        expect(c.key).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(c.label.length, `construction ${c.key} : dite en clair au concepteur`).toBeGreaterThan(12);
      }
      for (const c of s.constructions.slice(1)) expect(css.includes(`[data-tn-c="${c.key}"]`), `feuille : construction ${c.key}`).toBe(true);
      // Rien d'inventé dans l'exemple.
      const text = visible(s.html), claim = CLAIM.exec(CLAIM_ALLOWED[s.id] ? text.replace(CLAIM_ALLOWED[s.id], " ") : text);
      expect(claim?.[0] ?? null, `exemple : « ${claim?.[0]} » s'écrit « [À compléter : …] »`).toBeNull();
      // Dit au concepteur : ce que fait la section, et sa place dans la banque.
      expect(s.does.length).toBeGreaterThan(60);
      expect(sectionGroup(s), `famille de la banque pour le rôle « ${s.role} »`).not.toBeNull();
      expect(s.trait.hauteur).toBeGreaterThan(20);
    });
  }
});

/** Trois tenues très différentes : une section doit tenir dans les trois. */
const VIF_BRAND = {
  name: "Zeste", nameStatus: "validated", alternatives: [], tagline: "", positioning: "Des infusions aux fruits, joyeuses et franches.", audience: "", personality: ["joyeuse", "franche"],
  tone: { voice: "Tutoiement, phrases courtes.", do: [], dont: [] },
  palette: { primary: "#FF4F6D", secondary: "#FFD43B", accent: "#FF4F6D", light: "#FFF6DC", dark: "#1D1A3A" },
  fonts: { heading: "unbounded_n8", body: "dm_sans" }, logo: { concept: "", status: "proposed" },
} as const;
const TENUES = [
  { key: "calme", brand: F.FAUTEUIL_BRAND, tenue: { ...F.FAUTEUIL_TENUE }, dir: undefined as string | undefined, photos: F.PRODUCT_PHOTOS.slice(0, 3), names: ["Fauteuil Alcôve terracotta", "Repose-pieds Alcôve", "Coussin Alcôve"] },
  { key: "brute", brand: K.SAC_BRAND, tenue: { ...K.SAC_TENUE }, dir: K.SAC_DIR, photos: K.SAC_PRODUCT_PHOTOS, names: ["Sac de voyage Traverse kaki", "Trousse Traverse", "Sangle Traverse"] },
  { key: "vive", brand: VIF_BRAND, tenue: { titres: "capitales", bouton: "ombre", cadre: "penche", fond: "uni", petits: "normal", signe: "le zeste" } as const, dir: undefined as string | undefined, photos: F.PRODUCT_PHOTOS.slice(0, 3), names: ["Infusion pêche", "Infusion fraise", "Infusion citron"] },
];

describe.runIf(!!process.env.TENUE_OUT)("sections à tenue : planches en image, dans trois tenues", async () => {
  process.env.STUDIO_SYNA_AGENT = "1";
  const only = (process.env.TENUE_ONLY ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const wanted = TENUE_SECTIONS.filter((s) => !only.length || only.includes(s.id) || only.includes(moduleOf(s)));

  it(`${wanted.length} section(s) rendues, rien ne dépasse de l'écran`, async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { saveBrand, saveServices, loadProject } = await import("@/lib/projects");
    const { saveCompany } = await import("@/lib/syna-agent/activity");
    const { saveAsset } = await import("@/lib/library");
    const { createProduct } = await import("@/lib/products/catalog");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const { shootPages } = await import("@/lib/syna-agent/custom-theme/shots");
    const out = process.env.TENUE_OUT!;
    fs.mkdirSync(out, { recursive: true });
    // Une page par section et par construction ; l'en-tête et le pied de page du socle tiennent la coque.
    const pages = wanted.flatMap((s) => (s.constructions.length ? s.constructions.map((c) => c.key) : [null]).map((c) => ({ key: `${s.id.slice(3)}${c ? `--${c}` : ""}`.slice(0, 40), id: s.id, construction: c })));
    expect(new Set(pages.map((p) => p.key)).size, "clés de page uniques").toBe(pages.length);
    const overflow: string[] = [];
    for (const tn of TENUES) {
      const user = await account(); // un abonnement, un projet
      const pid = await project(user);
      saveBrand(pid, tn.brand as any);
      for (const [i, f] of tn.photos.entries()) {
        const a = await saveAsset({ projectId: pid, userId: user.id, data: await F.photo(f, undefined, tn.dir), name: f.replace(".webp", ".jpg"), mime: "image/jpeg", role: "original", origin: "upload" });
        createProduct(pid, { title: tn.names[i], images: [{ assetId: a.id }], price: [14900, 3900, 1900][i], categories: [i < 2 ? "La gamme" : "Les accessoires"] } as any);
      }
      // Données de test du client : les emplacements « data-tn-… » (téléphone, adresse, horaires, zone, prestations,
      // livraison, retours) se jugent remplis ; la bibliothèque, elle, n'écrit jamais une coordonnée d'exemple.
      saveServices(pid, { ...loadProject(pid).services, services: [{ name: "Coupe et coiffage", price: "38 €", duration: "45 min" }, { name: "Couleur complète", price: "72 €", duration: "1 h 30" }, { name: "Balayage", price: "", duration: "" }] as any, phone: "04 72 00 00 00", address: "12 rue des Lilas, 69003 Lyon", hours: "Du mardi au vendredi 9 h – 19 h ; samedi 9 h – 17 h", area: "Lyon, Villeurbanne, Bron et Caluire" });
      saveCompany(pid, { shipping: "Colissimo, 48 h, 4,90 €", returns: "14 jours, emballage fermé" });
      let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
      t = S.applyStructure(t, [
        ...pages.flatMap((p) => [{ op: "page", key: p.key, label: p.key } as const, { op: "add", page: p.key, section: p.id, ...(p.construction ? { construction: p.construction } : {}) } as const]),
        { op: "shell", slot: "header", section: "tn-entete" }, { op: "shell", slot: "footer", section: "tn-pied" }, { op: "tenue", tenue: tn.tenue },
      ]);
      const html = renderCustomTheme(loadProject(pid), t, { embed: true });
      const views: ("téléphone" | "ordinateur")[] = process.env.TENUE_BUREAU ? ["téléphone", "ordinateur"] : ["téléphone"];
      for (const view of views) {
        const shots = await shootPages(html, pages.map((p) => p.key), { view, maxHeight: 2600 });
        expect(shots, "Chromium présent").not.toBeNull();
        for (const s of shots!) {
          fs.writeFileSync(path.join(out, `${s.key}__${tn.key}__${view === "téléphone" ? "tel" : "ordi"}.jpg`), s.data);
          if (s.overflow > 1) overflow.push(`${s.key} · tenue ${tn.key} · ${view} : dépasse de ${s.overflow} px`);
        }
      }
    }
    expect(overflow, "rien ne dépasse de l'écran en largeur").toEqual([]);
  }, 900_000);
});
