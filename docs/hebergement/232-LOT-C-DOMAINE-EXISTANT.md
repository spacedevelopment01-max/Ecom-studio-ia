# Sites de services (#232) — Lot C : relier un domaine déjà possédé

**Base** : lot B (`claude/232-hebergement-fiabilite`) ← lot A ← prototype #234 (`72c572af`, CI verte).
**Branche** : `claude/232-domaine-existant`. Aucun achat, aucun registrar, aucune modification de DNS réel, aucun certificat réel.
La recherche, l'achat et le renouvellement de **nouveaux** noms sont une phase ultérieure (registrar partenaire, décision séparée).

## 1. État

| Élément | Fait | Testé localement | Non testé réellement | Prêt seulement après configuration |
|---|---|---|---|---|
| Saisie du domaine, refus des domaines du studio et des sites, 2 par site au plus | ✅ | ✅ | — | — |
| Preuve de propriété TXT `_ecs-verif.<domaine>` (jeton propre à chaque demande) | ✅ | ✅ (DNS local réel) | DNS public | — |
| Pointage : CNAME (sous-domaine), A/AAAA vers le serveur (domaine nu) ; mauvaise IP détectée | ✅ | ✅ | DNS public | IP publique du serveur (`SITES_PUBLIC_IPS`) |
| États lisibles : preuve à ajouter, pointage à faire, prêt non servi, actif, désactivé, à revérifier, perdu | ✅ | ✅ ordinateur + téléphone | — | — |
| Servi seulement si vérifié par le propriétaire **actuel** ; changement de propriétaire → à revérifier | ✅ | ✅ (tests) | — | — |
| Désactivation réversible (réactiver = revérifier), retrait sans toucher l'adresse du studio | ✅ | ✅ | — | — |
| Revérification quotidienne : preuve absente 3 fois → « perdu », plus servi | ✅ | ✅ (worker réel, 3 passages simulés) | durée réelle | — |
| Conflits : domaine prouvé ailleurs refusé ; demande jamais prouvée libérée après 7 jours | ✅ | ✅ (tests) | — | — |
| HTTPS : route `ask` pour Caddy `on_demand_tls` (oui seulement pour un nom servi, forfait actif, site en ligne ; jeton) | ✅ | ✅ | **émission réelle d'un certificat** | Caddy + serveur public |
| Forfait expiré | ✅ (site suspendu 503 ; pas de nouveau certificat) | ✅ (tests du prototype) | — | — |

## 2. Fonctionnement (`src/lib/sites/domains.ts`)

Le client fait trois gestes chez son fournisseur de domaine. Le studio vérifie et explique, sans jamais modifier le DNS lui-même.

1. **Preuve** : TXT `_ecs-verif.<domaine>` = `ecs-…`. Il faut laisser cet enregistrement en place : il est revérifié chaque jour.
2. **Pointage** :
   - sous-domaine (`www.…`) : CNAME vers `<adresse>.<domaine des sites>` ;
   - domaine nu : A (et AAAA) vers l'IP du serveur. Tant qu'elle n'est pas connue, le studio conseille de relier `www`.
3. **HTTPS** : certificat émis par le proxy à la première visite, après accord de `GET /api/site-domains/ask?domain=…&token=…`.

| État (`domainState`) | Signification | Servi ? |
|---|---|---|
| `pending_dns` | Preuve absente | Non |
| `pointing` | Propriété prouvée, pointage absent ou incorrect | Si le trafic arrive quand même (DNS déjà pointé ailleurs vers nous) : oui ; sinon il n'arrive pas |
| `not_served` | Tout est prêt, mais `SITES_CUSTOM_DOMAINS` n'est pas activé sur ce serveur | Non |
| `active` | Preuve, pointage et mise en service OK | Oui |
| `disabled` | Désactivé par le client | Non |
| `reverify` | Le projet a changé de propriétaire depuis la preuve | Non |
| `lost` | Preuve disparue 3 vérifications de suite (domaine expiré, DNS changé, domaine cédé) | Non |

Variables :
- `SITES_CUSTOM_DOMAINS=1` : mise en service ;
- `SITES_PUBLIC_IPS` : IP du serveur pour les domaines nus ;
- `SITES_ASK_TOKEN` : jeton de la route `ask` ;
- `SITES_DNS_SERVERS` : résolveurs interrogés, par exemple `1.1.1.1,8.8.8.8` ; la recette y met un DNS local ;
- `STUDIO_HOSTS` : noms internes du studio, jamais traités comme un site.

### Caddy (indicatif, non déployé)

