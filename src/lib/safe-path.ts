/**
 * Chemin de retour après connexion (`?suite=`) : uniquement un chemin interne du site, jamais une autre origine
 * (`//hote`, `/\hote`, `https:`…). Utilisable côté serveur et navigateur.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/studio"): string {
  if (!raw || raw.length > 500) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const u = new URL(raw, "http://interne.invalid");
    if (u.origin !== "http://interne.invalid") return fallback;
    // Pas de retour vers les pages de connexion elles-mêmes (boucle).
    if (/^\/(connexion|inscription)(\/|$)/.test(u.pathname)) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
