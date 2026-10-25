import { L } from "../../i18n-server";
export function higgsfieldMessage(code: string) {
  if (/CREDENTIALS/.test(code))
    return L(
      "Identifiant et secret Higgsfield absents ou modifiés. Enregistrez-les dans l’administration, puis récupérez à nouveau les tarifs. Aucun plan vidéo envoyé.",
      "Higgsfield credentials are missing or changed. Save them in administration and retrieve prices again. No video shot submitted.",
    );
  if (/INCREASE|APPROVAL_CHANGED/.test(code))
    return L(
      "Le tarif Higgsfield ou sa version a changé. Actualisez les tarifs et confirmez la nouvelle proposition avant de lancer ce plan. Aucun plan vidéo envoyé.",
      "The Higgsfield price or approval revision changed. Refresh and approve the new proposal before this shot. No video shot submitted.",
    );
  if (/INCOMPLETE|EXACT_PRICE|ESTIMATE/.test(code))
    return L(
      "Le prix officiel de cette configuration Higgsfield manque ou ne peut pas être vérifié. Consultez les lignes signalées dans l’administration ; aucun prix de remplacement n’est appliqué.",
      "The official price for this Higgsfield configuration is missing or unverified. Review flagged rows in administration; no substitute price is applied.",
    );
  if (/APPROVAL|STALE|UNVERIFIED|FX/.test(code))
    return L(
      "Tarifs Higgsfield ou conversion monétaire non confirmés, désactivés ou périmés. Récupérez et confirmez les tarifs dans l’administration. Aucun plan vidéo envoyé.",
      "Higgsfield prices or currency conversion are unapproved, disabled or stale. Retrieve and approve prices in administration. No video shot submitted.",
    );
  return L(
    "Cette configuration Higgsfield ne peut pas être activée. Vérifiez les modèles sélectionnés, les prix et les corrections facultatives dans l’administration. Aucun envoi payant effectué.",
    "This Higgsfield configuration cannot be activated. Check selected models, prices and optional overrides in administration. No paid submission made.",
  );
}
