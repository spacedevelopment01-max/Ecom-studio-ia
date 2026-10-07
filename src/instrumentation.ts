/** Démarrage du serveur Next.js : masquage des secrets dans tout ce que le serveur écrit en console. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") (await import("./lib/redact")).installConsoleRedaction();
}
