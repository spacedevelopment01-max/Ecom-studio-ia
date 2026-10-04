import Link from "next/link";
import { BellRing, Camera, CalendarClock, FolderOpen, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import { requireSession, userHasPasskey } from "@/lib/auth";
import { sql } from "@/lib/db";
import { usage } from "@/lib/quota";
import { aiMode } from "@/lib/ai/provider";
import { Alert, ProNotice, UrgencyBadge } from "@/components/ui";
import { formatFrDate, nextMonthStart, parisDate, daysBetween } from "@/lib/time";

export const metadata = { title: "Mon espace" };

export default async function Page({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const { bienvenue } = await searchParams;
  const { user } = await requireSession();
  const u = await usage(user.id);
  const today = parisDate();
  const urgent = await sql()<{ id: string; title: string; urgency: "vert" | "orange" | "rouge"; deadline: string | null }[]>`
    select id, title, urgency, to_char(deadline, 'YYYY-MM-DD') as deadline from documents
     where user_id = ${user.id} and status = 'analyzed' and user_status in ('a_traiter', 'en_attente')
     order by case urgency when 'rouge' then 0 when 'orange' then 1 else 2 end, deadline nulls last limit 5`;
  const deadlines = await sql()<{ id: string; label: string; due_date: string; confirmed_at: Date | null }[]>`
    select id, label, to_char(due_date, 'YYYY-MM-DD') as due_date, confirmed_at from deadlines
     where user_id = ${user.id} and enabled and due_date >= ${today}::date order by due_date limit 5`;
  const hasPasskey = await userHasPasskey(user.id);
  const mode = aiMode();
  const left = Math.max(0, u.limits.document - u.used.document);

  return (
    <div className="container-page max-w-5xl pb-10">
      <div className="mb-6 mt-6 md:mt-10">
        <p className="eyebrow">Mon espace</p>
        <h1 className="font-display mt-2 text-[2rem] font-semibold md:text-[2.6rem]">Bonjour{user.display_name ? ` ${user.display_name}` : ""}&nbsp;!</h1>
      </div>
      {bienvenue && (
        <Alert tone="ok" title="Votre compte est créé" className="mb-5">
          Bienvenue sur Allô Papiers. Pour protéger votre coffre-fort, vous pouvez ajouter une clé d'accès (empreinte ou visage) dans <Link href="/compte/securite" className="font-semibold underline">Sécurité</Link>.
        </Alert>
      )}
      {mode === "absent" && (
        <Alert tone="warn" title="Analyse par IA pas encore activée" className="mb-5">La rédaction guidée, les dossiers, les rappels et le coffre-fort fonctionnent. L'analyse automatique sera disponible dès que la clé du fournisseur d'IA sera configurée.</Alert>
      )}

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Link href="/nouveau" className="neon card group flex items-center gap-4 p-6">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-orange text-white"><Camera className="h-8 w-8" aria-hidden /></span>
          <span>
            <span className="block text-xl font-semibold">Comprendre un document</span>
            <span className="text-muted">Photo ou PDF · explication en moins d'une minute</span>
          </span>
        </Link>
        <div className="card p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-muted">{u.plan === "plus" ? "Offre Plus" : "Offre gratuite"}</p>
          <p className="mt-2 text-3xl font-semibold">{left} <span className="text-lg font-normal text-muted">document{left > 1 ? "s" : ""} restant{left > 1 ? "s" : ""}</span></p>
          <div className="mt-3 h-2 rounded-full bg-sand" aria-hidden><div className="h-2 rounded-full bg-orange" style={{ width: `${Math.min(100, (u.used.document / Math.max(1, u.limits.document)) * 100)}%` }} /></div>
          <p className="mt-2 text-sm text-muted">Renouvellement le {formatFrDate(nextMonthStart())}.</p>
          {u.plan === "free" && <Link href="/compte/abonnement" className="mt-3 inline-block font-semibold text-orange underline">Découvrir l'offre Plus</Link>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { href: "/courriers", icon: PenLine, l: "Rédiger un courrier" },
          { href: "/dossiers", icon: FolderOpen, l: "Mes dossiers" },
          { href: "/rappels", icon: BellRing, l: "Échéances" },
          { href: "/coffre-fort", icon: ShieldCheck, l: "Coffre-fort" },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="card flex min-h-24 flex-col items-start justify-between gap-2 p-4 hover:shadow-lg">
            <x.icon className="h-6 w-6 text-orange" aria-hidden />
            <span className="font-semibold leading-tight">{x.l}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="h-5 w-5 text-orange" aria-hidden /> À traiter en priorité</h2>
          {urgent.length === 0 ? (
            <p className="mt-3 text-muted">Rien en attente. <Link href="/documents" className="font-semibold underline">Voir mes documents</Link></p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {urgent.map((d) => (
                <li key={d.id}>
                  <Link href={`/documents/${d.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 hover:border-navy/30">
                    <span className="min-w-0"><span className="block truncate font-semibold">{d.title}</span>{d.deadline && <span className="text-sm text-muted">Avant le {formatFrDate(d.deadline)}</span>}</span>
                    <UrgencyBadge level={d.urgency} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><CalendarClock className="h-5 w-5 text-orange" aria-hidden /> Prochaines échéances</h2>
          {deadlines.length === 0 ? (
            <p className="mt-3 text-muted">Aucune échéance à venir.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {deadlines.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <span className="min-w-0"><span className="block truncate font-semibold">{d.label}</span><span className="text-sm text-muted">{formatFrDate(d.due_date)} · dans {daysBetween(today, d.due_date)} j</span></span>
                  {d.confirmed_at ? <span className="chip bg-ok-soft text-ok">Rappels actifs</span> : <Link href="/rappels" className="chip bg-warn-soft text-warn">À confirmer</Link>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {!hasPasskey && (
        <Alert tone="info" title="Protégez votre coffre-fort" className="mt-6">
          Ajoutez une clé d'accès : vous ouvrirez votre coffre avec l'empreinte, le visage ou le code de votre téléphone. Votre empreinte reste sur l'appareil. <Link href="/compte/securite" className="font-semibold underline">Ajouter une clé d'accès</Link>
        </Alert>
      )}
      <ProNotice className="mt-6" />
    </div>
  );
}
