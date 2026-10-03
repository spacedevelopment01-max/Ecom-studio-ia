"use client";
/** Bibliothèque « Ajouter une section » : recherche, catégories et aperçus, ajout en un clic. */
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { cx, Modal } from "../ui";

export type LibraryItem = { type: string; name: string; category: string; description: string; keywords: string; preview: string | null };

const ORDER = ["Ouverture", "Produit", "Preuves", "Animations", "Images et vidéos", "Collections", "Textes", "Conversion", "Avancé"];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function SectionLibrary({ open, onClose, items, onPick, where, busy }: { open: boolean; onClose: () => void; items: LibraryItem[]; onPick: (type: string) => void; where: string; busy?: string | null }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Toutes");
  const cats = useMemo(() => ["Toutes", ...ORDER.filter((c) => items.some((i) => i.category === c))], [items]);
  const shown = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return items
      .filter((i) => cat === "Toutes" || i.category === cat)
      .filter((i) => words.every((w) => norm(`${i.name} ${i.description} ${i.keywords} ${i.category}`).includes(w)))
      .sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || a.name.localeCompare(b.name, "fr"));
  }, [items, q, cat]);
  return (
    <Modal open={open} onClose={onClose} title="Ajouter une section" wide>
      <p className="-mt-2 mb-4 text-sm text-muted">{where}. La section arrive remplie avec les photos et vidéos de votre projet ; vous la retouchez ensuite en discutant ou dans l'éditeur.</p>
      <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-paper px-4 focus-within:border-ink">
        <Search className="size-4 text-muted" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher des sections (avis, vidéo, étapes…)" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Rechercher des sections" />
      </label>
      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Catégories">
        {cats.map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={cx("shrink-0 rounded-full border px-3 py-1.5 text-xs", cat === c ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink")}>{c}</button>
        ))}
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((i) => (
          <li key={i.type}>
            <button onClick={() => onPick(i.type)} disabled={!!busy} className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-paper text-left transition hover:-translate-y-0.5 hover:border-ink disabled:opacity-60">
              <span className="relative block aspect-[16/9] w-full overflow-hidden bg-paper-2">
                {i.preview ? <img src={i.preview} alt="" loading="lazy" className="size-full object-cover object-top" /> : <span className="grid size-full place-items-center text-xs text-muted">Aperçu indisponible</span>}
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-1 text-[11px] font-semibold text-signal-ink opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Plus className="size-3" /> {busy === i.type ? "Ajout…" : "Ajouter"}
                </span>
              </span>
              <span className="block p-3">
                <span className="block text-sm font-semibold">{i.name}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{i.description}</span>
              </span>
            </button>
          </li>
        ))}
        {!shown.length && <li className="col-span-full py-8 text-center text-sm text-muted">Aucune section ne correspond. Décrivez-la dans la discussion : l'IA peut en créer une sur mesure.</li>}
      </ul>
    </Modal>
  );
}
