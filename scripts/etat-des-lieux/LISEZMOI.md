# Prototypes de l'état des lieux du 12 novembre 2026

Outils écrits pendant l'état des lieux demandé par le propriétaire (`docs/MISSION-STUDIO-COMPLET.md`), **sans aucune
dépense** : aucune clé d'IA, aucun appel payant. Ce sont des prototypes : ils servent de point de départ au premier lot
du plan (`docs/etat-des-lieux-2026-11-12.md`), ils ne sont branchés sur rien dans le Studio.

Tout se lance depuis la racine du dépôt. Rien n'est écrit dans le dépôt : les sorties vont dans le dossier donné.

## 1. Studio d'audit sans clé (`audit-studio.mts`)

Lance le Studio sur des données fictives, **sans aucune clé de fournisseur** (elles sont retirées de l'environnement
avant le démarrage), avec des comptes fictifs et quatre projets portant un thème sur mesure d'exemple.

```bash
npx next build
AUDIT_DIR=<dossier hors dépôt> AUDIT_PORT=3493 npx tsx --tsconfig tsconfig.json scripts/etat-des-lieux/audit-studio.mts
```

## 2. Captures de chaque écran (`captures.mjs`)

Ouvre chaque page du Studio d'audit sur ordinateur (1440 px) et sur téléphone (390 px), capture, et relève les erreurs
de script, les requêtes en échec et les débordements.

```bash
node scripts/etat-des-lieux/captures.mjs <dossier d'audit> <dossier de sortie>
```

## 3. Contrôle visuel automatique, sans IA (`controle-visuel.mjs`)

Ouvre une page comme un visiteur, sur ordinateur puis sur téléphone, et mesure section par section :

- textes peu lisibles : le contraste est mesuré sur les vrais pixels, sous le texte (une seconde capture est prise avec
  les textes rendus transparents) ; les cartes estompées exprès, les lettres au contour et le dos des cartes qui se
  retournent sont écartés ;
- textes et boutons trop petits sur téléphone, texte collé au bord ;
- boutons et liens où rien ne se passe au clic (chaque lien sans destination est réellement cliqué) ;
- images cassées, floues ou en double ; vides et colonnes étroites ; sections collées ; titres mal alignés ;
- erreurs de script.

Chaque défaut est entouré en rouge sur une capture de la section. Deux niveaux : « défaut » et « à regarder ».

```bash
# Un thème sur mesure du Studio d'audit (toutes ses pages)
node scripts/etat-des-lieux/controle-visuel.mjs <dossier d'audit> <sortie> client "/api/projects/<id>/custom-theme" <nom>
# La banque de sections, avec ses exemples remplis
CV_REMPLI=1 node scripts/etat-des-lieux/controle-visuel.mjs <dossier d'audit> <sortie> client "/api/projects/<id>/custom-theme?catalog=classique" <nom>
# N'importe quelle page locale, sans connexion
node scripts/etat-des-lieux/controle-visuel.mjs <dossier d'audit> <sortie> - "file:///chemin/page.html" <nom>
```

**Limites connues (à régler au lot 0)** : fausses alertes dans les paniers qui s'ouvrent sur le côté et les carrousels ;
« textes superposés » sur-signalé quand un grand titre a un interligne serré ; éléments rangés hors écran pris pour des
débordements. Les chiffres du 12 novembre (`synthese-controle-2026-11-12.json`) donnent un ordre de grandeur.

## 4. Sections « composants » (`composants-prototype/`)

Trois sections écrites **une seule fois** (`composants/<nom>/` : `schema.json`, `gabarit.liquid`, `style.css`), des
règles de dessin communes (`jetons.css`) et trois marques **fictives** (`donnees/marques.json`). Le même programme :

1. contrôle les données avant tout affichage (réglage inconnu, texte hors limites, bouton sans lien, photo en double) ;
2. affiche chaque marque (rendu Liquid) ;
3. fabrique un thème Shopify (sections avec schéma, modèles JSON) et le fait vérifier par Theme Check.

```bash
SORTIE=<dossier hors dépôt> npx tsx --tsconfig tsconfig.json scripts/etat-des-lieux/composants-prototype/construire.mts tout
```

Résultat du 12 novembre : données conformes, Theme Check 0 erreur et 0 avertissement, contrôle visuel 0 défaut sur les
trois marques (ordinateur et téléphone). Le contrôle avait d'abord trouvé quatre textes peu lisibles dans l'ouverture :
le voile a été corrigé.

Le prototype est autonome pour rester lisible. La vraie banque doit vivre dans `theme-base/` et passer par le moteur
existant (`src/lib/theme/` : `ThemeSpec`, `compileTheme`, `renderPage`, opérations de retouche, export), pas par un
moteur à part.
