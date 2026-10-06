/**
 * Réponse de l'assistant de retouche de la boutique : jamais de fausse affirmation de changement.
 * La réponse de l'IA décrit ce qu'elle COMPTE faire ; le studio n'annonce comme fait que ce qui a réellement été
 * appliqué et validé, et dit clairement ce qui ne l'a pas été.
 */
import { L } from "../i18n-server";

/** Affirmations d'un changement accompli (« c'est fait », « j'ai modifié… », « I've updated… »). */
const DONE = /\b(c'est fait|voilà qui est fait|c'est chose faite|c'est corrigé|c'est modifié|j'ai (bien )?(modifié|changé|ajouté|remplacé|supprimé|retiré|mis|passé|déplacé|corrigé|agrandi|réduit|appliqué|créé|mis à jour|actualisé|refait|harmonisé|ajusté)|(a|ont) été (modifiée?s?|changée?s?|ajoutée?s?|remplacée?s?|supprimée?s?|retirée?s?|mise?s? à jour|appliquée?s?|corrigée?s?|déplacée?s?|ajustée?s?)|done[.!]|all set|i('ve| have) (just )?(changed|updated|added|replaced|removed|moved|fixed|applied|made|created|adjusted|set)|(has|have) been (changed|updated|added|replaced|removed|moved|fixed|applied|adjusted))/i;

export function claimsChange(reply: string): boolean {
  return DONE.test(reply ?? "");
}

/**
 * Message final de l'assistant : réponse de l'IA (ou du moteur local), corrigée si elle annonce un changement qui
 * n'a pas eu lieu, puis liste factuelle de ce qui a été modifié et de ce qui ne l'a pas été.
 */
export function honestChatNote(input: { reply: string; mode: "ai" | "local"; revert: boolean; opsCount: number; applied: string[]; rejected: string[] }): string {
  let reply = (input.reply ?? "").trim();
  const nothing = L(
    "Je n'ai pas pu appliquer cette modification : rien n'a été changé dans la boutique. Précisez l'élément visé (vous pouvez le désigner dans l'aperçu) ou reformulez la demande.",
    "I couldn't apply this change: nothing was changed in the store. Point to the element (you can select it in the preview) or rephrase the request.",
  );
  if (!input.revert && !input.applied.length) {
    // Des opérations étaient prévues mais aucune n'a passé la validation, ou la réponse affirme un changement
    // sans aucune opération : on ne laisse pas croire au client que sa boutique a changé.
    if ((input.mode === "ai" && input.opsCount) || claimsChange(reply)) reply = nothing;
  } else if (input.applied.length && input.rejected.length) {
    reply = `${L("Modification appliquée en partie (détail ci-dessous).", "Change partly applied (details below).")}${reply ? `\n\n${reply}` : ""}`;
  }
  return [
    reply,
    input.applied.length ? L(`\n\nModifié : ${input.applied.join(" ; ")}.`, `\n\nChanged: ${input.applied.join("; ")}.`) : "",
    input.rejected.length ? L(`\n\nNon appliqué : ${input.rejected.join(" ; ")}.`, `\n\nNot applied: ${input.rejected.join("; ")}.`) : "",
  ].join("").trim();
}
