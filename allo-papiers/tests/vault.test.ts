/**
 * Coffre rangé par l'IA et « Apporter mes documents enregistrés » : tests sur une vraie base
 * PostgreSQL. L'IA est simulée (aucun appel réel, aucun crédit dépensé).
 */
import "./helpers";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser, TINY_JPEG, TINY_PNG } from "./helpers";
import { EXAMPLES } from "@/lib/examples";

const aiState: { fail: boolean; type: string } = { fail: false, type: "avis_imposition" };

vi.mock("@/lib/ai/provider", async (orig) => {
  const real = await orig<typeof import("@/lib/ai/provider")>();
  return {
    ...real,
    aiMode: () => "anthropic",
    classifyPiece: async () => {
      if (aiState.fail) throw new real.AiError("indisponible", "Service simulé indisponible.");
      return {
        data: { type_piece: aiState.type, libelle: "Avis d'impôt 2026 sur les revenus 2025", periode: "revenus 2025", date_document: "2026-08-01", valable_jusqu_au: "2099-13-45", emetteur: "DGFiP", confiance: "elevee" },
        meta: { provider: "anthropic", model: "simulation-test", inputTokens: 1, outputTokens: 1 },
      };
    },
  };
});

// Les routes appellent requireSession / requireElevated : on fournit la session de test.
const authState: { user: unknown; session: unknown; elevated: boolean } = { user: null, session: null, elevated: false };
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  const { HttpError } = await import("@/lib/http");
  return {
    ...real,
    requireSession: async () => ({ user: authState.user, session: authState.session }),
    requireElevated: async () => {
      if (!authState.elevated) throw new HttpError(403, "verification_requise", "Coffre fermé.");
      return { user: authState.user, session: authState.session };
    },
  };
});

const { sql } = await import("@/lib/db");
const docs = await import("@/lib/documents");
const vault = await import("@/lib/vault");

async function piece(userId: string, type: string, libelle: string, extra: { date?: string; until?: string; image?: Buffer } = {}) {
  const id = await docs.createDocument(userId, "courrier", undefined, "piece");
  await docs.addFile(userId, id, extra.image ?? TINY_JPEG);
  await vault.classifyManually(userId, id, { type_piece: type as never, libelle, date_document: extra.date ?? null, valable_jusqu_au: extra.until ?? null });
  return id;
}

