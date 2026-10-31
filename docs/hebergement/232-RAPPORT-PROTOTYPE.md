# Hébergement natif des sites de services : rapport du prototype (#232)

**Niveau atteint : `prototype`, recetté sur une instance isolée locale** (studio compilé, proxy HTTPS à certificat auto-signé, noms fictifs `*.recette.test`).
Ce n'est **ni** un `test sur vraie infrastructure` **ni** une `production validée` : aucun domaine public, aucun serveur permanent, aucun certificat reconnu, aucun SMTP.
**Ce n'est pas un hébergement prêt pour des clients.**

- Branche : `claude/232-hebergement-services`, issue de `main` `70204a7f`.
- Code recetté : `61cf1542` (dernier correctif) ; la recette principale a été faite sur `905e9964`, puis l'envoi de formulaire du site 3 a été rejoué sur `61cf1542`.
- Audit et architecture : [`232-AUDIT-ARCHITECTURE.md`](./232-AUDIT-ARCHITECTURE.md).
- Preuves (captures, résultats JSON) et scripts de recette : [`recette-232/`](./recette-232/).
- Rien n'est fusionné, déployé ni activé. Aucun achat, aucune clé, aucun DNS.

## 1. Ce que fait le prototype

| Étape | Fonctionnement |
|---|---|
| Publier | Onglet Site → « Publier votre site ». Le studio rend **tout le site** (accueil, pages, politiques, liens internes) avec le moteur existant, sans les éléments de l'aperçu, puis **fige** le résultat : fichiers + `manifest.json` (empreinte sha256 de chaque fichier, version du thème, commit du code). Écriture dans un dossier temporaire puis renommage : une publication est complète ou n'existe pas. |
| Bloquer | Publication refusée, avec les raisons, si un texte à compléter est visible (`[À compléter…]`, `[À renseigner]`, « À renseigner » seul, etc.), si la réservation est en démonstration, non reliée au studio ou sans horaire. |
| Servir | Un nom `<site>.<domaine des sites>` est réécrit vers une route dédiée qui ne lit **que** l'artefact figé. Le studio, l'admin, les API privées et l'aperçu répondent 404 sous un nom de site. Nom inconnu → 404. |
| Versions | Chaque publication est conservée ; « Remettre en ligne » repointe une ancienne publication en une transaction, sans nouveau rendu. Historique conservé. |
| Formulaires | Vraie réception sur le site (`POST /contact`) : même origine exigée, champ piège, limites de taille, 5 envois / 10 min par visiteur et 200 / jour par site, conservation 12 mois, notification par e-mail si un SMTP est configuré, sinon consultable dans le studio. |
| Réservation | Les moteurs natifs (cabinet, salon, restaurant) appellent l'API publique du studio en HTTPS ; jamais publiés en démonstration. |
| Domaines | Préparés, **non activés** : ajout, jeton TXT `_ecs-verif.<domaine>`, vérification DNS réelle, unicité, maximum 2 par site, retrait. Servis seulement si `SITES_CUSTOM_DOMAINS=1`. |
| Droits | Gestion réservée au propriétaire du projet. Forfait expiré → site suspendu (503), pas supprimé. Projet archivé ou masqué → plus servi. |

