import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { emptyProduct, emptyServiceProfile } from "@/lib/project-types";
import { withContentLang } from "@/lib/i18n-server";

/** Projet de services de test (kiné) : seule l'offre saisie par le client sert aux textes. */
function project(over: Record<string, any> = {}): any {
  return {
    id: "p",
    userId: "u",
    name: "Ondine",
    business: "services",
    product: { ...emptyProduct(), name: "Cabinet Ondine", category: "Kinésithérapie", summary: "Cabinet de kinésithérapie à Lyon 3e, sur rendez-vous." },
    brand: { name: "Ondine", tagline: "Retrouver le plaisir de bouger.", story: "", palette: { primary: "#2F5D62", secondary: "#A7C4BC", accent: "#E0A458", light: "#F4F1EA", dark: "#14201F" } },
    services: {
      ...emptyServiceProfile(),
      services: [
        { name: "Rééducation du dos", description: "Bilan et exercices guidés.", duration: "45 min" },
        { name: "Kinésithérapie du sport", description: "Reprise progressive après une blessure." },
      ],
      area: "Lyon 3e",
      phone: "04 78 00 00 00",
      hours: "Lun–Ven 8 h–19 h",
      bookingUrl: "https://www.doctolib.fr/ondine",
      contactMode: "booking",
    },
    ...over,
  };
}

/** Termes de boutique qui n'ont rien à faire dans les visuels d'une entreprise de services. */
const SHOP_WORDS = /packshot|détour|panier|livraison|acheter|commander|add to cart|shop now|buy|cutout/i;
/** Allégations inventées interdites (avis, notes, chiffres de clients, diplômes…). */
const FAKE = /avis|★|\d+\s?%|clients? satisfaits|happy customers|diplôm|certifi|n°\s?1|meilleur|best/i;

