/** Native, scoped inventory. Descriptive metadata are evidence, never an automatic visual certification. */
import sharp from 'sharp';
import { videoDelivery } from '../media/delivery-check';
import { createHash } from 'node:crypto';
import { all, json } from '../db';
import { assetData, getAsset, type Asset } from '../library';
import { inspectSiteMediaLineage } from '../project-handoff/media-pool';
import { isAutoUsable } from '../quality/usable';
import type { Project } from '../projects';
const decodedVideos = new Set<string>();
export type MediaRole = 'opening' | 'packshot' | 'detail' | 'use' | 'method' | 'realization' | 'video' | 'logo';
export type ClientMedium = {
    id: string;
    file: string;
    kind: string;
    role: MediaRole;
    sourceRole: string;
    name: string;
    description: string;
    width: number;
    height: number;
    origin: string;
    subject: string;
    serviceKey: string;
    reviewed: boolean;
    focal: {
        desktop: string;
        mobile: string;
    };
    authentic: boolean;
    placement: string;
};
export type MediaInventory = {
    usable: ClientMedium[];
    excluded: {
        id: string;
        reason: string;
    }[];
};
const roleOf = (a: Asset, m: any): MediaRole => /^(logo(?:-|$)|favicon(?:-|$))/.test(a.role ?? '') ? 'logo' : a.kind === 'video' ? 'video' : m.themeContent?.role ?? (String(m.slot ?? '').startsWith('theme:') ? String(m.slot).split(':')[1] as MediaRole : /packshot|cutout/.test(a.role ?? '') || m.triage?.kind === 'packshot' ? 'packshot' : a.role === 'detail' ? 'detail' : /making|method/.test(a.role ?? '') ? 'method' : m.authenticWork === true ? 'realization' : a.role === 'banner' ? 'opening' : 'use');
export async function inventoryClientMedia(p: Project): Promise<MediaInventory> {
    const usable: ClientMedium[] = [], excluded: MediaInventory['excluded'] = [], hashes = new Set<string>();
    for (const a of all<Asset>("SELECT * FROM assets WHERE project_id=? AND user_id=? AND deleted_at IS NULL AND kind IN ('image','video') ORDER BY (status='approved') DESC, created_at ASC, id ASC", p.id,p.userId)) {
        const m = json<any>(a.meta, {}), lineage = inspectSiteMediaLineage(a, p.id, getAsset);
        let reason = !isAutoUsable(a) ? 'media_rejected' : lineage.issue ? 'source_not_site_media' : m.demo?.isDemo || m.lot2a?.demo ? 'demo_media' : p.business === 'products' && m.stock ? 'product_stock_forbidden' : m.people === true && a.origin === 'generated' && !m.peopleConsent ? 'people_not_authorized' : '';
        if (/^(brand-board|palette-board|identity-board)/.test(a.role ?? ''))
            reason = 'identity_board_not_site_media';
        const target = String(m.themeContent?.subject ?? m.subject?.key ?? m.imageV2?.brief?.subject?.key ?? '');
        if (target && target !== 'product:main' && !p.catalog.some(x => target === `product:catalog:${x.key}`) && !p.services.services.some(x => target === `service:${x.key}`))
            reason = 'subject_not_current';
        if (reason) {
            excluded.push({ id: a.id, reason });
            continue;
        }
        try {
            const bytes = assetData(a);
            if (!bytes.length)
                throw Error('empty');
            const digest = createHash('sha256').update(bytes).digest('hex');
            if (hashes.has(digest)) {
                excluded.push({ id: a.id, reason: 'duplicate_file_content' });
                continue;
            }
            hashes.add(digest);
            let width = a.width ?? 0, height = a.height ?? 0;
            if (a.kind === 'image') {
                const image = sharp(bytes, { limitInputPixels: 64000000 });
                const meta = await image.metadata();
                await image.resize(24, 24, { fit: 'inside' }).raw().toBuffer();
                width = meta.width ?? 0;
                height = meta.height ?? 0;
                if (!width || !height)
                    throw Error('dimensions');
            }
            else {
                if (!width || !height || !a.duration)
                    throw Error('video metadata');
                const key = a.id + ':' + digest;
                if (!decodedVideos.has(key)) {
                    await videoDelivery(p.id, a.id);
                    decodedVideos.add(key);
                    if (decodedVideos.size > 512)
                        decodedVideos.delete(decodedVideos.values().next().value!);
                }
            }
            const role = roleOf(a, m);
            if (!['opening', 'packshot', 'detail', 'use', 'method', 'realization', 'video', 'logo'].includes(role)) {
                excluded.push({ id: a.id, reason: 'unknown_media_role' });
                continue;
            }
            const ext = a.mime === 'image/svg+xml' ? 'svg' : a.mime === 'image/webp' ? 'webp' : a.mime === 'image/png' ? 'png' : a.mime === 'image/avif' ? 'avif' : a.kind === 'video' ? /webm/.test(a.mime) ? 'webm' : 'mp4' : 'jpg';
            usable.push({ id: a.id, file: `es-client-${a.id}.${ext}`, kind: a.kind, role, sourceRole: a.role ?? '', name: a.name, description: String(m.themeContent?.description ?? m.alt ?? m.description ?? m.triage?.caption ?? ''), width, height, origin: a.origin, subject: target, serviceKey: String(m.serviceKey ?? ''), reviewed: m.themeContent?.reviewed === true || m.preparation?.reviewedSlot?.alignment?.status === 'accepted', focal: { desktop: String(m.themeContent?.focus ?? m.media?.desktop ?? '50% 50%'), mobile: String(m.themeContent?.mobileFocus ?? m.media?.mobile ?? '50% 50%') }, placement: String(m.slot ?? '').startsWith('theme:') ? String(m.slot) : '', authentic: a.origin !== 'generated' && m.authenticWork === true });
        }
        catch {
            excluded.push({ id: a.id, reason: 'file_missing_or_undecodable' });
        }
    }
    return { usable, excluded };
}
export function chooseClientMedium(pool: ClientMedium[], role: MediaRole, used: Set<string>, aspect: number | null, serviceKey?: string): ClientMedium | undefined {
    const compatible = pool.filter(a => a.kind === (role === 'video' ? 'video' : 'image') && (role === 'logo' ? a.role === 'logo' : a.role !== 'logo') && (!serviceKey || a.serviceKey === serviceKey || a.subject === `service:${serviceKey}`) && (!['opening', 'use', 'method'].includes(role) || (['opening', 'use'].includes(role) ? ['opening', 'use'].includes(a.role) : a.role === 'method')) && (role !== 'realization' || a.authentic) && (role !== 'packshot' || a.role === 'packshot') && (role !== 'detail' || a.role === 'detail') && (role !== 'video' || a.role === 'video'));
    const score = (a: ClientMedium) => (a.role === role ? 20 : role === 'opening' && a.role === 'use' ? 12 : 0) + (a.reviewed ? 4 : 0) - (aspect ? Math.abs(Math.log((a.width / a.height) / aspect)) * 5 : 0);
    return compatible.filter(a => !used.has(a.id)).sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))[0];
}
