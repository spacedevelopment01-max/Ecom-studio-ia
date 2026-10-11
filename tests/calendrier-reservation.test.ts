/**
 * Calendrier de réservation (rendez-vous, salle, table) : lecture prudente des horaires du client, section ajoutée en
 * fin d'accueil d'un site de services en mode réservation, rendu complet (salles et capacités, personnes, options,
 * champs personnalisés, FR/EN) et ajout par le chat.
 */
import { describe, expect, it } from "vitest";
import { parseOpeningHours } from "@/lib/theme-v2/hours";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { localThemeCommand } from "@/lib/engine/local";
import { availableSectionTypes } from "@/lib/theme/spec";
import { runWithLang } from "@/lib/i18n-server";
import { serviceSpec } from "./fixtures";

describe("horaires du client lus pour le calendrier", () => {
  it("plage simple, pause, abréviations et anglais", () => {
    expect(parseOpeningHours("Du lundi au vendredi, 9 h – 18 h")).toEqual({ days: [1, 2, 3, 4, 5], open: "09:00", close: "18:00", breakStart: "", breakEnd: "" });
    expect(parseOpeningHours("Du mardi au samedi de 9h à 12h30 et de 14h à 19h")).toEqual({ days: [2, 3, 4, 5, 6], open: "09:00", close: "19:00", breakStart: "12:30", breakEnd: "14:00" });
    expect(parseOpeningHours("Mon–Fri 9am–6pm")?.days).toEqual([1, 2, 3, 4, 5]);
    expect(parseOpeningHours("Mon–Fri 9am–6pm")?.close).toBe("18:00");
    expect(parseOpeningHours("Lundi, mercredi et vendredi : 10:00 - 17:00")?.days).toEqual([1, 3, 5]);
  });

  it("rien n'est deviné : horaires absents, plusieurs groupes ou sans jours → null", () => {
    expect(parseOpeningHours(null)).toBeNull();
    expect(parseOpeningHours("Sur rendez-vous")).toBeNull();
    expect(parseOpeningHours("9h-18h")).toBeNull();
    expect(parseOpeningHours("Lundi-vendredi 9h-18h ; samedi 9h-12h")).toBeNull();
  });
});

describe("site de services en mode réservation", async () => {
  const { compose } = await import("@/lib/theme-v2/compose");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const { composeThemeV2 } = await import("@/lib/theme-v2/engine");
  const { createUser } = await import("@/lib/auth");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`calendrier-${Date.now()}@test.fr`, "motdepasse-test", "C");
  const hid = await seedThemeScenario(u.id, "hightech");
  const base = await fr(() => composeThemeV2(hid));
  const types = (t: { order: string[]; sections: Record<string, { type: string }> }) => t.order.map((k) => t.sections[k].type);
  const offers = ["Ostéopathie adulte", "Ostéopathie du sportif"].map((title) => ({ title, text: "Séance complète.", meta: "" }));
  const run = (hours: string | null, bookingUrl: string | null = null) =>
    fr(() => compose({ ...base.intent, site: "local_service" as const, conversion: "book" as const }, base.art, { ...base.content, offers, contact: { ...base.content.contact, hours, bookingUrl } }, null, null));

  it("horaires lisibles : le calendrier termine l'accueil, réglé sur les jours et horaires donnés, avec les prestations", () => {
    const spec = run("Du lundi au vendredi, 9 h – 12 h et 14 h – 18 h");
    const home = spec.templates.index;
    const list = types(home);
    expect(list[list.length - 1]).toBe("booking-calendar");
    expect(list).not.toContain("v2-cta");
    const sec = home.sections[home.order[home.order.length - 1]];
    expect(sec.settings).toMatchObject({ day_mon: true, day_fri: true, day_sat: false, day_sun: false, open_time: "09:00", close_time: "18:00", break_start: "12:00", break_end: "14:00" });
    const items = Object.values(sec.blocks ?? {}).filter((b) => b.type === "item").map((b) => b.settings.title);
    expect(items).toEqual(["Ostéopathie adulte", "Ostéopathie du sportif"]);
  });

  it("horaires absents ou lien de réservation en ligne : pas de calendrier inventé, le bouton reste", () => {
    expect(types(run(null).templates.index)).not.toContain("booking-calendar");
    expect(types(run("Sur rendez-vous").templates.index)).toContain("v2-cta");
    expect(types(run("Du lundi au vendredi, 9 h – 18 h", "https://reservation.exemple/rdv").templates.index)).not.toContain("booking-calendar");
  });
});

