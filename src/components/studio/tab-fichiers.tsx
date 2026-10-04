"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Folder, FolderOpen, FolderPlus, Pencil, Search, Star, Trash2, Upload, Wand2, ArchiveRestore, MoveRight, Grid2x2, List } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, formatBytes, formatDate, Input, Modal, Select, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, JobProgress, ROLE_LABEL, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import { useT } from "../i18n";

type FolderView = { id: string; name: string; parentId: string | null; system: boolean; key: string | null; count: number; total?: number };

export default function TabFichiers() {
  const { id } = useProject();
  const toast = useToast();
  const t = useT();
  const [folder, setFolder] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [trash, setTrash] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const active = useActive(["files.classify", "canva."]);
  const params = trash ? "trash=1" : q ? `q=${encodeURIComponent(q)}` : folder ? `folder=${folder}` : "folder=root";
  const { data, reload } = useApi<{ folders: FolderView[]; assets: AssetView[]; rootCount: number }>(`/api/projects/${id}/files?${params}`);
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  const folders = data?.folders ?? [];
  const children = (pid: string | null) => folders.filter((f) => f.parentId === pid);
  const path = useMemo(() => {
    const out: FolderView[] = [];
    let cur = folders.find((f) => f.id === folder);
    while (cur) {
      out.unshift(cur);
      cur = folders.find((f) => f.id === cur!.parentId);
    }
    return out;
  }, [folders, folder]);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    if (folder) fd.append("folderId", folder);
    try {
      const r = await api<{ assets: AssetView[] }>(`/api/projects/${id}/files`, { form: fd });
      toast("ok", t(`${r.assets.length} fichier(s) importé(s).`, `${r.assets.length} file(s) uploaded.`));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const Tree = (pid: string | null, depth: number): React.ReactNode => (
    <ul className={cx(depth > 0 && "ml-3 border-l border-line pl-2")}>
      {children(pid).map((f) => (
        <li key={f.id}>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              const ids = e.dataTransfer.getData("text/assets").split(",").filter(Boolean);
              for (const aid of ids) await api(`/api/files/${aid}`, { method: "PATCH", body: { folderId: f.id } });
              if (ids.length) toast("ok", t(`${ids.length} fichier(s) déplacé(s) dans « ${f.name} ».`, `${ids.length} file(s) moved to "${f.name}".`));
              setSel(new Set());
              reload();
            }}
            className={cx("group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm", folder === f.id && !q && !trash ? "bg-ink text-paper" : "hover:bg-paper-2")}
          >
            <button onClick={() => (setFolder(f.id), setQ(""), setTrash(false))} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
              {folder === f.id ? <FolderOpen className="size-4 shrink-0" /> : <Folder className="size-4 shrink-0" />}
              <span className="truncate">{f.name}</span>
              {f.count > 0 && <span className="ml-auto text-[11px] opacity-60">{f.count}</span>}
            </button>
          </div>
          {children(f.id).length > 0 && Tree(f.id, depth + 1)}
        </li>
      ))}
    </ul>
  );
  const current = folders.find((f) => f.id === folder);
  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[260px_1fr]" onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } }} onDragLeave={() => setDrag(false)} onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); } }}>
      <Card className="h-max p-3 lg:sticky lg:top-24">
        <button onClick={() => (setFolder(null), setQ(""), setTrash(false))} className={cx("mb-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm", !folder && !q && !trash ? "bg-ink text-paper" : "hover:bg-paper-2")}><Folder className="size-4" /> {t("Racine", "Root")} <span className="ml-auto text-[11px] opacity-60">{data?.rootCount ?? ""}</span></button>
        {Tree(null, 0)}
        <div className="mt-3 grid gap-1 border-t border-line pt-3">
          <button
            onClick={async () => {
              const name = prompt(t("Nom du nouveau dossier", "New folder name"), t("Nouveau dossier", "New folder"));
              if (!name) return;
              await api(`/api/projects/${id}/folders`, { body: { name, parentId: folder } });
              reload();
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-paper-2"
          >
            <FolderPlus className="size-4" /> {folder ? t("Nouveau sous-dossier", "New subfolder") : t("Nouveau dossier", "New folder")}
          </button>
          <button onClick={async () => { await api(`/api/projects/${id}/classify`, { method: "POST" }); toast("ok", t("Classement en cours : les fichiers non rangés seront déplacés et nommés, sans suppression.", "Sorting in progress: unfiled files will be moved and named, nothing is deleted.")); }} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-paper-2"><Wand2 className="size-4" /> {t("Ranger les fichiers non classés", "Sort unfiled files")}</button>
          <button onClick={() => (setTrash(true), setQ(""))} className={cx("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm", trash ? "bg-ink text-paper" : "hover:bg-paper-2")}><Trash2 className="size-4" /> {t("Corbeille", "Trash")}</button>
        </div>
      </Card>
      <div className="min-w-0">
        {active.map((j) => <JobProgress key={j.id} job={j} className="mb-4" />)}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm" aria-label={t("Chemin", "Path")}>
            <button onClick={() => setFolder(null)} className="text-muted hover:text-ink">{t("Fichiers", "Files")}</button>
            {path.map((f) => (
              <span key={f.id} className="flex items-center gap-1"><ChevronRight className="size-3.5 text-muted" /><button onClick={() => setFolder(f.id)} className="hover:underline">{f.name}</button></span>
            ))}
            {trash && <span className="flex items-center gap-1"><ChevronRight className="size-3.5 text-muted" />{t("Corbeille", "Trash")}</span>}
            {current && !current.system && (
              <span className="ml-1 flex gap-1">
                <button onClick={async () => { const n = prompt(t("Renommer le dossier", "Rename folder"), current.name); if (n) { await api(`/api/folders/${current.id}`, { method: "PATCH", body: { name: n } }); reload(); } }} className="grid size-7 place-items-center rounded-full hover:bg-paper-2" aria-label={t("Renommer le dossier", "Rename folder")}><Pencil className="size-3.5" /></button>
                <button onClick={async () => { try { await api(`/api/folders/${current.id}`, { method: "DELETE" }); setFolder(current.parentId); reload(); } catch (e) { toast("bad", (e as Error).message); } }} className="grid size-7 place-items-center rounded-full hover:bg-paper-2" aria-label={t("Supprimer le dossier vide", "Delete empty folder")}><Trash2 className="size-3.5" /></button>
              </span>
            )}
          </nav>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => (setQ(e.target.value), setTrash(false))} placeholder={t("Rechercher partout", "Search everywhere")} className="h-10 w-56 pl-9 text-sm" aria-label={t("Rechercher", "Search")} />
          </div>
          <div className="flex rounded-full border border-line bg-card p-0.5">
            <button onClick={() => setLayout("grid")} className={cx("grid size-8 place-items-center rounded-full", layout === "grid" && "bg-ink text-paper")} aria-label={t("Vignettes", "Thumbnails")}><Grid2x2 className="size-4" /></button>
            <button onClick={() => setLayout("list")} className={cx("grid size-8 place-items-center rounded-full", layout === "list" && "bg-ink text-paper")} aria-label={t("Liste", "List")}><List className="size-4" /></button>
          </div>
          <Button icon={<Upload className="size-4" />} onClick={() => input.current?.click()}>{t("Importer", "Upload")}</Button>
          <input ref={input} type="file" multiple className="hidden" onChange={(e) => (upload(e.target.files), (e.target.value = ""))} />
        </div>
        {sel.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-ink px-4 py-2 text-sm text-paper">
            {sel.size} {t("sélectionné(s)", "selected")}
            <Button size="sm" variant="secondary" icon={<MoveRight className="size-3.5" />} onClick={() => setMoveOpen(true)}>{t("Déplacer", "Move")}</Button>
            {!trash && <Button size="sm" variant="secondary" icon={<Trash2 className="size-3.5" />} onClick={async () => { const errs: string[] = []; for (const aid of sel) { try { await api(`/api/files/${aid}`, { method: "DELETE" }); } catch (e) { errs.push((e as Error).message); } } if (errs.length) toast("bad", errs[0]); setSel(new Set()); reload(); }}>{t("Corbeille", "Trash")}</Button>}
            {trash && <Button size="sm" variant="secondary" icon={<ArchiveRestore className="size-3.5" />} onClick={async () => { for (const aid of sel) await api(`/api/files/${aid}`, { method: "PATCH", body: { restore: true } }); setSel(new Set()); reload(); }}>{t("Restaurer", "Restore")}</Button>}
            <button onClick={() => setSel(new Set())} className="ml-auto text-xs underline">{t("Désélectionner", "Deselect")}</button>
          </div>
        )}
        {drag && <div className="mb-4 rounded-2xl border-2 border-dashed border-signal bg-signal-soft p-8 text-center text-sm text-signal">{t(`Déposez pour importer dans « ${current?.name ?? "Racine"} »`, `Drop to upload to "${current?.name ?? "Root"}"`)}</div>}
        {!q && !trash && folder !== undefined && children(folder).length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {children(folder).map((f) => <button key={f.id} onClick={() => setFolder(f.id)} className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3 py-3 text-left text-sm hover:border-ink"><Folder className="size-4 shrink-0 text-signal" /><span className="truncate">{f.name}</span><span className="ml-auto text-xs text-muted">{f.total ?? f.count}</span></button>)}
          </div>
        )}
        {(data?.assets ?? []).length === 0 ? (
          <Empty title={trash ? t("Corbeille vide", "Trash is empty") : t("Aucun fichier ici", "No files here")} icon={<Folder className="size-5" />}>{trash ? t("Les fichiers mis à la corbeille restent restaurables.", "Files moved to the trash can still be restored.") : t("Glissez des fichiers pour les importer, ou laissez le studio ranger ses créations automatiquement.", "Drag files here to upload them, or let the studio file its creations automatically.")}</Empty>
        ) : layout === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {data!.assets.map((a) => (
              <div key={a.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/assets", [...new Set([...sel, a.id])].join(","))} className={cx("group relative overflow-hidden rounded-2xl border bg-card", sel.has(a.id) ? "border-signal ring-2 ring-signal" : "border-line")}>
                <button onClick={() => setViewer(a)} className="block w-full text-left"><AssetThumb a={a} className="aspect-square w-full" /></button>
                <input type="checkbox" checked={sel.has(a.id)} onChange={(e) => { const s = new Set(sel); if (e.target.checked) s.add(a.id); else s.delete(a.id); setSel(s); }} className="absolute left-2 top-2 size-4 accent-[var(--signal)] opacity-70 group-hover:opacity-100" aria-label={t(`Sélectionner ${a.name}`, `Select ${a.name}`)} />
                {a.starred && <Star className="absolute right-2 top-2 size-4 fill-signal text-signal" />}
                <div className="p-2">
                  <p className="truncate text-xs font-medium" title={a.name}>{a.name}</p>
                  <p className="mt-0.5 flex items-center justify-between gap-1 text-[11px] text-muted"><span className="truncate">{ROLE_LABEL[a.role ?? ""] ?? a.kind}</span>{(a.usages?.length ?? 0) > 0 && <span title={t("Utilisations", "Uses")}>↗ {a.usages!.length}</span>}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="w-10 p-3" /><th className="p-3 font-medium">{t("Nom", "Name")}</th><th className="p-3 font-medium">{t("Type", "Type")}</th><th className="p-3 font-medium">{t("Statut", "Status")}</th><th className="p-3 font-medium">{t("Poids", "Size")}</th><th className="p-3 font-medium">{t("Date", "Date")}</th></tr></thead>
              <tbody>
                {data!.assets.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0 hover:bg-paper-2">
                    <td className="p-3"><input type="checkbox" checked={sel.has(a.id)} onChange={(e) => { const s = new Set(sel); if (e.target.checked) s.add(a.id); else s.delete(a.id); setSel(s); }} className="size-4 accent-[var(--signal)]" aria-label={t(`Sélectionner ${a.name}`, `Select ${a.name}`)} /></td>
                    <td className="p-3"><button onClick={() => setViewer(a)} className="flex items-center gap-2 text-left"><AssetThumb a={a} className="size-9 rounded-lg" /><span className="truncate">{a.name}</span></button></td>
                    <td className="p-3 text-muted">{ROLE_LABEL[a.role ?? ""] ?? a.kind}{a.version > 1 && <Badge className="ml-1.5">v{a.version}</Badge>}</td>
                    <td className="p-3"><StatusBadge status={a.status} /></td>
                    <td className="p-3 text-muted">{formatBytes(a.size)}</td>
                    <td className="p-3 text-muted">{formatDate(a.createdAt, { day: "numeric", month: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
      <AssetViewer asset={viewer} onClose={() => setViewer(null)} onChanged={reload} />
      <Modal open={moveOpen} onClose={() => setMoveOpen(false)} title={t(`Déplacer ${sel.size} fichier(s)`, `Move ${sel.size} file(s)`)}>
        <Select
          defaultValue=""
          onChange={async (e) => {
            const target = e.target.value === "root" ? null : e.target.value;
            for (const aid of sel) await api(`/api/files/${aid}`, { method: "PATCH", body: { folderId: target, ...(trash ? { restore: true } : {}) } });
            toast("ok", t("Fichiers déplacés.", "Files moved."));
            setSel(new Set());
            setMoveOpen(false);
            reload();
          }}
          aria-label={t("Dossier de destination", "Destination folder")}
        >
          <option value="" disabled>{t("Choisir un dossier…", "Choose a folder…")}</option>
          <option value="root">{t("Racine", "Root")}</option>
          {folders.map((f) => {
            let depth = 0;
            let p = f.parentId;
            while (p) { depth++; p = folders.find((x) => x.id === p)?.parentId ?? null; }
            return <option key={f.id} value={f.id}>{"\u00a0\u00a0".repeat(depth)}{f.name}</option>;
          })}
        </Select>
      </Modal>
    </div>
  );
}
