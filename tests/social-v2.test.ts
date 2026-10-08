/**
 * Social Engine V2 (phase 9A) — briques gratuites : intention, dates et fuseaux, 1 à 5 publications par jour,
 * stratégies par activité, adaptateurs de réseaux, rédaction locale sans invention, variété, barrière sociale,
 * approbation par version, retouches en conversation, routage.
 */
import { describe, expect, it } from "vitest";

describe("Social V2 — briques locales", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { parseSocialAsk } = await import("@/lib/social-v2/intent");
  const { publishingDates, atZoned, planSlots, weightedSequence } = await import("@/lib/social-v2/planner");
  const { socialStrategy, archetypeOf } = await import("@/lib/social-v2/strategy");
  const { adaptForPlatform, frequencyWarnings, nativeFormatFor, PLATFORM_SPECS } = await import("@/lib/social-v2/platforms");
  const { writeLocal } = await import("@/lib/social-v2/copy");
  const { contentHash, approvalValid } = await import("@/lib/social-v2/approval");
  const { moveToWeekday } = await import("@/lib/social-v2/local-edit");
  const { verifiedFacts } = await import("@/lib/seo-v2/facts");
  const { lintClaims } = await import("@/lib/ai/tasks");
  const { routeLlm } = await import("@/lib/ai/llm");
  const { POLICIES } = await import("@/lib/quality/policies");
  const { formatInTimeZone } = await import("date-fns-tz");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`soc2-${Date.now()}@test.fr`, "motdepasse-test", "S");
  const proj = (k: Parameters<typeof seedImageFixture>[1]) => loadProject(seedImageFixture(u.id, k));

  it("intention : la demande complète du client est comprise (30 jours, 3 par jour, images, vidéos, textes, programmer)", () => {
    const a = parseSocialAsk("Prépare mes publications pour les 30 prochains jours, avec 3 publications par jour, des images, des vidéos et des textes, puis programme-les sur mes comptes connectés.");
    expect(a).toMatchObject({ days: 30, perDay: 3, schedule: true });
    expect(a.formatMix).toEqual({ image: 1, video: 1, text: 1 });
    expect(parseSocialAsk("Deux semaines, 2 publications par jour sur instagram et tiktok")).toMatchObject({ days: 14, perDay: 2, platforms: ["instagram", "tiktok"] });
    const too = parseSocialAsk("8 publications par jour pendant 10 jours");
    expect(too.perDay).toBe(5);
    expect(too.notes.join(" ")).toMatch(/limité à 5/);
  });

  it("dates : période, jours de la semaine, jours exclus ; heure locale exacte (heure d'été) dans le fuseau du client", () => {
    expect(publishingDates({ startDate: "2026-11-02", days: 7 })).toHaveLength(7);
    const weekdays = publishingDates({ startDate: "2026-11-02", endDate: "2026-11-15", weekdays: [1, 3, 5], exclude: ["2026-11-11"] });
    expect(weekdays).toEqual(["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-09", "2026-11-13"]);
    expect(() => publishingDates({ startDate: "2026-11-10", endDate: "2026-11-01" })).toThrow();
    // Passage à l'heure d'été (29 mars 2026, Paris) : 10:00 locale = 08:00 UTC ; la veille = 09:00 UTC.
    expect(new Date(atZoned("2026-03-29", "10:00", "Europe/Paris")).toISOString()).toBe("2026-03-29T08:00:00.000Z");
    expect(new Date(atZoned("2026-03-28", "10:00", "Europe/Paris")).toISOString()).toBe("2026-03-28T09:00:00.000Z");
    expect(new Date(atZoned("2026-11-02", "18:30", "America/New_York")).toISOString()).toBe("2026-11-02T23:30:00.000Z");
  });

  it("1 à 5 publications par jour : nombre exact, créneaux triés, réseaux à tour de rôle ou tous, piliers sans répétition consécutive", () => {
    const p = proj("cosmetic");
    const strategy = fr(() => socialStrategy(p));
    for (const perDay of [1, 2, 3, 4, 5]) {
      const { slots } = planSlots({ startDate: "2026-11-02", days: 10, perDay, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }, { platform: "facebook" }] }, strategy);
      expect(slots).toHaveLength(10 * perDay);
      const firstDay = slots.filter((s) => s.ymd === "2026-11-02").map((s) => s.time);
      expect(firstDay).toEqual([...firstDay].sort());
      for (let i = 1; i < slots.length; i++) expect(slots[i].pillar.id === slots[i - 1].pillar.id).toBe(false);
    }
    const all = planSlots({ startDate: "2026-11-02", days: 3, perDay: 2, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }, { platform: "facebook" }], distribution: "all" }, strategy).slots;
    expect(all).toHaveLength(12);
    expect(new Set(all.map((s) => s.groupId)).size).toBe(6);
    // Thème prioritaire : plus présent.
    const base = planSlots({ startDate: "2026-11-02", days: 20, perDay: 2, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }] }, strategy).slots.filter((s) => s.pillar.id === "achat").length;
    const prio = planSlots({ startDate: "2026-11-02", days: 20, perDay: 2, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], priority: ["achat"] }, strategy).slots.filter((s) => s.pillar.id === "achat").length;
    expect(prio).toBeGreaterThan(base);
    // Répartition des formats demandée (vidéos) respectée.
    const mixed = planSlots({ startDate: "2026-11-02", days: 10, perDay: 2, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], formatMix: { video: 50, image: 50 } }, strategy).slots;
    expect(mixed.filter((s) => s.format === "reel").length).toBe(10);
    expect(weightedSequence([{ item: "a", weight: 3 }, { item: "b", weight: 1 }], 8, false).filter((x) => x === "a")).toHaveLength(6);
  });

  it("stratégie : un artisan, une marque cosmétique, un high-tech, un restaurant et un SaaS ont des piliers et appels à l'action différents", () => {
    const ps = { artisan: proj("artisan"), cosmetic: proj("cosmetic"), hightech: proj("hightech"), restaurant: proj("restaurant"), saas: proj("saas") };
    expect(Object.fromEntries(Object.entries(ps).map(([k, p]) => [k, archetypeOf(p)]))).toEqual({ artisan: "trade", cosmetic: "beauty", hightech: "tech", restaurant: "restaurant", saas: "saas" });
    const s = Object.fromEntries(Object.entries(ps).map(([k, p]) => [k, fr(() => socialStrategy(p, { startDate: "2026-11-02", days: 30 }))]));
    const ids = Object.values(s).map((x) => x.pillars.map((y) => y.id).join(","));
    expect(new Set(ids).size).toBe(5);
    expect(s.artisan.ctas[0]).toMatch(/devis/);
    expect(s.restaurant.ctas[0]).toMatch(/Réserver/);
    expect(s.saas.ctas[0]).toMatch(/Essayer/);
    expect(s.restaurant.gaps.join(" ")).toMatch(/événements confirmés/);
    expect(s.artisan.gaps.join(" ")).toMatch(/aucune réalisation ne sera inventée/);
    expect(s.artisan.objectives.join(" ")).toMatch(/Mâcon/);
  });

  it("adaptateurs : lien non cliquable → « lien en bio », hashtags limités, format natif, légende raccourcie ; LinkedIn = export ; limites de fréquence signalées", () => {
    const ig = adaptForPlatform("instagram", { caption: "Notre sérum.\n\nhttps://boutique.test/serum", title: "Sérum", hashtags: ["a", "b", "c", "d", "e", "f", "g"], link: "https://boutique.test/serum", format: "text", mediaCount: 1 });
    expect(ig.caption).not.toContain("https://");
    expect(ig.caption).toMatch(/Lien en bio\./);
    expect(ig.link).toBeNull();
    expect(ig.hashtags).toHaveLength(5);
    expect(ig.format).toBe("image");
    const fb = adaptForPlatform("facebook", { caption: "x", title: "t", hashtags: [], link: "https://boutique.test", format: "text", mediaCount: 0 });
    expect(fb.link).toBe("https://boutique.test");
    expect(nativeFormatFor("tiktok", "image")).toBe("video");
    expect(nativeFormatFor("youtube", "video")).toBe("short");
    const long = adaptForPlatform("tiktok", { caption: `${"Phrase complète. ".repeat(40)}`, title: "t", hashtags: [], link: null, format: "video", mediaCount: 1 });
    expect(long.caption.length).toBeLessThanOrEqual(PLATFORM_SPECS.tiktok.captionMax);
    expect(long.caption.endsWith(".")).toBe(true);
    expect(PLATFORM_SPECS.linkedin.level).toBe("export");
    expect(PLATFORM_SPECS.instagram.level).toBe("ready_to_connect");
    expect(frequencyWarnings({ tiktok: 6, youtube: 7, instagram: 3 }).join(" ")).toMatch(/TikTok.*YouTube/);
  });

  it("rédaction locale : aucune affirmation inventée, aucune accroche répétée sur 60 publications, inconnues marquées", () => {
    for (const k of ["artisan", "cosmetic", "hightech", "restaurant", "saas"] as const) {
      const p = proj(k);
      const f = verifiedFacts(p);
      const s = fr(() => socialStrategy(p));
      const used = new Set<string>();
      const hooks: string[] = [];
      for (let i = 0; i < 60; i++) {
        const pillar = s.pillars[i % s.pillars.length];
        const d = fr(() => writeLocal({ pillar, archetype: s.archetype, f, questions: ["comment choisir", "combien de temps"], n: Math.floor(i / s.pillars.length), lang: "fr", cta: s.ctas[0], used }));
        expect(fr(() => lintClaims(`${d.title}\n${d.caption}`, p)), `${k} ${d.caption}`).toEqual([]);
        const h = d.caption.split("\n")[0];
        if (!/\[À compléter/.test(h)) hooks.push(h);
      }
      expect(new Set(hooks).size).toBe(hooks.length);
    }
  });

  it("approbation par version : l'empreinte couvre texte et médias, pas la date ; une version modifiée n'est plus approuvée", () => {
    const row = { network: "instagram", format: "image", title: "T", caption: "C", hashtags: "a b", link: null, media: '["m1"]' };
    const h = contentHash(row);
    expect(contentHash({ ...row })).toBe(h);
    expect(contentHash({ ...row, caption: "C2" })).not.toBe(h);
    expect(contentHash({ ...row, media: '["m2"]' })).not.toBe(h);
    expect(contentHash({ ...row, media: '["m1","m2"]' })).not.toBe(contentHash({ ...row, media: '["m2","m1"]' }));
    expect(approvalValid({ ...row, engine: "v2", approved_hash: h })).toBe(true);
    expect(approvalValid({ ...row, caption: "changé", engine: "v2", approved_hash: h })).toBe(false);
    expect(approvalValid({ ...row, engine: "v1", approved_hash: null })).toBe(true);
  });

  it("déplacement au jour voulu : même heure locale, même semaine, heure d'été respectée", () => {
    const at = atZoned("2026-03-25", "18:30", "Europe/Paris"); // mercredi
    const fri = moveToWeekday(at, "Europe/Paris", 5);
    expect(formatInTimeZone(fri, "Europe/Paris", "yyyy-MM-dd HH:mm EEE")).toBe("2026-03-27 18:30 Fri");
    const mon = moveToWeekday(atZoned("2026-03-31", "10:00", "Europe/Paris"), "Europe/Paris", 1);
    expect(formatInTimeZone(mon, "Europe/Paris", "yyyy-MM-dd HH:mm")).toBe("2026-03-30 10:00");
  });

  it("politique social_post_v2 et routage : défauts bloquants listés ; réécriture sociale au niveau standard", () => {
    expect(POLICIES.social_post_v2.blocking).toEqual(expect.arrayContaining(["invented_claim", "media_rejected", "incomplete", "duplicate_hook", "rights_unknown"]));
    expect(POLICIES.social_post_v2.finalCheckers).toEqual(["ai", "human"]);
    expect(routeLlm({ task: "social_copy" }).tier).toBe("standard");
  });
});
