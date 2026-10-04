"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardCopy, FileDown, Save, Trash2 } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert, ProNotice, Spinner } from "@/components/ui";
import type { AppointmentSheet } from "@/lib/ai/schema";

const toLines = (a: string[]) => a.join("\n");
const fromLines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export function SheetEditor({ id }: { id: string }) {
  const [c, setC] = useState<AppointmentSheet | null>(null);
  const [chrono, setChrono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ sheet: { content: AppointmentSheet } }>(`/api/appointments/${id}`)
      .then((r) => {
        setC(r.sheet.content);
        setChrono(r.sheet.content.chronologie.map((e) => `${e.date ?? ""} | ${e.evenement}`).join("\n"));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Chargement impossible."));
  }, [id]);

  function current(): AppointmentSheet {
    return {
      ...c!,
      pieces_a_apporter: fromLines(c!.pieces_a_apporter.join("\n")),
      questions_a_poser: fromLines(c!.questions_a_poser.join("\n")),
      points_attention: fromLines(c!.points_attention.join("\n")),
      chronologie: fromLines(chrono).map((l) => {
        const [d, ...rest] = l.split("|");
        const date = d.trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(date) ? { date, evenement: rest.join("|").trim() } : { date: null, evenement: l.replace(/^\s*\|\s*/, "") };
      }),
    };
  }

  async function save() {
    setError(null);
    try {
      await api(`/api/appointments/${id}`, { method: "PATCH", json: { content: current() } });
      setMsg("Fiche enregistrée.");
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
      return false;
    }
  }

  async function copy() {
    const x = current();
    const text = [x.titre, "", "Résumé", x.resume, "", "Chronologie", ...x.chronologie.map((e) => `- ${e.date ?? ""} ${e.evenement}`), "", "Pièces à apporter", ...x.pieces_a_apporter.map((p) => `- ${p}`), "", "Questions à poser", ...x.questions_a_poser.map((p) => `- ${p}`), "", "Points d'attention", ...x.points_attention.map((p) => `- ${p}`)].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Fiche copiée.");
    } catch {
      setError("Copie impossible sur cet appareil.");
    }
  }

  if (!c) return <div className="container-page py-16">{error ? <Alert tone="danger">{error}</Alert> : <Spinner />}</div>;
  const list = (k: "pieces_a_apporter" | "questions_a_poser" | "points_attention", label: string) => (
    <div>
      <label className="field-label" htmlFor={k}>{label}</label>
      <textarea id={k} className="input" value={toLines(c[k])} onChange={(e) => setC({ ...c, [k]: e.target.value.split("\n") })} />
      <span className="field-help">Un élément par ligne.</span>
    </div>
  );

  return (
    <div className="container-page max-w-3xl pb-10">
      <div className="mb-5 mt-6 md:mt-10">
        <Link href="/rendez-vous" className="text-[0.95rem] font-semibold text-muted hover:text-orange">← Mes fiches</Link>
      </div>
      <Alert tone="info" className="mb-4">Cette fiche vous aide à préparer l'entretien. Aucun rendez-vous n'est réservé par Allô Papiers.</Alert>
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      {msg && <Alert tone="ok" className="mb-4">{msg}</Alert>}
      <div className="card grid gap-5 p-5 sm:p-6">
        <div><label className="field-label" htmlFor="titre">Titre</label><input id="titre" className="input" value={c.titre} onChange={(e) => setC({ ...c, titre: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="resume">Résumé de la situation</label><textarea id="resume" className="input" value={c.resume} onChange={(e) => setC({ ...c, resume: e.target.value })} /></div>
        <div>
          <label className="field-label" htmlFor="chrono">Chronologie</label>
          <textarea id="chrono" className="input" value={chrono} onChange={(e) => setChrono(e.target.value)} placeholder="2026-09-12 | Courrier reçu de la CAF" />
          <span className="field-help">Une ligne par événement : date (AAAA-MM-JJ, facultative) | description.</span>
        </div>
        {list("pieces_a_apporter", "Pièces à apporter")}
        {list("questions_a_poser", "Questions à poser")}
        {list("points_attention", "Points d'attention")}
        <div className="grid gap-3 sm:grid-cols-3">
          <button className="btn btn-outline" onClick={save}><Save className="h-5 w-5" aria-hidden /> Enregistrer</button>
          <button className="btn btn-outline" onClick={copy}><ClipboardCopy className="h-5 w-5" aria-hidden /> Copier</button>
          <button className="btn btn-primary" onClick={async () => { if (await save()) location.href = `/api/appointments/${id}/pdf`; }}><FileDown className="h-5 w-5" aria-hidden /> PDF</button>
        </div>
      </div>
      <button className="btn btn-danger mt-6" onClick={async () => { if (confirm("Supprimer cette fiche ?")) { await api(`/api/appointments/${id}`, { method: "DELETE" }); location.href = "/rendez-vous"; } }}><Trash2 className="h-5 w-5" aria-hidden /> Supprimer</button>
      <ProNotice className="mt-6" />
    </div>
  );
}
