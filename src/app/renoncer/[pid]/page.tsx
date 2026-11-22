import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { BOUTON_CONFIRMER, LIEN_RETRACTATION } from "@/lib/sites/retractation";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: LIEN_RETRACTATION.fr, robots: { index: false } };
}

/**
 * « Renoncer au contrat ici » (directive 2023/2673) : la déclaration en ligne de l'acheteur, puis « Confirmer la
 * rétractation » ; l'accusé daté part par e-mail. Page hébergée par le Studio pour toutes les boutiques qu'il monte.
 */
export default async function Page({ params, searchParams }: { params: Promise<{ pid: string }>; searchParams: Promise<{ recu?: string; accuse?: string; erreur?: string }> }) {
  const { pid } = await params, q = await searchParams;
  const p = one<{ name: string }>("SELECT name FROM projects WHERE id=?", pid);
  if (!p) notFound();
  const box = { maxWidth: 560, margin: "48px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif", lineHeight: 1.5 } as const;
  const field = { display: "block", width: "100%", padding: "10px 12px", marginTop: 6, fontSize: 16, border: "1px solid #888", borderRadius: 8 } as const;
  if (q.recu) {
    const at = new Date(Number(q.recu)).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" });
    return (
      <main style={box}>
        <h1>Rétractation enregistrée</h1>
        <p>Votre rétractation auprès de {p.name} a bien été reçue le {at} (heure de Paris).</p>
        <p>{q.accuse === "1" ? "Un accusé de réception, avec le contenu de votre déclaration, la date et l'heure, vient de vous être envoyé par e-mail." : `${p.name} a été prévenu et vous enverra l'accusé de réception par e-mail.`}</p>
      </main>
    );
  }
  return (
    <main style={box}>
      <h1>{LIEN_RETRACTATION.fr}</h1>
      <p>Vous pouvez renoncer à votre achat chez {p.name} pendant le délai de rétractation de 14 jours. Remplissez ces trois informations, puis confirmez.</p>
      {q.erreur && <p role="alert" style={{ color: "#a00" }}>{q.erreur}</p>}
      <form method="post" action={`/api/renoncer/${encodeURIComponent(pid)}`}>
        <label style={{ display: "block", marginTop: 16 }}>Votre nom<input name="nom" required maxLength={200} autoComplete="name" style={field} /></label>
        <label style={{ display: "block", marginTop: 16 }}>Votre numéro de commande<input name="commande" required maxLength={200} style={field} /></label>
        <label style={{ display: "block", marginTop: 16 }}>Votre adresse e-mail (pour l&apos;accusé de réception)<input name="email" type="email" required maxLength={200} autoComplete="email" style={field} /></label>
        <input name="site_web" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999 }} />
        <button type="submit" style={{ marginTop: 24, padding: "12px 20px", fontSize: 16, borderRadius: 999, border: 0, background: "#111", color: "#fff" }}>{BOUTON_CONFIRMER.fr}</button>
      </form>
    </main>
  );
}
