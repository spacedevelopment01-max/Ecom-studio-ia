# Preuves de contre-vérification #195

Candidat corrigé contre-vérifié : `3ae89a6d42711c13962571483f55c496d6b3ddaa` ; Next 15.5.28, verrou inchangé. Les captures des quinze accueils et des parcours studio/Higgsfield ci-dessous restent datées du code 7f. **Avis technique favorable AVANT fusion sur 3a : 3 395 tests réussis, aucun échec, 31 ignorés ; CI entièrement verte. APRÈS fusion en attente du vrai SHA main. CMS et kits privés restent partiellement non vérifiés.**

Données fictives exclusivement. Aucun fournisseur réel, paiement, e-mail externe, déploiement ni fusion. Les prix Higgsfield sont simulés et signalés dans les captures. Les pages ci-dessous appartiennent à des projets de recette séparés ; les clichés ne prouvent pas la qualité des kits privés absents.

## Captures des quinze accueils

Chaque lien donne le PNG natif lisible et téléchargeable. Les premiers écrans sont disponibles à côté des captures complètes (`*-premier-ecran.png`). La contre-mesure après décodage des images est dans [controle-medias-cadrage.json](navigateur/controle-medias-cadrage.json).

| Thème | Médias source absents | Ordinateur | Mobile |
|---|---:|---|---|
| fraise | 25 | [PNG complet](navigateur/fraise-ordinateur.png) | [PNG complet](navigateur/fraise-mobile.png) |
| onde | 26 | [PNG complet](navigateur/onde-ordinateur.png) | [PNG complet](navigateur/onde-mobile.png) |
| rive | 0 | [PNG complet](navigateur/rive-ordinateur.png) | [PNG complet](navigateur/rive-mobile.png) |
| sillon | 0 | [PNG complet](navigateur/sillon-ordinateur.png) | [PNG complet](navigateur/sillon-mobile.png) |
| noctil | 0 | [PNG complet](navigateur/noctil-ordinateur.png) | [PNG complet](navigateur/noctil-mobile.png) |
| traverse | 0 | [PNG complet](navigateur/traverse-ordinateur.png) | [PNG complet](navigateur/traverse-mobile.png) |
| heuren | 0 | [PNG complet](navigateur/heuren-ordinateur.png) | [PNG complet](navigateur/heuren-mobile.png) |
| museau-club | 0 | [PNG complet](navigateur/museau-club-ordinateur.png) | [PNG complet](navigateur/museau-club-mobile.png) |
| souple | 0 | [PNG complet](navigateur/souple-ordinateur.png) | [PNG complet](navigateur/souple-mobile.png) |
| table-saison | 0 | [PNG complet](navigateur/table-saison-ordinateur.png) | [PNG complet](navigateur/table-saison-mobile.png) |
| atelier-nuance | 2 | [PNG complet](navigateur/atelier-nuance-ordinateur.png) | [PNG complet](navigateur/atelier-nuance-mobile.png) |
| parenthese | 7 | [PNG complet](navigateur/parenthese-ordinateur.png) | [PNG complet](navigateur/parenthese-mobile.png) |
| phase | 26 | [PNG complet](navigateur/phase-ordinateur.png) | [PNG complet](navigateur/phase-mobile.png) |
| maison-horizon | 87 | [PNG complet](navigateur/maison-horizon-ordinateur.png) | [PNG complet](navigateur/maison-horizon-mobile.png) |
| aplat | 29 | [PNG complet](navigateur/aplat-ordinateur.png) | [PNG complet](navigateur/aplat-mobile.png) |

## Planches inspectées

Miniatures de contrôle réalisées à partir des captures natives. Les images complètes ci-dessus gardent leur résolution. Les médias absents sont explicitement comptés sur chaque ligne.

![Accueils ordinateur et mobile, planche 1](navigateur/planches/01-accueils.png)

![Accueils ordinateur et mobile, planche 2](navigateur/planches/02-accueils.png)

![Accueils ordinateur et mobile, planche 3](navigateur/planches/03-accueils.png)

![Accueils ordinateur et mobile, planche 4](navigateur/planches/04-accueils.png)

![Accueils ordinateur et mobile, planche 5](navigateur/planches/05-accueils.png)

## Parcours natifs et vidéos

- [Résultat studio, catalogue sauvegardé/rechargé et autre métier](navigateur/resultat.json) ; [vidéo réelle du navigateur — téléchargement WebM](navigateur/parcours-studio-apercus.webm). Cette vidéo précède le contrôle final des cadrages et décodages ; les captures finales et le JSON de contre-mesure font foi pour ce contrôle.
- [Résultat sécurité, inscription/SMTP local, données personnelles, aperçus et panier](lot9/parcours.json) ; les 20 PNG sont dans [lot9](lot9/). Les reçus initiaux simulés sont dénombrés ; aucune nouvelle activité fournisseur n’est autorisée par le harnais.
- [Résultat administrateur Higgsfield](higgsfield/browser-result.json), [confirmation groupée](higgsfield/03-approbation-groupee-simulee.png), [mobile](higgsfield/05-admin-mobile-simule.png), [vidéo — téléchargement WebM](higgsfield/parcours-admin-simule.webm). **810 estimations fictives ; zéro prix réel de compte vérifié.**

## Exports et preuves techniques

