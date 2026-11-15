/**
 * Photo détourée du thème sur mesure (demande du propriétaire du 10 novembre 2026 : garder le mannequin ou le produit
 * détouré qui déborde de l'ouverture de la famille Moderne). La photo est créée sur un fond uni (FOND_A_DETOURER), puis
 * son fond est retiré par le détourage local du Studio (modèle embarqué, gratuit, aucun service extérieur). Si le
 * détourage échoue, la photo pleine est gardée et le problème est dit honnêtement.
 */
import { cutoutProduct } from "../../media/cutout";

/** Fond uni demandé au modèle d'images pour une photo à détourer (gris clair : ni blanc ni noir, rien ne s'y confond). */
export const FOND_A_DETOURER = "#E6E8EB";

/** Remplaçable par les tests (aucun modèle chargé). */
export const cutoutDeps: { cut?: (png: Buffer) => Promise<Buffer> } = {};

export async function cutoutPhoto(data: Buffer): Promise<{ data: Buffer; cut: boolean; problem?: string }> {
  try {
    const png = cutoutDeps.cut ? await cutoutDeps.cut(data) : (await cutoutProduct(data)).png;
    return { data: png, cut: true };
  } catch (e) {
    return { data, cut: false, problem: `détourage impossible (${(e as Error).message.slice(0, 120)}) : photo pleine posée à la place` };
  }
}
