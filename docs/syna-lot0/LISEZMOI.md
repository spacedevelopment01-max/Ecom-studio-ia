# SYNA — lot 0 : fondations Encre + Plein cadre (mission #282)

Autorisation du propriétaire : « Tu as mon autorisation pour développer le lot 0 de la refonte SYNA » et consigne du
31 octobre sur l'issue #282 (« GO pour CLAUDE : développement lot 0 uniquement »). **Ce lot ne change aucun écran du
Studio.** Il pose le socle commun des deux présentations, Encre et Plein cadre. Le lot 1 / 1 bis l'utilisera après une
nouvelle validation.

- Base : `main` à `37fcfd25`. Branche : `claude/syna-lot0-fondations`. PR brouillon, à ne pas fusionner.
- Indépendant de la PR documentaire #283 : les maquettes servent de référence et ne sont pas copiées ici.
- Indépendant du travail A1 de Codex (PR #286) : aucun fichier en commun. Les fichiers de #286 (moteur, stockage,
  routes, reprise des projets, `conversation-panel.tsx`) ne sont ni lus par ce lot, ni modifiés.
- Coût IA du lot : 0. Aucun appel, aucun drapeau `STUDIO_CONVERSATION_*` activé, aucune base ni configuration touchée.

## Ce qui a été construit

| Élément | Fichier | Rôle |
|---|---|---|
| Jetons de couleur | `src/lib/syna-ui/tokens.ts` | Encre et Plein cadre, chacun en clair et en sombre ; trois bleus (encre, cobalt, Prusse) ; calcul du contraste WCAG et liste de tous les couples utilisés |
| Réglages d'affichage (structure) | `src/lib/syna-ui/preferences.ts` | Mode, apparence, bleu, largeur de la conversation (360 à 560 px), densité, taille du texte, panneau épinglé ou replié. Priorité projet > compte > défaut, valeurs invalides ignorées, « rétablir » sans toucher aux projets. Module pur : aucun stockage |
| Feuille de style enfermée | `src/components/syna/syna.css` | Tous les sélecteurs passent par le conteneur `.syna-ui`. Polices sous des noms « Syna … ». Focus visible, cibles tactiles de 44 px au doigt, texte de 15 px minimum au téléphone, animations coupées si l'appareil le demande, contraste forcé pris en charge |
| Primitives présentatives | `src/components/syna/primitives.tsx` | Conteneur `SynaScope`, état unifié (7 états), bouton, progression, carte d'action, devis et consentement, compteur de budget en %, puce de sélection, accès à SYNA (onglet signature Encre, barre de commande Plein cadre, onglet téléphone), message, zone de saisie, coquille conversation + espace de travail |
| Libellés FR / EN | `src/components/syna/labels.ts` | Mots des états, textes d'accessibilité, format des pourcentages (« ≈ 6 % », « < 1 % ») |
| Polices | `public/syna/fonts/` (+ `OFL.txt`) | Newsreader, Geist, Geist Mono, Onest, sous licence SIL OFL 1.1. Bricolage Grotesque réutilise `/fonts/bricolage.woff2`, déjà présent |
| Vitrine interne | `src/app/syna-fondations/` | Page de contrôle visuel. Ouverte en développement, fermée en production (sauf `SYNA_VITRINE=1` posé volontairement), exclue des moteurs de recherche |
| Tests | `tests/syna-lot0-*.test.ts` | Jetons et contraste, isolement, réglages, rendu React des composants |
| Captures et contrôles | `scripts/syna-lot0-captures.ts`, `scripts/syna-lot0-non-regression.ts` | Vitrine dans un vrai navigateur ; comparaison pixel par pixel des écrans actuels avant / après |

**Un seul balisage, deux présentations.** Le contenu de la coquille est identique dans les deux modes : le test le
vérifie octet par octet. Seuls les attributs du conteneur changent (`data-syna-mode`, `data-syna-scheme`,
`data-syna-accent`, `data-syna-density`, `data-syna-text`, `data-syna-panel`). Il n'existe ni deuxième Studio, ni
deuxième jeu de composants, ni API propre à un mode. Le mode ne touche jamais le site du client, son thème ni ses exports.

**Purement présentatif.** Les composants ne font aucune requête et ne lisent ni n'écrivent aucun stockage. Ils ne
simulent aucun succès. Les actions sont des emplacements (`actions`, `onActivate`, `onClear`, `onSend`) que le lot
suivant branchera. Sans branchement, « Envoyer » reste inactif, et une alternative ou un « retirer » ne devient bouton
que s'il agit. Les coûts sont toujours en % du budget IA du mois, jamais en euros.

## Utilisation prévue au lot 1 / 1 bis (non fait ici)

```tsx
import "@/components/syna/syna.css";
import { SynaScope, SynaShell, SynaTrigger } from "@/components/syna";
import { resolveSynaPrefs } from "@/lib/syna-ui/preferences";

<SynaScope prefs={resolveSynaPrefs(compte, projet)} lang={lang}>
  <SynaShell conversation={…} workspace={…} rail={<SynaTrigger variant="rail" … />} commandBar={<SynaTrigger variant="commandbar" … />} />
</SynaScope>
```

`SynaScope` ne pose ses jetons qu'à l'intérieur de son conteneur. Un écran peut donc l'adopter sans rien changer aux
autres. La coquille s'adapte à la place qu'on lui donne (requêtes de conteneur), pas seulement à la taille de l'écran.

## Vérifications

Voir [`RESULTATS.md`](RESULTATS.md) : tests exécutés, captures, contraste mesuré, clavier, tactile, animations
réduites, bascule de mode, comparaison avant / après des écrans actuels, et ce qui n'a pas été vérifié.

## Retour arrière

Le lot n'ajoute que des fichiers neufs : aucun fichier existant du dépôt n'est modifié (`git diff --stat main` le
montre). Pour l'annuler, il suffit d'annuler le commit (`git revert <commit>`). Rien d'autre n'est à défaire : ni base,
ni réglage, ni drapeau, ni écran.
