import "server-only";
import { env } from "../env";
import { ConfigError } from "../db";
import { RealPostalAdapter } from "./real-adapter";
import { TestPostalAdapter } from "./test-adapter";
import type { PostalAdapter } from "./adapter";

/**
 * Choix du mode. Le mode réel est REFUSÉ explicitement tant que l'adaptateur réel n'a pas
 * été développé et que les paramètres du contrat ne sont pas fournis.
 */
export function postalAdapter(): PostalAdapter {
  if (env.laposteMode === "real") {
    const missing = ["LAPOSTE_CONTRACT_ID", "LAPOSTE_CLIENT_ID", "LAPOSTE_CLIENT_SECRET"].filter((k) => !process.env[k]);
    if (process.env.LAPOSTE_REAL_ADAPTER_READY !== "true") {
      throw new ConfigError("Mode La Poste réel demandé, mais l'adaptateur réel n'est pas développé ni vérifié. Aucun envoi réel n'est possible.");
    }
    if (missing.length) throw new ConfigError(`Mode La Poste réel : paramètres du contrat manquants (${missing.join(", ")}).`);
    return new RealPostalAdapter();
  }
  return new TestPostalAdapter();
}

/** Prix affiché AVANT validation. En mode test, c'est un tarif fictif clairement signalé. */
export function sendPrice(): { cents: number; label: string; fictive: boolean } {
  if (env.laposteMode === "real") {
    const cents = Number(process.env.LAPOSTE_LRAR_PRICE_CENTS);
    if (!Number.isInteger(cents) || cents <= 0) throw new ConfigError("Prix réel du recommandé non configuré (LAPOSTE_LRAR_PRICE_CENTS).");
    return { cents, label: "Lettre recommandée avec avis de réception", fictive: false };
  }
  const cents = Number(process.env.TEST_LRAR_PRICE_CENTS ?? 990);
  return { cents, label: "Lettre recommandée avec avis de réception — TARIF DE TEST (fictif)", fictive: true };
}
