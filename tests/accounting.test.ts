import { describe, expect, it, vi } from "vitest";
import {
  breakEven, compare, fromHt, fromTtc, journalCsv, last12Months, monthlyEquivalent, nextOccurrences, occurrences, pctChange, periodRange, pnl, previousRange,
  summarize, toPaySummary, type Entry,
} from "@/lib/accounting";

// Session simulée pour les routes : le jeton est lu dans ce cookie.
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));

const entry = (p: Partial<Entry>): Entry => ({
  id: Math.random().toString(36).slice(2), ref: "X", date: "2026-03-10", kind: "expense", source: "manual", auto: false, category: "hosting", label: "L", supplier: "",
  ht: 0, vatRate: 2000, vat: 0, ttc: 0, status: "paid", paymentMethod: "carte", receipt: null, ...p,
});

describe("TVA HT ⇄ TTC", () => {
  it("calcule la TVA depuis le HT et retrouve le HT depuis le TTC (HT + TVA = TTC au centime)", () => {
    expect(fromHt(10000, 2000)).toEqual({ ht: 10000, vat: 2000, ttc: 12000 });
    expect(fromHt(999, 550)).toEqual({ ht: 999, vat: 55, ttc: 1054 });
    expect(fromTtc(12000, 2000)).toEqual({ ht: 10000, vat: 2000, ttc: 12000 });
    expect(fromTtc(4990, 2000)).toEqual({ ht: 4158, vat: 832, ttc: 4990 });
    expect(fromTtc(1000, 0)).toEqual({ ht: 1000, vat: 0, ttc: 1000 });
    for (const rate of [2000, 1000, 550, 210, 0]) for (const ttc of [1, 99, 1234, 98765]) {
      const a = fromTtc(ttc, rate);
      expect(a.ht + a.vat).toBe(ttc);
    }
  });
});

describe("périodes et comparaison", () => {
  it("calcule les périodes prédéfinies", () => {
    expect(periodRange("month", "2026-10-04")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange("prev_month", "2026-01-15")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(periodRange("quarter", "2026-08-20")).toEqual({ from: "2026-07-01", to: "2026-09-30" });
    expect(periodRange("year", "2026-08-20")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(periodRange("prev_year", "2026-08-20")).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(periodRange("last12", "2026-10-04")).toEqual({ from: "2025-11-01", to: "2026-10-31" });
    expect(periodRange("custom", "2026-10-04", { from: "2026-05-10", to: "2026-05-01" })).toEqual({ from: "2026-05-01", to: "2026-05-10" });
    expect(last12Months("2026-03-31")).toHaveLength(12);
    expect(last12Months("2026-03-31")[0]).toBe("2025-04");
  });
  it("donne la période précédente comparable", () => {
    expect(previousRange({ from: "2026-03-01", to: "2026-03-31" })).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(previousRange({ from: "2026-07-01", to: "2026-09-30" })).toEqual({ from: "2026-04-01", to: "2026-06-30" });
    expect(previousRange({ from: "2026-01-01", to: "2026-12-31" })).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(previousRange({ from: "2026-05-11", to: "2026-05-20" })).toEqual({ from: "2026-05-01", to: "2026-05-10" });
  });
  it("calcule les variations (sans pourcentage sur une base nulle)", () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(-50, -100)).toBe(50);
    expect(pctChange(10, 0)).toBeNull();
    const cur = summarize([entry({ kind: "revenue", ht: 20000, vat: 4000, ttc: 24000 })]);
    const prev = summarize([entry({ kind: "revenue", ht: 10000, vat: 2000, ttc: 12000 })]);
    expect(compare(cur, prev).revenueHt).toBe(100);
  });
});

