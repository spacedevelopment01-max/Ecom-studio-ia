"use client";

import { useState } from "react";
import { Download, LogOut, Trash2 } from "lucide-react";
import { api, ApiError, withStepUp } from "@/components/api";
import { Alert } from "@/components/ui";

type S = { display_name: string; retention_days: number | null; reminders_enabled: boolean; ai_consent: boolean };
const RETENTION = [
  { v: "30", l: "30 jours" },
  { v: "90", l: "3 mois" },
  { v: "365", l: "1 an (par défaut)" },
  { v: "1095", l: "3 ans" },
  { v: "", l: "Jusqu'à ce que je les supprime" },
];

export function AccountSettings({ initial, email }: { initial: S; email: string }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");

  async function save(patch: Partial<S>) {
    setError(null);
    setMsg(null);
    try {
      const { ai_consent, ...rest } = patch;
      if (Object.keys(rest).length) await api("/api/account", { method: "PATCH", json: rest });
      if (ai_consent !== undefined) await api("/api/account/consent-ai", { method: "POST", json: { accept: ai_consent } });
      setS((x) => ({ ...x, ...patch }));
      setMsg("Préférences enregistrées.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    }
  }

  async function exportData() {
    try {
      await withStepUp(async () => {
        const r = await fetch("/api/account/export");
        if (r.status === 403) throw new ApiError(403, "verification_requise", "");
        if (!r.ok) throw new ApiError(r.status, "erreur", "Export impossible.");
        const url = URL.createObjectURL(await r.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = "allo-papiers-mes-donnees.json";
        a.click();
      });
    } catch (e) {
      if (!(e instanceof ApiError && e.code === "verification_annulee")) setError(e instanceof ApiError ? e.message : "Export impossible.");
    }
  }

  async function deleteAccount() {
    if (!confirm("Supprimer définitivement votre compte, tous vos documents et votre abonnement ? Cette action est irréversible.")) return;
    try {
      await withStepUp(() => api("/api/account", { method: "DELETE", json: { confirmEmail } }));
      location.href = "/?compte=supprime";
    } catch (e) {
      if (!(e instanceof ApiError && e.code === "verification_annulee")) setError(e instanceof ApiError ? e.message : "Suppression impossible.");
    }
  }

  return (
    <div className="grid gap-5">
      {msg && <Alert tone="ok">{msg}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      <section className="card grid gap-4 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Préférences</h2>
        <div>
          <label className="field-label" htmlFor="name">Prénom ou nom affiché</label>
          <div className="flex gap-2"><input id="name" className="input" value={s.display_name} onChange={(e) => setS({ ...s, display_name: e.target.value })} /><button className="btn btn-outline" onClick={() => save({ display_name: s.display_name })}>OK</button></div>
        </div>
        <div>
          <label className="field-label" htmlFor="ret">Conservation de mes documents</label>
          <select id="ret" className="input" value={s.retention_days == null ? "" : String(s.retention_days)} onChange={(e) => save({ retention_days: e.target.value ? Number(e.target.value) : null })}>
            {RETENTION.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
          <span className="field-help">Au-delà, les documents (fichiers, analyses, échanges) sont supprimés automatiquement.</span>
        </div>
        <label className="flex items-start gap-3"><input type="checkbox" className="check" checked={s.reminders_enabled} onChange={(e) => save({ reminders_enabled: e.target.checked })} /><span>Recevoir les rappels d'échéances par email</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" className="check" checked={s.ai_consent} onChange={(e) => save({ ai_consent: e.target.checked })} /><span>J'accepte le traitement de mes documents par le fournisseur d'IA (nécessaire pour l'analyse ; vous pouvez le retirer à tout moment)</span></label>
      </section>
      <section className="card grid gap-4 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Mes données</h2>
        <button className="btn btn-outline w-full sm:w-auto" onClick={exportData}><Download className="h-5 w-5" aria-hidden /> Exporter mes données (JSON)</button>
        <button className="btn btn-outline w-full sm:w-auto" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}><LogOut className="h-5 w-5" aria-hidden /> Se déconnecter</button>
      </section>
      <section className="card grid gap-3 border-[#f2c4c0] p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-danger">Supprimer mon compte</h2>
        <p className="text-[0.97rem] text-muted">Tout est supprimé : fichiers dans le stockage, analyses, dossiers, courriers, preuves d'envoi. Un abonnement en cours est arrêté. Les factures restent chez Stripe (obligations comptables).</p>
        <label className="field-label" htmlFor="confirm-email">Pour confirmer, saisissez votre adresse email ({email})</label>
        <input id="confirm-email" className="input" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} autoComplete="off" />
        <button className="btn btn-danger" onClick={deleteAccount} disabled={confirmEmail.trim().toLowerCase() !== email}><Trash2 className="h-5 w-5" aria-hidden /> Supprimer définitivement</button>
      </section>
    </div>
  );
}
