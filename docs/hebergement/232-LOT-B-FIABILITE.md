# Sites de services (#232) — Lot B : fiabilité de l'hébergement

**Base** : lot A (`claude/232-notifications-email`), lui-même basé sur le prototype #234 (`72c572af`, CI verte).
**Branche** : `claude/232-hebergement-fiabilite`. Rien n'est déployé ; aucun fournisseur, domaine ou serveur réel.

## 1. État

| Élément | Fait | Testé localement | Prêt seulement après configuration réelle |
|---|---|---|---|
| Site riche en médias (24 images, 3 formats, de 480 px à 3 200 px) : figé, servi à l'identique, redimensionné | ✅ | ✅ tests + recette | — |
| Média supprimé ou fichier introuvable → publication refusée avec la liste | ✅ | ✅ | — |
| Restauration : tous les fichiers vérifiés contre leur empreinte ; version altérée ou purgée refusée | ✅ | ✅ | — |
| Purge automatique : version en ligne + 10 plus récentes gardées ; fiches et historique conservés | ✅ | ✅ | — |
| Quota de stockage : 1 Go par site, inclus ; au-delà, les plus anciennes sont purgées d'abord, jamais la version en ligne ni la plus récente | ✅ | ✅ | — |
| Trafic mesuré (requêtes, octets, par jour) ; repère d'usage de 50 Go par mois, signalé, jamais coupé ni facturé | ✅ | ✅ | limitation anti-abus au proxy (§3) |
| Publication interrompue (dossier temporaire de plus d'1 h) nettoyée par le worker | ✅ | ✅ | — |
| Sauvegarde en ligne (base SQLite + publications) et vérification par empreintes ; script d'exploitation | ✅ | ✅ | planification et copie hors serveur |
| Diagnostic dans le studio (« Vérifier le site en ligne ») | ✅ | ✅ ordinateur + téléphone | — |

## 2. Fonctionnement

- **`src/lib/sites/maintenance.ts`** :
  - `verifyPublication` : présence et sha256 de chaque fichier, selon le manifeste ;
  - `cleanupInterrupted` ;
  - `purgeOldPublications` : colonne `purged_at`, suppression des fichiers seulement ;
  - `storageUsed` ;
  - `recordTraffic` / `flushTraffic` / `traffic` : compteurs en mémoire, écrits par lots dans `site_traffic` ;
  - `siteDiagnostics` ;
  - `backupSites` / `verifyBackup`.
- **Publication** (`publish.ts`) :
  - un fichier manquant bloque la publication ;
  - après mise en ligne, purge bornée ;
  - la restauration vérifie l'intégrité et refuse une version purgée.
- **Service** (`serve.ts`) : comptage du trafic des pages et fichiers servis.
- **Worker** : nettoyage des publications interrompues à chaque passage.
- **Studio** :
  - espace utilisé et règle de conservation ;
  - versions purgées signalées, sans bouton « Remettre en ligne » ;
  - section « Diagnostic du site ».
- **Exploitation** : `npx tsx scripts/sites-backup.ts sauvegarder <dossier> | verifier <dossier> | controler`.

### Restauration après incident (studio arrêté)

1. Arrêter le studio et son worker.
2. Remplacer `DATA_DIR/studio.db` (ou le fichier de base configuré) par `studio.db` de la sauvegarde. Remplacer `DATA_DIR/sites/` par `sites/` de la sauvegarde.
3. Si les médias des clients (`DATA_DIR` hors `sites/`) sont aussi touchés, les restaurer depuis la sauvegarde complète de `DATA_DIR` (voir §3).
4. Redémarrer, puis lancer `scripts/sites-backup.ts controler` : chaque publication doit être intacte.
5. Si une seule publication est abîmée, la remettre en ligne depuis une version intacte (studio) ou la republier.

## 3. Infrastructure réelle à prévoir — distinction nette avec les tests locaux

| Sujet | Test local (fait) | Réel (à décider, non fait) |
|---|---|---|
| **Domaine des sites** | `*.sites.recette.test`, résolu vers la machine par Chromium | Un domaine **enregistrable distinct** de celui du studio (isolation des scripts et des cookies), par exemple `<marque>-sites.fr`. DNS joker `*.<domaine>` vers le serveur |
| **Serveur** | Studio compilé (`npm run studio`), Codespace/conteneur éphémère | Serveur permanent (VPS), image Docker du dépôt (`Dockerfile`, volume `/data`), redémarrage automatique |
| **HTTPS** | Proxy local à certificat auto-signé | Caddy en frontal. Certificat joker `*.<domaine des sites>` par défi DNS-01 (jeton de l'API DNS du registrar). Studio sur son propre nom. Domaines personnalisés : lot C |
| **E-mails** | SMTP local de test, sans relais | SMTP transactionnel, domaine expéditeur du studio avec SPF, DKIM et DMARC (lot A) |
| **Stockage** | Disque local du conteneur | Disque du serveur dimensionné : 1 Go par site au plus pour les publications, plus les médias des clients |
| **Sauvegardes** | Script lancé à la main, vérifié | Chaque nuit : `sites-backup.ts sauvegarder` + copie chiffrée hors serveur (stockage objet), plus une sauvegarde complète de `DATA_DIR`. Conserver 7 jours, 4 semaines et 6 mois. Restauration testée chaque mois |
| **Surveillance** | Diagnostic du studio, journal d'erreurs, `/api/health` (dont le battement du worker) | Sonde externe sur `/api/health` et sur un site témoin. Alerte sur échecs d'e-mails et erreurs `site-notify:echec` / `sites:*`. Espace disque, échéance des certificats |
| **Anti-abus** | Limites de l'application sur les formulaires | Limitation de débit par IP au proxy (Caddy `rate_limit` ou équivalent). Cache HTTP déjà émis (`max-age=60`, `ETag`) |

### Exemple de configuration Caddy (indicatif, non déployé)

```
{
  email exploitation@<domaine du studio>
}
studio.<domaine du studio> {
  reverse_proxy studio:3000
}
*.<domaine des sites> {
  tls {
    dns <fournisseur-dns> {env.DNS_API_TOKEN}
  }
  reverse_proxy studio:3000
}
```

Le studio reçoit le nom d'hôte d'origine : son middleware ne sert que les sites sous ces noms. Variables : `SITES_DOMAIN=<domaine des sites>`, `APP_URL=https://studio.<domaine du studio>`.

## 4. Coûts (ordres de grandeur, aucun engagé, à confirmer)

| Poste | Ordre de grandeur |
|---|---|
| Domaine des sites | 10 à 20 € par an |
| Serveur (VPS 2 à 4 vCPU, 4 à 8 Go) | 5 à 30 € par mois |
| Stockage objet des sauvegardes | Quelques euros par mois pour des dizaines de Go |
| Certificats Let's Encrypt | Gratuit |
| SMTP | Voir lot A |
| Surveillance externe | Gratuite à quelques euros par mois |

Les forfaits 49, 89 et 129 € incluent l'hébergement des sites sans supplément.

## 5. Preuves

### Tests automatiques

- `tests/hebergement-fiabilite.test.ts` : **7/7**.
  - Site riche en médias : figé, servi à l'identique, redimensionné.
  - V2, puis restauration de V1 à l'identique. Version altérée refusée ; le diagnostic signale le défaut.
  - Média supprimé : publication refusée.
  - Purge et quota.
  - Publication interrompue.
  - Sauvegarde : vérifiée ; perte en service puis restauration depuis la sauvegarde ; altération détectée.
  - Trafic et diagnostic ; droits.
- Lot A et prototype non régressés : 37/37 tests d'hébergement au total. Types OK.

### Recette

Voir le §6.

## 6. Recette sur l'instance isolée (studio compilé `4c33c536`, proxy HTTPS local)

4e site fictif : « Studio Lumière Fictif », thème APLAT. 24 images générées (PNG, JPEG, WebP, de 480 à 3 200 px), placées dans les 18 emplacements d'image des sections. Preuves : [`recette-232-lot-b/`](./recette-232-lot-b/).

| Scénario | Résultat | Preuves |
|---|---|---|
| Publication du site riche en médias | 13 pages, 3,4 Mo, 52 fichiers | `b1-01` |
| Visiteur, ordinateur et téléphone (accueil, prestations) | Toutes les images demandées ont chargé, **aucune réponse en erreur**. Les quelques images « non chargées » sont des variantes masquées sur cet écran ou à chargement différé : elles répondent toutes 200 (vérifié une par une). `/pages/realisations` (404) n'existe pas dans ce site : chemin supposé par le script, aucun lien n'y mène | `b1-02-*`, `b1-fiabilite.json` |
| Diagnostic | 7 contrôles OK, dont « 52 fichiers intacts (empreintes vérifiées) », espace, trafic et e-mails | `b1-03`, `b1-07-*` |
| Publications répétées | 10 versions restaurables gardées, les plus anciennes marquées « fichiers purgés » (ordinateur et téléphone). Espace constant (≈ 32 Mo sur 1 024) | `b1-04`, `b1-08-*` |
| Remise en ligne | Version purgée : **refusée** (409, message clair). Version gardée : **remise en ligne** | `b1-fiabilite.json` |
| Fichier altéré dans la version en ligne | Diagnostic « À voir : 1 altéré » ; remise en ligne de cette version refusée ; republication → diagnostic de nouveau OK | `b1-05`, `b1-06` |
| Publication interrompue simulée (dossier temporaire de 2 h) | Nettoyée par `controler` | `b1-fiabilite.json` |
| Script `sauvegarder` / `verifier` / `controler` | 15 publications, 677 fichiers, 42,8 Mo sauvegardés. La vérification **signale la publication n°24, volontairement altérée par la recette** (code de sortie 1). Une altération ajoutée ensuite dans la sauvegarde est aussi détectée | `b1-fiabilite.json` |

Note : sur téléphone, « Publier votre site » est dans l'onglet « Aperçu » du site, comme le reste de la barre d'outils.
