/**
 * LE MESSAGE D'UNE ERREUR AVEC SA CAUSE (26 novembre 2026, essai Mouture) : « Connection error. » seul ne dit pas ce qui a
 * coupé. Le SDK d'OpenAI garde l'erreur du réseau dans `cause` (« fetch failed », puis par exemple « other side closed »
 * [UND_ERR_SOCKET] ou ECONNRESET, avec les octets envoyés et reçus sur la connexion) : elle est écrite avec le message dans
 * le journal des appels et dans les comptes rendus des essais, pour savoir la prochaine fois d'où vient la coupure. Le
 * message montré au client ne change pas. Rien de secret (ni clé, ni corps de la demande). Sans dépendance : lisible par les
 * scripts d'essai avant l'ouverture de la base.
 */
export function messageAvecCause(e: unknown): string {
  const parts: string[] = [];
  const vus = new Set<unknown>();
  let cur: any = e;
  for (let i = 0; cur != null && i < 5 && !vus.has(cur); i++) {
    vus.add(cur);
    const msg = String(cur instanceof Error ? cur.message : typeof cur === "object" ? (cur.message ?? "") : cur).trim();
    const nom = i > 0 && typeof cur?.name === "string" && cur.name !== "Error" ? `${cur.name}: ` : "";
    const code = typeof cur?.code === "string" || typeof cur?.code === "number" ? ` [${cur.code}]` : "";
    const s = cur?.socket;
    const octets = s && typeof s === "object" && (typeof s.bytesWritten === "number" || typeof s.bytesRead === "number") ? ` (octets envoyés ${s.bytesWritten ?? "?"}, reçus ${s.bytesRead ?? "?"})` : "";
    const texte = `${nom}${msg}${code}${octets}`;
    if (texte && !parts.includes(texte)) parts.push(texte);
    cur = cur?.cause;
  }
  return parts.join(" ← cause : ");
}
