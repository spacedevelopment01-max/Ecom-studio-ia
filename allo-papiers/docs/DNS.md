# Domaines et emails : réglages DNS (OVH ou Gandi)

> **Les valeurs exactes sont affichées par Vercel et par Resend** au moment où vous ajoutez le domaine. Elles peuvent changer : **recopiez toujours celles affichées dans leurs tableaux de bord**. Celles ci-dessous sont des exemples typiques, que je n'ai pas pu vérifier sur votre compte.

## Avant de commencer : ne rien casser

Si vous avez **déjà une messagerie** sur `allopapiers.fr` (OVH Mail, Gandi Mail, Google Workspace…) :

- **Ne supprimez pas** les enregistrements **MX** existants de `allopapiers.fr`. Ce sont eux qui reçoivent vos emails.
- **Ne créez pas un second SPF** sur `allopapiers.fr`. Il ne peut en exister qu'**un seul** par nom. Resend utilise le sous-domaine **`send`** : il ne touche donc pas à votre SPF principal.
- Si vous voulez **recevoir** des emails sur `contact@allopapiers.fr`, utilisez la messagerie de votre registraire (OVH : offre « MX Plan » ; Gandi : 2 boîtes incluses avec le domaine) ou une redirection vers votre adresse personnelle.

## 1. Site web : `allopapiers.fr` → Vercel

Dans Vercel, **Settings → Domains**, ajoutez `allopapiers.fr` et `www.allopapiers.fr`. Vercel affiche alors les enregistrements attendus, en général :

| Type | Nom (sous-domaine) | Valeur | Remarque |
|---|---|---|---|
| A | *(vide / @)* | `76.76.21.21` | ou l'adresse IP indiquée par Vercel |
| CNAME | `www` | `cname.vercel-dns.com.` | ou la valeur indiquée par Vercel |

Pour le domaine principal, choisissez **`allopapiers.fr`**. Vercel redirige alors `www` vers lui. Le code du site le fait aussi.

## 2. Redirection : `allo-papiers.fr` → `allopapiers.fr`

Ajoutez aussi `allo-papiers.fr` (et `www.allo-papiers.fr`) dans **Vercel → Domains**, puis réglez-les sur **« Redirect to allopapiers.fr » (308 permanent)**. Créez chez le registraire de `allo-papiers.fr` les mêmes enregistrements **A** et **CNAME** qu'au point 1.

## 3. Emails d'envoi (Resend) : SPF, DKIM, DMARC

Dans Resend, **Domains → allopapiers.fr** (région Ireland) affiche généralement :

| Type | Nom | Valeur | Rôle |
|---|---|---|---|
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com`, priorité 10 | retours d'erreur (bounces) |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | **SPF** du sous-domaine d'envoi |
| TXT | `resend._domainkey` | `p=MIGfMA0…` (longue clé fournie par Resend) | **DKIM** (signature) |

Ajoutez ensuite **DMARC** (un seul enregistrement par domaine ; s'il en existe déjà un, gardez-le) :

| Type | Nom | Valeur |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:contact@allopapiers.fr` |

Commencez avec `p=none` (simple observation). Après quelques semaines sans problème, passez à `p=quarantine`.

## Où cliquer

**OVH** : Espace client → **Web Cloud** → **Noms de domaine** → `allopapiers.fr` → onglet **Zone DNS** → **Ajouter une entrée**.
- Choisissez le type (A, CNAME, TXT, MX).
- Saisissez le sous-domaine **sans** le nom de domaine (par exemple `send`, et non `send.allopapiers.fr`).
- Collez la valeur et validez.
- Supprimez un éventuel ancien enregistrement **A** de `@` qui pointe vers une page d'attente OVH. Ne touchez pas aux **MX**.

**Gandi** : Tableau de bord → **Noms de domaine** → `allopapiers.fr` → **Enregistrements DNS** → **Ajouter**.
- Le nom `@` désigne le domaine lui-même.
- Gandi crée souvent des enregistrements par défaut (`@ A` vers sa page d'accueil, `www CNAME webredir…`). **Remplacez-les** par ceux de Vercel.

La propagation prend de quelques minutes à quelques heures. Vercel et Resend affichent **« Valid » / « Verified »** quand c'est terminé.
