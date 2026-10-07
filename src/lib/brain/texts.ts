/**
 * Textes de consigne partagés par le contexte actuel (projectContext) et le Project Brain : une seule source,
 * pour que la façade du Brain transmette exactement les mêmes règles de vocabulaire et de véracité.
 */

/** Consignes propres aux entreprises de services (vocabulaire, appels à l'action, ce qu'il ne faut jamais inventer). */
export function servicesRulesText(ph: string): string {
  return `Consignes propres aux services :
- Vocabulaire du métier : prestations, rendez-vous, séance, consultation, intervention, devis, zone d'intervention, horaires, clients accompagnés, réalisations, équipe. N'emploie jamais « produit », « panier », « livraison », « commande », « stock », « expédition », « retours », « packshot » ou « détourage ».
- Appels à l'action adaptés au mode de contact : « Prendre rendez-vous », « Demander un devis », « Appeler », « Nous contacter » (ou leurs équivalents dans la langue des contenus).
- Ne jamais inventer : tarif, devis gratuit, délai ou rapidité d'intervention, disponibilité (7j/7, 24h/24), diplôme, qualification, certification, label, assurance, années d'expérience, nombre de clients, résultat garanti, avis ou note. Seuls les éléments ci-dessus et les faits confirmés sont utilisables ; sinon « ${ph} ».
- Les pages « livraison et retours » deviennent « Infos pratiques » (zone, adresse, horaires, accès, contact, prise de rendez-vous) ; les conditions générales de vente deviennent des conditions de prestation, rédigées en espaces réservés à faire valider par le professionnel.
- Santé, juridique, finances : aucune promesse de résultat, de guérison ou de gain.`;
}
