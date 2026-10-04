"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileText, FlaskConical, Paperclip, Send } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert, euros, Spinner } from "@/components/ui";

type Addr = { name: string; line1: string; line2: string; postalCode: string; city: string };
type Data = {
  send: {
    id: string;
    status: string;
    mode: "test" | "real";
    nature: string;
    body: string;
    sender: Addr;
    recipient: Addr;
    recipientSource: string;
    attachments: { label: string }[];
    priceCents: number;
    priceFictive: boolean;
    contentHash: string;
    validatedAt: string | null;
    validatedValid: boolean;
    trackingNumber: string | null;
    trackingFictive: boolean;
    letterId: string | null;
  };
  statement: string;
  events: { at: string; status: string; detail: string }[];
};

const STATUS: Record<string, string> = {
  draft: "Brouillon — en attente de votre validation",
  validated: "Validé — en attente de paiement",
  payment_pending: "Paiement en cours de confirmation",
  paid: "Payé — transmission en cours",
  submitted: "Transmis",
  failed: "Échec",
  cancelled: "Annulé",
};

function lines(a: Addr) {
  return [a.name, a.line1, a.line2, `${a.postalCode} ${a.city}`].filter((l) => l && l.trim());
}

export function SendReview({ id, retour }: { id: string; retour: string | null }) {
  const [data, setData] = useState<Data | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api<Data>(`/api/sends/${id}`).then(setData).catch((e) => setError(e instanceof ApiError ? e.message : "Chargement impossible.")), [id]);
  useEffect(() => void load(), [load]);
  // Après le paiement : on attend la confirmation SERVEUR (webhook Stripe), pas la page de retour.
  useEffect(() => {
    if (!data || !["payment_pending", "paid"].includes(data.send.status)) return;
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [data, load]);

  async function send() {
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/sends/${id}/validate`, { method: "POST", json: { accepted: checked, contentHash: data.send.contentHash } });
      const r = await api<{ url: string }>(`/api/sends/${id}/pay`, { method: "POST" });
      location.href = r.url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Envoi impossible.");
      setBusy(false);
      void load();
    }
  }

  if (!data) return <div className="container-page py-16">{error ? <Alert tone="danger">{error}</Alert> : <Spinner />}</div>;
  const s = data.send;
  const editable = s.status === "draft" || s.status === "validated";

  return (
    <div className="container-page max-w-3xl pb-10">
      <div className="mb-5 mt-6 md:mt-10">
        {s.letterId && <Link href={`/courriers/${s.letterId}`} className="text-[0.95rem] font-semibold text-muted hover:text-orange">← Retour au courrier</Link>}
        <h1 className="font-display mt-3 text-[1.9rem] font-semibold md:text-[2.3rem]">Récapitulatif de l'envoi</h1>
        <p className="mt-1 font-semibold text-muted">{STATUS[s.status] ?? s.status}</p>
      </div>

      {s.mode === "test" && (
        <Alert tone="warn" title="MODE TEST — aucun courrier ne sera réellement envoyé" className="mb-5">
          <FlaskConical className="mr-1 inline h-4 w-4" aria-hidden />Le dépôt et la distribution sont simulés et le numéro de suivi est fictif. Le paiement passe par Stripe en mode test (carte de test). L'envoi réel par La Poste sera activé après signature d'un contrat et vérification de l'intégration.
        </Alert>
      )}
      {retour === "annule" && editable && <Alert tone="info" className="mb-5">Paiement annulé : rien n'a été envoyé ni débité.</Alert>}
      {error && <Alert tone="danger" className="mb-5">{error}</Alert>}

      <section className="card grid gap-5 p-5 sm:p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-muted">Nature de l'envoi</p>
          <p className="mt-1 font-semibold">{s.nature}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-muted">Expéditeur</p>
            <p className="mt-1 whitespace-pre-line">{lines(s.sender).join("\n")}</p>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-muted">Destinataire et adresse</p>
            <p className="mt-1 whitespace-pre-line font-semibold">{lines(s.recipient).join("\n")}</p>
            <p className="mt-1 text-sm text-muted">Origine : {s.recipientSource === "courrier" ? "extraite du courrier reçu" : s.recipientSource === "annuaire" ? "annuaire officiel" : "saisie par vous"}</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-muted">Texte final</p>
          <div className="prose-letter mt-2 max-h-[28rem] overflow-y-auto rounded-2xl border border-line bg-[#fffdf9] p-4 text-[0.98rem]">{s.body}</div>
          <a href={`/api/sends/${id}/pdf`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 font-semibold text-orange underline"><FileText className="h-5 w-5" aria-hidden /> Voir le PDF exact qui sera imprimé</a>
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-muted">Pièces jointes</p>
          {s.attachments.length === 0 ? <p className="mt-1 text-muted">Aucune</p> : (
            <ul className="mt-1 grid gap-1">{s.attachments.map((a, i) => <li key={i} className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-muted" aria-hidden />{a.label}</li>)}</ul>
          )}
        </div>
        <div className="rounded-2xl bg-sand/70 p-4">
          <p className="text-sm font-bold uppercase tracking-wider text-muted">Prix total</p>
          <p className="mt-1 text-3xl font-semibold">{euros(s.priceCents)} <span className="text-base font-normal text-muted">TTC</span></p>
          {s.priceFictive && <p className="text-sm font-semibold text-warn">Tarif de test, fictif : aucun montant réel ne sera prélevé en mode test.</p>}
        </div>
      </section>

      {editable && (
        <section className="card mt-5 p-5 sm:p-6">
          <label className="flex items-start gap-3 rounded-2xl border-2 border-orange/50 bg-orange-soft/60 p-4">
            <input type="checkbox" className="check" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span className="text-[1.05rem] font-semibold">{data.statement}</span>
          </label>
          <p className="mt-3 text-[0.95rem] text-muted">
            Nous conservons la preuve de votre validation : date, heure, version exacte du texte, destinataire, pièces et prix. Toute modification ultérieure annule cette validation.
          </p>
          <button className="btn btn-primary mt-4 w-full" onClick={send} disabled={!checked || busy}>
            <Send className="h-5 w-5" aria-hidden /> {busy ? "Ouverture du paiement…" : `Envoyer — payer ${euros(s.priceCents)}`}
          </button>
          <p className="mt-2 text-sm text-muted">Le courrier n'est transmis qu'après confirmation du paiement par notre serveur.</p>
        </section>
      )}

      {!editable && (
        <section className="card mt-5 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Suivi</h2>
          {["payment_pending", "paid"].includes(s.status) && <p className="mt-2"><Spinner label="En attente de la confirmation du paiement par Stripe…" /></p>}
          {s.trackingNumber && (
            <p className="mt-3 text-lg">
              Numéro de suivi : <strong>{s.trackingNumber}</strong>
              {s.trackingFictive && <span className="ml-2 chip bg-warn-soft text-warn">FICTIF — mode test</span>}
            </p>
          )}
          <ol className="mt-4 grid gap-3 border-l-2 border-line pl-5">
            {data.events.map((e, i) => (
              <li key={i}>
                <p className="font-semibold">{e.detail}</p>
                <p className="text-sm text-muted">{new Date(e.at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
