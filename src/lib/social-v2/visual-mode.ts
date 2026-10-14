/** Trois façons de faire le visuel d'une publication (choix du client, prix affiché avant toute dépense). */
export type VisualMode = "free" | "ai_image" | "ai_post";

/** Paramètres d'estimation / de production pour un mode : gratuit, image de fond par l'IA, publication entière par l'IA. */
export const visualParams = (m: VisualMode) => (m === "free" ? { allowPaid: false } : m === "ai_image" ? { allowPaid: true, aiBackground: true } : { allowPaid: true, aiImages: 60 });
