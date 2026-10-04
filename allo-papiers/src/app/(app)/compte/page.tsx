import Link from "next/link";
import { requirePageSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AccountSettings } from "./account-settings";

export const metadata = { title: "Mon compte" };

export default async function Page() {
  const { user } = await requirePageSession();
  const sends = await sql()<{ id: string; status: string; provider_mode: string; created_at: Date; tracking_number: string | null; tracking_is_fictive: boolean }[]>`
    select id, status, provider_mode, created_at, tracking_number, tracking_is_fictive from send_requests where user_id = ${user.id} order by created_at desc limit 20`;
  return (
    <div className="container-page max-w-3xl pb-10">
      <div className="mb-6 mt-6 md:mt-10">
        <p className="eyebrow">Compte</p>
        <h1 className="font-display mt-2 text-[2rem] font-semibold">Mon compte</h1>
        <p className="mt-1 text-muted">{user.email}</p>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Link href="/compte/abonnement" className="card p-5 hover:shadow-lg"><p className="text-sm font-bold uppercase tracking-wider text-muted">Abonnement</p><p className="mt-1 text-xl font-semibold">{user.plan === "plus" ? "Offre Plus" : "Offre gratuite"}</p><p className="text-orange underline">Gérer</p></Link>
        <Link href="/compte/securite" className="card p-5 hover:shadow-lg"><p className="text-sm font-bold uppercase tracking-wider text-muted">Sécurité</p><p className="mt-1 text-xl font-semibold">Clés d'accès, sessions, journal</p><p className="text-orange underline">Gérer</p></Link>
      </div>
      <AccountSettings
        initial={{ display_name: user.display_name ?? "", retention_days: user.retention_days, reminders_enabled: user.reminders_enabled, ai_consent: Boolean(user.ai_consent_at) }}
        email={user.email}
      />
      {sends.length > 0 && (
        <section className="card mt-5 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Historique des envois</h2>
          <ul className="mt-3 grid gap-2">
            {sends.map((s) => (
              <li key={s.id}>
                <Link href={`/envois/${s.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3 hover:border-navy/30">
                  <span>{s.created_at.toLocaleDateString("fr-FR")} · {s.status}{s.tracking_number ? ` · ${s.tracking_number}` : ""}</span>
                  {s.provider_mode === "test" && <span className="chip bg-warn-soft text-warn">Test (fictif)</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
