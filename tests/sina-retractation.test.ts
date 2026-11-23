/**
 * « Renoncer au contrat ici » (directive 2023/2673, en vigueur depuis le 19 juin 2026) : le lien dans chaque pied de page
 * d'une boutique, la déclaration (nom, commande, e-mail), « Confirmer la rétractation », l'accusé daté et le marchand
 * prévenu. Aucun appel d'IA, aucun e-mail réel.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("la rétractation en ligne", async () => {
  const R = await import("@/lib/sites/retractation");
  const { all } = await import("@/lib/db");
  const { account, project } = await import("./conversation209-fixtures");
  const { POST } = await import("@/app/api/renoncer/[pid]/route");

  it("le lien se pose dans chaque pied de page, une seule fois", () => {
    const html = "<main>x</main><footer class=\"tn tn-pied\"><a>Contact</a></footer>";
    const avec = R.avecRetractation(html, "https://studio.exemple/renoncer/p1");
    expect(avec).toContain('<p class="tn-retractation" data-tn-retractation><a href="https://studio.exemple/renoncer/p1" rel="nofollow">Renoncer au contrat ici</a></p></footer>');
    expect(R.avecRetractation(avec, "https://studio.exemple/renoncer/p1")).toBe(avec);
    expect(R.retractationUrl("p 1")).toMatch(/\/renoncer\/p%201$/);
  });

  it("la déclaration demande le nom, la commande et l'e-mail ; l'accusé dit le contenu, la date et l'heure", () => {
    expect(R.declarationValide({ nom: "", commande: "1001", email: "a@b.fr" })).toMatch(/nom/);
    expect(R.declarationValide({ nom: "Léa", commande: "", email: "a@b.fr" })).toMatch(/commande/);
    expect(R.declarationValide({ nom: "Léa", commande: "1001", email: "pas-une-adresse" })).toMatch(/e-mail/);
    expect(R.declarationValide({ nom: "Léa", commande: "1001", email: "lea@exemple.fr" })).toBeNull();
    const t = R.texteAccuse("Atelier Brume", { nom: "Léa Martin", commande: "#1001", email: "lea@exemple.fr" }, Date.UTC(2026, 10, 22, 9, 30));
    expect(t).toContain("reçue le 22 novembre 2026 à 10:30");
    expect(t).toContain("- Nom : Léa Martin\n- Commande : #1001\n- Adresse e-mail : lea@exemple.fr");
  });

  it("« Confirmer la rétractation » : enregistrée, marchand prévenu ; sans envoi d'e-mails, il est averti d'envoyer l'accusé", async () => {
    const u = await account(), pid = project(u) as string;
    const form = new FormData();
    form.set("nom", "Léa Martin"); form.set("commande", "#1001"); form.set("email", "lea@exemple.fr");
    const res = await POST(new Request(`http://x/api/renoncer/${pid}`, { method: "POST", body: form }), { params: Promise.resolve({ pid }) });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(new RegExp(`^/renoncer/${pid}\\?recu=\\d+&accuse=0$`));
    const rows = R.retractationsDuProjet(pid);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ nom: "Léa Martin", commande: "#1001", email: "lea@exemple.fr", accuse_at: null, accuse_erreur: "envoi des e-mails non configuré" });
    const n = all<{ title: string; body: string; level: string }>("SELECT title, body, level FROM notifications WHERE project_id=? ORDER BY created_at DESC", pid)[0];
    expect(n.title).toBe("Une rétractation vient d'arriver");
    expect(n.body).toMatch(/l'accusé de réception n'a pas pu partir ; envoie-le toi-même/);
    // Le champ piège : rien n'est enregistré.
    const bot = new FormData(); bot.set("site_web", "spam"); bot.set("nom", "x"); bot.set("commande", "y"); bot.set("email", "z@z.fr");
    await POST(new Request(`http://x/api/renoncer/${pid}`, { method: "POST", body: bot }), { params: Promise.resolve({ pid }) });
    expect(R.retractationsDuProjet(pid)).toHaveLength(1);
  });

  it("le site de SINA et la boutique Shopify portent le lien (boutiques seulement)", () => {
    const render = fs.readFileSync("src/lib/syna-agent/custom-theme/render.ts", "utf8");
    expect(render).toContain('const retractation = (html: string) => (p.business === "services" ? html : avecRetractation(html, retractationUrl(p.id)));');
    expect(render).toContain("return retractation(`<!doctype html>");
    expect(fs.readFileSync("src/lib/syna-agent/custom-theme/install.ts", "utf8")).toContain('if (business === "products") for (const s of Object.values(out.spec.customSections)) if (s.liquid.includes("</footer>")) s.liquid = avecRetractation(s.liquid, retractationUrl(projectId));');
  });
});
