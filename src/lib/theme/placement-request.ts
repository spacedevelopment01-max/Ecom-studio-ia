/** Exact stored placement, owner/version/context scoped. Read-only validation before any new supplier work. */
import { HttpError } from '../auth';
import { currentTheme, loadProject, themeVersion } from '../projects';
import { stableHash } from '../brain/hash';
import { L } from '../i18n-server';
import { getAsset } from '../library';
export type ThemePlacement = {
    versionId: string;
    slotKey: string;
    contextHash: string;
};
export const clientThemeContext = (p: ReturnType<typeof loadProject>) => stableHash('theme-client-context', { brand: p.brand, product: p.product, services: p.services });
export function placementRequest(projectId: string, ref: ThemePlacement) {
    const p = loadProject(projectId), v = themeVersion(projectId, ref.versionId), plan = v?.spec.meta?.adaptation;
    if (!v || !plan)
        throw new HttpError(404, L('Emplacement du thème introuvable.', 'Theme placement not found.'));
    if (currentTheme(projectId)?.version.id !== ref.versionId || plan.contextHash !== ref.contextHash || clientThemeContext(p) !== plan.contextHash)
        throw new HttpError(409, L('Le projet ou la version a changé. Actualisez l’adaptation et son devis avant de créer ce visuel.', 'The project or version changed. Refresh adaptation and its quote before creating this image.'));
    const request = plan.generationRequests.find(x => x.key === ref.slotKey);
    if (!request)
        throw new HttpError(404, L('Cet emplacement ne demande aucune nouvelle génération.', 'This placement does not request new generation.'));
    for (const id of request.referenceAssetIds) {
        const a = getAsset(id);
        if (!a || a.project_id !== projectId || a.deleted_at || a.status === "rejected")
            throw new HttpError(409, L("Une photo de référence n’est plus disponible. Vérifiez les médias avant de demander un devis.", "A reference photo is no longer available. Review media before requesting a quote."));
    }
    if (p.business === "products" && !request.referenceAssetIds.length)
        throw new HttpError(409, L("Ajoutez une photo fidèle de votre produit avant de préparer cette génération.", "Add an accurate product photo before preparing this generation."));
    return { request, plan, project: p };
}
