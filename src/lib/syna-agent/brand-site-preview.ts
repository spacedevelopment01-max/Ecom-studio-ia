/**
 * Le haut du site sur téléphone, rendu par le Studio sur la planche de marque (brand-boards.tsx, PhoneSite) : ce module
 * garde ce qui se teste sans navigateur. Rien n'y est inventé : chaque mot vient de la planche.
 */

/** Points forts courts et vrais, tirés du dos de l'objet de la planche (jamais d'un « [À compléter] »), trois au plus. */
export function sitePoints(back: string[]): string[] {
  const seen = new Set<string>();
  return back.filter((l) => !/\[/.test(l)).flatMap((l) => l.split(/[,;.]\s*/)).map((x) => x.trim()).filter((x) => x.length >= 6 && x.length <= 26)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1)).filter((x) => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
}

/** Le premier produit montré dans la boutique du téléphone : une ligne du devant de l'objet qui n'est pas le nom de la marque. */
export function firstProduct(front: string[], brand: string): string | null {
  const b = brand.trim().toLowerCase();
  return front.map((l) => l.trim()).find((l) => l && l.toLowerCase() !== b && !/\[/.test(l)) ?? null;
}
