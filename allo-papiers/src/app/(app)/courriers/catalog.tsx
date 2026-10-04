"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, FileText, Search } from "lucide-react";
import { PageTitle, ProNotice } from "@/components/ui";

type T = { id: string; domain: string; title: string; description: string; keywords: string[]; plus: boolean };

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function Catalog({ templates, domains, letters, plan }: { templates: T[]; domains: Record<string, string>; letters: { id: string; title: string; updated_at: string; reviewed_at: string | null }[]; plan: string }) {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("");
  const list = useMemo(() => {
    const nq = norm(q.trim());
    return templates.filter((t) => (!domain || t.domain === domain) && (!nq || norm(`${t.title} ${t.description} ${t.keywords.join(" ")}`).includes(nq)));
  }, [q, domain, templates]);

  return (
    <div className="container-page max-w-5xl pb-10">
      <PageTitle eyebrow="Rédaction guidée" title="Rédiger un courrier, sans document">
        Choisissez votre démarche, répondez à quelques questions : vous obtenez un courrier clair, modifiable, à relire avant de l'utiliser.
      </PageTitle>

      {letters.length > 0 && (
        <section className="card mb-8 p-5">
          <h2 className="text-lg font-semibold">Mes courriers</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {letters.map((l) => (
              <li key={l.id}>
                <Link href={`/courriers/${l.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 hover:border-navy/30">
                  <span className="min-w-0"><span className="block truncate font-semibold">{l.title}</span><span className="text-sm text-muted">Modifié le {new Date(l.updated_at).toLocaleDateString("fr-FR")}{l.reviewed_at ? " · relu" : ""}</span></span>
                  <FileText className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr]">
        <label className="relative">
          <span className="sr-only">Rechercher une démarche</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input !pl-12" placeholder="Ex. démission, dépôt de garantie, résiliation…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Domaine">
          <option value="">Tous les domaines</option>
          {Object.entries(domains).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(domains).map(([k, v]) => (
          <button key={k} className={`chip !min-h-10 !px-4 ${domain === k ? "!bg-navy text-white" : "hover:bg-orange-soft"}`} onClick={() => setDomain(domain === k ? "" : k)} aria-pressed={domain === k}>{v}</button>
        ))}
      </div>

      <p className="mt-5 text-sm text-muted" aria-live="polite">{list.length} démarche{list.length > 1 ? "s" : ""}</p>
      <ul className="mt-3 grid gap-3 md:grid-cols-2">
        {list.map((t) => (
          <li key={t.id}>
            <Link href={`/courriers/nouveau/${t.id}`} className="card flex h-full items-start justify-between gap-3 p-5 transition-shadow hover:shadow-lg">
              <span>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-dark">{domains[t.domain]}{t.plus ? " · Plus" : ""}</span>
                <span className="mt-1 block text-lg font-semibold leading-snug">{t.title}</span>
                <span className="mt-1 block text-[0.96rem] text-muted">{t.description}</span>
              </span>
              <ArrowRight className="mt-6 h-5 w-5 shrink-0 text-orange" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {plan === "free" && <p className="mt-6 text-sm text-muted">La rédaction guidée est incluse dans l'offre gratuite.</p>}
      <ProNotice className="mt-6" />
    </div>
  );
}
