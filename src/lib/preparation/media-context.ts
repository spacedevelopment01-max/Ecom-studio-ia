import { stableHash } from "../brain/hash";
import type { Project } from "../projects";
import type { Contents, VisualSlot } from "./types";
/** Une validation visuelle appartient à une identité, un texte et une affectation précis. */
export function placementHash(p: Pick<Project, "brand" | "product" | "services">, c: Contents, slot: VisualSlot) {
  return stableHash("preparation-placement", {
    brand: p.brand, offer: p.product, services: p.services,
    text: c.editorial?.filter(b => b.pageKey === slot.pageKey && b.sectionKey === slot.sectionKey) ?? c.documents.filter(d => d.doc.page.key === slot.pageKey),
    slot: { key: slot.key, pageKey: slot.pageKey, sectionKey: slot.sectionKey, kind: slot.kind, source: slot.source, aspect: slot.aspect, scene: slot.scene, correction: slot.correction, people: slot.peopleConsent === "this_slot" },
  });
}

export function receiptFor(meta: any, hash: string): VisualSlot | undefined {
  const saved = meta?.preparation?.reviews?.[hash];
  if (saved) return saved;
  const current = meta?.preparation?.reviewedSlot;
  return current?.alignment?.contextHash === hash ? current : undefined;
}
