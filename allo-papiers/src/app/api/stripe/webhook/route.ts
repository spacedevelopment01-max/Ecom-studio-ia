import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handleStripeEvent, stripe } from "@/lib/billing";

/**
 * Webhook Stripe : la SIGNATURE est vérifiée avec le secret du webhook. Une simple visite de
 * la page de succès ne prouve rien ; seul cet événement signé active l'offre ou un envoi.
 */
export async function POST(req: Request) {
  const secret = env.stripeWebhookSecret;
  if (!secret || !env.stripeSecret) return NextResponse.json({ error: "non_configure" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "signature" }, { status: 400 });
  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "signature_invalide" }, { status: 400 });
  }
  try {
    const outcome = await handleStripeEvent(event);
    return NextResponse.json({ received: true, outcome });
  } catch (e) {
    console.error("[stripe] traitement échoué", event.type, e instanceof Error ? e.message.slice(0, 160) : "");
    // 500 → Stripe renverra l'événement plus tard (traitement idempotent).
    return NextResponse.json({ error: "traitement" }, { status: 500 });
  }
}