function req(url: string, method: string, body?: unknown) {
  return new Request(`http://localhost:3100${url}`, {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost:3100" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function login(plan: "free" | "plus" = "free") {
  const u = await makeUser(plan);
  authState.user = u.user;
  authState.session = u.session;
  authState.elevated = false;
  return u;
}

beforeEach(() => {
  aiState.fail = false;
  aiState.type = "avis_imposition";
});

afterAll(async () => {
  await sql().end();
});

describe("Rangement des pièces dans le coffre", () => {
  it("l'IA range la pièce, protège les pièces sensibles et ignore une date invalide", async () => {
    const { user } = await makeUser();
    const id = await docs.createDocument(user.id, "courrier", undefined, "piece");
    await docs.addFile(user.id, id, TINY_JPEG);
    const c = await vault.classifyDocument(user.id, id, null);
    expect(c.type_piece).toBe("avis_imposition");
    expect(c.valable_jusqu_au).toBeNull(); // « 2099-13-45 » n'est pas une date : jamais inventée ni conservée
    const [d] = await sql()<{ vault_category: string; title: string; status: string; classified_by: string; sensitive: boolean }[]>`
      select vault_category, title, status, classified_by, sensitive from documents where id = ${id}`;
    expect(d).toMatchObject({ vault_category: "revenus_impots", title: c.libelle, status: "analyzed", classified_by: "ia", sensitive: true });
    const [n] = await sql()<{ n: number }[]>`select count(*)::int as n from usage_ledger where user_id = ${user.id} and kind = 'classement' and status = 'consumed'`;
    expect(n.n).toBe(1);
  });

  it("un échec de l'IA ne consomme aucun crédit et le rangement manuel reste possible", async () => {
    const { user } = await makeUser();
    const id = await docs.createDocument(user.id, "courrier", undefined, "piece");
    await docs.addFile(user.id, id, TINY_JPEG);
    aiState.fail = true;
    await expect(vault.classifyDocument(user.id, id, null)).rejects.toThrow(/Aucun crédit/);
    const [n] = await sql()<{ n: number }[]>`select count(*)::int as n from usage_ledger where user_id = ${user.id} and kind = 'classement' `;
    expect(n.n).toBe(0);
    await vault.classifyManually(user.id, id, { type_piece: "rib", libelle: "RIB compte courant" });
    const [d] = await sql()<{ piece_type: string; classified_by: string; sensitive: boolean }[]>`select piece_type, classified_by, sensitive from documents where id = ${id}`;
    expect(d).toMatchObject({ piece_type: "rib", classified_by: "utilisateur", sensitive: true });
  });

  it("le quota de rangements automatiques est appliqué côté serveur", async () => {
    const { user } = await makeUser();
    const { limits } = await import("@/lib/plans");
    const limit = limits("free").classement;
    for (let i = 0; i < limit; i++) {
      await sql()`insert into usage_ledger (user_id, kind, ref_id, period, status) values (${user.id}, 'classement', ${crypto.randomUUID()}, to_char(now() at time zone 'Europe/Paris', 'YYYY-MM'), 'consumed')`;
    }
    const id = await docs.createDocument(user.id, "courrier", undefined, "piece");
    await docs.addFile(user.id, id, TINY_JPEG);
    await expect(vault.classifyDocument(user.id, id, null)).rejects.toThrow(/à la main|manuel|vous-même/i);
  });

  it("on ne peut pas ranger le document d'un autre compte", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const id = await piece(a.user.id, "rib", "RIB");
    await expect(vault.classifyManually(b.user.id, id, { type_piece: "autre", libelle: "volé" })).rejects.toThrow();
    const [d] = await sql()<{ piece_label: string }[]>`select piece_label from documents where id = ${id}`;
    expect(d.piece_label).toBe("RIB");
  });
});

describe("Apporter mes documents enregistrés", () => {
  it("choisit la pièce la plus récente encore valable, sans réutiliser la même deux fois", async () => {
    const { user } = await makeUser();
    await piece(user.id, "avis_imposition", "Avis 2024", { date: "2024-08-01" });
    const recent = await piece(user.id, "avis_imposition", "Avis 2025", { date: "2025-08-01" });
    await piece(user.id, "piece_identite", "Carte d'identité périmée", { until: "2020-01-01" });
    const s = await vault.suggestAttachments(user.id, [
      { type: "avis_imposition", libelle: "Dernier avis" },
      { type: "avis_imposition", libelle: "Avis précédent" },
      { type: "piece_identite", libelle: "Pièce d'identité" },
      { type: "rib", libelle: "RIB" },
    ]);
    expect(s[0].match?.id).toBe(recent);
    expect(s[0].others).toBe(1);
    expect(s[1].match?.label).toBe("Avis 2024");
    expect(s[2].match).toBeNull();
    expect(s[2].note).toMatch(/dépassée/);
    expect(s[3].match).toBeNull();
    expect(s[3].note).toBeNull();
  });

  it("ne propose jamais les documents d'un autre compte ni le courrier auquel on répond", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await piece(b.user.id, "rib", "RIB de B");
    const own = await piece(a.user.id, "attestation_loyer", "Quittance");
    expect((await vault.suggestAttachments(a.user.id, [{ type: "rib", libelle: "RIB" }]))[0].match).toBeNull();
    expect((await vault.suggestAttachments(a.user.id, [{ type: "attestation_loyer", libelle: "Loyer" }], [own]))[0].match).toBeNull();
  });

  it("« Répondre avec mes documents » crée le courrier avec les pièces demandées déjà jointes", async () => {
    const { user } = await login();
    const caf = EXAMPLES.find((e) => e.analysis.pieces_demandees.length > 0)!;
    expect(caf).toBeTruthy();
    const docId = await docs.createDocument(user.id, "courrier");
    await docs.addFile(user.id, docId, TINY_JPEG);
    await sql()`insert into analyses (document_id, user_id, result, provider, model, prompt_version) values (${docId}, ${user.id}, ${sql().json(caf.analysis as never)}, 'demo', 'test', 'test')`;
    const avis = await piece(user.id, "avis_imposition", "Avis 2025", { date: "2025-08-01" });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(req("/api/letters", "POST", { document_id: docId, auto_attach: true }), undefined as never);
    expect(res.status).toBe(200);
    const out = (await res.json()) as { id: string; attached: number; needs: number };
    expect(out.needs).toBe(caf.analysis.pieces_demandees.length);
    expect(out.attached).toBe(1);
    const [l] = await sql()<{ attachments: string[]; needs: { type: string }[] }[]>`select attachments, needs from letters where id = ${out.id}`;
    expect(l.attachments).toEqual([avis]);

    // Le bouton dans le courrier ajoute ensuite une pièce scannée entre-temps, sans rien retirer.
    const loyer = await piece(user.id, "attestation_loyer", "Attestation de loyer");
    const att = await import("@/app/api/letters/[id]/attachments/route");
    const r2 = await att.POST(req(`/api/letters/${out.id}/attachments`, "POST"), { params: Promise.resolve({ id: out.id }) });
    expect(((await r2.json()) as { attachments: string[] }).attachments.sort()).toEqual([avis, loyer].sort());
  });

  it("on ne peut pas joindre le document d'un autre compte", async () => {
    const { user } = await login();
    const other = await makeUser();
    const foreign = await piece(other.user.id, "rib", "RIB d'un autre");
    const [l] = await sql()<{ id: string }[]>`insert into letters (user_id, title, body) values (${user.id}, 'Test', 'Objet : test') returning id`;
    const att = await import("@/app/api/letters/[id]/attachments/route");
    const r = await att.PUT(req(`/api/letters/${l.id}/attachments`, "PUT", { document_ids: [foreign] }), { params: Promise.resolve({ id: l.id }) });
    expect(r.status).toBe(404);
  });

  it("le PDF avec les originaux et l'envoi d'une pièce protégée exigent le coffre ouvert", async () => {
    const { user } = await login();
    const rib = await piece(user.id, "rib", "RIB", { image: TINY_PNG }); // pièce sensible
    const [l] = await sql()<{ id: string }[]>`
      insert into letters (user_id, title, body, attachments, reviewed_at) values (${user.id}, 'Test', 'Objet : test', ${sql().json([rib])}, now() + interval '1 second') returning id`;
    const pdf = await import("@/app/api/letters/[id]/pdf/route");
    const locked = await pdf.GET(req(`/api/letters/${l.id}/pdf?avec_pieces=1`, "GET"), { params: Promise.resolve({ id: l.id }) });
    expect(locked.status).toBe(403);
    const sends = await import("@/app/api/sends/route");
    const s = await sends.POST(req("/api/sends", "POST", { letter_id: l.id }), undefined as never);
    expect(s.status).toBe(403);
    authState.elevated = true;
    const open = await pdf.GET(req(`/api/letters/${l.id}/pdf?avec_pieces=1`, "GET"), { params: Promise.resolve({ id: l.id }) });
    expect(open.status).toBe(200);
    expect(open.headers.get("content-type")).toMatch(/pdf/);
    const { PDFDocument } = await import("pdf-lib");
    const merged = await PDFDocument.load(new Uint8Array(await open.arrayBuffer()));
    expect(merged.getPageCount()).toBeGreaterThanOrEqual(2); // courrier + la pièce

    // Une image illisible n'est jamais retirée en silence : erreur explicite qui la nomme.
    const bad = await piece(user.id, "facture", "Facture abîmée");
    await sql()`update letters set attachments = ${sql().json([rib, bad])}, reviewed_at = now() + interval '1 second' where id = ${l.id}`;
    const err = await pdf.GET(req(`/api/letters/${l.id}/pdf?avec_pieces=1`, "GET"), { params: Promise.resolve({ id: l.id }) });
    expect(err.status).toBe(422);
    expect(((await err.json()) as { message: string }).message).toContain("Facture abîmée");
  });
});
