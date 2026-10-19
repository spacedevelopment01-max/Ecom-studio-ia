# Devis fournisseur conditionnel — ONDE, sans génération

> Historique de la première passe. Référence noir/bleu écartée par la mission suivante ; les maillons et chiffres ci-dessous ne décrivent plus la chaîne corrigée. Consulter le [devis actualisé noir/vert, références manquantes et limites](../pr140-video-lots/DEVIS_CHAINE.md).

Relevé du **19 octobre 2026**. Demande [6266012060](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6266012060), ajoutée à la [mission vidéo 6265941030](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6265941030). [Rapport technique](../../docs/coordination/PR_140_VIDEO.md) · [Calculs et hypothèses](devis-calcul.json).

**Aucun appel fournisseur, achat ou débit de crédits : coût réellement engagé 0 €. Le rendu complet demandé n'est pas exécutable aujourd'hui dans le parcours guidé. Les montants ci-dessous sont conditionnels, pas un prix client ni un coût moyen constaté.**

## Résultat à chiffrer

Une publicité premium ONDE de **20 s, verticale 9:16, un seul export 1080 × 1920**, quatre clips réellement animés d'environ 5 s : révélation dans un premier environnement ; détail des matières/coussinets visibles sur la référence ; second environnement sans personne et vue différente vérifiable ; dernier plan du casque avec le logo et « Découvrir ONDE ». Même forme, matières et couleurs sur les quatre plans. Aucun remplacement par quatre photographies zoomées.

Scénario français, voix française naturelle **du projet**, sous-titres lisibles et synchronisés, charte ONDE, transitions sobres et musique autorisée. Aucune caractéristique technique, promesse, démonstration physique, personne ou marque tierce inventée. Aucune déclinaison ni publication sociale.

La référence jointe `1000032787.jpg` (720 × 1280) a été réellement ouverte : casque noir/bleu avec marquage ONDE, affiche déjà titrée. **Pas de logo ONDE séparé, de référence de dos ni de voix ONDE identifiée dans cette copie.** L'accès aux fichiers du projet déployé n'est pas établi. Il faudra réutiliser ces éléments s'ils y existent, pas inventer un autre produit ou refaire le logo. Aucun projet ONDE n'a été créé pour ce devis ; l'affiche privée n'est pas republiée.

## Routes et tarifs : hypothèses vérifiables, production inconnue

Le parcours guidé appelle `realThreeScenesDeps` : `llmJson(copywriting)` → `aiPostImage(social_image)` → `aiClip` avec le modèle de `SCENE_VIDEO_MODEL` → voix locale conditionnelle → montage du studio → contrôles locaux du fichier. Le moteur V2 a des contrôles vision et des reprises de plans, mais constitue un autre parcours ; on ne les attribue pas au parcours guidé.

La base et les clés de production ne sont pas accessibles ici. Les réglages `ai.routes`, `ai.policy`, `ai.media.usage`, `ai.media.models`, `ai.prices`, `billing.usdToEur`, `billing.markup`, la région fournisseur, le forfait réellement payé et le budget restant sont **inconnus en production**. Les identifiants exacts qui suivent répondent à la demande explicite du devis ; aucun modèle actif n'est prétendu et aucun nouveau modèle n'est ajouté au code.

Hypothèse : Alibaba International/Singapour, images `qwen-image-3.0-pro`, clips `wan2.6-i2v-flash` en **1080P sans son**, texte et vision Anthropic `claude-sonnet-5-5`, sans relais vers un autre modèle. Ces adaptateurs et tarifs existent dans cette branche. Activation et accès réels restent à vérifier.