```
{
  on_demand_tls {
    ask http://127.0.0.1:3000/api/site-domains/ask?token={env.SITES_ASK_TOKEN}
  }
}
https:// {
  tls { on_demand }
  reverse_proxy 127.0.0.1:3000
}
```

L'appel `ask` part de `127.0.0.1`, qui est un nom du studio : il n'est jamais réécrit vers un site. Le certificat joker du domaine des sites reste en DNS-01 (lot B).

## 3. Contrats pour SYNA (#211) : prévu, implémenté, vérifié

| Contrat | Fonction | Statut |
|---|---|---|
| `domain.verifyOwnership` | `addCustomDomain` puis `verifyCustomDomain` | **Implémenté, vérifié localement** (tests + DNS local) |
| `domain.connect` | `verifyCustomDomain` (pointage) et `setCustomDomainEnabled(true)` | **Implémenté, vérifié localement** |
| `domain.status` | `customDomains(projectId)` : état, instructions, dernière vérification, motif | **Implémenté, vérifié localement** |
| `domain.disconnect` | `setCustomDomainEnabled(false)`, `removeCustomDomain` | **Implémenté, vérifié localement** |
| `domain.checkAvailability`, `domain.suggest`, `domain.quote`, `domain.register`, `domain.renew` | — | **Prévus seulement** : exigent un registrar partenaire et un accord |

Droits : propriétaire du projet seulement (API `site-publication`, actions `domain-add`, `domain-verify`, `domain-enable`, `domain-remove`). SYNA doit passer par ces mêmes actions ; il ne doit pas dupliquer la logique DNS.

## 4. Preuves

- **Tests** : `tests/domaines-existants.test.ts` **7/7**. Avec les lots précédents : 44/44 tests d'hébergement. Types OK.
- **Recette** sur l'instance isolée : studio compilé et son worker, proxy HTTPS local, **serveur DNS local** répondant réellement aux requêtes du studio, domaines fictifs en `.example`. Voir [`recette-232-lot-c/`](./recette-232-lot-c/) et le §5.

## 5. Recette (studio compilé `4876fc59`, `SITES_CUSTOM_DOMAINS=1`, DNS local)

Site de l'artisan fictif « Atelier Clé de Fa » (`cle-de-fa-lyon.sites.recette.test`), domaines fictifs `www.cle-de-fa.example` et `cle-de-fa.example`. Le « fournisseur DNS » du client est simulé par `dns-local.mjs`, que le studio interroge réellement (journal des requêtes dans `c1-domaines.json`).

| Étape | Résultat | Preuves |
|---|---|---|
| Domaine ajouté, rien dans le DNS | « Étape 1 : preuve de propriété à ajouter » ; le visiteur reçoit 404 | `c1-01` |
| TXT ajouté → Vérifier | « Propriété prouvée · étape 2 : pointage à faire », motif « ne pointe pas encore vers … (CNAME) » | `c1-02` |
| CNAME ajouté → Vérifier | « Actif » ; **le visiteur voit le site sur son domaine (200)** | `c1-03`, `c1-04` |
| Question du proxy avant certificat | 200 avec le jeton ; 404 sans jeton ou pour un domaine inconnu ; 200 pour l'adresse du studio | `c1-domaines.json` |
| Domaine nu | Instructions `A/AAAA cle-de-fa.example → 203.0.113.10` (IP de documentation). Une mauvaise IP laisse le domaine en « pointage à faire » ; la bonne IP le rend actif, servi (200) | `c1-05` |
| Désactiver | Désactivé, 404, aucun certificat. Réactiver → revérifié → actif, 200 | `c1-06` |
| Preuve retirée (domaine « expiré ») | Après 3 revérifications du worker (requêtes DNS réelles au DNS local) : « Perdu : preuve DNS disparue », motif explicite, 404, aucun certificat | `c1-07` |
| Compte étranger | Lecture du projet de l'artisan : 404 (le conflit entre deux clients est couvert par les tests) | `c1-domaines.json` |
| Téléphone | Parcours lisible : actif et perdu | `c1-08` |

## 6. Limites

- **Certificats réels** : non testés (pas de serveur public). La route `ask` est prête.
- **Domaine nu** : il faut l'IP fixe du serveur. Pas d'ALIAS/ANAME automatique ; `www` reste conseillé.
- **Redirection domaine nu ↔ www** : non faite (à ajouter au proxy).
- **Liste des suffixes publics approximative** (`.co.uk`, `.com.fr`… courants seulement) pour distinguer un domaine nu d'un sous-domaine.
- **Plusieurs comptes revendiquant le même domaine non prouvé** : premier arrivé, 7 jours au plus. Ensuite, le premier qui prouve.
