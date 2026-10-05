import { handleStripeEvent, verifyStripeSignature } from "@/lib/payments";
import { logError } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"))) return new Response("Signature invalide", { status: 400 });
  try {
    // Un événement déjà traité répond 200 tout de suite (journal des événements, voir payments.ts).
    await handleStripeEvent(JSON.parse(payload));
    return Response.json({ received: true });
  } catch (e) {
    logError("stripe:webhook", e);
    return new Response("Erreur de traitement", { status: 500 });
  }
}
