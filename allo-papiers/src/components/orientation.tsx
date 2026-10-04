"use client";

import { useState } from "react";
import { ExternalLink, LocateFixed, MapPin, Phone, Search } from "lucide-react";
import { api, ApiError } from "./api";
import { Alert, Spinner } from "./ui";

type Office = {
  id: string;
  nom: string;
  adresse: string | null;
  codePostal: string | null;
  commune: string | null;
  telephone: string | null;
  horaires: string[];
  siteInternet: string | null;
  urlServicePublic: string | null;
  distanceKm: number | null;
  miseAJour: string | null;
  source: string;
};

type Result = { ok: true; offices: Office[]; place: string | null; officialSearch: string; espace: { label: string; url: string } | null } | { ok: false; message: string; officialSearch: string };

export const KIND_LABELS: Record<string, string> = {
  france_services: "France Services",
  caf: "CAF",
  cpam: "CPAM",
  impots: "Centre des finances publiques",
  mairie: "Mairie",
  urssaf: "URSSAF",
  france_travail: "France Travail",
  prefecture: "Préfecture",
  carsat: "Retraite (Carsat)",
};

/** Coordonnées issues de l'annuaire officiel — jamais inventées, toujours avec la source et la date. */
export function OrientationPanel({ initialKind = "france_services", lockKind = false }: { initialKind?: string; lockKind?: boolean }) {
  const [kind, setKind] = useState(initialKind);
  const [cp, setCp] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(params: Record<string, string>) {
    setBusy(true);
    setError(null);
    try {
      setResult(await api<Result>(`/api/annuaire?${new URLSearchParams({ type: kind, ...params })}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Recherche impossible.");
    } finally {
      setBusy(false);
    }
  }

  function locate() {
    if (!("geolocation" in navigator)) return setError("La localisation n'est pas disponible sur cet appareil. Saisissez votre code postal.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => void search({ lat: pos.coords.latitude.toFixed(4), lon: pos.coords.longitude.toFixed(4) }),
      () => {
        setBusy(false);
        setError("Localisation refusée ou indisponible. Saisissez votre code postal.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <div>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (/^\d{5}$/.test(cp)) void search({ cp });
          else setError("Saisissez un code postal à 5 chiffres.");
        }}
      >
        {!lockKind && (
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="kind">Organisme recherché</label>
            <select id="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="field-label" htmlFor="cp">Votre code postal</label>
          <input id="cp" className="input" inputMode="numeric" maxLength={5} autoComplete="postal-code" value={cp} onChange={(e) => setCp(e.target.value.replace(/\D/g, ""))} placeholder="Ex. 69003" />
        </div>
        <button className="btn btn-navy self-end" disabled={busy}><Search className="h-5 w-5" aria-hidden /> Rechercher</button>
      </form>
      <button type="button" onClick={locate} className="mt-3 inline-flex items-center gap-2 font-semibold text-orange underline" disabled={busy}>
        <LocateFixed className="h-5 w-5" aria-hidden /> Utiliser ma position (avec votre accord, non conservée)
      </button>

      <div className="mt-5" aria-live="polite">
        {busy && <Spinner label="Recherche dans l'annuaire officiel…" />}
        {error && <Alert tone="warn">{error}</Alert>}
        {result && !result.ok && (
          <Alert tone="warn">
            {result.message}{" "}
            <a className="font-semibold underline" href={result.officialSearch} target="_blank" rel="noreferrer">Ouvrir l'annuaire officiel</a>
          </Alert>
        )}
        {result?.ok && (
          <div className="grid gap-4">
            {result.place && <p className="text-muted">Résultats près de {result.place}</p>}
            {result.offices.length === 0 && (
              <Alert tone="info">
                Aucun résultat dans l'annuaire pour cette recherche.{" "}
                <a className="font-semibold underline" href={result.officialSearch} target="_blank" rel="noreferrer">Chercher sur l'annuaire officiel</a>
              </Alert>
            )}
            {result.offices.map((o) => (
              <article key={o.id} className="rounded-2xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold">{o.nom}</h3>
                  {o.distanceKm != null && <span className="chip">{o.distanceKm.toLocaleString("fr-FR")} km</span>}
                </div>
                {(o.adresse || o.commune) && (
                  <p className="mt-2 flex gap-2 text-ink/85"><MapPin className="mt-1 h-4 w-4 shrink-0 text-orange" aria-hidden />{[o.adresse, [o.codePostal, o.commune].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p>
                )}
                {o.telephone && (
                  <a href={`tel:${o.telephone.replace(/\s/g, "")}`} className="btn btn-outline mt-3 !min-h-11 w-full sm:w-auto"><Phone className="h-5 w-5" aria-hidden /> {o.telephone}</a>
                )}
                {o.horaires.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer font-semibold">Horaires</summary>
                    <ul className="mt-2 grid gap-1 text-[0.95rem] text-muted">{o.horaires.map((h) => <li key={h}>{h}</li>)}</ul>
                  </details>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.95rem]">
                  {o.siteInternet && <a className="inline-flex items-center gap-1 font-semibold text-orange underline" href={o.siteInternet} target="_blank" rel="noreferrer">Site officiel <ExternalLink className="h-4 w-4" aria-hidden /></a>}
                  {o.urlServicePublic && <a className="inline-flex items-center gap-1 font-semibold text-orange underline" href={o.urlServicePublic} target="_blank" rel="noreferrer">Fiche service-public <ExternalLink className="h-4 w-4" aria-hidden /></a>}
                </div>
                <p className="mt-3 text-sm text-muted">Source : {o.source}{o.miseAJour ? ` — mis à jour le ${new Date(o.miseAJour).toLocaleDateString("fr-FR")}` : ""}.</p>
              </article>
            ))}
            {result.espace && (
              <p className="text-[0.97rem] text-muted">
                Espace en ligne officiel : <a className="font-semibold text-orange underline" href={result.espace.url} target="_blank" rel="noreferrer">{result.espace.label}</a> — vous vous y connectez vous-même ; Allô Papiers n'y accède jamais.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
