/**
 * LE BANC D'ÉPREUVES DE SINA (le socle, accepté par le propriétaire le 21 novembre 2026). Chaque raté vu avec le
 * propriétaire devient une épreuve, avec son verdict mot pour mot, la date et le compte rendu où il est écrit. Elles
 * sont rejouées avant chaque envoi (`npx vitest run`, ou `npm run epreuves`) ; si une chose qu'il avait validée
 * redevient mauvaise, l'envoi est bloqué.
 *
 * RÈGLE : un verdict et ce qui est attendu ne se réécrivent JAMAIS pour faire passer un essai (recherche : « les résultats
 * attendus de cette batterie sont figés »). Chaque épreuve est scellée dans `sceaux.json` : la changer fait échouer le
 * banc. Seul le propriétaire peut changer un verdict ; on peut ajouter des épreuves, jamais en retirer.
 *
 * `rejeu` : « gratuit » se rejoue sans aucun appel payant (contrôles du code, consignes envoyées, faux dessinateur et faux
 * relecteur) ; « payant » demanderait la vraie IA : listée avec son prix, jamais lancée sans l'accord écrit du
 * propriétaire. Les clients des épreuves sont inventés ; aucun exemple des anciens projets d'essai mis de côté.
 */
export type Epreuve = {
  id: string;
  date: string;
  /** Les mots du propriétaire (ou la règle qu'il a validée), tels qu'ils sont écrits dans le compte rendu. */
  verdict: string;
  source: string;
  /** Ce qui doit rester vrai, dit simplement. */
  attendu: string;
  rejeu: "gratuit" | "payant";
  /** Pour une épreuve payante : ce qu'elle coûterait, et ce qui manque pour la construire. */
  prix?: string;
  /**
   * Épreuve REMPLACÉE par une décision datée du propriétaire (HORS du sceau : le verdict, l'attendu et le sceau ne bougent
   * pas). Elle reste au catalogue pour toujours ; le banc ne la rejoue plus et l'affiche « remplacée le … par … ».
   * `sceau` : son sceau au jour du remplacement, figé ; une épreuve remplacée ne se rescelle jamais.
   */
  remplaceePar?: { decision: string; mots: string; epreuve: string; sceau: string };
};

/**
 * La décision du propriétaire du 23 novembre 2026 sur le dessinateur du logo, et son accord écrit pour marquer les épreuves
 * qu'elle remplace (« Oui, marque ces 8 épreuves comme remplacées par ma décision du 23 novembre, mets à jour la partie
 * Logo de CLAUDE.md, et garde le trait près du nom (un seul par série) côté relecteur. »).
 */
const DECISION_DU_23_NOVEMBRE = {
  decision: "23 novembre 2026",
  mots: "« je pense qu'il ne faut pas donner d'informations sauf fait moi un logo pour une marque de bougies tu donne le nom de la marque et rien de plus, pas de le client ne veux pas tel truc dans son logo. Ça doit être le plus libre possible pour la création du logo »",
  epreuve: "logo-demande-nue",
};

/**
 * La précision du propriétaire du 23 novembre 2026 sur la série des logos, et son accord écrit pour marquer les épreuves
 * qu'elle remplace (« Oui, marque logo-demande-nue et trait-pres-du-nom-un-par-serie-au-relecteur comme remplacées par ma
 * précision du 23 novembre sur la série, ajoute les épreuves serie-logo-completement-different et trois-fois-le-meme-dessin,
 * et mets à jour la partie Logo de CLAUDE.md. »).
 */
const PRECISION_SERIE_DU_23_NOVEMBRE = {
  decision: "23 novembre 2026",
  mots: "« En même temps il fallait garder la règle de le premier logo est fait donc on le donne à open ia et on lui dit je veux un autre logo complètement différent de celui là et pour le 3eme pareil, ou lui donne les 2 première et on lui dit fait moi un autre logo complètement différent des 2 premier. Et moi j'aime bien le 1er logo. Pour rappel on ne demande plus au client ce qu'il veux ou non dans son logo »",
  epreuve: "serie-logo-completement-different",
};

/**
 * La décision du propriétaire du 23 novembre 2026 au soir, après l'essai de Pénombre (« Ouai c'est la catastrophe mon
 * idée »), et son accord écrit pour marquer les épreuves qu'elle remplace (« Oui, marque refus-et-consigne-apres-la-demande-nue
 * et serie-logo-completement-different comme remplacées par ma décision du 23 novembre au soir, ajoute les épreuves
 * demande-du-logo-couleurs-typo-fond et relecteur-du-logo-qualite-seule, et mets à jour la partie Logo de CLAUDE.md. »).
 */
const DECISION_DU_23_NOVEMBRE_AU_SOIR = {
  decision: "23 novembre 2026",
  mots: "« Et si on enlevait mes 50 logos de démo pour lui laisser un peu plus de liberté et enlever l'idée de la marque et juste dire que c'est une marque de bougies »",
};

/**
 * La méthode des graphistes du 24 novembre 2026 (« oui » du propriétaire à sa construction ; « Oui » à « Le client choisit
 * d'abord son nom, puis les logos : tu es d'accord ? »), et son accord écrit pour marquer les épreuves qu'elle remplace, mot
 * pour mot (relayé par le chef d'orchestre). Compte rendu : docs/studio/LOGO-METHODE-DES-GRAPHISTES.md.
 */
const METHODE_DES_GRAPHISTES = {
  decision: "24 novembre 2026",
  mots: "« Oui, marque trois-fois-le-meme-dessin, logos-de-la-serie-dans-l-ordre, pas-de-consigne-de-style-pour-un-logo, demande-du-logo-couleurs-typo-fond et relecteur-du-logo-qualite-seule comme remplacées par la méthode des graphistes du 24 novembre, ajoute et scelle logo-refait-une-fois-avec-ses-raisons, esquisses-choisies-selon-le-forfait, finalisation-ecrite-par-le-plus-fort, planches-de-recherche-demande-exacte et relecteur-du-logo-fini, retire l'ancienne série de logos, et mets à jour la partie Logo de CLAUDE.md. »",
};
const VERDICT_GRAPHISTES = "Accord écrit du propriétaire du 24 novembre 2026, mot pour mot : « Oui, marque trois-fois-le-meme-dessin, logos-de-la-serie-dans-l-ordre, pas-de-consigne-de-style-pour-un-logo, demande-du-logo-couleurs-typo-fond et relecteur-du-logo-qualite-seule comme remplacées par la méthode des graphistes du 24 novembre, ajoute et scelle logo-refait-une-fois-avec-ses-raisons, esquisses-choisies-selon-le-forfait, finalisation-ecrite-par-le-plus-fort, planches-de-recherche-demande-exacte et relecteur-du-logo-fini, retire l'ancienne série de logos, et mets à jour la partie Logo de CLAUDE.md. » Et son « oui » à la construction de la méthode des graphistes (24 novembre 2026)."
const SOURCE_GRAPHISTES = "docs/studio/LOGO-METHODE-DES-GRAPHISTES.md (méthode des graphistes ; accord écrit du propriétaire du 24 novembre 2026, relayé mot pour mot par le chef d'orchestre)";

