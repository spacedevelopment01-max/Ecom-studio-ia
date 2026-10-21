# Rôles de contenu des sections : pour l'adaptation client (à l'attention de Codex)

Consigne de Thomas du 21 octobre 2026, 19 h 50, § 4. Les démonstrations des 11 thèmes sont réécrites. Pour qu'une
boutique **client** reçoive des titres et des textes du même niveau, le moteur central doit savoir **à quoi sert**
chaque section, et pas seulement de quel type elle est. Ce document et le registre `src/lib/theme/content-roles.ts`
donnent cette carte. Ils ne rédigent rien. Ils ne créent pas de second moteur. Ils ne touchent ni la branche
`codex/160-strategie-client` ni les forfaits (49 € = 1 angle, 89 € = 2, 129 € = 5).

## Contrat proposé

- `contentRole(type)` renvoie le rôle d'un type de section. Les rôles sont : `hook`, `idea`, `facts`, `usage`, `choice`,
  `method`, `objections`, `proof`, `call`, `collect`, `story`, `practical` et `structural`.
- Pour chaque rôle, le registre indique :
  - les champs de `MarketingAngle` qui nourrissent le **titre** (`heading`) ;
  - les champs qui nourrissent le **texte** (`text`) ;
  - ce qu'il ne faut **jamais** écrire (`never`).
- `GENERIC_TITLES` liste les titres interchangeables à ne plus produire quand un angle actif existe.
- Le test `tests/content-roles.test.ts` vérifie que toute section des trois familles a un rôle.

| Rôle | Ce que la section doit faire | Titre ← angle | Texte ← angle | Jamais |
|---|---|---|---|---|
| hook (ouverture, `cv-hero`, `fs-campaign`) | se reconnaître + comprendre ce qui change | `examples.hero`, `promise` | `examples.subtext`, `tension`, `situation` | slogan interchangeable, note, urgence |
| idea (`ed-statement`, `rich-text`) | poser l'angle en une phrase | `promise`, `benefit` | `motivation` | répéter l'accroche |
| facts (`features-grid`, `ed-finishes`, `stats`…) | ce que l'on voit ou sait vraiment | `benefit` | `proofs` | spec ou chiffre non fournis |
| usage (`ed-scene`, `ed-diptych`, `cv-stories`…) | se projeter : lieu, moment, geste | `situation`, `messages` | `situation`, `benefit` | « En situation », « Chez vous » sans scène |
| choice (`featured-purchase`, `comparison-table`…) | choisir une pièce ou une offre | `benefit`, `messages` | `audience`, `benefit` | remise sur prix de référence inventé |
| method (`timeline`, `how-to`, `booking`…) | comment cela se passe | `situation` | `proofs`, `limits` | délai ou tarif non fournis |
| objections (`faq`, `v2-faq`) | vraies hésitations + une question « démonstration » | `objections` | `objections`, `limits` | réponse qui invente |
| proof (`cv-reviews`, `cv-guarantee`, `testimonials`…) | preuves **réelles** du client | `proofs` | `proofs`, `limits` | avis, note, garantie inventés, même « fictifs » |
| call (`cta-banner`) | appel final, bouton qui dit où il mène | `motivation`, `examples.cta` | `benefit` | « Commander » si l'achat est désactivé |
| collect (`newsletter`, `contact-form`) | dire ce que l'on recevra | `tone` | `tone` | offre ou nouveauté non prévue |
| story (`about`, `team`, `cv-article`) | pourquoi la marque existe | `motivation`, `promise` | `motivation`, `limits` | fondateur, date, chiffre inventés |
| practical / structural | coordonnées connues / gabarits | — | — | adresse, horaire, texte légal inventés |

Règle commune : quand le champ nécessaire manque (pas de preuve, pas de délai), la section dit honnêtement
« non renseigné », ou elle reste masquée pour le visiteur et visible dans l'éditeur. Elle ne comble jamais le vide.

## Avant / après (démonstrations réécrites)

| Thème · section (rôle) | Avant | Après |
|---|---|---|
| SOUPLE · `image-with-text` (usage) | « Envie de changer de séance ? » | « Ce soir, plutôt Pilates ? » |
| SOUPLE · FAQ (objections) | questions de commande génériques | « Par quelle pièce commencer ? », « Yoga ou Pilates ? », « Peu de place ? » + une question démonstration |
| HEUREN · adaptation client (usage) | « En situation » + texte générique (état actuel du moteur) | **à faire par le moteur** : titre tiré de `situation`, au niveau de la démo « Du bureau au dîner, sans changer de montre » |
| ALCÔVE · ouverture (hook) | phrase de positionnement | « Fini le coin de canapé… » (tension de la cible) |
| NOCTIL · H1 (hook) | deux cibles mêlées | « Ce soir, on ne sort pas. *On change de ciel.* » (une cible, aucun bienfait sur le sommeil) |
| SILLON · en-tête (call) | « Commander » (achat désactivé) | « Voir la machine » |
| ORBE · statement (idea) | générique | « Une lampe qui suit la soirée, au lieu d'un plafonnier qui la fige. » |
| Atelier Rive · portfolio (usage) | « Réalisations » + « [À compléter] » | « Inspirations » : légendes tirées des photos, aucun chantier inventé |
| FRAISE · `cv-reviews` (proof) | six avis « fictifs » + note 4,8/5 | « Les avis de vos clients *à venir* » : aucun avis inventé |
| FRAISE · `comparison-table` (choice) | contre une « autre confiserie » imaginaire | « Un flacon, *trois ou cinq ?* » : les trois offres côte à côte |
| FRAISE · `cv-guarantee` (proof) | « 30 jours » en exemple | « Bon à savoir avant de commander » : paiement désactivé, rien d'expédié |

## Problèmes restants dans le moteur central (non modifiés ici)

Ces titres de repli sont produits quand l'angle ne fournit rien. Avec un angle actif, il faut les remplacer par le
champ indiqué pour le rôle :

- `src/lib/theme/section-copy-conversion.ts:52`, `:103` et `:137` : « En situation » (usage → `situation`). La ligne 45
  lit `ctx.strategy.angles`, l'ancien format du moteur local. Il faut la brancher sur l'angle **actif** du contrat
  (`ActiveStrategy.angle`).
- `src/lib/theme/section-copy-editorial.ts:15`, `:53` et `:73` : « En situation », « Chez vous », « Au fil de la
  journée » (usage).
- `src/lib/theme/section-copy-family.ts:102` : « Chez vous » (usage, lookbook).
- `src/lib/theme/section-copy-hero.ts:366` et `:404`, `src/lib/theme/section-copy-media.ts:291`,
  `src/lib/theme/section-copy-product.ts:575` : « En situation » comme libellé de collection ou de carte.
- Les avis (`cv-reviews`, `fs-reviews`) et la garantie (`cv-guarantee`) ne doivent recevoir que des preuves fournies par
  le client (`StrategySource.kind` `client` ou `confirmed_fact`), jamais un `creative_hypothesis`.
- Forfaits à 2 ou 5 angles : un seul angle **actif** nourrit les textes du thème. Les autres restent des propositions.
  Le registre ne choisit rien.

Les démonstrations n'imposent aucun angle aux clients : leurs textes sont écrits dans les fixtures de démonstration
(`tests/*-fixtures.ts`, `tests/engine-demo-copy.ts`, `tests/fraise-demo-copy.ts`), après la composition par le moteur.