describe("rendu de la section", () => {
  const withCalendar = (lang: "fr" | "en") => {
    const spec = serviceSpec("atelier", lang);
    spec.templates.index.sections.cal = {
      type: "booking-calendar",
      settings: { heading: "Réserver une salle", kind: "room", day_mon: true, day_tue: true, day_wed: false, day_thu: true, day_fri: true, day_sat: true, day_sun: false, closed_dates: "2026-12-25\n2027-01-01", open_time: "08:30", close_time: "19:00", break_start: "", break_end: "", slot_minutes: 30, notice_days: 0, horizon_days: "60", durations: "1 heure\nDemi-journée\nJournée", ask_people: true, people_min: 2, people_max: 40, ask_phone: true, phone_required: true, ask_message: true, price_note: "", button_label: "Envoyer", note: "", color_scheme: "scheme-1", padding_top: 48, padding_bottom: 48 },
      blocks: {
        a: { type: "item", settings: { title: "Salle Atelier", text: "Lumineuse", capacity: 12, duration: "", price: "" } },
        b: { type: "item", settings: { title: "Grande salle", text: "", capacity: 40, duration: "", price: "" } },
        o: { type: "option", settings: { title: "Vidéoprojecteur", price: "" } },
        f: { type: "field", settings: { label: "Type d'événement", field_type: "select", choices: "Réunion\nFormation", required: true } },
      },
      block_order: ["a", "b", "o", "f"],
    } as never;
    spec.templates.index.order.push("cal");
    return spec;
  };
  const html = async (lang: "fr" | "en") => {
    const spec = withCalendar(lang);
    return (await runWithLang({ ui: lang, content: lang }, () => renderPage({ spec, base: "/p", files: compileTheme(spec), cart: [] }, "/", new URLSearchParams()))).html;
  };

  it("jours, horaires, fermetures, salles avec capacité, personnes, durées, options et champ personnalisé", async () => {
    const h = await html("fr");
    expect(h).toContain("data-booking-cal");
    expect(h).toContain('data-days="1,2,4,5,6,"');
    expect(h).toContain('data-open="08:30"');
    expect(h).toContain('data-slot="30"');
    expect(h).toContain('data-closed="2026-12-25,2027-01-01"');
    expect(h).toMatch(/data-capacity="12"[\s\S]*Salle Atelier/);
    expect(h).toContain("Choisissez votre salle");
    expect(h).toMatch(/type="number" name="contact\[Nombre de personnes\]" value="2" min="2" max="40"/);
    expect(h).toContain("Demi-journée");
    expect(h).toContain("Vidéoprojecteur");
    expect(h).toMatch(/<select name="contact\[Type d&#39;événement\]" required>|<select name="contact\[Type d'événement\]" required>/);
    expect(h).toMatch(/type="tel" name="contact\[phone\]" autocomplete="tel" required/);
    // Les champs natifs date / heure restent la source envoyée (et la solution sans JavaScript).
    expect(h).toMatch(/type="date" name="contact\[Date\]"/);
    expect(h).toMatch(/type="time" name="contact\[Horaire\]"[^>]*step="1800"/);
    expect(h).not.toMatch(/translation missing|Liquid error/i);
  });

  it("en anglais : libellés traduits", async () => {
    const h = await html("en");
    expect(h).toContain("Choose your room");
    expect(h).toContain("Number of people");
    expect(h).not.toMatch(/translation missing|Liquid error/i);
  });

  it("script du calendrier livré avec le thème", () => {
    const js = String(compileTheme(serviceSpec()).get("assets/theme.js"));
    expect(js).toContain("initBookingCal");
  });
});

describe("chat", () => {
  it("« ajoute un calendrier de réservation » ajoute la section, pour une boutique comme pour un site de services", () => {
    const spec = serviceSpec();
    expect(availableSectionTypes(spec)).toContain("booking-calendar");
    for (const business of ["services", "products"] as const) {
      const r = runWithLang({ ui: "fr", content: "fr" }, () => localThemeCommand(spec, "Ajoute un calendrier de réservation", null, business));
      expect(r.ops[0]).toMatchObject({ op: "add_section", type: "booking-calendar" });
    }
    const r = runWithLang({ ui: "fr", content: "fr" }, () => localThemeCommand(spec, "ajoute la réservation d'une salle", null, "services"));
    expect(r.ops[0]).toMatchObject({ op: "add_section", type: "booking-calendar" });
  });
});

