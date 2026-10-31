/**
 * SYNA lot 1 bis (#282) : réglages d'affichage enregistrés sur le serveur (compte, exception par projet), droits entre
 * comptes, validation, retour aux valeurs par défaut ; commandes d'affichage reconnues sur place, sans IA.
 */
import { describe, expect, it, vi } from "vitest";

const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }), headers: async () => new Headers() }));

import { parseSynaUiCommand, nextConvoWidth } from "@/lib/syna-ui/ui-commands";

async function setup() {
  const { createUser } = await import("@/lib/auth");
  const { run, id } = await import("@/lib/db");
  const { sha256 } = await import("@/lib/secrets");
  const t = Date.now() + Math.random().toString(36).slice(2, 6);
  const a = await createUser(`prefs-a${t}@test.fr`, "motdepasse-test", "A");
  const b = await createUser(`prefs-b${t}@test.fr`, "motdepasse-test", "B");
  for (const [u, tok] of [[a, `tok-a-${t}`], [b, `tok-b-${t}`]] as const) run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(tok), u.id, Date.now() + 3600_000, Date.now());
  const project = (uid: string) => {
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, status, created_at, updated_at) VALUES (?,?,?,?,?,?)", pid, uid, "Projet prefs", "draft", Date.now(), Date.now());
    return pid;
  };
  return { a, b, tokA: `tok-a-${t}`, tokB: `tok-b-${t}`, pa: project(a.id), pa2: project(a.id), pb: project(b.id) };
}
const route = async () => await import("@/app/api/studio/ui-prefs/route");
const req = (method: string, path: string, body?: unknown) => new Request(`http://x${path}`, { method, body: body ? JSON.stringify(body) : undefined, headers: body ? { "Content-Type": "application/json" } : undefined });

describe("réglages enregistrés sur le serveur", () => {
  it("compte : enregistrés, relus, validés ; une valeur inconnue est ignorée ; défauts Encre", async () => {
    const s = await setup();
    const { GET, PUT } = await route();
    jar.token = s.tokA;
    const first = await (await GET(req("GET", `/api/studio/ui-prefs?projectId=${s.pa}`))).json();
    expect(first.resolved).toMatchObject({ mode: "encre", appearance: "auto", accent: "encre", convoWidth: 440, panel: "pinned" });
    const put = await PUT(req("PUT", "/api/studio/ui-prefs", { scope: "account", projectId: s.pa, prefs: { mode: "plein", accent: "prusse", convoWidth: 999, density: "rose", hack: "<script>" } }));
    expect(put.status).toBe(200);
    const v = await put.json();
    expect(v.account).toEqual({ mode: "plein", accent: "prusse", convoWidth: 560 });
    expect(v.resolved).toMatchObject({ mode: "plein", accent: "prusse", convoWidth: 560, density: "comfortable" });
    // Un autre projet du même compte (autre appareil, autre session) retrouve le réglage du compte.
    const other = await (await GET(req("GET", `/api/studio/ui-prefs?projectId=${s.pa2}`))).json();
    expect(other.resolved.mode).toBe("plein");
    expect(other.project).toBeNull();
  });

  it("exception par projet : prioritaire sur le compte, n'affecte que ce projet, se retire", async () => {
    const s = await setup();
    const { GET, PUT } = await route();
    jar.token = s.tokA;
    await PUT(req("PUT", "/api/studio/ui-prefs", { scope: "account", projectId: s.pa, prefs: { mode: "plein", appearance: "dark" } }));
    const proj = await (await PUT(req("PUT", "/api/studio/ui-prefs", { scope: "project", projectId: s.pa, prefs: { mode: "encre" } }))).json();
    expect(proj.resolved).toMatchObject({ mode: "encre", appearance: "dark" });
    expect(proj.resolved.source).toMatchObject({ mode: "project", appearance: "account" });
    expect((await (await GET(req("GET", `/api/studio/ui-prefs?projectId=${s.pa2}`))).json()).resolved.mode).toBe("plein");
    const cleared = await (await PUT(req("PUT", "/api/studio/ui-prefs", { scope: "project", projectId: s.pa, prefs: {} }))).json();
    expect(cleared.project).toBeNull();
    expect(cleared.resolved.mode).toBe("plein");
  });

  it("« Réglages par défaut » vide le compte sans toucher aux exceptions des projets", async () => {
    const s = await setup();
    const { PUT } = await route();
    jar.token = s.tokA;
    await PUT(req("PUT", "/api/studio/ui-prefs", { scope: "account", projectId: s.pa, prefs: { mode: "plein", textSize: "large" } }));
    await PUT(req("PUT", "/api/studio/ui-prefs", { scope: "project", projectId: s.pa, prefs: { accent: "cobalt" } }));
    const reset = await (await PUT(req("PUT", "/api/studio/ui-prefs", { scope: "account", projectId: s.pa, prefs: {} }))).json();
    expect(reset.account).toEqual({});
    expect(reset.project).toEqual({ accent: "cobalt" });
    expect(reset.resolved).toMatchObject({ mode: "encre", textSize: "normal", accent: "cobalt" });
  });

  it("droits : sans session 401 ; le projet d'un autre compte est refusé (404) en lecture comme en écriture ; chacun ses réglages", async () => {
    const s = await setup();
    const { GET, PUT } = await route();
    jar.token = "";
    expect((await GET(req("GET", `/api/studio/ui-prefs?projectId=${s.pa}`))).status).toBe(401);
    expect((await PUT(req("PUT", "/api/studio/ui-prefs", { scope: "account", prefs: { mode: "plein" } }))).status).toBe(401);
    jar.token = s.tokB;
    expect((await GET(req("GET", `/api/studio/ui-prefs?projectId=${s.pa}`))).status).toBe(404);
    expect((await PUT(req("PUT", "/api/studio/ui-prefs", { scope: "project", projectId: s.pa, prefs: { mode: "plein" } }))).status).toBe(404);
    await PUT(req("PUT", "/api/studio/ui-prefs", { scope: "account", projectId: s.pb, prefs: { mode: "plein" } }));
    jar.token = s.tokA;
    expect((await (await GET(req("GET", `/api/studio/ui-prefs?projectId=${s.pa}`))).json()).resolved.mode).toBe("encre");
    expect((await PUT(req("PUT", "/api/studio/ui-prefs", { scope: "project", prefs: { mode: "plein" } }))).status).toBe(400);
  });

  it("une requête d'une autre origine est refusée (protection des écritures)", async () => {
    const s = await setup();
    const { PUT } = await route();
    jar.token = s.tokA;
    const res = await PUT(new Request("http://x/api/studio/ui-prefs", { method: "PUT", headers: { "Content-Type": "application/json", origin: "https://ailleurs.example" }, body: JSON.stringify({ scope: "account", prefs: { mode: "plein" } }) }));
    expect(res.status).toBe(403);
  });

  it("stockage : une valeur stockée devenue invalide est ignorée à la lecture, jamais renvoyée", async () => {
    const s = await setup();
    const { readSynaPrefs, writeSynaPrefs } = await import("@/lib/syna-ui/prefs-store");
    const { run } = await import("@/lib/db");
    writeSynaPrefs(s.a.id, "account", null, { mode: "plein" });
    run("UPDATE studio_ui_prefs SET prefs = ? WHERE user_id = ? AND project_id = ''", JSON.stringify({ mode: "cockpit", accent: "encre" }), s.a.id);
    expect(readSynaPrefs(s.a.id, null).account).toEqual({ accent: "encre" });
    run("UPDATE studio_ui_prefs SET prefs = 'pas du json' WHERE user_id = ? AND project_id = ''", s.a.id);
    expect(readSynaPrefs(s.a.id, null).account).toEqual({});
    expect(() => writeSynaPrefs(s.a.id, "project", null, { mode: "plein" })).toThrow();
  });
});

