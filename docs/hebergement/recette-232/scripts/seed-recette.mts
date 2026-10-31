// Recette #232 : données FICTIVES de l'instance isolée (aucune donnée réelle). Comptes, abonnements et trois sites de
// services composés par le studio dans des thèmes existants ; les textes « à compléter » sont renseignés comme le ferait
// le client, sauf la page légale du premier site, laissée à rédiger dans l'interface pour montrer le blocage.
const W = process.cwd();
const fs = await import("node:fs");
process.env.STOCK_OFFLINE = "1";
globalThis.fetch = async () => { throw new Error("réseau interdit"); };
const { payingUser, completeSite, fictiveContact } = await import(W + "/tests/sites-fixtures.ts");
const { seedHoldout } = await import(W + "/tests/lot1-holdout-fixtures.ts");
const { composeShop } = await import(W + "/src/lib/engine/shop.ts");
const { saveThemeVersion, saveBrand, loadProject } = await import(W + "/src/lib/projects.ts");
const { run } = await import(W + "/src/lib/db.ts");
const { runWithLang } = await import(W + "/src/lib/i18n-server.ts");
const { hashPassword } = await import(W + "/src/lib/password.ts").catch(() => ({ hashPassword: null }));
const out: Record<string, unknown> = {};
await runWithLang({ content: "fr", ui: "fr" }, async () => {
  const owner = await payingUser("proprio");
  const foreign = await payingUser("etranger");
  for (const [u, email] of [[owner, "proprio@recette.invalid"], [foreign, "etranger@recette.invalid"]] as const) run("UPDATE users SET email = ? WHERE id = ?", email, u.id);
  out.owner = owner.id; out.foreign = foreign.id;
  const sites = [
    { key: "artisan", name: "Atelier Clé de Fa", holdout: 2, direction: "aplat", keepLegal: true },
    { key: "reservation", name: "Cabinet Souffle", holdout: 3, direction: "parenthese", keepLegal: false },
    { key: "agence", name: "Agence Horizon Conseil", holdout: 2, direction: "rive", keepLegal: false },
  ];
  for (const s of sites) {
    const pid = seedHoldout(owner.id, s.holdout, s.name);
    run("UPDATE projects SET name = ? WHERE id = ?", s.name, pid);
    fictiveContact(pid);
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: s.name, direction: s.direction });
    const { spec } = await composeShop(pid, s.direction as any, null, false);
    const full = completeSite(spec, s.name);
    if (s.keepLegal) full.store.policies = full.store.policies.map((x) => (x.handle === "legal-notice" ? spec.store.policies.find((o) => o.handle === "legal-notice")! : x));
    saveThemeVersion(pid, full, `Site fictif de recette (${s.name})`, "user");
    out[s.key] = pid;
  }
});
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
