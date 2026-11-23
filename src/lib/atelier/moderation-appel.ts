/**
 * L'appel réseau à la modération GRATUITE d'OpenAI (« The moderation endpoint is free to use »), par la clé d'OpenAI
 * du Studio saisie dans Administration › Fournisseurs IA. Null sans clé ou quand le service ne répond pas : rien
 * n'est alors vérifié. Seul fichier qui sort sur le réseau pour la vérification : les essais le remplacent par une
 * fausse vérification (`tests/database-file-setup.ts`), jamais un appel réel.
 */
import { activeProviderKey } from "../ai/config";
import { MODERATION_URL } from "./garde-fous";

export async function appelModeration(body: unknown): Promise<any | null> {
  const key = activeProviderKey("openai");
  if (!key) return null;
  const r = await fetch(MODERATION_URL, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) return null;
  return r.json();
}
