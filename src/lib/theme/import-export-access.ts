/** Code tiers importé : l'isolation de l'aperçu ne constitue pas une validation du code installé dans un CMS. */
import { createHash } from "node:crypto";
import { HttpError } from "../auth";
import { getAsset, assetData } from "../library";
import { getJsonSetting } from "../settings";
import { importedArchive } from "./imported";
import { unsafeContentReason } from "./content-security";
import type { ThemeSpec } from "./spec";

export function assertImportedExportAccess(spec:ThemeSpec){
 if(!spec.imported)return;
 const a=getAsset(spec.imported.archive);
 if(!a||a.deleted_at)throw new HttpError(404,"Thème introuvable / Theme not found");
 const bytes=assetData(a),arc=importedArchive(spec.imported).arc;
 const active=[...arc.text].some(([name,text])=>/\.js$/i.test(name)&&text.trim()||/\.(?:liquid|html|svg)$/i.test(name)&&unsafeContentReason(text,true));
 if(!active)return;
 const digest=createHash('sha256').update(bytes).digest('hex');
 const review=getJsonSetting<Record<string,{archiveSha256?:string;codeReviewed?:boolean;reviewedAt?:string}>>("security.importedThemeReviews",{})[a.id];
 if(!review?.codeReviewed||review.archiveSha256!==digest||!review.reviewedAt||!Number.isFinite(Date.parse(review.reviewedAt)))throw new HttpError(422,"Le code actif du thème importé doit être examiné avant un export CMS. Contactez l’assistance. L’original et vos versions sont conservés. / Active code in the imported theme requires review before CMS export. Contact support. Originals and versions are kept.","imported_theme_review_required");
}