describe("export WordPress", () => {
  const php = (() => { try { return require("node:child_process").spawnSync("php", ["-v"]).status === 0; } catch { return false; } })();
  it.skipIf(!php)("le calendrier rendu par le moteur PHP livré est identique à l'aperçu du studio", async () => {
    const { parity } = await import("../scripts/lib/cms-parity");
    const spec = serviceSpec();
    spec.templates.index.sections.cal = { type: "booking-calendar", settings: { heading: "Réserver", kind: "room", ask_people: true, people_min: 2, people_max: 30, durations: "1 heure\nJournée", closed_dates: "2026-12-25", slot_minutes: 30, horizon_days: "60" }, blocks: { a: { type: "item", settings: { title: "Salle A", capacity: 10 } }, o: { type: "option", settings: { title: "Café" } }, f: { type: "field", settings: { label: "Société", field_type: "text" } } }, block_order: ["a", "o", "f"] } as never;
    spec.templates.index.order = ["cal"]; // seule la section comparée
    const res = await runWithLang({ ui: "fr", content: "fr" }, () => parity(spec, ["index"]));
    const cal = res.filter((r) => r.type === "booking-calendar");
    expect(cal).toHaveLength(1);
    expect(cal[0].same).toBe(true);
  }, 180_000);
});

describe("WordPress : réception de la demande", () => {
  const php = (() => { try { return require("node:child_process").spawnSync("php", ["-v"]).status === 0; } catch { return false; } })();
  it.skipIf(!php)("salle, date, horaire, personnes et options sont gardés dans le message enregistré et l'e-mail", async () => {
    const fs = await import("node:fs");
    const { execFileSync } = await import("node:child_process");
    const src = fs.readFileSync("assets/cms/wordpress/es-theme.php", "utf8");
    const start = src.indexOf("function es_handle_form()");
    const fn = src.slice(start, src.indexOf("\n}\n", start) + 3);
    const stubs = `<?php
      $GLOBALS['opt'] = []; $GLOBALS['mail'] = null;
      function sanitize_key($s) { return strtolower(preg_replace('/[^a-z0-9_\\-]/i', '', $s)); }
      function wp_get_referer() { return '/'; } function home_url($p) { return $p; } function wp_unslash($v) { return $v; }
      function sanitize_email($s) { return trim($s); } function is_email($s) { return strpos($s, '@') !== false; }
      function sanitize_text_field($s) { return trim(strip_tags($s)); } function sanitize_textarea_field($s) { return trim(strip_tags($s)); }
      function current_time($t) { return '2026-10-11 10:00:00'; } function get_option($k, $d = null) { return $GLOBALS['opt'][$k] ?? $d; }
      function update_option($k, $v, $a = null) { $GLOBALS['opt'][$k] = $v; } function __($s, $d = null) { return $s; }
      function wp_mail($to, $sub, $body, $h = []) { $GLOBALS['mail'] = $body; } function add_query_arg($k, $v, $u) { return $u; }
      function get_bloginfo() { return ''; }
      function wp_safe_redirect($u) { throw new Exception('redirect'); }
      ${fn.replace(/^/, "")}
      $_POST = ['form_type' => 'contact', 'contact' => ['Demande' => 'Réserver une salle', 'Salle' => 'Grande salle', 'Date' => '2026-10-12', 'Horaire' => '11:00', 'Nombre de personnes' => '15', 'Option : Vidéoprojecteur' => 'Oui', 'name' => 'Test', 'email' => 't@exemple.fr', 'phone' => '', 'body' => 'Merci']];
      try { es_handle_form(); } catch (Exception $e) {}
      echo json_encode(['entry' => $GLOBALS['opt']['es_form_entries'][0]['body'] ?? null, 'mail' => $GLOBALS['mail']]);`;
    const out = JSON.parse(execFileSync("php", [], { input: stubs.replace(/\bexit;/g, "return;") }).toString());
    for (const text of [out.entry, out.mail]) {
      expect(text).toContain("Salle : Grande salle");
      expect(text).toContain("Date : 2026-10-12");
      expect(text).toContain("Horaire : 11:00");
      expect(text).toContain("Nombre de personnes : 15");
      expect(text).toContain("Option : Vidéoprojecteur : Oui");
      expect(text).toContain("Merci");
    }
  });
});
