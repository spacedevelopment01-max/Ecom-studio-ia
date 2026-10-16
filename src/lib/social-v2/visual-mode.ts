/**
 * Façons de faire le visuel d'une publication (images finales 100 % IA) :
 *  - « free » : reprendre une image déjà créée par l'IA pour ce projet et validée (gratuit) ; sinon la publication attend
 *    son visuel — jamais une mise en page du studio ni une photo de banque ;
 *  - « ai_post » : publication entière créée par l'IA (payant, prix affiché avant).
 * « ai_image » (ancienne image IA + mise en page du studio) n'existe plus : traité comme « ai_post ».
 */
export type VisualMode = "free" | "ai_image" | "ai_post";

export const visualParams = (m: VisualMode) => (m === "free" ? { allowPaid: false } : { allowPaid: true, aiImages: 60 });