- [Trois rejets PrestaShop natifs sous verrou exact](7f854218-rejets-prestashop-verrou-exact.json), à corriger ; aucun CMS installé dans cet environnement.
- [45 archives natives, inventaire et SHA-256](exports-consolides-7f854218.json) : ensemble préliminaire avant réinstallation des dépendances ; verdicts structurés seulement pour six thèmes. Un ZIP généré n’est ni une installation ni un achat vérifié. Les archives volumineuses ne sont pas toutes republiées.
- [Blocage Docker/CMS réellement constaté](cms-preparation-blocage.json).
- [Dépendances exactes](7f854218-dependances-exactes.json) et [écart de préparation documenté](dependances-preparation-ecart.json).
- [Manifestes SHA-256 des preuves](manifest.json). Les logs des échecs de préparation et leurs retests sont conservés, jamais annoncés verts.

## Rejouer les harnais

Utiliser une copie isolée sans `.env` ni `.env.local`, jamais le dossier du studio/client. Le candidat exact et ses dépendances sont indiqués dans le rapport. Le `npm ci` CPU local utilise l’option officielle `npm_config_onnxruntime_node_install_cuda=skip` ; le verrou reste inchangé. Les tests fournisseurs doivent garder le preload `scripts/lot9/network-guard.mjs`.

Les fichiers de [harnais](harnais/) sont des copies de preuve ; placer chaque copie dans son emplacement prévu sous `scripts/` (et le harnais de sécurité sous `scripts/lot9/`) pour conserver ses imports relatifs. Les extensions `.ts.txt` / `.mts.txt` doivent retrouver `.ts` / `.mts`. Ne remplacer aucun fichier existant : les noms `contre-verification-195-*` sont dédiés. Le harnais de sécurité crée lui-même sa base fictive et un serveur Next sur loopback, puis les arrête ; il refuse une configuration client préexistante. Pour les autres harnais, n’utiliser qu’un `DATA_DIR` commençant par `/tmp/ecs-higgsfield-proof-195-` et le réseau simulé séparé `scripts/higgsfield-proof-network.mjs`. Lancer le serveur web seul, sans worker.

Les adaptations du harnais historique sont expliquées dans le [rapport](../../docs/coordination/CONTRE_VERIFICATION_195.md) : fixture native renommée et garde stricte contre tout nouvel appel, même simulé. Le contrôle média remet le défilement instantanément à zéro et attend le décodage avant capture. Les jetons signés fictifs ont été expurgés des références exportées ; aucune session/clé/base n’est incluse.


## Correctif PrestaShop et formulaire APLAT — nouveau candidat 3a

- [57 contrôles ciblés réussis](3ae89a6d-cibles.log.txt), contre [6 échecs attendus de la même nouvelle contre-épreuve sur l’ancien moteur](7f854218-exports-scripts-contre-epreuve-rouge.log.txt).
- [17 exports PrestaShop, gates natifs complets](3ae89a6d-exports-17-prestashop.json) : tous PROVISIONAL ; pas de faux rejet, pas de qualification d’installation ou de qualité photographique complète.
- [38 interactions APLAT](aplat-3ae89a6d/resultat.json), [étape 2 du devis](aplat-3ae89a6d/03-devis-mobile-etape2.png), [vidéo de la démonstration](aplat-3ae89a6d/aplat-devis-demo.webm).
- [Mode non démonstration, un seul POST local et aucune fausse confirmation](aplat-3ae89a6d/mode-nondemo.json) ; [capture avant POST](aplat-3ae89a6d/05-mode-nondemo-avant-post-local.png), [récepteur local sans e-mail](aplat-3ae89a6d/06-recepteur-local-sans-email.png). Le serveur ne transmet rien à un CMS ou à un destinataire.
- [SHA du build effectivement servi sur loopback, accès anonyme refusé](3ae89a6d-production-http.json). Le studio réel de Thomas n’a pas été modifié.
- [PHP CLI isolé et empreintes des paquets](php-cli-isole.json), [9 tests réels du moteur PHP exporté](3ae89a6d-php-native-smoke.log.txt). Aucun paquet système installé et aucun CMS créé par ces commandes.

Les six nouvelles captures et la vidéo APLAT n’emportent pas les 29 médias privés absents : elles attestent les interactions et la configuration du formulaire. La version sans démonstration est uniquement rendue et reçue sur loopback, sans publication. Les limites CMS et photo restent ouvertes.

## Verdict AVANT et preuves finales 3a

- [Suite complète, synthèse machine](3ae89a6d-suite-synthese.json) ; [journal](3ae89a6d-suite.log.txt).
- [64 contrôles HTTP natifs, sauvegarde et isolation](3ae89a6d-http-matrice-64.json).
- [CI, identité du candidat et registre des apports](3ae89a6d-github-candidat-ci-registre.json).
- [Pilote sept jours, 63 réussites](3ae89a6d-autopilot-7jours.log.txt).
- Migrations/restaurations 3a : [dcfc13b1](migration-dcfc13b1-3ae89a6d.json), [d97e0b95](migration-d97e0b95-3ae89a6d.json), [main 0a](migration-0a6aa1dd-3ae89a6d.json).

Tous les éléments sont attribués à leur SHA. Aucun résultat avant fusion ne vaut contrôle après fusion ni mise à jour du studio réel.