Sources officielles consultées le **19/10/2026** : [Alibaba, prix images et vidéos](https://www.alibabacloud.com/help/en/model-studio/model-pricing) ; [API Wan, durées/résolutions](https://www.alibabacloud.com/help/en/model-studio/legacy-image-to-video-api-reference) ; [Anthropic, identifiant et tarifs](https://platform.claude.com/docs/en/models/sonnet-5-5/overview). Les tarifs ci-dessous n'intègrent pas d'éventuelles taxes de facture fournisseur.

## Premier passage cible : détail des postes

Quantités de jetons **hypothétiques**, à remplacer par le comptage de la demande et l'usage facturé. Par prudence, toutes les entrées texte/vision sont valorisées à **2,50 $/million** (création de cache 5 minutes), les sorties à **10 $/million** ; aucune remise de lecture n'est supposée. Au tarif d'entrée simple, ce serait 2 $/million. Les images incluses dans les contrôles doivent être comptées dans les jetons d'entrée.

| Poste | Fournisseur / modèle | Unité, quantité et résolution | Estimation USD |
|---|---|---|---:|
| Scénario et textes FR | Anthropic `claude-sonnet-5-5` | 1 appel, 8 000 jetons d'entrée + 2 000 de sortie | 0,040 |
| Images de départ | Alibaba `qwen-image-3.0-pro` | 4 sorties au palier 2K : 0,075 $ + **1 référence d'entrée** à 0,003 $ par scène ; requête studio 1008 × 1792 | 0,312 |
| Contrôle des images | Anthropic `claude-sonnet-5-5` | 4 appels, chacun 4 000 entrée + 1 000 sortie | 0,080 |
| Quatre clips distincts | Alibaba `wan2.6-i2v-flash` | **20 s générées**, 4 × 5 s, 1080P sans son, 0,0375 $/s ; 20 s montées visées | 0,750 |
| Contrôle des clips | Anthropic `claude-sonnet-5-5` | 4 appels avec plusieurs images de chaque clip + référence produit, chacun 6 000 entrée + 1 000 sortie | 0,100 |
| Contrôle final | Anthropic `claude-sonnet-5-5` | 1 appel, 8 000 entrée + 1 500 sortie ; ne remplace pas l'écoute humaine ni l'analyse du mouvement | 0,035 |
| Voix, musique, sous-titres et assemblage | Voix locale Kokoro si installée et voix projet reconnue ; composition et FFmpeg locaux | 1 voix ≈ 37–50 mots selon le guide, une piste, un assemblage final ; aucun fournisseur payant branché à ces postes | 0 fournisseur ; calcul/hébergement non mesurés |
| **Total fournisseur cible, premier passage** | **Hypothèses ci-dessus** | **4 images intermédiaires, 4 clips, 10 appels texte/vision** | **1,317 $** |

Wan accepte des durées entières de 2 à 15 s : chaque clip de 5 s représente 5 s facturables, pas une fraction de scène montée. Si l'on conserve une poignée d'une seconde par clip, il faut **24 s générées** pour 20 s montées, soit **+0,150 $** au premier passage. Toute image supplémentaire, nouvelle référence facturable ou contrôle supplémentaire s'ajoute ; aucun lot gratuit ou rabais n'est supposé. La marge d'estimation interne ne constitue pas un montant fournisseur dépensé.

La voix locale est une possibilité du code, **pas une voix ONDE disponible ou validée ici**. [Licence du modèle Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) : Apache 2.0 ; installation et dépendances locales nécessaires. La composition locale n'a pas de prix d'API. Le fichier `node_modules/generaluser/LICENSE.txt` permet l'usage musical commercial, tout en indiquant une incertitude de provenance pour certains échantillons : les droits précis du morceau final restent donc à vérifier, ou utiliser une piste autorisée du projet. Aucun achat de musique n'est présumé.

## Les trois montants demandés

Conversion illustrative **1 USD = 0,86 EUR** : valeur de repli lue le 19/10/2026 dans `src/lib/ai/config.ts::usdToEur`. **Ce n'est ni le taux bancaire du jour ni un réglage déployé constaté.** Avec un taux effectif `r`, multiplier les montants USD par `r`. Aucun prix commercial ni TVA client n'est ajouté à ces coûts fournisseur.

| Scénario | Coût fournisseur estimé USD | Conversion illustrative EUR | Portée |
|---|---:|---:|---|
| Premier passage sans reprise | **1,3170 $** | **1,13262 €** | Scénario cible détaillé ci-dessus, sans poignée supplémentaire |
| **Une seule scène vidéo refaite** | **1,5645 $** | **1,34547 €** | Même image de départ réutilisée ; +5 s vidéo (0,1875 $), contrôle du clip (0,025 $), nouveau contrôle final (0,035 $). Ni les trois autres clips ni le scénario ne sont repayés |
| **Plafond maximal du rendu cible** | **Non attestable aujourd'hui** | `min(C_job_validé, B_disponible)` | Les contrôles et reprises du rendu cible ne sont pas raccordés dans un même parcours. Leur attribuer une limite numérique serait inventer une politique |

**Repère réel du code actuel, à ne pas confondre avec le troisième total cible :** pour le parcours guidé existant, avec ces mêmes routes hypothétiques, taux de change `r=0,86` et coefficient 1, le plafond de tâche calculé par l'API serait **1,389332 €**, indépendant du nombre de relances. [Exécution des fonctions natives, zéro projet créé et zéro appel fournisseur](devis-natif-conditionnel.json). Le devis probable natif est 1,363100 € ; le plafond est la plus grande des deux estimations. Formule native : `max(4 × (Imax + V5) + T, 4 × (Iprob + V5) + T)`. Ici `Imax=0,182858 €` (borne générique du devis pour deux images, marge comprise ; une seule image produite par scène), `Iprob=0,176300 €`, `V5=0,161250 €`, `T=0,012900 €`. `Iprob` vient du devis social (image + conception/contrôle), alors que ces sous-appels ne sont pas tous exécutés pour chaque image vidéo : **cette estimation générique n'est pas le devis premium**. Ce plafond peut arrêter la tâche ; il ne garantit pas sa livraison, même lorsque le total estimé reste inférieur au plafond. Les réservations maximales peuvent aussi bloquer avant épuisement du plafond.

Dans le parcours guidé, pas de reprise créative automatique d'une scène après contrôle vision : ce contrôle n'y est pas branché. Le scénario `llmJson` possède ses propres réparations JSON (jusqu'à 4 appels selon troncature, une correction de schéma), et les relais média après refus confirmé sont possibles ; tous restent soumis au plafond. Un résultat incertain ne justifie aucune nouvelle génération. Les `maxRetries` du moteur V2 sont ceux d'un **autre parcours** et ne peuvent pas être appliqués à ce devis par simple multiplication.

**Autres coûts directs connus :** aucune licence achetée, API voix/musique payante ou service de montage facturé dans la chaîne examinée. **Non mesurés :** temps CPU/GPU, écoute et contrôle humain, stockage, trafic, maintenance, taxes/frais de paiement fournisseur. Total économique complet = fournisseur + ces coûts ; ils ne valent pas automatiquement zéro.

## Consommation du crédit inclus

Prix catalogue mensuels TTC dans `src/lib/plans.ts`, TVA codée 20 % dans `src/lib/billing.ts` ; ce sont les valeurs du dépôt, pas le contrat payé d'un client observé. Budget mensuel `B= floor_micro(40 % × prix_TTC / 1,20)`. Annualisation native : prix annuel payé ramené au mois, arrondi conservateur au centime inférieur, puis calcul HT ; remises/proratas et prix enregistrés priment.

| Forfait | Prix mensuel TTC / HT | Budget fournisseur mensuel | Premier passage cible | Avec une scène reprise | Plafond cible |
|---|---:|---:|---:|---:|---|
| Créer | 49 € / 40,8333 € | 16,333333 € | 6,93 %* | 8,24 %* | `100 × Cmax / B` |
| Développer | 89 € / 74,1667 € | 29,666666 € | 3,82 % | 4,54 % | même formule |
| Dominer | 129 € / 107,50 € | 43,00 € | 2,63 % | 3,13 % | même formule |

\* Comparaison arithmétique seulement : **Créer n'autorise pas les clips générés par IA**. Développer autorise les vidéos courtes ≤ 30 s ; Dominer, les vidéos avancées. Le devis ne change aucun droit. Un crédit disponible ne donne pas un droit absent du forfait.

Recharge effectivement payée `R_TTC` : `B_recharge = floor_micro(50 % × R_TTC / 1,20)`, puis consommation `100 × C / B_recharge`. Réservations, autres créations et budget mensuel déjà consommé doivent être déduits avant toute autorisation. Le coefficient `billing.markup`, s'il diffère de 1 en production, modifie le débit interne et doit être distingué de la facture fournisseur. **Aucun nombre de vidéos par mois n'est garanti.**

## Écart précis avec ce qui est réalisable aujourd'hui

Le code guidé sait obtenir quatre images de départ puis quatre clips via l'adaptateur, monter les fichiers aux dimensions demandées et ajouter un logo de la bibliothèque. Le test local valide l'encodeur et les reprises **avec des mires synthétiques**, pas les API ni la fidélité du casque.

Pour 20 s / 4 scènes, la carte de fin est un **cinquième segment graphique**, d'environ 2,8 s selon la direction, retranché de la durée des clips depuis la correction. Ce n'est pas encore le quatrième clip de 5 s avec casque + logo + CTA superposés. Le parcours guidé n'effectue pas de contrôle vision systématique des images/clips : fidélité, continuité, marques et présence humaine ne peuvent pas être déclarées validées par ses seuls contrôles locaux. Voix ONDE et ressources de voix installées non établies ; le moteur V2 conserve `voice: null`. Les sous-titres de la chaîne guidée sont répartis à l'intérieur des phrases selon leur longueur, pas alignés phonème par phonème.

Le devis cible suppose donc encore : logo et voix authentiques réutilisables ; storyboard approuvé sans détails invisibles inventés ; habillage sur le quatrième clip ; contrôles visuels raccordés et contrôles audio réels ; politique de reprise et plafond couvrant tous ces postes. **Le plafond cible sera recalculé avant toute autorisation d'essai.** L'alternative actuelle — clips plus courts + carte graphique séparée, éventuellement sans voix — doit être présentée comme un compromis explicite, jamais comme le rendu demandé.
