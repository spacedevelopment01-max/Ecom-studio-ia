# Devis de chaîne actualisé — ONDE noir/vert, conditionnel

19 octobre 2026. [Mission](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6266974136). Remplace le chiffrage générique précédent pour la chaîne guidée corrigée. **Aucune génération payante : coût API réellement engagé 0 €.** Pack noir/vert et logo privés indisponibles ici ; aucun projet ONDE de substitution.

Calcul natif exécuté dans une configuration isolée : [postes, unités, routes exactes et hypothèses](chain-quote.json). Paramètres : 20 s, vertical 9:16, quatre clips de cinq secondes, quatre images intermédiaires avec une référence chacune. Hypothèses de jetons : scénario 12 000 entrée/4 000 sortie ; chacun des quatre contrôles images 6 000/1 500 ; chacun des quatre contrôles clips 9 000/1 500, sur trois images échantillonnées. Ces quantités sont des provisions de planification, pas un usage fournisseur mesuré. Pas d'appel audiovisuel final payant raccordé dans le guidé.

| Poste | Micro-euros internes estimés |
|---|---:|
| Scénario | 55 040 |
| Quatre images : une réservation maximale unitaire par image | 365 716 |
| Quatre contrôles images | 92 880 |
| Quatre clips : vingt secondes générées | 645 000 |
| Quatre contrôles clips | 113 520 |
| Voix locale, musique, sous-titres, encodage et contrôles locaux | 0 d'API ; CPU/stockage non mesurés |
| **Premier passage natif** | **1 272 156 (1,272156 €)** |
| **Une reprise ciblée image + contrôle + clip 5 s + contrôle** | **+304 279 (0,304279 €)** |
| **Premier passage avec cette reprise / plafond de chaîne** | **1 576 435 (1,576435 €)** |

Le plafond effectif reste limité par le solde disponible, les réservations et le plafond de tâche signé. Les images déjà fournies peuvent être réemployées : la ligne image baisse, leur contrôle reste nécessaire. Refaire seulement un clip devrait consommer moins que la provision complète d'une scène. Une reprise d'une scène ne refait ni le scénario ni les autres scènes acceptées. Aucune régénération créative automatique ; un ajustement gratuit de contraste n'est pas une nouvelle génération.

**Ce tableau n'est pas une facture fournisseur ni un prix commercial.** La ligne image utilise la réservation maximale native, marges de sécurité comprises : le montant présenté comme probable reste conservateur à ce poste. Taux configuré dans la fixture : **0,86 EUR/USD**, pas un taux bancaire du jour constaté. Coefficient, région, tarifs et routes de production inconnus. Ne pas reconduire l'ancien ~1,13 € comme prix garanti. Le plafond protège la dépense et peut interrompre une tâche ; il ne garantit ni livraison ni qualité.

Sources officielles relevées lors de la première passe du 19/10 : [Alibaba, tarifs](https://www.alibabacloud.com/help/en/model-studio/model-pricing), [API clips](https://www.alibabacloud.com/help/en/model-studio/legacy-image-to-video-api-reference), [Anthropic](https://platform.claude.com/docs/en/models/sonnet-5-5/overview), [voix locale](https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models). Le calcul actuel utilise les tarifs de configuration natifs, pas un nouveau relevé de facture. **Point à rapprocher avant essai réel :** l'adaptateur image comptabilise une sortie au forfait et son coût estimé ; la tarification distincte des références d'entrée décrite dans le premier devis doit être rapprochée de l'usage et de la facture réels. Les réservations ne prouvent pas le coût facturé. Aucun coût inconnu traité comme une dépense réelle nulle.

Budget mensuel = **40 % du prix d'abonnement payé HT** ; recharge = **50 % du paiement HT**, sous réserve des règles natives d'arrondi. À titre arithmétique, sur les prix mensuels catalogue du dépôt :

| Forfait | Budget mensuel HT alloué à l'IA | Premier passage | Avec reprise/plafond |
|---|---:|---:|---:|
| Créer | 16,333333 € | 7,79 %* | 9,65 %* |
| Développer | 29,666666 € | 4,29 % | 5,31 % |
| Dominer | 43 € | 2,96 % | 3,67 % |

*Comparaison seulement : **aucun clip IA autorisé sur Créer**, droit préservé. Pour un budget réellement disponible `B`, consommation `100 × coût/B`. Autres créations et dépenses déjà engagées partagent le même budget ; aucun nombre garanti de vidéos mensuelles. L'interface client reste en pourcentage, sans prix en euros. Pas de nouvel abonnement, achat, appel payant ou publication.
