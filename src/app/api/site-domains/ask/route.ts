import { askDomain } from "@/lib/sites/domains";

/**
 * Question du proxy frontal avant d'émettre un certificat HTTPS (Caddy « on_demand_tls { ask … } ») : 200 seulement pour
 * un nom servi par un site en ligne (adresse du studio active, ou domaine relié vérifié), sinon 404. Jeton facultatif
 * `SITES_ASK_TOKEN` passé en paramètre « token ». Aucune information sur le site n'est renvoyée.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const ok = askDomain(u.searchParams.get("domain"), u.searchParams.get("token"));
  return new Response(ok ? "ok" : "non", { status: ok ? 200 : 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
