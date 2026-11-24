/**
 * ÉPREUVES PROPOSÉES, PAS ENCORE SCELLÉES : la méthode des graphistes (24 novembre 2026). Elles n'entrent dans le
 * catalogue (`catalogue.ts`) et ne reçoivent leur sceau (`sceaux.json`) qu'avec l'accord écrit du propriétaire, en même
 * temps que les cinq épreuves qu'elles remplaceraient sont marquées remplacées (jamais réécrites). D'ici là, elles sont
 * rejouées comme des essais ordinaires (`tests/epreuves-graphistes-proposees.test.ts`).
 *
 * Les verdicts restent à écrire avec les mots du propriétaire, relayés par le chef d'orchestre : ils ne sont pas inventés.
 */
import type { Epreuve } from "./catalogue";

const SOURCE = "docs/studio/LOGO-METHODE-DES-GRAPHISTES.md";
const VERDICT = "[À compléter : les mots du propriétaire sur la méthode des graphistes, relayés par le chef d'orchestre. Connu : « oui » à la construction, 24 novembre 2026.]";

export const EPREUVES_A_SCELLER: (Epreuve & { remplacerait: string })[] = [
  {
    id: "logo-refait-une-fois-avec-ses-raisons", date: "2026-11-24", source: SOURCE, verdict: VERDICT, rejeu: "gratuit", remplacerait: "trois-fois-le-meme-dessin",
    attendu: "Un logo fini refusé par le relecteur est refait UNE fois, à la charge du Studio, avec toutes les raisons du refus à la fin du texte envoyé ; refusé deux fois, il n'est pas gardé (l'identité n'est pas construite avec lui) et SINA propose une autre esquisse ; jamais un troisième essai.",
  },
  {
    id: "esquisses-choisies-selon-le-forfait", date: "2026-11-24", source: SOURCE, verdict: VERDICT, rejeu: "gratuit", remplacerait: "logos-de-la-serie-dans-l-ordre",
    attendu: "Le client choisit ses esquisses, numérotées, au plus 2, 3 ou 4 selon son forfait (moins est permis, deux au moins : chaque esquisse devient une identité) ; un numéro inconnu ou refusé est refusé ; la carte n'autorise jamais plus de cases cochées et envoie « Je choisis les esquisses 3, 7 et 11 » ; les logos finis partent dans l'ordre des numéros.",
  },
  {
    id: "finalisation-ecrite-par-le-plus-fort", date: "2026-11-24", source: SOURCE, verdict: VERDICT, rejeu: "gratuit", remplacerait: "pas-de-consigne-de-style-pour-un-logo",
    attendu: "Le texte de finalisation est écrit par GPT-6.2 Astra, qui regarde l'esquisse, avec la consigne de finaliser.py mot pour mot plus la ligne d'évolution ; un contrôle gratuit vérifie le début et la fin attendus, dix phrases au plus et l'évolution, sinon une réécriture à la charge du Studio ; ce texte part tel quel à /v1/images/edits (2.6 Sunburst, l'esquisse dans image[]) ; aucune consigne de SINA, aucune couleur du client n'y entre.",
  },
  {
    id: "planches-de-recherche-demande-exacte", date: "2026-11-24", source: SOURCE, verdict: VERDICT, rejeu: "gratuit", remplacerait: "demande-du-logo-couleurs-typo-fond",
    attendu: "La recherche part en deux appels en même temps (2.5 Sunburst et 2.6 Flare, même texte, mêmes réglages, « complexity » pour Flare seul) avec la demande exacte des preuves : le nom, le métier, « le savoir-faire de … » ou « l'univers de … », rien d'autre (ni couleurs, ni typographie, ni goûts, ni logos joints) ; seule « Évite ces pistes déjà présentées : … » peut s'ajouter à la fin.",
  },
  {
    id: "relecteur-du-logo-fini", date: "2026-11-24", source: SOURCE, verdict: VERDICT, rejeu: "gratuit", remplacerait: "relecteur-du-logo-qualite-seule",
    attendu: "Le logo fini est relu par le relecteur le plus fort, effort élevé, un autre modèle que le rédacteur, avec le logo sur blanc, l'esquisse, le nom, le vrai métier et le texte envoyé ; il est refusé si le nom est mal écrit (le code le compare aussi), si l'idée de l'esquisse est perdue, s'il est trop proche de l'esquisse sans évolution, s'il porte une arche, une phrase inventée qui ne dit pas le vrai métier, ou une note sous 8 ; un fond que le Studio ne retire pas proprement le fait refaire.",
  },
];