describe("commandes d'affichage locales (sans IA)", () => {
  it.each([
    ["Passe en Plein cadre", { kind: "set", patch: { mode: "plein" } }],
    ["Reviens à Encre", { kind: "set", patch: { mode: "encre" } }],
    ["switch to full frame", { kind: "set", patch: { mode: "plein" } }],
    ["Agrandis l'aperçu", { kind: "width", delta: -80 }],
    ["Réduis l'aperçu", { kind: "width", delta: 80 }],
    ["mode sombre", { kind: "set", patch: { appearance: "dark" } }],
    ["comme l'appareil", { kind: "set", patch: { appearance: "auto" } }],
    ["Replie Syna", { kind: "set", patch: { panel: "collapsed" } }],
    ["texte plus grand", { kind: "set", patch: { textSize: "large" } }],
    ["plus compact", { kind: "set", patch: { density: "compact" } }],
    ["réinitialise l'affichage", { kind: "reset" }],
  ])("« %s » est une commande d'affichage", (text, expected) => {
    expect(parseSynaUiCommand(text)).toMatchObject(expected);
  });
  it.each(["change le mode", "agrandis"])("« %s » est ambigu : une question, pas une action", (text) => {
    const c = parseSynaUiCommand(text);
    expect(c?.kind).toBe("ask");
    expect(c && "options" in c ? c.options.length : 0).toBe(2);
  });
  it.each([
    "Crée 3 images de la finition Cuivre",
    "Ajoute une section sombre en bas de la page",
    "Rends le titre plus court",
    "Écris un article sur le café en mode sombre pour le blog demain matin s'il te plaît",
    "Publie la vidéo en plein écran sur Instagram",
    "",
  ])("« %s » n'est pas une commande d'affichage : elle reste pour la conversation", (text) => {
    expect(parseSynaUiCommand(text)).toBeNull();
  });
  it("la largeur reste dans les bornes sûres (360 à 560 px)", () => {
    expect(nextConvoWidth(400, -80)).toBe(360);
    expect(nextConvoWidth(540, 80)).toBe(560);
    expect(nextConvoWidth(440, -80)).toBe(360);
  });
});
