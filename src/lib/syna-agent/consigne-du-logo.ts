/**
 * JAMAIS DE CONSIGNE DE STYLE POUR UN LOGO (essai réel de Nadia, 23 novembre 2026). Pour refaire les logos de « Halo » et
 * de « Pénombre », SINA avait écrit dans sa consigne « logo dessiné sur un fond blanc parfaitement uni » et « pas de
 * lettres bleues arrondies avec une ellipse orange ». La règle du propriétaire (CLAUDE.md, partie Logo) : la demande au
 * dessinateur tient en deux choses, le métier en mots simples et le nom exact ; ce que le client dit de lui-même va au
 * relecteur, jamais au dessinateur.
 *
 * Le dessinateur ne lit déjà jamais cette consigne (brand-images, `demandeDuLogo`). Le Studio la retire en plus, sans IA,
 * avant même la tâche : seuls restent les mots du client cités tels quels (« Le client a dit : « … » »), pour le
 * relecteur. Choix : retirer plutôt que refuser l'appel. Un refus ferait réécrire SINA (un pas de plus, payé) et
 * retarderait la carte du client ; retirer ne coûte rien, ne bloque personne, et SINA lit dans le résultat de l'outil
 * que sa consigne a été retirée (rien n'est dit au dessinateur, ni au client).
 */

/** Une consigne qui parle du style d'un logo : son fond, ses couleurs, ses lettres, sa forme, ce qu'il ne faut pas y mettre. */
export const STYLE_DU_LOGO = /(?<![\p{L}])(fond|blanc|uni|couleur|teinte|bleu|rouge|vert|jaune|orange|noir|rose|violet|dor[ée]|lettr|typo|police|serif|empattement|forme|rond|arrondi|ellipse|cercle|trait|symbole|pictogramme|ic[ôo]ne|flamme|dessin|style|sobre|chic|moderne|minimal|épur|pas de|sans |jamais|éviter|évite)/iu;

/** Les mots du client cités par SINA (« Le client a dit : « … » »), seuls gardés pour le relecteur. */
const citations = (g: string): string[] => [...g.matchAll(/client a dit\s*:\s*«\s*[^»]+?\s*»/gi)].map((m) => `Le ${m[0]}`);

/**
 * La consigne donnée à l'outil qui refait un logo, sans rien sur le style du logo. Logo seul : seuls ses mots cités
 * restent. Logo avec d'autres images (la grande scène, le haut du site) : les phrases qui parlent du logo sont retirées,
 * le reste (pour les photos) est gardé. `retire` : ce qui a été retiré (dit à SINA seulement), sinon null.
 */
export function consigneSansStyleDuLogo(guidance: string | undefined, images: readonly string[]): { guidance?: string; retire: string | null } {
  const g = (guidance ?? "").trim();
  if (!g || !images.includes("logo")) return { ...(g ? { guidance: g } : {}), retire: null };
  const cites = citations(g);
  const logoSeul = images.every((s) => s === "logo");
  const phrases = g.replace(/client a dit\s*:\s*«\s*[^»]+?\s*»/gi, " ").split(/(?<=[.!?;\n])\s+/u).map((x) => x.trim()).filter((x) => /\p{L}/u.test(x) && !/^le\s*\.?$/i.test(x));
  const gardees = logoSeul ? [] : phrases.filter((p) => !/\blogo/i.test(p));
  const retirees = phrases.filter((p) => !gardees.includes(p));
  const reste = [...gardees, ...cites].join(" ").trim();
  const style = retirees.filter((p) => STYLE_DU_LOGO.test(p) || /\blogo/i.test(p));
  return { ...(reste ? { guidance: reste } : {}), retire: retirees.length ? (style.length ? style : retirees).join(" ") : null };
}

/** Ce que SINA lit dans le résultat de l'outil quand sa consigne a été retirée (jamais le client ni le dessinateur). */
export const noteConsigneRetiree = (retire: string) =>
  `Ta consigne pour le logo a été retirée sans être transmise (« ${retire.slice(0, 300)} ») : le dessinateur ne reçoit que le métier, le nom, les couleurs et la typographie de la marque, et tu n'écris jamais de consigne de style pour un logo (fond, couleur, lettres, forme, refus).`;