describe("visuels d'une entreprise de services", () => {
  it("jeu complet : bannières, réseaux, publicités, textes tirés de l'offre réelle, sans packshot ni faux chiffres", async () => {
    const { serviceCardPlan } = await import("@/lib/engine/service-media");
    const plan = serviceCardPlan(project(), 0);
    const templates = plan.map((x) => x.card.template);
    expect(templates).toEqual(expect.arrayContaining(["services", "announce", "carousel-cover", "carousel-slide", "carousel-end", "quote", "info", "booking", "graphic"]));
    expect(plan.filter((x) => x.role === "ad").map((x) => x.card.format).sort()).toEqual(["landscape", "square", "story"]);
    // Sans photo : aucune carte ne référence d'image.
    expect(plan.every((x) => x.card.photo === undefined)).toBe(true);
    // La bannière d'ouverture (sans texte) est enregistrée en dernier : c'est elle que le site choisit.
    expect(plan.at(-1)!.card.template).toBe("graphic");
    const text = JSON.stringify(plan.map((x) => x.card));
    expect(text).not.toMatch(SHOP_WORDS);
    expect(text).not.toMatch(FAKE);
    expect(text).toContain("Prenez rendez-vous");
    expect(text).toContain("Rééducation du dos");
    expect(text).toContain("45 min");
    // La citation est attribuée à la marque, jamais à un client.
    const quote = plan.find((x) => x.card.template === "quote")!;
    expect(quote.card.author).toBe("— Ondine");
    // Le tarif n'apparaît que s'il est donné.
    expect(text).not.toMatch(/€/);
  });

  it("avec photos : les cartes se répartissent les photos réelles ; appel à l'action selon le mode de contact", async () => {
    const { serviceCardPlan, serviceCta } = await import("@/lib/engine/service-media");
    const p = project({ services: { ...project().services, contactMode: "quote" } });
    const plan = serviceCardPlan(p, 2);
    expect(plan.filter((x) => x.card.photo !== undefined).length).toBeGreaterThan(4);
    expect(plan.every((x) => x.card.photo === undefined || x.card.photo < 2)).toBe(true);
    expect(serviceCta(p)).toBe("Demandez votre devis");
    const story = plan.find((x) => x.card.format === "story")!;
    expect(story.card.eyebrow).toBe("Sur devis");
    expect(JSON.stringify(plan.map((x) => [x.card.cta, x.card.title, x.card.eyebrow]))).not.toContain("rendez-vous");
  });

  it("aucune ligne d'infos pratiques inventée ; sans infos, pas de visuel « horaires »", async () => {
    const { serviceCardPlan, infoRows } = await import("@/lib/engine/service-media");
    const bare = project({ services: { ...emptyServiceProfile(), services: [] }, brand: { name: "Ondine", tagline: "", story: "" } });
    expect(infoRows(bare)).toEqual([]);
    const plan = serviceCardPlan(bare, 0);
    expect(plan.some((x) => x.card.template === "info")).toBe(false);
    expect(plan.some((x) => x.card.template === "quote")).toBe(false);
    // Pas de prestation : l'annonce présente l'activité (résumé réel), pas de carrousel vide.
    expect(plan.some((x) => x.card.template.startsWith("carousel"))).toBe(false);
    expect(plan.find((x) => x.card.template === "announce")!.card.text).toContain("kinésithérapie");
  });

  it("en anglais : textes des visuels entièrement en anglais", async () => {
    const { serviceCardPlan } = await import("@/lib/engine/service-media");
    const text = withContentLang("en", () => JSON.stringify(serviceCardPlan(project({ services: { ...project().services, services: [{ name: "Back care", description: "Assessment and guided exercises.", duration: "45 min" }], hours: "Mon–Fri 8am–7pm", area: "Lyon" } }), 0).map((x) => [x.card.eyebrow, x.card.title, x.card.cta, x.card.swipe, x.card.rows])));
    expect(text).toContain("Book an appointment");
    expect(text).toContain("Our services");
    expect(text).not.toMatch(/\b(Prenez|Nos prestations|Faites glisser|Horaires|Zone :)\b/);
  });

  it("conseils saisis par le client : « Titre : texte », quatre au plus", async () => {
    const { parseTips } = await import("@/lib/engine/service-media");
    const tips = parseTips(["Bouger chaque jour : la marche compte aussi.", "", "Varier les positions", "a", "b", "c"]);
    expect(tips).toHaveLength(4);
    expect(tips[0]).toEqual({ title: "Bouger chaque jour", text: "La marche compte aussi." });
    expect(tips[1].title).toBe("Varier les positions");
  });

  it("pas de détourage pour un service", async () => {
    const { ensureCutouts } = await import("@/lib/engine/images");
    expect(await ensureCutouts(null, project())).toEqual([]);
  });

  it("repli sans navigateur : visuel composé sur toile au bon format", async () => {
    const { renderServiceCard, FORMATS } = await import("@/lib/media/compose");
    const p = project();
    const jpg = await renderServiceCard({ palette: p.brand.palette, typo: { heading: "Inter", body: "Inter" }, format: FORMATS.story, brand: "Ondine", eyebrow: "Prestation", title: "Rééducation du dos", text: "Bilan et exercices guidés.", lines: ["45 min"], cta: "Réserver" });
    const m = await sharp(jpg).metadata();
    expect([m.format, m.width, m.height]).toEqual(["jpeg", 1080, 1920]);
  });
});

