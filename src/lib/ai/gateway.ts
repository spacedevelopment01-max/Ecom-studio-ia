/**
 * Clé injectée par la passerelle réseau de l'hébergement (`AI_GATEWAY_PROVIDERS=openai`) : le studio ne connaît pas
 * la clé, il envoie la requête SANS en-tête d'autorisation et la passerelle ajoute la vraie clé à la sortie. Utilisé
 * seulement quand aucune clé n'est saisie (administration ou environnement) ; le bouton « Désactiver » de
 * l'administration coupe ces appels comme les autres.
 */
export const GATEWAY_KEY = "gateway-injected";
/** Fournisseurs dont tous les appels du studio savent se passer de l'en-tête d'autorisation. */
const GATEWAY_READY = ["openai"] as const;
export type GatewayProvider = (typeof GATEWAY_READY)[number];

export const gatewayProviders = (): string[] =>
  (process.env.AI_GATEWAY_PROVIDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => (GATEWAY_READY as readonly string[]).includes(s));

export const isGatewayKey = (k: string | null | undefined): boolean => k === GATEWAY_KEY;

/** En-têtes d'autorisation d'un appel : aucun quand la passerelle injecte la clé. */
export const bearer = (key: string): Record<string, string> => (isGatewayKey(key) ? {} : { authorization: `Bearer ${key}` });
