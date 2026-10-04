/**
 * Tests d'intégration sur un VRAI PostgreSQL (démarré par tests/global-setup.ts) et un
 * stockage local chiffré. Le fournisseur d'IA et Stripe sont SIMULÉS ici (aucune clé réelle) :
 * ces tests vérifient la logique du site, pas les services externes.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { makeUser, TINY_JPEG } from "./helpers";
import { EXAMPLES } from "@/lib/examples";

const aiState: { fail: boolean; calls: number } = { fail: false, calls: 0 };

vi.mock("@/lib/ai/provider", async (orig) => {
  const real = await orig<typeof import("@/lib/ai/provider")>();
  return {
    ...real,
    aiMode: () => "anthropic",
    analyzeDocument: async () => {
      aiState.calls++;
      if (aiState.fail) throw new real.AiError("indisponible", "Service simulé indisponible.");
      return { data: structuredClone(EXAMPLES[0].analysis), meta: { provider: "anthropic", model: "simulation-test", inputTokens: 10, outputTokens: 10 } };
    },
  };
});

const { sql } = await import("@/lib/db");
const docs = await import("@/lib/documents");
const quota = await import("@/lib/quota");

async function newDocWithPage(userId: string) {
  const id = await docs.createDocument(userId, "courrier");
  await docs.addFile(userId, id, TINY_JPEG);
  return id;
}

beforeEach(() => {
  aiState.fail = false;
  aiState.calls = 0;
});

afterAll(async () => {
  await sql().end();
});

describe("Quotas appliqués côté serveur", () => {
  it("n'accorde jamais plus de 3 documents gratuits, même avec 12 requêtes simultanées", async () => {
    const { user } = await makeUser("free");
    const ids = await Promise.all(Array.from({ length: 12 }, () => newDocWithPage(user.id)));
    const results = await Promise.allSettled(ids.map((id) => docs.runAnalysis(user.id, id)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const u = await quota.usage(user.id);
    expect(u.used.document).toBe(3);
  });

  it("une analyse échouée ne consomme aucun crédit et peut être relancée", async () => {
    const { user } = await makeUser("free");
    const id = await newDocWithPage(user.id);
    aiState.fail = true;
    await expect(docs.runAnalysis(user.id, id)).rejects.toThrow(/Aucun crédit/);
    expect((await quota.usage(user.id)).used.document).toBe(0);
    const [d] = await sql()<{ status: string }[]>`select status from documents where id = ${id}`;
    expect(d.status).toBe("failed");
    aiState.fail = false;
    await docs.runAnalysis(user.id, id);
    expect((await quota.usage(user.id)).used.document).toBe(1);
  });

  it("plusieurs pages d'un même courrier = un seul document", async () => {
    const { user } = await makeUser("free");
    const id = await docs.createDocument(user.id, "courrier");
    for (let i = 0; i < 4; i++) await docs.addFile(user.id, id, TINY_JPEG);
    await docs.runAnalysis(user.id, id);
    expect((await quota.usage(user.id)).used.document).toBe(1);
  });

  it("deux lancements simultanés du même document ne déclenchent qu'une analyse", async () => {
    const { user } = await makeUser("free");
    const id = await newDocWithPage(user.id);
    const r = await Promise.allSettled([docs.runAnalysis(user.id, id), docs.runAnalysis(user.id, id)]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(aiState.calls).toBe(1);
  });

  it("refuse la discussion et la comparaison à l'offre gratuite", async () => {
    const { user } = await makeUser("free");
    await expect(quota.reserveCredit(user.id, "chat", crypto.randomUUID())).rejects.toThrow(/offre Plus/);
    await expect(quota.reserveCredit(user.id, "compare", crypto.randomUUID())).rejects.toThrow(/offre Plus/);
  });
});

describe("Isolation entre comptes", () => {
  it("un compte ne peut ni lire, ni modifier, ni supprimer le document d'un autre", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const id = await newDocWithPage(a.user.id);
    await expect(docs.getDocument(b.user.id, id)).rejects.toMatchObject({ status: 404 });
    await expect(docs.addFile(b.user.id, id, TINY_JPEG)).rejects.toMatchObject({ status: 404 });
    await expect(docs.deleteDocument(b.user.id, id)).rejects.toMatchObject({ status: 404 });
    await expect(docs.runAnalysis(b.user.id, id)).rejects.toMatchObject({ status: 404 });
    expect(await docs.listFiles(b.user.id, id)).toHaveLength(0);
    expect((await docs.getDocument(a.user.id, id)).id).toBe(id);
  });
});

describe("Stockage chiffré et suppression réelle", () => {
  it("chiffre les fichiers et les supprime réellement du stockage", async () => {
    const { user } = await makeUser();
    const id = await newDocWithPage(user.id);
    const [f] = await docs.listFiles(user.id, id);
    const file = path.join(process.cwd(), ".data", "storage", f.storage_key);
    expect(existsSync(file)).toBe(true);
    const { readFileSync } = await import("node:fs");
    const raw = readFileSync(file);
    expect(raw.subarray(0, 3).toString()).toBe("AP1"); // format chiffré
    expect(raw.includes(TINY_JPEG.subarray(0, 20))).toBe(false); // le contenu en clair n'apparaît pas
    const { getDecrypted } = await import("@/lib/storage");
    expect((await getDecrypted(f.storage_key)).equals(TINY_JPEG)).toBe(true);
    await docs.deleteDocument(user.id, id);
    expect(existsSync(file)).toBe(false);
    const [n] = await sql()<{ n: number }[]>`select count(*)::int as n from analyses where document_id = ${id}`;
    expect(n.n).toBe(0);
  });

  it("refuse les formats déguisés (contenu qui n'est ni image ni PDF)", async () => {
    const { user } = await makeUser();
    const id = await docs.createDocument(user.id, "courrier");
    await expect(docs.addFile(user.id, id, Buffer.from("<html>pas une image</html>"))).rejects.toMatchObject({ status: 415 });
  });

  it("la suppression du compte efface aussi les fichiers", async () => {
    const { user } = await makeUser();
    const id = await newDocWithPage(user.id);
    const [f] = await docs.listFiles(user.id, id);
    const file = path.join(process.cwd(), ".data", "storage", f.storage_key);
    const { deleteAccount } = await import("@/lib/account");
    await deleteAccount(user);
    expect(existsSync(file)).toBe(false);
    const [n] = await sql()<{ n: number }[]>`select count(*)::int as n from users where id = ${user.id}`;
    expect(n.n).toBe(0);
  });
});

describe("Échéances et rappels", () => {
  it("n'envoie de rappel que pour une date confirmée, une seule fois", async () => {
    const { user } = await makeUser();
    const { parisDate } = await import("@/lib/time");
    const due = new Date(Date.now() + 2 * 86400000);
    const dueIso = parisDate(due);
    await sql()`insert into deadlines (user_id, label, due_date, source) values (${user.id}, 'Non confirmée', ${dueIso}, 'document')`;
    await sql()`insert into deadlines (user_id, label, due_date, source, confirmed_at) values (${user.id}, 'Confirmée', ${dueIso}, 'utilisateur', now())`;
    const { sendDueReminders } = await import("@/lib/reminders");
    const first = await sendDueReminders();
    const sent = await sql()<{ label: string }[]>`select d.label from reminder_sends r join deadlines d on d.id = r.deadline_id where d.user_id = ${user.id}`;
    expect(sent.map((s) => s.label)).toEqual(["Confirmée"]);
    expect(first.sent).toBeGreaterThanOrEqual(1);
    await sendDueReminders();
    const again = await sql()<{ n: number }[]>`select count(*)::int as n from reminder_sends r join deadlines d on d.id = r.deadline_id where d.user_id = ${user.id}`;
    expect(again[0].n).toBe(1);
  });

  it("l'analyse crée une échéance NON confirmée", async () => {
    const { user } = await makeUser();
    const id = await newDocWithPage(user.id);
    await docs.runAnalysis(user.id, id);
    const [d] = await sql()<{ confirmed_at: Date | null; source: string }[]>`select confirmed_at, source from deadlines where document_id = ${id}`;
    expect(d.confirmed_at).toBeNull();
    expect(d.source).toBe("document");
  });
});

describe("Vérification renforcée (coffre-fort)", () => {
  it("le code email seul ne suffit pas quand une passkey existe", async () => {
    const { user, session } = await makeUser();
    await sql()`insert into webauthn_credentials (id, user_id, public_key) values (${`cred-${user.id}`}, ${user.id}, ${Buffer.from("cle")})`;
    const stepup = await import("@/lib/stepup");
    await stepup.sendStepUpEmailCode(user, session);
    await expect(stepup.verifyEmailStepUp(user, session, "000000")).rejects.toMatchObject({ code: "passkey_requise" });
  });

  it("sans passkey, le bon code ouvre le coffre ; un mauvais code est refusé et limité", async () => {
    const { user, session } = await makeUser();
    const stepup = await import("@/lib/stepup");
    await stepup.sendStepUpEmailCode(user, session);
    // Lecture du code dans la boîte d'envoi locale (aucun email réel en test)
    const { readdirSync, readFileSync } = await import("node:fs");
    const dir = path.join(process.cwd(), ".data", "outbox");
    const mail = readdirSync(dir).map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8"))).filter((m) => m.to === user.email).pop();
    const code = /(\d{6})/.exec(mail.subject)![1];
    await expect(stepup.verifyEmailStepUp(user, session, code === "123456" ? "654321" : "123456")).rejects.toMatchObject({ code: "code_invalide" });
    await stepup.verifyEmailStepUp(user, session, code);
    const [s] = await sql()<{ elevated_until: Date }[]>`select elevated_until from sessions where id = ${session.id}`;
    expect(new Date(s.elevated_until).getTime()).toBeGreaterThan(Date.now());
    // usage unique
    await expect(stepup.verifyEmailStepUp(user, session, code)).rejects.toMatchObject({ code: "code_invalide" });
  });

  it("les challenges passkey sont à usage unique et liés à la session", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await sql()`insert into webauthn_challenges (user_id, session_id, challenge, purpose, expires_at) values (${a.user.id}, ${a.session.id}, 'chal-test', 'stepup', now() + interval '5 minutes')`;
    const stepup = await import("@/lib/stepup");
    const fake = { id: "x", rawId: "x", type: "public-key", response: { clientDataJSON: Buffer.from(JSON.stringify({ challenge: "chal-test" })).toString("base64url"), authenticatorData: "", signature: "" }, clientExtensionResults: {} };
    // Une autre session ne peut pas utiliser ce challenge
    await expect(stepup.verifyPasskeyStepUp(b.user, b.session, fake as never)).rejects.toMatchObject({ code: "challenge" });
  });
});

describe("Envois recommandés : validation explicite et paiement", () => {
  async function letterReady(userId: string) {
    const [l] = await sql()<{ id: string }[]>`
      insert into letters (user_id, title, body, sender, recipient, reviewed_at)
      values (${userId}, 'Test', 'Objet : Demande\n\nMadame, Monsieur,\n\nCeci est un test.',
              ${sql().json({ name: "Jeanne Test", line1: "1 rue A", line2: "", postalCode: "75001", city: "Paris" })},
              ${sql().json({ name: "Organisme", line1: "2 rue B", line2: "", postalCode: "69001", city: "Lyon", source: "saisie", conflict: false, conflictResolved: false })},
              now() + interval '1 second')
      returning id`;
    return l.id;
  }

  it("refuse la validation sans case cochée, ou si le contenu a changé depuis l'affichage", async () => {
    const { user } = await makeUser();
    const sends = await import("@/lib/sends");
    const letterId = await letterReady(user.id);
    const sendId = await sends.prepareSend(user, letterId, []);
    const s = await sends.getSend(user.id, sendId);
    await expect(sends.validateSend(user, sendId, false, s.content_hash, "1.2.3.4")).rejects.toMatchObject({ code: "case_non_cochee" });
    await expect(sends.validateSend(user, sendId, true, "0".repeat(64), "1.2.3.4")).rejects.toMatchObject({ code: "contenu_modifie" });
    // Modification du courrier après affichage : la validation devient impossible
    await sql()`update letters set body = body || ' modifié', reviewed_at = now() + interval '2 seconds' where id = ${letterId}`;
    await expect(sends.validateSend(user, sendId, true, s.content_hash, "1.2.3.4")).rejects.toMatchObject({ code: "contenu_modifie" });
  });

  it("refuse le paiement d'un envoi non validé", async () => {
    const { user } = await makeUser();
    const sends = await import("@/lib/sends");
    const sendId = await sends.prepareSend(user, await letterReady(user.id), []);
    await expect(sends.startSendPayment(user, sendId)).rejects.toMatchObject({ code: "validation_requise" });
  });

  it("refuse l'envoi d'un courrier non relu", async () => {
    const { user } = await makeUser();
    const sends = await import("@/lib/sends");
    const id = await letterReady(user.id);
    await sql()`update letters set reviewed_at = null where id = ${id}`;
    await expect(sends.prepareSend(user, id, [])).rejects.toMatchObject({ code: "relecture_requise" });
  });

  it("webhook signé : un seul envoi (simulé) même si Stripe renvoie l'événement deux fois ; montant vérifié", async () => {
    const { user } = await makeUser();
    const sends = await import("@/lib/sends");
    const sendId = await sends.prepareSend(user, await letterReady(user.id), []);
    const s = await sends.getSend(user.id, sendId);
    await sends.validateSend(user, sendId, true, s.content_hash, "1.2.3.4");
    await sql()`update send_requests set status = 'payment_pending' where id = ${sendId}`;
    const v = await sends.getSend(user.id, sendId);

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe("sk_test_fake_for_signature_tests");
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const event = {
      id: `evt_${sendId.slice(0, 8)}`,
      object: "event",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_1", object: "checkout.session", mode: "payment", payment_status: "paid", amount_total: v.price_cents, currency: "eur", client_reference_id: user.id, payment_intent: "pi_test_1", metadata: { sendId, userId: user.id, validatedHash: v.validated_hash } } },
    };
    const payload = JSON.stringify(event);
    const post = (body: string, sig: string) => POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": sig } }));

    // Signature invalide → refus
    expect((await post(payload, "t=1,v1=faux")).status).toBe(400);
    const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_test_secret" });
    const r1 = await post(payload, sig);
    expect(r1.status).toBe(200);
    const r2 = await post(payload, sig);
    expect((await r2.json()).outcome).toBe("doublon");

    const after = await sends.getSend(user.id, sendId);
    expect(after.status).toBe("submitted");
    expect(after.tracking_is_fictive).toBe(true);
    expect(after.tracking_number).toMatch(/^TEST-FICTIF-/);
    const ev = await sql()<{ status: string }[]>`select status from send_events where send_id = ${sendId} and status = 'depose_simule'`;
    expect(ev).toHaveLength(1);
  });

  it("un montant payé différent du prix validé est rejeté (aucun envoi)", async () => {
    const { user } = await makeUser();
    const sends = await import("@/lib/sends");
    const sendId = await sends.prepareSend(user, await letterReady(user.id), []);
    const s = await sends.getSend(user.id, sendId);
    await sends.validateSend(user, sendId, true, s.content_hash, "1.2.3.4");
    const v = await sends.getSend(user.id, sendId);
    await expect(
      sends.onSendPaid({ mode: "payment", payment_status: "paid", amount_total: 1, currency: "eur", client_reference_id: user.id, metadata: { sendId, validatedHash: v.validated_hash! } } as never),
    ).rejects.toThrow(/montant/);
    expect((await sends.getSend(user.id, sendId)).status).toBe("validated");
  });

  it("le mode La Poste réel est refusé explicitement tant que l'adaptateur n'existe pas", async () => {
    const { postalAdapter } = await import("@/lib/laposte");
    process.env.LAPOSTE_MODE = "real";
    try {
      expect(() => postalAdapter()).toThrow(/pas développé/);
    } finally {
      process.env.LAPOSTE_MODE = "test";
    }
  });
});

describe("Abonnement : webhooks", () => {
  it("active puis retire l'offre Plus selon l'état réel de l'abonnement", async () => {
    const { user } = await makeUser();
    await sql()`update users set stripe_customer_id = ${`cus_${user.id.slice(0, 8)}`} where id = ${user.id}`;
    const billing = await import("@/lib/billing");
    const sub = (status: string, cancel = false) =>
      ({ id: `sub_${user.id.slice(0, 8)}`, customer: `cus_${user.id.slice(0, 8)}`, status, cancel_at_period_end: cancel, metadata: {}, items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30, price: { id: "price_test_plus" } }] } }) as never;
    await billing.syncSubscription(sub("active"));
    expect((await sql()<{ plan: string }[]>`select plan from users where id = ${user.id}`)[0].plan).toBe("plus");
    await billing.syncSubscription(sub("active", true));
    const [s] = await sql()<{ cancel_at_period_end: boolean }[]>`select cancel_at_period_end from subscriptions where user_id = ${user.id}`;
    expect(s.cancel_at_period_end).toBe(true);
    await billing.syncSubscription(sub("canceled"));
    expect((await sql()<{ plan: string }[]>`select plan from users where id = ${user.id}`)[0].plan).toBe("free");
  });
});