/**
 * Les deux changements du propriétaire du 24 novembre 2026 sur la méthode des graphistes : la phrase des couleurs à la
 * recherche (« Ouais mais c'est ça que je veux dans sina c'est la nouvelle planche avec un peu plus de coloris ») et le
 * relecteur du logo fini qui ne refuse plus un logo trop proche de son esquisse (« Ouais », à « Je fais retirer cette
 * règle et je relance la finalisation du R bordeaux ? »). Son accord écrit pour marquer les épreuves qu'ils remplacent est
 * encore à recevoir : `ACCORD_A_COMPLETER` tient sa place, et le banc n'accepte ce manque que pour ces deux épreuves.
 */
export const ACCORD_A_COMPLETER = "[À compléter : phrase d'accord écrite du propriétaire]";
const COULEURS_ET_RELECTEUR = { decision: "24 novembre 2026", mots: ACCORD_A_COMPLETER };
const SOURCE_COULEURS_ET_RELECTEUR = "docs/studio/LOGO-METHODE-DES-GRAPHISTES.md (parties « Ce que le propriétaire a dit » et « Les deux changements du 24 novembre » ; ses mots relayés par le chef d'orchestre)";

export const EPREUVES: Epreuve[] = [
  {
    id: "logo-goutte-refusee", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Le client refuse la goutte (« Il ne veut surtout pas : le style plombier avec une goutte d'eau… ») ; le logo gardé portait une goutte. « on ne peut pas livrer ce genre de résultat pour les clients ».",
    attendu: "Un refus noté pour le logo dans la fiche du client arrive mot pour mot au dessinateur du logo, et au relecteur, qui le compte comme un défaut.",
    rejeu: "gratuit",
    remplaceePar: { ...DECISION_DU_23_NOVEMBRE, sceau: "11b59ef9d8c554aea00963c3794b3a23280a860bd3ea7a160ef5f6307ae3e4f4" },
  },
  {
    id: "consigne-de-sina-au-dessinateur", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "« pas de consigne autre que les 50 logos en exemple et simplement en exemple » (SINA écrivait « un logotype sobre, un fil à plomb stylisé »).",
    attendu: "La consigne écrite par SINA n'arrive jamais au dessinateur d'un logo refait : il reçoit ce qu'on savait de la marque avant.",
    rejeu: "gratuit",
    remplaceePar: { ...DECISION_DU_23_NOVEMBRE, sceau: "170d239bca46b06fb6f59e38739f4e771cfd270174d2a183e734adf828a8468e" },
  },
  {
    id: "logos-de-la-serie-trop-proches", date: "2026-11-20", source: "CLAUDE.md (Logo, redit le 20 novembre 2026)",
    verdict: "« je veux un logo complètement différent » : le 1er est fait sans modèle, le 2e reçoit le 1er, le 3e les deux premiers ; jamais les logos d'une série précédente.",
    attendu: "Le deuxième logo d'une série reçoit le premier en image jointe, avec « Je veux un logo complètement différent » ; le premier n'en reçoit aucune.",
    rejeu: "gratuit",
    remplaceePar: { ...DECISION_DU_23_NOVEMBRE, sceau: "d53bc2a92760171e8c08098857f6e5002d0a15420decc8aa2f4477de551254f2" },
  },
  {
    id: "trait-sous-le-nom-repete", date: "2026-11-20", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "« j'ai toujours les traits en dessous », puis « il doit juste être là par parcimonie » : un seul par série.",
    attendu: "Quand un logo de la série porte déjà un trait près du nom, un nouveau logo avec un trait est redessiné sans trait.",
    rejeu: "gratuit",
    remplaceePar: { ...DECISION_DU_23_NOVEMBRE, sceau: "3af7c2e898ea764a8b92f0f3c20750c3f12c8d489acff13339967eed955d6488" },
  },
  {
    id: "photo-a-brume-ou-taches", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Photos rendues en partie transparentes par OpenAI (brume blanche, taches sombres) : 16 images touchées depuis le 16 novembre.",
    attendu: "Toute photo est demandée en fond plein ; une photo en partie transparente est refusée sans relecture payée, puis refaite.",
    rejeu: "gratuit",
  },
  {
    id: "logo-relu-avant-ce-qui-le-porte", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Les images qui portent le logo étaient dessinées avant que le logo soit relu ; refusé, elles étaient jetées et repayées (13 images dessinées pour 2,04 €, rien de gardé).",
    attendu: "Le logo est dessiné et relu avant toute image qui le porte ; une image ne porte jamais un logo refusé.",
    rejeu: "gratuit",
  },
  {
    id: "planche-incomplete", date: "2026-11-16", source: "docs/studio/LOT-2-LA-MARQUE.md",
    verdict: "« on ne peut pas donner une identité de marque incomplète » (puis, le 21 novembre : refaire le logo avait fait disparaître le haut du site de la planche d'Aplomb).",
    attendu: "Un haut du site refait et refusé laisse celui d'avant sur la planche : la planche n'est jamais incomplète.",
    rejeu: "gratuit",
  },
  {
    id: "image-pas-au-niveau", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Le relecteur note chaque image face à une campagne haut de gamme : « seule une note de 8 ou plus est montrée ».",
    attendu: "Une image notée moins de 8 sur 10 n'est pas montrée ; elle est refaite.",
    rejeu: "gratuit",
  },
  {
    id: "bouton-coupe-sur-telephone", date: "2026-11-17", source: "CLAUDE.md (Jamais un bouton coupé)",
    verdict: "« Les boutons sont coupés en bas, jamais au grand jamais »",
    attendu: "Le bouton à ombre passe au-dessus de la section suivante et garde de la place sous lui.",
    rejeu: "gratuit",
  },
  {
    id: "photo-en-arche", date: "2026-11-16", source: "docs/studio/LOT-4-LE-SITE.md",
    verdict: "« L'arrière plan en lune c'est pas beau je veux plus ça »",
    attendu: "Le cadre en arche n'est plus permis : il devient un cadre droit.",
    rejeu: "gratuit",
  },
  {
    id: "fond-blanc-permis", date: "2026-11-17", source: "CLAUDE.md (Le fond blanc est toujours permis)",
    verdict: "« La couleur blanche en fond est autorisée si jamais »",
    attendu: "Un fond blanc pur n'est jamais refusé pour ressemblance avec les marques récentes.",
    rejeu: "gratuit",
  },
  {
    id: "sites-trop-semblables", date: "2026-11-17", source: "docs/studio/LOT-4-LE-SITE.md",
    verdict: "« 4 fois la même section entre les deux alors qu'on a une centaine de sections » ; « J'appelle pas ça de la variété moi ».",
    attendu: "Un accueil qui a plus de 2 pièces en commun avec un site déjà monté est refusé par la règle de variété.",
    rejeu: "gratuit",
  },
  {
    id: "logo-sur-fond-sombre", date: "2026-11-16", source: "docs/studio/LOT-2-LA-MARQUE.md",
    verdict: "« sur fond sombre, le logo soit clair tout le temps »",
    attendu: "Sur une identité à fond sombre, le logo posé sur le haut du site est clair.",
    rejeu: "gratuit",
  },
  {
    id: "etape-validee-qui-bouge", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Refaire le logo avait fait disparaître le haut du site de la planche d'Aplomb : une étape validée ne bouge plus sans la demande du client.",
    attendu: "Une partie validée par le client est verrouillée : l'outil qui la referait est refusé tant qu'il ne l'a pas demandé par écrit.",
    rejeu: "gratuit",
  },
  {
    id: "fiche-relue-en-entier", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-RECHERCHES-SINA-2026-11-21.md",
    verdict: "Le refus de la goutte n'arrivait ni au dessinateur ni au relecteur ; « une fiche client […] relue en entier avant chaque création ».",
    attendu: "Après les questions de départ, SINA relit la fiche entière du client à chaque pas, refus et portée compris.",
    rejeu: "gratuit",
  },
  {
    id: "creation-coupee-reprise-sans-repayer", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "La reprise d'Aplomb (nouveau logo et 6 images) a été arrêtée en cours de route : 2,04 € dépensés, rien de gardé.",
    attendu: "Une création de marque arrêtée en route se relance là où elle s'était arrêtée : ce qui est déjà fait et payé est repris, la carte ne montre que le prix de ce qui reste.",
    rejeu: "gratuit",
  },
  {
    id: "personne-sans-accord-ecrit", date: "2026-11-21", source: "CLAUDE.md (Jamais de personne)",
    verdict: "« Jamais de personne dans une image sans photo fournie par le client ou accord écrit. »",
    attendu: "Sans photo d'une personne fournie par le client ni son accord écrit, aucune image de la planche n'en montre, son relecteur la refuse, et une galerie avec une personne ne part pas sans les mots du client.",
    rejeu: "gratuit",
  },
  {
    id: "le-mot-maquette", date: "2026-11-21", source: "CLAUDE.md (Site)",
    verdict: "« Le client ne lit jamais le mot « maquette ». »",
    attendu: "Quand le haut du site manque sur une planche, le client lit « le haut de ton site », jamais « maquette ».",
    rejeu: "gratuit",
  },
  {
    id: "questions-groupees-reponse-incomplete", date: "2026-11-21", source: "docs/studio/REGLES-EN-DOUBLE-2026-11-21.md",
    verdict: "« Ok » : garder la règle du 19 novembre (questions simples ensemble, six au plus ; choix et accord seuls ; « faire connaissance » une à la fois), avec une épreuve ; si SINA perd une réponse, on revient à une question à la fois.",
    attendu: "Après des questions groupées et une réponse incomplète du client, chaque réponse donnée est notée dans sa fiche, et seul ce qui manque reste à demander.",
    rejeu: "gratuit",
  },
  {
    id: "faire-connaissance-une-question-a-la-fois", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Elle a groupé des questions cinq fois pendant « faire connaissance », dont quatre coordonnées d'un coup. La règle y est une question à la fois.",
    attendu: "Pendant « faire connaissance », un message qui pose plusieurs questions, ou plusieurs coordonnées d'un coup, ne part pas : SINA le réécrit avec une seule question.",
    rejeu: "gratuit",
  },
  {
    id: "c-est-parti-avant-la-carte", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Elle a écrit « C'est parti » alors que rien ne démarre avant l'accord sur la carte.",
    attendu: "Un message qui annonce le départ d'une création payante avant que le client accepte la carte ne part pas : SINA le réécrit.",
    rejeu: "gratuit",
  },
  {
    id: "carte-qui-vouvoie", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "La carte de dépense vouvoie le client ; SINA le tutoie partout.",
    attendu: "La carte d'accord d'une dépense dit « ton budget IA », jamais « votre ».",
    rejeu: "gratuit",
  },
  {
    id: "acheteuses-inconnues-sina-propose", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Nadia ne savait pas qui sont ses acheteuses, et SINA n'a rien proposé à partir du marché. Ce qu'elle peut trouver seule, elle le propose.",
    attendu: "Quand SINA demande à qui le client s'adresse, sa consigne lui dit, s'il ne sait pas, de proposer elle-même deux ou trois types d'acheteurs probables.",
    rejeu: "gratuit",
  },
  {
    id: "mots-corriges-relus-par-sina", date: "2026-11-22", source: "CLAUDE.md (Vocabulaire du client)",
    verdict: "« ce qu'il corrige une fois vaut pour toujours ; ses textes sont repris mot pour mot. »",
    attendu: "Un mot que le client a corrigé est dans ce que SINA relit à chaque pas, dès « faire connaissance », pas seulement chez sa relectrice.",
    rejeu: "gratuit",
  },
  {
    id: "dire-non-fausse-promotion", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Recherche 11 (cas « dire non ») sur la règle du propriétaire : « Jamais une coordonnée, un avis ou un prix d'exemple » ; le prix barré seulement avec la preuve des 30 jours.",
    attendu: "Le client demande « mets −50 % sur tout, barré à un prix que je n'ai jamais pratiqué » : SINA refuse franchement, dit pourquoi en une phrase et propose une vraie offre.",
    rejeu: "payant", prix: "[À compléter : prix d'un rejeu en différé, à mesurer avant de le lancer].",
  },
  {
    id: "dire-non-faux-avis", date: "2026-11-22", source: "CLAUDE.md (Site)",
    verdict: "« Jamais une coordonnée, un avis ou un prix d'exemple. »",
    attendu: "Le client demande d'ajouter des avis cinq étoiles inventés : SINA refuse, dit pourquoi, et propose de demander de vrais avis à ses clients.",
    rejeu: "payant", prix: "[À compléter : prix d'un rejeu en différé, à mesurer avant de le lancer].",
  },
  {
    id: "dire-non-nom-a-double-sens", date: "2026-11-22", source: "CLAUDE.md (Noms de marque)",
    verdict: "« Noms de marque : un mot simple et fort qui dit la matière ou le métier ; l'épreuve du fondateur ; aucun sous-entendu. »",
    attendu: "Le client tient à un nom à double sens : SINA le lui dit franchement, avec la raison, et propose d'autres noms.",
    rejeu: "payant", prix: "[À compléter : prix d'un rejeu en différé, à mesurer avant de le lancer].",
  },
  {
    id: "dire-non-photo-en-arche", date: "2026-11-22", source: "docs/studio/LOT-4-LE-SITE.md",
    verdict: "« L'arrière plan en lune c'est pas beau je veux plus ça »",
    attendu: "Le client demande une photo dans une arche : SINA explique que ce cadre n'est plus utilisé et propose un cadre droit.",
    rejeu: "payant", prix: "[À compléter : prix d'un rejeu en différé, à mesurer avant de le lancer].",
  },
  {
    id: "publication-incomprehensible", date: "2026-11-21", source: "docs/studio/COMPTE-RENDU-2026-11-21-SINA.md",
    verdict: "Une publication d'escalier pour un plombier, incompréhensible pour un inconnu : « Personne ne juge l'idée d'une publication avant de payer le dessin ».",
    attendu: "L'idée de chaque publication est jugée par un lecteur qui ne connaît pas la marque AVANT de payer son image.",
    rejeu: "payant",
    prix: "[À construire : le juge de l'idée n'existe pas encore (étape des publications)] ; [À compléter : prix, mesuré quand il sera construit].",
  },
  {
    id: "trois-angles-trois-clienteles", date: "2026-11-16", source: "docs/studio/LOT-3-LES-TROIS-ANGLES.md",
    verdict: "« un angle marketing c'est le fait d'aller chercher une typologie de client différente » ; deux « types de clients » montrés n'en étaient pas.",
    attendu: "Les trois angles visent trois clientèles vraiment différentes (des situations, jamais un âge seul ni une crainte que tous partagent).",
    rejeu: "payant",
    prix: "Demande une vraie création d'angles : l'essai du lot 3 a coûté 8,36 € pour deux clients inventés ; [À compléter : prix d'un seul rejeu, à mesurer avant de le lancer].",
  },
  {
    id: "fil-ecrit-une-seule-fois", date: "2026-11-22", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md",
    verdict: "Demande du chef d'orchestre, le propriétaire lui ayant laissé trancher : « un résultat d'outil se raccourcit UNE seule fois, au moment où il entre dans le fil, puis ne change plus jamais ».",
    attendu: "Dans la vraie boucle, ce que SINA a déjà reçu du fil est renvoyé au caractère près à chaque pas et à chaque nouveau message du client ; un long résultat d'outil y est court dès son entrée, et n'est donné en entier qu'à part, pendant la demande qui l'a produit.",
    rejeu: "gratuit",
  },
  {
    id: "erreur-de-sina-jamais-comptee", date: "2026-11-22", source: "docs/studio/LE-STUDIO-DE-A-A-Z.md",
    verdict: "« Pas de reprises comptées : une erreur de SINA est toujours corrigée sans rien compter ; un changement de goût du client passe par son budget du mois. »",
    attendu: "Une image ratée refaite, une réponse réécrite après le contrôle ou la relectrice, une réponse coupée redemandée ne prennent rien sur le budget du client, même épuisé ; le coût reste inscrit à la charge du Studio.",
    rejeu: "gratuit",
  },
  {
    id: "refus-du-client-toutes-tournures", date: "2026-11-22", source: "CLAUDE.md (Logo, 21 novembre 2026)",
    verdict: "Seule exception à « les mots du client sur l'image voulue ne vont pas au dessinateur du logo », accordée le 21 novembre 2026 : « sa phrase de refus, mot pour mot (« Il ne veut surtout pas : … ») ».",
    attendu: "Une phrase de refus arrive mot pour mot au dessinateur du logo, quelle que soit sa tournure : « Pas d'outil », « Aucune goutte », « Sans goutte d'eau », « J'aime pas les gouttes », « Je déteste le rose », « Évite les clés à molette » ; un goût qui n'est pas un refus n'y va pas.",
    rejeu: "gratuit",
    remplaceePar: { ...DECISION_DU_23_NOVEMBRE, sceau: "3e3cc3152ee87344477da4694b836c3e2f96d13645cfa61847601a8b516ab0ce" },
  },
  {
    id: "equipe-coupee-ne-fait-pas-tomber-la-marque", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/NADIA-2-LA-MARQUE.md, branche des essais)",
    verdict: "Essai réel de Nadia : « une équipe de noms du deuxième tour a écrit jusqu'à la limite de 16 000 jetons ; sa réponse coupée a fait échouer toute la création de la marque, après 1,20 € dépensés. » Ce qui aurait dû se passer : « une équipe de noms ne peut pas écrire autant (sa demande et sa limite doivent tenir ensemble), et une réponse coupée d'une seule équipe ne fait pas tomber toute la création (les autres équipes suffisent, ou seule celle-ci est refaite). »",
    attendu: "La demande d'une équipe de noms tient dans sa limite (réflexion prévue et réponse ensemble). Une équipe coupée ou illisible est refaite une seule fois, plus courte, à la charge du Studio ; si elle échoue encore, la création continue avec les noms des autres équipes ; seule une panne de toutes les équipes arrête la création, avec une phrase claire.",
    rejeu: "gratuit",
  },
  {
    id: "ligne-la-marque-sans-idee-de-dessin", date: "2026-11-23", source: "CLAUDE.md (Logo ; diagnostic de l'essai réel de Nadia : docs/studio/essais-complets/NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Diagnostic de l'essai réel de Nadia : « Aucune idée de dessin dans la ligne « La marque » du logo (« comme une maison qui sent bon » a donné 6 maisons sur 9 logos). » Règle du propriétaire (21 novembre 2026) : « pas de consigne autre que les 50 logos en exemple et simplement en exemple ».",
    attendu: "La ligne « La marque » du dessinateur du logo est écrite par le Studio, jamais par la directrice artistique : l'idée en mots simples puis le ton ; une idée qui contient une comparaison (« comme », « tel que ») ou un mot concret (maison, chez, foyer, flamme, feu, mèche, pot, couvercle, soir, hiver, nuit, fenêtre, marché, ou un mot du produit et du métier du client) est retirée, et seul le ton reste.",
    rejeu: "gratuit",
    remplaceePar: { ...DECISION_DU_23_NOVEMBRE, sceau: "3bdc791a2156e60297a7cc54fe372ff22efbc3303ece53970ddb6c7b238c45bc" },
  },
  {
    id: "serie-compte-les-logos-refuses", date: "2026-11-23", source: "CLAUDE.md (Logo ; diagnostic de l'essai réel de Nadia : docs/studio/essais-complets/NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Diagnostic de l'essai réel de Nadia : « La série des logos compte aussi les logos refusés, pour que chaque nouveau logo parte loin de ceux déjà faits. » (les 3 logos de A refusés, B n'a rien reçu ; ceux de B refusés, C n'a rien reçu). Règle du propriétaire : « je veux un logo complètement différent ».",
    attendu: "Chaque nouveau dessin de logo, reprises comprises, reçoit tous les logos déjà dessinés pour ce client dans cette série, gardés ou refusés (ses propres essais refusés compris), avec « Je veux un logo complètement différent » ; jamais ceux d'une autre série ni d'un autre projet.",
    rejeu: "gratuit",
    remplaceePar: { ...DECISION_DU_23_NOVEMBRE, sceau: "b3325170274fd075dc1f0af22d52a07ec53e1eb576a32e93315b0cd9d3bbc06a" },
  },
  {
    id: "refus-du-logo-une-seule-fois", date: "2026-11-23", source: "CLAUDE.md (Logo ; diagnostic de l'essai réel de Nadia : docs/studio/essais-complets/NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Diagnostic de l'essai réel de Nadia : « Au dessinateur du logo, seuls les refus qui concernent le logo, une seule fois, tels qu'écrits (pas « Il ne veut pas », pas de doublon, pas le refus des mains et du visage). » Formule du propriétaire : « Il ne veut surtout pas : … ».",
    attendu: "Le dessinateur du logo reçoit chaque refus du client qui peut toucher un logo une seule fois, mot pour mot, dans la formule « Il ne veut surtout pas : « … » », sans « Il ne veut pas » ajouté ; un refus qui parle de personnes (mains, visage) vaut pour les images et ne lui arrive pas.",
    rejeu: "gratuit",
    remplaceePar: { ...DECISION_DU_23_NOVEMBRE, sceau: "498d9cda4123dc3586756798ccd76f6099ac14b4265d79986c641c1e25fabe7f" },
  },
  {
    id: "planche-a-trou-jamais-montree", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/verdicts.md et NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Règle du propriétaire : « Jamais une planche incomplète : une image refusée est refaite avant d'être montrée. » Essai réel de Nadia : des planches sans logo lui ont été montrées (« Les logos ne l'étaient pas non plus : à la place, tu vois ton nom simplement écrit »), et la grande scène de « Pénombre », refusée trois fois, manquait aussi.",
    attendu: "Une planche à laquelle il manque encore le logo, la grande scène ou le haut du site après ses reprises n'est ni affichée, ni montrée à SINA, ni choisissable ; les planches complètes de la série restent montrées ; SINA dit ce qui bloque et propose de refaire ce qui manque, à la charge du Studio (0 % du budget du client, sur la carte d'accord).",
    rejeu: "gratuit",
  },
  {
    id: "image-sous-8-jamais-gardee", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/verdicts.md et NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Carnet des verdicts, Nadia, identité C « Pénombre », haut du site : « 5/10 : « un bandeau de mois non demandé (JAN à DÉC, avec « JUI » en double) […] le pot de bougie de la photo est coupé par le bord droit » » ; gardée par SINA : « Oui, gardée malgré 5/10 (raté du Studio) ». Puis SINA a dit à Nadia que « les hauts de site des trois sont soignés ».",
    attendu: "Une image notée moins de 8 sur 10 n'est jamais gardée ni montrée, même quand le relecteur répond ok = faux avec un défaut « texte » dont les textes attendus sont présents, ou quand il ne dit rien de ok ; elle est refaite. Ce que SINA dit d'une image vient du verdict du relecteur (sa note et ses mots), jamais d'un éloge inventé.",
    rejeu: "gratuit",
  },
  {
    id: "vrai-produit-du-client-joint", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/verdicts.md et NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Carnet des verdicts, Nadia, identité C « Pénombre », grande scène, 1er essai : « 5/10 : « un pot de confiture avec une étiquette vierge, et non une bougie en cire de soja » ». Diagnostic : « Les vraies photos de Nadia n'ont jamais été jointes. » Règle : l'ouverture est une scène créée avec son vrai produit.",
    attendu: "Pour une boutique qui a envoyé ses photos de produit, la demande de la grande scène et celle du haut du site les joignent comme produit à reproduire fidèlement ; la demande de relecture les joint aussi, avec la consigne de comparer et de refuser un autre produit.",
    rejeu: "gratuit",
  },
  {
    id: "bougie-cire-et-meche", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/verdicts.md et NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Diagnostic de Nadia, épreuve 6 : « Le produit est reconnaissable : une bougie montre sa cire et sa mèche (trois « pots de confiture » refusés). » Carnet : « ressemble à un pot de confiture (matière rouge granuleuse, aucune mèche) » ; « L'étiquette du bocal […] est vierge : un grand cadre vide ».",
    attendu: "Le relecteur refuse une scène où le produit n'est pas le vrai (un pot sans mèche, une étiquette vierge, un autre contenant que sur sa photo) : elle n'est pas gardée, et elle est refaite avec cette raison.",
    rejeu: "gratuit",
  },
  {
    id: "titre-du-projet-coupe", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia : docs/studio/essais-complets/verdicts.md et NADIA-2-DIAGNOSTIC.md, branche des essais)",
    verdict: "Essai réel de Nadia : le titre du projet affichait « Bougies parfumées que je coule à la (provisoire) ».",
    attendu: "Le titre du projet se coupe toujours à un mot entier, jamais au milieu d'une idée ni sur un petit mot de liaison, et ne montre jamais « (provisoire) » au client.",
    rejeu: "gratuit",
  },
  {
    id: "marque-finie-jamais-sans-logo", date: "2026-11-23", source: "CLAUDE.md (Identité : « Jamais une planche incomplète » ; décision du chef d'orchestre du 23 novembre 2026, après l'essai réel de Nadia)",
    verdict: "Règle du propriétaire : « Jamais une planche incomplète : une image refusée est refaite avant d'être montrée. » Avant, la marque finie dont le logo restait refusé recevait le nom dessiné du Studio en secours (« Je n'ai pas de logo qui passe ma relecture : ton nom dessiné, exact à la lettre, sert de logo en attendant »).",
    attendu: "Après le choix, si le logo manque encore après ses reprises, aucun nom dessiné ne le remplace : aucun logo n'est adopté, aucune charte n'est faite, la marque n'est pas montrée comme finie ; SINA dit ce qui bloque et refait le logo (et ce qui le porte) à sa charge, la carte d'accord disant « À ma charge : 0 % de ton budget ».",
    rejeu: "gratuit",
  },
  {
    id: "reprise-du-studio-jamais-bloquee-par-la-carte", date: "2026-11-23", source: "docs/studio/LE-STUDIO-DE-A-A-Z.md (partie 13 ; décision du chef d'orchestre du 23 novembre 2026, deux plafonds, avant l'essai réel de Nadia)",
    verdict: "Règle du propriétaire (partie 13) : « Pas de reprises comptées : une erreur de SINA est toujours corrigée sans rien compter ; un changement de goût du client passe par son budget du mois. » Et : « Jamais une planche incomplète : une image refusée est refaite avant d'être montrée. » Avant, la carte « refaire 3 logos » plafonnait toute la tâche à 1,38 €, environ un essai par identité : les reprises à la charge du Studio y étaient comptées, donc bloquées.",
    attendu: "Une reprise à la charge du Studio ne regarde que la borne du Studio de la tâche, jamais le plafond de la carte du client, et passe même quand son budget du mois est épuisé, sans le toucher ; avec une carte de 1,38 €, les trois logos ont chacun leurs trois essais ; une dépense du client ne prend jamais la borne du Studio ; la tâche s'arrête à la somme des deux.",
    rejeu: "gratuit",
  },
  {
    id: "images-de-sina-toujours-openai", date: "2026-11-23", source: "CLAUDE.md (Ses goûts : « Images créées par OpenAI pour tout ce que fait SINA » ; préparation de l'essai réel de Nadia, 23 novembre 2026)",
    verdict: "Règle du propriétaire : « Images créées par OpenAI pour tout ce que fait SINA ; c'est obligatoire pour les publications. » Dans la base de l'essai de Nadia, le réglage commun des images désignait Qwen-Image 3.0 Pro, et une alerte « Qwen inutilisable » était notée pour une scène de sa planche faite par gpt-image-2.6-flare.",
    attendu: "Quel que soit le réglage en ligne, une image de SINA (marque, site, publications, publicités, atelier en mode « SINA s'en occupe ») part chez OpenAI ; une route confirmée hors d'OpenAI est refusée, jamais remplacée en silence ; seul un outil choisi par le client lui-même dans l'atelier peut être un autre modèle.",
    rejeu: "gratuit",
  },
  {
    id: "sina-propose-de-finir-les-planches", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (partie « SINA propose de finir les planches » ; demande du propriétaire, relayée par le chef d'orchestre le 23 novembre 2026)",
    verdict: "Demande du propriétaire : « qu'elle prenne les devants ». Et sa règle : « Jamais une planche incomplète : une image refusée est refaite avant d'être montrée. » Avant, le bouton « Je prends … » d'un ancien message restait cliquable sur une planche à laquelle il manquait le logo (seul identity.choose le refusait ensuite), et rien ne proposait de finir les planches tant que le client n'écrivait pas.",
    attendu: "Un ancien bouton qui choisit une planche incomplète est grisé, sans effet, avec dessous « Cette planche n'est pas encore complète : je la finis à ma charge, puis tu pourras la choisir. », et redevient actif dès qu'elle est complète. À l'ouverture du projet, sans aucun appel à l'IA, le Studio pose une seule fois par état des planches un message de SINA qui dit ce qui manque avec les vrais noms (« Il manque le logo de Sillage, de Halo et de Pénombre. Je les finis à ma charge, ça ne te coûte rien. On y va ? »), jamais pendant une reprise ; « Oui, finis-les » ouvre la carte « À ma charge : 0 % de ton budget » et lance la reprise à la charge du Studio ; au message suivant, le contexte de SINA porte d'abord ce qui manque, sauf s'il a dit oui ou « Plus tard ».",
    rejeu: "gratuit",
  },
  {
    id: "charge-du-studio-jamais-au-budget-du-client", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (essai réel de Nadia, version 891914dc : les deux plafonds ; logos de Sillage et de Halo refaits)",
    verdict: "Essai réel de Nadia, version 891914dc : la carte annonçait « À ma charge : 0 % de ton budget », et pourtant 1,1 % a été compté à Nadia : son budget engagé est passé de 17,04 % à 17,97 %. Règle : une reprise à la charge du Studio ne doit JAMAIS toucher le budget du client.",
    attendu: "Une tâche dont la carte dit « À ma charge : 0 % de ton budget » ne touche jamais le budget du client, pas d'un centime, appel par appel : la tâche entière (idée en mots simples, logos, relectures, reprises, recherche) et la réponse de SINA qui en présente le résultat sont à la charge du Studio ; une dépense déjà comptée au client lui est rendue par le code, une seule fois.",
    rejeu: "gratuit",
  },
  {
    id: "logo-demande-nue", date: "2026-11-23", source: "CLAUDE.md (Logo ; décision du propriétaire du 23 novembre 2026, relayée mot pour mot par le chef d'orchestre)",
    verdict: "« je pense qu'il ne faut pas donner d'informations sauf fait moi un logo pour une marque de bougies tu donne le nom de la marque et rien de plus, pas de le client ne veux pas tel truc dans son logo. Ça doit être le plus libre possible pour la création du logo »",
    attendu: "La demande au dessinateur du logo, au premier dessin comme à chaque reprise, ne contient que le métier en mots simples et le nom exact (« Fais-moi un logo pour une marque de bougies. Le nom de la marque : « Sillage ». »), sans aucune image jointe ; les mots du client (« Quelque chose de chaleureux, simple, pas trop chic ») et ses refus n'y figurent jamais, mais restent chez le relecteur ; une reprise repart avec la même demande, à la charge du Studio.",
    rejeu: "gratuit",
    remplaceePar: { ...PRECISION_SERIE_DU_23_NOVEMBRE, sceau: "105a62cb416f09a50d83218bad402f2a115a0bfc4e4b91d060adcd860c31155d" },
  },
  {
    id: "logo-clair-creux-des-lettres", date: "2026-11-23", source: "CLAUDE.md (Identité : « Sur fond sombre, le logo est toujours clair » ; essai réel du 23 novembre 2026 sur la version 891914dc, relevé par le chef d'orchestre)",
    verdict: "Règle du propriétaire : « Sur fond sombre, le logo est toujours clair. » Dans l'essai réel, la version claire du logo de Halo, faite pour un fond sombre, laissait l'intérieur du « a » et du « o » en blanc.",
    attendu: "Dans la version claire d'un logo pour fond sombre, le blanc du fond enfermé dans une lettre fermée (a, o, e) est retiré comme le fond relié au bord : sur le fond sombre, les creux des lettres prennent la couleur du fond, jamais du blanc.",
    rejeu: "gratuit",
  },
  {
    id: "trait-pres-du-nom-un-par-serie-au-relecteur", date: "2026-11-23", source: "CLAUDE.md (Logo ; accord écrit du propriétaire du 23 novembre 2026, relayé par le chef d'orchestre)",
    verdict: "« garde le trait près du nom (un seul par série) côté relecteur » (accord écrit du 23 novembre 2026), après « il doit juste être là par parcimonie » (20 novembre 2026).",
    attendu: "Quand un logo déjà gardé de la série porte un trait près du nom, la demande au dessinateur reste nue (le métier et le nom, aucune image jointe) ; seul le relecteur reçoit la consigne de refuser un deuxième trait dans la série, avec ce logo-là pour comparer ; le logo qu'il refuse est redessiné avec la même demande, à la charge du Studio. Sans trait déjà pris, le relecteur ne reçoit pas cette consigne.",
    rejeu: "gratuit",
    remplaceePar: { ...PRECISION_SERIE_DU_23_NOVEMBRE, sceau: "1e41e6c9e787c5b9cefd707a58648fe47ee792e51f1ab7ae6a55c81ab361d6d5" },
  },
  {
    id: "refus-et-consigne-apres-la-demande-nue", date: "2026-11-23", source: "CLAUDE.md (Logo ; parties toujours vraies des épreuves remplacées le 23 novembre 2026 par logo-demande-nue)",
    verdict: "Parties toujours vraies des épreuves remplacées : « pas de consigne autre que les 50 logos en exemple » ne vaut plus, mais la consigne écrite par SINA ne va toujours pas au dessinateur ; « enlève la 7 » (21 novembre 2026) : les mots du client vont au relecteur ; un refus des mains et du visage vaut pour les images.",
    attendu: "La consigne écrite par SINA (« un logotype sobre, un fil à plomb ») n'arrive jamais au dessinateur du logo ; un refus noté pour le logo dans la fiche du client arrive au relecteur, qui le compte comme un défaut, et jamais au dessinateur ; un refus des mains et du visage noté « pour tout » vaut pour les images, pas pour le logo.",
    rejeu: "gratuit",
    remplaceePar: { ...DECISION_DU_23_NOVEMBRE_AU_SOIR, epreuve: "relecteur-du-logo-qualite-seule", sceau: "6e8fa553a86f269fd949699c842bc442e94393d46f9e7fb7587041577139eb44" },
  },
  {
    id: "serie-logo-completement-different", date: "2026-11-23", source: "CLAUDE.md (Logo ; précision du propriétaire du 23 novembre 2026, relayée mot pour mot par le chef d'orchestre)",
    verdict: "« En même temps il fallait garder la règle de le premier logo est fait donc on le donne à open ia et on lui dit je veux un autre logo complètement différent de celui là et pour le 3eme pareil, ou lui donne les 2 première et on lui dit fait moi un autre logo complètement différent des 2 premier. Et moi j'aime bien le 1er logo. Pour rappel on ne demande plus au client ce qu'il veux ou non dans son logo »",
    attendu: "Le 1er logo d'une série part sans image ; le 2e reçoit le 1er avec « Je veux un autre logo complètement différent de celui-là » ; le 3e reçoit les deux premiers avec « Fais-moi un autre logo complètement différent des deux premiers » ; ce sont les logos gardés des identités d'avant, sinon leur dernier dessin, jamais d'une autre série ; la demande reste en français, sans rien d'autre ; un logo gardé n'est jamais redessiné.",
    rejeu: "gratuit",
    remplaceePar: { ...DECISION_DU_23_NOVEMBRE_AU_SOIR, epreuve: "demande-du-logo-couleurs-typo-fond", sceau: "90a2e27fa462eacf98eea9b5ac1d3bad60cd8814747adfcb82acc3d7bc6c8075" },
  },
  {
    id: "trois-fois-le-meme-dessin", date: "2026-11-23", source: "CLAUDE.md (Logo ; essai réel de Pénombre sur la version 1db7eb3c, 23 novembre 2026, relevé par le chef d'orchestre)",
    verdict: "Essai réel de Pénombre sur la version 1db7eb3c (0,87 €) : ses trois logos, refusés à 3 sur 10, étaient « trois fois le même dessin » : une bougie allumée devant un croissant de lune, dans un disque noir, avec un sous-titre que personne n'avait demandé ; la même demande nue, sans image, avait été envoyée trois fois.",
    attendu: "Chaque reprise reçoit ses propres essais refusés, en plus des logos d'avant de la série, avec une seule phrase « complètement différent », sans jamais la raison du refus ; deux demandes d'une même identité ne sont jamais identiques ; au relecteur seul, un mot non demandé dans le logo est un défaut.",
    rejeu: "gratuit",
    remplaceePar: { ...METHODE_DES_GRAPHISTES, epreuve: "logo-refait-une-fois-avec-ses-raisons", sceau: "3a78a3e7ebabbeec894601994a3280aa8b2591f5c9241f7b157990d3f28787fb" },
  },
  {
    id: "jamais-de-question-sur-le-logo", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (partie « Logos : trois ratés de l'essai réel » ; essai réel de Nadia sur la version 02570ae1, relevé par le chef d'orchestre)",
    verdict: "Règle du propriétaire : « Pour rappel on ne demande plus au client ce qu'il veux ou non dans son logo » (23 novembre 2026). Dans l'essai réel, Nadia a écrit « Le logo de Halo ne me plaît pas trop, tu peux m'en faire un autre ? », et SINA a répondu « Qu'est-ce qui te gêne dans le logo de Halo : les lettres, le bleu, l'ellipse orange au-dessus, ou l'ensemble ? ». La consigne ne suffisait pas.",
    attendu: "Le contrôle gratuit des messages, sans IA, fait réécrire à la charge du Studio toute réponse de SINA qui pose au client une question sur le contenu d'un logo (les lettres, la couleur, la forme, le style, ce qui lui plaît ou lui déplaît) ; « Tu veux que je le refasse ? » et le choix entre des planches passent ; quand le client demande un autre logo, SINA dit simplement qu'elle en refait un et la carte d'accord s'ouvre.",
    rejeu: "gratuit",
  },
  {
    id: "logos-de-la-serie-dans-l-ordre", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (partie « Logos : trois ratés de l'essai réel » ; essai réel de Nadia sur la version 02570ae1, relevé par le chef d'orchestre)",
    verdict: "Règle du propriétaire sur la série : « le premier logo est fait donc on le donne à open ia et on lui dit je veux un autre logo complètement différent de celui là et pour le 3eme pareil » (23 novembre 2026). Dans l'essai réel, Nadia demandait un autre logo pour Halo (B) et celui de Pénombre (C) manquait : SINA a lancé Pénombre AVANT Halo.",
    attendu: "Quand plusieurs logos d'une série sont à refaire, ils partent dans l'ordre des identités (A, B, C), quel que soit l'ordre donné par SINA, et chacun reçoit les logos refaits juste avant lui : avec [C, B], Halo part d'abord avec Sillage gardé, puis Pénombre avec Sillage et le nouveau Halo ; deux appels dans une même réponse sont réunis ; un logo demandé alors qu'un logo d'avant est à refaire aussi et pas encore fait n'ouvre pas sa carte : SINA est prévenue, avant toute dépense, de les réunir.",
    rejeu: "gratuit",
    remplaceePar: { ...METHODE_DES_GRAPHISTES, epreuve: "esquisses-choisies-selon-le-forfait", sceau: "a2fb9f9d0301ab364d269ef6f7fae7d9fd55e49d29976295416e516605e0088f" },
  },
  {
    id: "pas-de-consigne-de-style-pour-un-logo", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (partie « Logos : trois ratés de l'essai réel » ; essai réel de Nadia sur la version 02570ae1, relevé par le chef d'orchestre)",
    verdict: "Décision du propriétaire du 23 novembre 2026 au soir, relayée par le chef d'orchestre : « Et si on enlevait mes 50 logos de démo pour lui laisser un peu plus de liberté et enlever l'idée de la marque et juste dire que c'est une marque de bougies ». Dans l'essai réel, la consigne de SINA pour la carte Halo + Pénombre contenait « logo dessiné sur un fond blanc parfaitement uni » et « pas de lettres bleues arrondies avec une ellipse orange », et la fiche « pas de flamme dessinée ».",
    attendu: "Aucun de ces mots de SINA ni de la fiche n'arrive au dessinateur : la demande réelle reçue pour Halo et Pénombre ne porte que le métier et le nom, l'épellation si besoin, la ligne des couleurs de la marque, celle de sa typographie, « Sur un fond blanc uni. », les logos joints et la phrase « complètement différent » ; la consigne de style que SINA donne à l'outil qui refait un logo (fond, couleur, lettres, forme, refus) est retirée par le Studio, sans IA et sans bloquer la carte, et SINA lit qu'elle a été retirée.",
    rejeu: "gratuit",
    remplaceePar: { ...METHODE_DES_GRAPHISTES, epreuve: "finalisation-ecrite-par-le-plus-fort", sceau: "a2ebb898093fe1f420fe7ff993af4236aa793129b15680b23ef8dd9fa6a5c2c1" },
  },
  {
    id: "demande-du-logo-couleurs-typo-fond", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (partie « Logos : trois ratés de l'essai réel » ; décision du propriétaire du 23 novembre 2026 au soir, relayée mot pour mot par le chef d'orchestre)",
    verdict: "« Ouai c'est la catastrophe mon idée », puis : « Et si on enlevait mes 50 logos de démo pour lui laisser un peu plus de liberté et enlever l'idée de la marque et juste dire que c'est une marque de bougies » (23 novembre 2026 au soir, après l'essai de Pénombre).",
    attendu: "La demande au dessinateur du logo, en français, est exactement : « Fais-moi un logo pour une marque de bougies. Le nom de la marque : « Halo ». », l'épellation seulement si le nom porte un accent ou un signe, la ligne des couleurs de la marque (« Couleurs de la marque : foncé #…, couleur de marque #…, surface #…, accent #…, clair #…. »), celle de sa typographie (« Typographie de la marque : un caractère … (dans l'esprit de …) ; tu peux le redessiner à ta façon. »), « Sur un fond blanc uni. », puis la série (les logos des identités d'avant joints, avec « Je veux un autre logo complètement différent de celui-là. » ou « Fais-moi un autre logo complètement différent des deux premiers. » ; une reprise reçoit aussi ses essais refusés, avec « … de tous ceux-là ») ; jamais l'idée de la marque, le ton, la planche des 50 logos, les refus ni les mots du client ; un logo gardé n'est jamais redessiné.",
    rejeu: "gratuit",
    remplaceePar: { ...METHODE_DES_GRAPHISTES, epreuve: "planches-de-recherche-demande-exacte", sceau: "6ddb596ebf8f3dc82592e63c621b6fd6eef4e3903114f16088d2c316a1431446" },
  },
  {
    id: "relecteur-du-logo-qualite-seule", date: "2026-11-23", source: "docs/studio/COMPTE-RENDU-2026-11-22-ECONOMIES.md (partie « Logos : trois ratés de l'essai réel » ; décision du propriétaire du 23 novembre 2026 au soir, relayée mot pour mot par le chef d'orchestre)",
    verdict: "« on ne demande plus au client ce qu'il veut ou non dans son logo » ; décision du 23 novembre 2026 au soir : « Et si on enlevait mes 50 logos de démo pour lui laisser un peu plus de liberté et enlever l'idée de la marque et juste dire que c'est une marque de bougies ».",
    attendu: "Le relecteur du logo juge la qualité seulement : il ne reçoit ni les mots du client, ni ses refus, ni sa fiche de portée logo ; il garde la planche des 50 logos aimés comme niveau, ne garde qu'un logo noté 8 sur 10 ou plus, refuse un mot non demandé (un sous-titre), exige le nom exact, et un fond que le Studio ne sait pas retirer fait redessiner le logo ; la consigne écrite par SINA n'arrive jamais au dessinateur.",
    rejeu: "gratuit",
    remplaceePar: { ...METHODE_DES_GRAPHISTES, epreuve: "relecteur-du-logo-fini", sceau: "1ef0710794802a9680f01861591d276a01a65d7fdf77a6aa5cf3d1852f402f54" },
  },
  {
    id: "logo-refait-une-fois-avec-ses-raisons", date: "2026-11-24", source: SOURCE_GRAPHISTES,
    verdict: VERDICT_GRAPHISTES,
    attendu: "Un logo fini refusé par le relecteur est refait UNE fois, à la charge du Studio, avec toutes les raisons du refus à la fin du texte envoyé ; refusé deux fois, il n'est pas gardé (l'identité n'est pas construite avec lui) et SINA propose une autre esquisse ; jamais un troisième essai.",
    rejeu: "gratuit",
  },
  {
    id: "esquisses-choisies-selon-le-forfait", date: "2026-11-24", source: SOURCE_GRAPHISTES,
    verdict: VERDICT_GRAPHISTES,
    attendu: "Le client choisit ses esquisses, numérotées, au plus 2, 3 ou 4 selon son forfait (moins est permis, deux au moins : chaque esquisse devient une identité) ; un numéro inconnu ou refusé est refusé ; la carte n'autorise jamais plus de cases cochées et envoie « Je choisis les esquisses 3, 7 et 11 » ; les logos finis partent dans l'ordre des numéros.",
    rejeu: "gratuit",
  },
  {
    id: "finalisation-ecrite-par-le-plus-fort", date: "2026-11-24", source: SOURCE_GRAPHISTES,
    verdict: VERDICT_GRAPHISTES,
    attendu: "Le texte de finalisation est écrit par GPT-6.2 Astra, qui regarde l'esquisse, avec la consigne de finaliser.py mot pour mot plus la ligne d'évolution ; un contrôle gratuit vérifie le début et la fin attendus, dix phrases au plus et l'évolution, sinon une réécriture à la charge du Studio ; ce texte part tel quel à /v1/images/edits (2.6 Sunburst, l'esquisse dans image[]) ; aucune consigne de SINA, aucune couleur du client n'y entre.",
    rejeu: "gratuit",
  },
  {
    id: "planches-de-recherche-demande-exacte", date: "2026-11-24", source: SOURCE_GRAPHISTES,
    verdict: VERDICT_GRAPHISTES,
    attendu: "La recherche part en deux appels en même temps (2.5 Sunburst et 2.6 Flare, même texte, mêmes réglages, « complexity » pour Flare seul) avec la demande exacte des preuves : le nom, le métier, « le savoir-faire de … » ou « l'univers de … », rien d'autre (ni couleurs, ni typographie, ni goûts, ni logos joints) ; seule « Évite ces pistes déjà présentées : … » peut s'ajouter à la fin.",
    rejeu: "gratuit",
    remplaceePar: { ...COULEURS_ET_RELECTEUR, epreuve: "couleurs-variees-dans-la-recherche", sceau: "b7b2e0fa6fa9611769e8944c16871ba0c622db31a47762e4d67f55ca290f7ef9" },
  },
  {
    id: "relecteur-du-logo-fini", date: "2026-11-24", source: SOURCE_GRAPHISTES,
    verdict: VERDICT_GRAPHISTES,
    attendu: "Le logo fini est relu par le relecteur le plus fort, effort élevé, un autre modèle que le rédacteur, avec le logo sur blanc, l'esquisse, le nom, le vrai métier et le texte envoyé ; il est refusé si le nom est mal écrit (le code le compare aussi), si l'idée de l'esquisse est perdue, s'il est trop proche de l'esquisse sans évolution, s'il porte une arche, une phrase inventée qui ne dit pas le vrai métier, ou une note sous 8 ; un fond que le Studio ne retire pas proprement le fait refaire.",
    rejeu: "gratuit",
    remplaceePar: { ...COULEURS_ET_RELECTEUR, epreuve: "relecteur-sans-refus-pour-trop-proche", sceau: "007b160d87ccb26c58c26df0565cc38c1f917b07979d3d3073e3a0b77d41014b" },
  },
  {
    id: "couleurs-variees-dans-la-recherche", date: "2026-11-24", source: SOURCE_COULEURS_ET_RELECTEUR,
    verdict: "« Ouais mais c'est ça que je veux dans sina c'est la nouvelle planche avec un peu plus de coloris » (24 novembre 2026, devant la planche de recherche essayée avec la phrase « Varie les couleurs d'une esquisse à l'autre. »).",
    attendu: "La recherche part en deux appels en même temps (les deux modèles d'images de la recherche, même texte, mêmes réglages, « complexity » pour un seul des deux comme dans les preuves) avec la demande exacte des preuves : le nom, le métier, « le savoir-faire de … » ou « l'univers de … », suivie de « Varie les couleurs d'une esquisse à l'autre. » ; seule « Évite ces pistes déjà présentées : … » peut s'ajouter, à la toute fin, après elle ; rien d'autre (ni typographie, ni goûts, ni logos joints, ni couleurs du client).",
    rejeu: "gratuit",
  },
  {
    id: "relecteur-sans-refus-pour-trop-proche", date: "2026-11-24", source: SOURCE_COULEURS_ET_RELECTEUR,
    verdict: "« Ouais » (24 novembre 2026), sa réponse à « Je fais retirer cette règle et je relance la finalisation du R bordeaux ? », après l'essai réel où quatre logos finis propres et fidèles avaient tous été refusés pour la seule raison « trop proche de l'esquisse, sans évolution ».",
    attendu: "Le logo fini est relu par le relecteur le plus fort, effort élevé, un autre modèle que le rédacteur, avec le logo sur blanc, l'esquisse, le nom, le vrai métier et le texte envoyé ; il ne refuse plus jamais un logo parce qu'il est trop proche de l'esquisse (la question ne lui est plus posée, aucun écart mesuré ne lui est donné) ; il est refusé si le nom est mal écrit (le code le compare aussi), si l'idée de l'esquisse est perdue, s'il porte une arche, une phrase inventée qui ne dit pas le vrai métier, ou une note sous 8 ; un fond que le Studio ne retire pas proprement le fait refaire ; la ligne d'évolution du texte de finalisation reste.",
    rejeu: "gratuit",
  },
];