describe("vidéos d'une entreprise de services", () => {
  it("découpage : ouverture, prestations, infos pratiques, appel à prendre rendez-vous — aucun plan produit", async () => {
    const { localServiceVideoPlan } = await import("@/lib/engine/service-media");
    const { checkVideoSpec, sceneText } = await import("@/lib/media/video");
    for (const n of [0, 2]) {
      const spec = localServiceVideoPlan(project(), "9:16", n);
      const kinds = spec.scenes.map((s) => s.kind);
      expect(kinds[0]).toBe(n ? "hook" : "title");
      expect(kinds).toContain("list");
      expect(kinds).toContain("info");
      expect(kinds.at(-1)).toBe("end");
      expect(kinds.some((k) => ["reveal", "spotlight", "callouts", "split"].includes(k))).toBe(false);
      expect(checkVideoSpec(spec)).toEqual([]);
      const all = spec.scenes.map(sceneText).join(" ");
      expect(all).toContain("Rééducation du dos · 45 min");
      expect(all).toContain("Prenez rendez-vous");
      expect(all).not.toMatch(FAKE);
      if (n) expect(spec.scenes.every((s) => !("image" in s) || (s as any).image < n)).toBe(true);
    }
  });

  it("rendu sans produit : MP4 H.264 en typographie animée", async () => {
    const { renderVideo } = await import("@/lib/media/video");
    const p = project();
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "svc-video-")), "v.mp4");
    const spec = { format: "1:1" as const, fps: 8, transition: "fade" as const, music: "none" as const, captions: true, scenes: [
      { kind: "list" as const, duration: 1.6, heading: "Nos prestations", items: ["Rééducation du dos · 45 min", "Kinésithérapie du sport"] },
      { kind: "info" as const, duration: 1.6, heading: "Infos pratiques", rows: [{ icon: "clock" as const, text: "Lun–Ven 8 h–19 h" }, { icon: "pin" as const, text: "Lyon 3e" }] },
      { kind: "end" as const, duration: 1.6, headline: "Ondine", cta: "Prenez rendez-vous" },
    ] };
    const r = await renderVideo(spec, { product: null, images: [], clips: [], logo: null, palette: p.brand.palette, typo: { heading: "Inter", body: "Inter" }, brand: "Ondine" }, out);
    expect(r.width).toBe(1080);
    expect(fs.statSync(out).size).toBeGreaterThan(10_000);
  });
});

describe("présentation face caméra (UGC) pour un service", () => {
  it("script local : présentation à la troisième personne, conforme aux règles, FR et EN", async () => {
    const { localUgcScript, serviceUgcIssues, beatPrompt } = await import("@/lib/engine/ugc");
    const { ugcIssues } = await import("@/lib/ugc-rules");
    const o = { format: "9:16" as const, beats: 4, presenter: "femme", age: "35-50", setting: "activite", tone: "naturel", angle: "presentation" };
    const fr = localUgcScript(project(), o);
    expect(fr.beats).toHaveLength(4);
    expect(fr.beats[0].line).toContain("Voici Ondine");
    expect(fr.beats[3].line).toContain("Prenez rendez-vous");
    expect(fr.persona).toContain("not a customer");
    expect(fr.setting).toContain("typical of this business");
    expect(ugcIssues(fr)).toEqual([]);
    expect(serviceUgcIssues(fr)).toEqual([]);
    // Aucun produit en main dans les consignes de tournage.
    const prompt = beatPrompt(fr, 0, o, true, "service");
    expect(prompt).not.toMatch(/product/i);
    expect(prompt).toContain("no diploma");
    const en = withContentLang("en", () => localUgcScript(project(), o));
    const text = en.beats.map((b) => b.line).join(" ");
    expect(text).toContain("Meet Ondine");
    expect(text).not.toMatch(/\b(voici|prenez|programme)\b/i);
    expect(ugcIssues(en, "en")).toEqual([]);
  });

  it("refuse une personne générée qui se dirait cliente ou se ferait passer pour le professionnel", async () => {
    const { serviceUgcIssues } = await import("@/lib/engine/ugc");
    for (const line of ["J'ai fait appel à eux pour mon dos.", "Mon kiné est génial.", "Je m'appelle Claire, je suis la fondatrice.", "I booked a session last week.", "My name is Claire and I'm the owner."]) {
      expect(serviceUgcIssues({ beats: [{ line, caption: line, action: "x" }] }), line).toHaveLength(1);
    }
    expect(serviceUgcIssues({ beats: [{ line: "Voici Ondine, cabinet de kinésithérapie à Lyon.", caption: "", action: "x" }] })).toEqual([]);
  });
});