describe("charges récurrentes", () => {
  const c = { frequency: "monthly" as const, day: 5, start_date: "2026-01-10", end_date: null, amount_ht: 3000, vat_rate: 2000, auto_paid: 1 };
  it("génère les échéances passées et la prochaine, une seule par période", () => {
    const occ = occurrences(c, "2026-04-20");
    expect(occ.map((o) => o.date)).toEqual(["2026-02-05", "2026-03-05", "2026-04-05", "2026-05-05"]);
    expect(new Set(occ.map((o) => o.periodKey)).size).toBe(occ.length);
    expect(occurrences({ ...c, frequency: "quarterly", start_date: "2026-01-01" }, "2026-08-01").map((o) => o.date)).toEqual(["2026-01-05", "2026-04-05", "2026-07-05", "2026-10-05"]);
    expect(occurrences({ ...c, end_date: "2026-03-31" }, "2026-08-01").map((o) => o.date)).toEqual(["2026-02-05", "2026-03-05"]);
    expect(nextOccurrences({ ...c, frequency: "yearly" }, "2026-04-20", 2).map((o) => o.date)).toEqual(["2027-02-05", "2028-02-05"]);
    expect(monthlyEquivalent({ amount_ht: 12000, frequency: "yearly" })).toBe(1000);
  });
  it("crée les échéances en base sans doublon, payées si passées et à payer pour la prochaine", async () => {
    const { run, all } = await import("@/lib/db");
    const { syncRecurring } = await import("@/lib/accounting-store");
    run("INSERT INTO recurring_charges (id, label, category, supplier, amount_ht, vat_rate, frequency, day, start_date, payment_method, auto_paid, active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      "rc_test", "Serveur", "hosting", "OVH", 3000, 2000, "monthly", 5, "2026-01-10", "prelevement", 1, 1, 0, 0);
    syncRecurring("2026-04-20");
    syncRecurring("2026-04-20");
    syncRecurring("2026-04-21");
    const rows = all<{ date: string; status: string; amount_ttc: number }>("SELECT date, status, amount_ttc FROM expenses WHERE recurring_id = 'rc_test' ORDER BY date");
    expect(rows.map((r) => r.date)).toEqual(["2026-02-05", "2026-03-05", "2026-04-05", "2026-05-05"]);
    expect(rows.map((r) => r.status)).toEqual(["paid", "paid", "paid", "to_pay"]);
    expect(rows[0].amount_ttc).toBe(3600);
  });
});

describe("compte de résultat et indicateurs", () => {
  const data: Entry[] = [
    entry({ kind: "revenue", source: "stripe", auto: true, category: "rev_subscription", date: "2026-01-15", ...fromTtc(5988, 2000) }),
    entry({ kind: "revenue", source: "stripe", auto: true, category: "rev_topup", date: "2026-02-03", ...fromTtc(1200, 2000) }),
    entry({ category: "hosting", date: "2026-01-05", ...fromHt(3000, 2000) }),
    entry({ category: "software", date: "2026-02-10", status: "to_pay", ...fromHt(1000, 2000) }),
    entry({ source: "stripe_fee", auto: true, estimated: true, category: "bank", date: "2026-01-31", vatRate: 0, ht: 157, vat: 0, ttc: 157 }),
  ];
  it("ventile catégories × mois et calcule le résultat", () => {
    const p = pnl(data, ["2026-01", "2026-02"]);
    expect(p.revenueTotal).toEqual([4990, 1000]);
    expect(p.expensesTotal).toEqual([3157, 1000]);
    expect(p.result).toEqual([1833, 0]);
    expect(p.totals.result).toBe(1833);
    expect(p.expenses.find((r) => r.category === "hosting")?.values).toEqual([3000, 0]);
  });
  it("résume la période : TVA, trésorerie, marge", () => {
    const s = summarize(data);
    expect(s.revenueHt).toBe(5990);
    expect(s.cashInTtc).toBe(7188);
    expect(s.expensesHt).toBe(4157);
    expect(s.expensesAutoHt).toBe(157);
    expect(s.vatCollected).toBe(1198);
    expect(s.vatDeductible).toBe(800);
    expect(s.vatBalance).toBe(398);
    expect(s.cash).toBe(7188 - 3600 - 157); // la dépense « à payer » ne sort pas de la trésorerie
    expect(s.marginPct).toBeCloseTo((1833 / 5990) * 100, 5);
    expect(toPaySummary([{ date: "2026-02-10", status: "to_pay", ttc: 1200 }, { date: "2026-12-01", status: "to_pay", ttc: 500 }], "2026-03-01")).toEqual({ ttc: 1700, count: 2, lateTtc: 1200, lateCount: 1 });
  });
  it("seuil de rentabilité : charges fixes ÷ marge par abonné", () => {
    expect(breakEven({ fixedMonthlyHt: 10000, priceHt: 4158, variablePerSubHt: 1158 })).toEqual({ subscribers: 4, marginPerSub: 3000 });
    expect(breakEven({ fixedMonthlyHt: 10000, priceHt: 1000, variablePerSubHt: 1200 }).subscribers).toBeNull();
  });
});

describe("export CSV pour le comptable", () => {
  it("français : « ; », virgule décimale, échappement ; anglais : « , » et point", () => {
    const rows = [entry({ ref: "ACH-1", label: 'Logiciel "Pro"; licence', supplier: "Éditeur", category: "software", vatRate: 550, ...fromHt(123456, 550), receipt: { name: "facture.pdf", mime: "application/pdf" } })];
    const fr = journalCsv(rows, "fr", () => "Logiciels").replace(/^﻿/, "").split("\r\n");
    expect(fr[0]).toBe("Date;Pièce;Libellé;Catégorie;Fournisseur / client;HT;Taux TVA (%);TVA;TTC;Statut;Mode de paiement;Justificatif");
    expect(fr[1]).toBe('2026-03-10;ACH-1;"Logiciel ""Pro""; licence";Logiciels;Éditeur;1234,56;5,5;67,90;1302,46;Payée;Carte;facture.pdf');
    const en = journalCsv(rows, "en", () => "Software").replace(/^﻿/, "").split("\r\n");
    expect(en[1]).toBe('2026-03-10,ACH-1,"Logiciel ""Pro""; licence",Software,Éditeur,1234.56,5.5,67.90,1302.46,Paid,Card,facture.pdf');
  });
});

describe("accès réservé à l'administration", () => {
  it("refuse un compte client et accepte l'administrateur", async () => {
    const { createUser } = await import("@/lib/auth");
    const { run } = await import("@/lib/db");
    const { sha256 } = await import("@/lib/secrets");
    const { GET } = await import("@/app/api/admin/accounting/route");
    const { POST } = await import("@/app/api/admin/accounting/expenses/route");
    const t = Date.now();
    const admin = await createUser(`compta-admin${t}@test.fr`, "motdepasse-test", "Admin");
    run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
    const client = await createUser(`compta-client${t}@test.fr`, "motdepasse-test", "Client");
    run("UPDATE users SET role = 'client' WHERE id = ?", client.id);
    const session = (uid: string, token: string) => run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(token), uid, Date.now() + 3600_000, Date.now());
    session(client.id, `tok-client-${t}`);
    session(admin.id, `tok-admin-${t}`);

    jar.token = "";
    expect((await GET(new Request("http://x/api/admin/accounting"))).status).toBe(401);
    jar.token = `tok-client-${t}`;
    expect((await GET(new Request("http://x/api/admin/accounting"))).status).toBe(403);
    const body = JSON.stringify({ date: "2026-03-01", label: "Test", category: "hosting", basis: "ttc", amount: 1200, vatRate: 2000, paymentMethod: "carte", status: "paid" });
    expect((await POST(new Request("http://x/api/admin/accounting/expenses", { method: "POST", body }))).status).toBe(403);

    jar.token = `tok-admin-${t}`;
    const created = await POST(new Request("http://x/api/admin/accounting/expenses", { method: "POST", body }));
    expect(created.status).toBe(200);
    const res = await GET(new Request("http://x/api/admin/accounting?preset=custom&from=2026-03-01&to=2026-03-31"));
    expect(res.status).toBe(200);
    const r = await res.json();
    const mine = r.entries.find((e: Entry) => e.label === "Test");
    expect(mine).toMatchObject({ ht: 1000, vat: 200, ttc: 1200 });
    // Montant non entier refusé (centimes entiers côté serveur).
    const bad = await POST(new Request("http://x/api/admin/accounting/expenses", { method: "POST", body: body.replace('"amount":1200', '"amount":12.5') }));
    expect(bad.status).toBe(400);
  });
});
