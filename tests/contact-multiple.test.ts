/** Plusieurs façons de contacter : la première cochée reste le bouton principal, les autres sont proposées aussi. */
import { describe, expect, it } from "vitest";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { contactModesOf } from "@/lib/project-types";
import { mergeServiceProfile } from "@/lib/engine/local";
import { serviceProfile, serviceSpec } from "./fixtures";

const visible = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("plusieurs façons de contacter", () => {
  it("liste ordonnée, principale en premier, sans doublon ; anciens projets inchangés", () => {
    expect(contactModesOf({ contactMode: "quote", contactModes: ["quote", "call", "call", "booking"] })).toEqual(["quote", "call", "booking"]);
    expect(contactModesOf({ contactMode: "call" })).toEqual(["call"]);
    expect(contactModesOf({ contactMode: "form", contactModes: ["nope" as never, "call"] })).toEqual(["form", "call"]);
  });

  it("le choix du client est gardé après l'analyse (jamais remplacé par une détection)", () => {
    const user = { ...serviceProfile, contactMode: "form" as const, contactModes: ["form" as const, "call" as const] };
    const merged = mergeServiceProfile(user, { contactMode: "booking" });
    expect(merged.contactMode).toBe("form");
    expect(merged.contactModes).toEqual(["form", "call"]);
    // Formulaire seul (valeur par défaut) : la détection peut proposer mieux, le formulaire reste accepté.
    const auto = mergeServiceProfile({ ...serviceProfile, contactMode: "form", contactModes: ["form"] }, { contactMode: "booking" });
    expect(auto.contactModes).toEqual(["booking", "form"]);
  });

  it("site : bouton principal = devis, réservation en ligne et appel proposés aussi", async () => {
    const sv = { ...serviceProfile, contactMode: "quote" as const, contactModes: ["quote", "booking", "call"] } as unknown as typeof serviceProfile;
    const spec = serviceSpec("atelier", "fr", sv);
    const files = compileTheme(spec);
    const home = visible((await renderPage({ spec, base: "/p", files, cart: [] }, "/", new URLSearchParams())).html);
    expect(home).toContain("Demander un devis");
    const contact = await renderPage({ spec, base: "/p", files, cart: [] }, "/pages/contact", new URLSearchParams());
    expect(contact.html).toContain("calendly.com/cabinet-ondine");
    const text = visible(contact.html);
    expect(text).toContain("Vous pouvez aussi réserver un créneau en ligne.");
    expect(text).toContain("Vous pouvez aussi nous appeler au 04 72 00 00 00.");
  });

  it("un seul mode : textes identiques à avant (pas de phrase en plus)", async () => {
    const spec = serviceSpec("atelier", "fr", { ...serviceProfile, contactMode: "quote" });
    const files = compileTheme(spec);
    const text = visible((await renderPage({ spec, base: "/p", files, cart: [] }, "/pages/contact", new URLSearchParams())).html);
    expect(text).not.toContain("Vous pouvez aussi");
  });
});
