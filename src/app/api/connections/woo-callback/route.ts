import { connectStore } from "@/lib/products/sync";
import { etatAutorisationWoo } from "@/lib/integrations/ventes";

export const runtime = "nodejs";

/** WooCommerce remet la clé après « Approuver » (recherche 08) : vérifiée, essayée, puis enregistrée chiffrée. */
export async function POST(req: Request) {
  const b: any = await req.json().catch(() => null);
  const etat = b ? etatAutorisationWoo(String(b.user_id ?? "")) : null;
  if (!etat || !b?.consumer_key || !b?.consumer_secret) return new Response("refusé", { status: 400 });
  try {
    await connectStore(etat.projectId, etat.userId, { platform: "woocommerce", url: etat.storeUrl, key: String(b.consumer_key), secret: String(b.consumer_secret) });
    return new Response("ok", { status: 200 });
  } catch { return new Response("refusé", { status: 400 }); }
}
