"use client";
import { useEffect, useState } from "react";
import { CheckCheck, Plus, Send } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, formatDate, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { JobProgress, useActive } from "./common";
import { NETWORKS, NetworkDot, POST_STATUS, PostEditor, type PostView } from "./post-editor";

const FILTERS = [["", "Toutes"], ["review", "À valider"], ["scheduled", "Programmées"], ["published", "Publiées"], ["failed", "Échecs"], ["draft", "Brouillons"]];

export default function TabPublications() {
  const { id } = useProject();
  const toast = useToast();
  const active = useActive(["calendar.plan", "post."]);
  const { data, reload } = useApi<{ posts: PostView[] }>(`/api/projects/${id}/posts`, { poll: 10000 });
  const [filter, setFilter] = useState("review");
  const [open, setOpen] = useState<PostView | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  const posts = (data?.posts ?? []).filter((p) => !filter || p.status === filter);
  const bulk = async () => {
    let okN = 0;
    const errs: string[] = [];
    for (const pid of sel) {
      try {
        await api(`/api/posts/${pid}`, { body: { action: "approve" } });
        okN++;
      } catch (e) {
        errs.push((e as Error).message);
      }
    }
    toast(errs.length ? "bad" : "ok", `${okN} publication(s) validée(s) et programmée(s).${errs.length ? ` ${errs.length} refusée(s) : ${[...new Set(errs)].join(" ")}` : ""}`);
    setSel(new Set());
    reload();
  };
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
          {FILTERS.map(([v, l]) => {
            const n = (data?.posts ?? []).filter((p) => !v || p.status === v).length;
            return <button key={v} onClick={() => (setFilter(v), setSel(new Set()))} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", filter === v ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{l} <span className="opacity-60">{n}</span></button>;
          })}
        </div>
        <div className="flex gap-2">
          {sel.size > 0 && <Button icon={<CheckCheck className="size-4" />} onClick={bulk}>Valider la sélection ({sel.size})</Button>}
          <Button
            variant="secondary"
            icon={<Plus className="size-4" />}
            onClick={async () => {
              const r = await api<{ id: string }>(`/api/projects/${id}/posts`, { body: { network: "instagram", format: "image", caption: "" } });
              await reload();
              const fresh = await api<{ posts: PostView[] }>(`/api/projects/${id}/posts`);
              setOpen(fresh.posts.find((p) => p.id === r.id) ?? null);
            }}
          >
            Nouvelle publication
          </Button>
        </div>
      </div>
      {posts.length === 0 ? (
        <Empty title={filter === "review" ? "Rien à valider" : "Aucune publication"} icon={<Send className="size-5" />}>Préparez plusieurs jours de publications depuis l'espace Calendrier : elles arrivent ici à valider.</Empty>
      ) : (
        <div className="grid gap-3">
          {posts.map((p) => (
            <Card key={p.id} className="flex items-stretch gap-0 overflow-hidden">
              {["review", "draft"].includes(p.status) && (
                <label className="grid w-12 shrink-0 cursor-pointer place-items-center border-r border-line">
                  <input type="checkbox" checked={sel.has(p.id)} onChange={(e) => { const s = new Set(sel); if (e.target.checked) s.add(p.id); else s.delete(p.id); setSel(s); }} aria-label="Sélectionner" className="size-4 accent-[var(--signal)]" />
                </label>
              )}
              <button onClick={() => setOpen(p)} className="flex min-w-0 flex-1 items-center gap-4 p-3 text-left hover:bg-paper-2">
                <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-paper-2">{p.media[0] && <img src={p.media[0].thumbUrl ?? p.media[0].url} alt="" className="size-full object-cover" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <NetworkDot network={p.network} /> {NETWORKS[p.network]?.label} · {p.format} {p.scheduledAt && `· ${formatDate(p.scheduledAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, p.timezone)}`}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm">{p.caption || p.title || "(sans texte)"}</span>
                  {p.error && <span className="mt-1 block truncate text-xs text-bad">{p.error}</span>}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge tone={POST_STATUS[p.status]?.tone}>{POST_STATUS[p.status]?.label}</Badge>
                  {p.connectionName ? <span className="text-[11px] text-muted">{p.connectionName}</span> : <span className="text-[11px] text-warn">compte à choisir</span>}
                </span>
              </button>
            </Card>
          ))}
        </div>
      )}
      <PostEditor post={open} onClose={() => setOpen(null)} onChanged={reload} />
    </div>
  );
}
