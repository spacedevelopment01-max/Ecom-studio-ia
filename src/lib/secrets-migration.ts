/**
 * Migration des secrets chiffrés avec l'ancienne constante de développement vers le secret maître actuel.
 * Aucune clé n'est perdue : une valeur illisible avec les deux secrets est laissée telle quelle (jamais effacée),
 * et `decrypt` sait toujours relire l'ancien chiffrement tant que la migration n'a pas tourné.
 */
import { all, run, tx } from "./db";
import { reencryptLegacy } from "./secrets";

/** Rechiffre les clés d'API (réglages secrets) et les jetons de connexion (réseaux, Shopify). Renvoie le nombre de valeurs migrées. */
export function migrateLegacySecrets(): number {
  let n = 0;
  tx(() => {
    for (const r of all<{ key: string; value: string }>("SELECT key, value FROM settings WHERE secret = 1")) {
      const v = reencryptLegacy(r.value);
      if (v) run("UPDATE settings SET value = ? WHERE key = ? AND value = ?", v, r.key, r.value), n++;
    }
    for (const c of all<{ id: string; access_token: string | null; refresh_token: string | null }>("SELECT id, access_token, refresh_token FROM connections")) {
      for (const col of ["access_token", "refresh_token"] as const) {
        const v = reencryptLegacy(c[col]);
        if (v) run(`UPDATE connections SET ${col} = ? WHERE id = ? AND ${col} = ?`, v, c.id, c[col]), n++;
      }
    }
  });
  return n;
}