Fichiers (hors documentation) : `src/lib/sites/{host-match,store,publish,serve,requests,domains,policies}.ts`, `src/middleware.ts`, `src/app/api/site-host/[[...path]]/route.ts`, `src/app/api/projects/[id]/site-publication/route.ts`, `src/components/studio/site-publication.tsx`, `src/components/studio/tab-boutique.tsx`, `src/lib/theme/render.ts` (option `publicOrigin`, inactive par défaut : l'aperçu ne change pas), tests `tests/hebergement-sites.test.ts` et `tests/sites-fixtures.ts`.
**Aucun thème validé n'est modifié.**

## 2. Recette (trois activités fictives, navigateur réel)

Comptes `proprio@recette.invalid` et `etranger@recette.invalid`, mot de passe fictif. Visiteurs **anonymes** dans des navigateurs séparés, sans aucun cookie du studio.

| # | Scénario | Résultat | Preuves |
|---|---|---|---|
| 1 | **Artisan, devis/contact** — « Atelier Clé de Fa », thème APLAT. Publication avec mentions légales incomplètes | Refusée : « Page /policies/legal-notice : texte à compléter… ». Rédaction dans « Pages légales », puis publication (13 pages, 1,6 Mo) | `s1-01` à `s1-05` |
| 1 | Visiteur ordinateur + téléphone | 9 pages en 200, aucun cookie, aucun débordement, aucun élément d'aperçu ; `/studio`, `/admin`, `/api/version`, `/connexion`, `/preview/…` → 404 ; `robots.txt` et `sitemap.xml` servis | `s1-ordinateur-*`, `s1-telephone-*`, `s1-visiteur.json` |
| 1 | Vraie demande de devis | 303 → page de confirmation du thème ; demande visible dans le studio (« SMTP non configuré ») | `s1-ordinateur-contact-*`, `s1-06` |
| 1 | Correction → V2 → restauration V1 | V2 en ligne (« VERSION 2 »), puis V1 remise en ligne à l'identique | `s1-07` à `s1-10` |
| 1 | Changement d'adresse | Nouvelle adresse 200, ancienne 404, V1 toujours servie | `s1-11`, `s1-11b`, `s1-versions.json` |
| 1 | Domaine personnalisé fictif `www.cle-de-fa.example` | Instructions TXT + CNAME ; vérification **refusée honnêtement** (« Enregistrement TXT de preuve introuvable ») ; domaine non servi | `s1-12` |
| 1 | Compte étranger | Lecture, retrait et restauration → 404 « Projet introuvable » ; page du projet → 404 ; site toujours en ligne | `s1-13` |
| 2 | **Cabinet avec réservation native** — « Cabinet Souffle », thème PARENTHÈSE. Publication en démonstration | Refusée : « réservation en mode démonstration : activez le service réel… » | `s2-01` |
| 2 | Activation du service réel, publication | Publié (16 pages, 1,9 Mo) | `s2-02` |
| 2 | Réservation par un visiteur anonyme | Calendrier (21 jours, 7 créneaux) chargé depuis l'API du studio ; rendez-vous **réellement créé** (201, référence P-2026-AZSLV) ; visible dans l'onglet Rendez-vous ; le site dit honnêtement qu'aucun e-mail n'a pu partir | `s2-04` à `s2-10`, `s2-reservation-visiteur.json` |
| 2 | Visiteur ordinateur + téléphone | 13 pages sur 14 en 200 ; `/pages/ateliers` en 404 : c'est une ancre **cachée** du thème (`aria-hidden`), vers une page absente de ce site ; aucun lien visible n'y mène (voir §3) | `s2-visiteur.json` |
| 3 | **Agence sans panier** — « Agence Horizon Conseil », thème RIVE | Aucun blocage, publié (9 pages, 2 Mo) | `s3-publication.json` |
| 3 | Visiteur + vraie demande | Pages en 200 ; demande enregistrée. **Défaut trouvé puis corrigé** : sans page de confirmation, le visiteur arrivait sur une page blanche hors charte. Désormais, retour à la page du formulaire avec le message du thème (« Merci, nous revenons vers vous rapidement. ») | `s3-ordinateur-contact-envoye` (avant), `s3b-ordinateur-contact-envoye` (après) |
| 1-3 | **Studio vs site publié** (même page, même taille, ordinateur 1440×900 et téléphone 390×844) | Écart pixel : 0,00 % partout, sauf l'accueil du site 2 (0,03 %) | `*-studio.png`, `*-publie.png`, `*-differences.png`, `s*-comparaison.json` |

Échec de publication : couvert par les blocages ci-dessus (refus avec raisons, aucune publication ni artefact créés) et par les tests automatiques.

### Tests automatiques

- `tests/hebergement-sites.test.ts` : **14/14** (hôtes et middleware, artefact figé avec empreintes, service public, V2/restauration, blocages, retrait, forfait inactif, projet archivé, réservation démo → réelle, demandes réelles, champ piège, origine, limites, retour « envoyé », droits propriétaire/étranger/anonyme, domaines).
- Rendu des thèmes et aperçu : `aplat`, `rive`, `parenthese-theme`, `parenthese-booking`, `lot5-routing-preview`, `plateformes-honnetes` : **77/77**.
- `tsc` sans erreur. CI complète : voir la PR.

## 3. Constats de la recette

Corrigés dans ce prototype :
1. Marques « à compléter » des thèmes non détectées (`[À renseigner]` dans PARENTHÈSE, « À renseigner » seul dans APLAT) → bloquées.
2. Réservation réelle sans horaire : le calendrier n'aurait proposé aucun créneau → publication bloquée.
3. Aucune manière de rédiger les pages légales avant publication → éditeur « Pages légales » ajouté.
4. Envoi de formulaire sans page de confirmation → retour dans la charte du site.

Observés, non corrigés (hors périmètre, aucun thème validé touché) :
- PARENTHÈSE garde une ancre cachée vers `/pages/ateliers`, même quand le site n'a pas d'ateliers (sans effet visible).
- APLAT : le nom de la marque en texte est presque invisible dans le pied de page sombre (identique dans l'aperçu).
- Les abonnements sont **par projet** : chaque site publié exige son propre forfait actif.

## 4. Limites (ce qui n'est pas fait)

- **Pas d'infrastructure réelle** : ni domaine des sites, ni DNS joker, ni serveur permanent, ni certificat reconnu. Le Codespace actuel ne convient pas : il est éphémère et servi sous une adresse GitHub.
- **HTTPS des domaines personnalisés** (émission, renouvellement) : rien dans l'application ; cela relève du proxy frontal (Caddy « on-demand TLS » avec une route `ask`). Non construit.
- Changement de propriétaire d'un projet : aucune règle spécifique (le domaine suit le projet). Expiration du forfait : site suspendu (503), testé.
- Pas de purge des anciennes publications (environ 2 Mo chacune sans photo) : à borner, par exemple aux 10 dernières.
- Pas de quota de trafic ni de stockage par forfait au-delà de 80 pages et 250 Mo par publication.
- Notifications e-mail : seulement si un SMTP est configuré.
- Sauvegardes de `DATA_DIR/sites` : à planifier.
- Photos : les sites recettés n'en avaient aucune. Le chemin des images est couvert par les tests, mais pas recetté à volume réel.

## 5. Coûts éventuels (ordres de grandeur, à confirmer avant tout achat)

Rien n'a été acheté ni souscrit.
- Un domaine dédié aux sites, différent de celui du studio : environ 10 à 20 € par an.
- Un serveur permanent (VPS) avec Caddy et Let's Encrypt : à partir de quelques euros par mois. Les certificats sont gratuits.
- Un SMTP transactionnel : offre gratuite ou quelques euros par mois selon le volume.
- Le stockage des sauvegardes : quelques euros par mois.
- Les forfaits 49 / 89 / 129 € restent inchangés, sans supplément. Le coût marginal d'un site sans photo (environ 2 Mo par publication) est négligeable.

## 6. Plan de déploiement (chaque étape attend un accord du propriétaire)

1. **Décision** : choisir et acheter le domaine des sites (registrable, distinct du studio) et l'hébergeur.
2. **Serveur** : studio compilé + Caddy. Joker `*.<domaine des sites>` avec certificat DNS-01, `SITES_DOMAIN`, `APP_URL` en HTTPS public (obligatoire pour la réservation réelle), sauvegardes `DATA_DIR`.
3. **Test sur vraie infrastructure** : rejouer cette recette (`recette-232/scripts`) sur le vrai domaine, avec un site fictif → niveau `test sur vraie infrastructure`.
4. **SMTP**, puis notification réelle d'une demande.
5. **Domaines personnalisés** : route `ask` pour Caddy, puis `SITES_CUSTOM_DOMAINS=1`, puis essai sur un domaine de test du propriétaire.
6. **Ouverture limitée** à un premier client volontaire, avec un suivi → seulement alors `production validée`.

## 7. Reproduire la recette

Dans `recette-232/scripts/` :
- `seed-recette.mts` crée les comptes et les sites fictifs ;
- `grant.mts` attribue les forfaits ;
- `proxy.mjs` lance le proxy HTTPS local (certificat auto-signé à générer dans `tls/`, jamais versionné) ;
- `run-all.sh` enchaîne les étapes.

Le studio se lance avec `SITES_DOMAIN=sites.recette.test SITES_PORT=3943 APP_URL=https://studio.recette.test:3943`. Chromium résout `*.recette.test` vers la machine (`--host-resolver-rules`).
