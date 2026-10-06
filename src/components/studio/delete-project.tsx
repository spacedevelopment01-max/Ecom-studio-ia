"use client";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { api, Button, cx, Modal, useToast } from "../ui";
import { useT } from "../i18n";

/** Suppression d'un projet, avec confirmation : il disparaît du studio, ses tâches et publications prévues sont arrêtées. */
export function DeleteProjectButton({ projectId, name, onDeleted, compact, className }: { projectId: string; name: string; onDeleted: () => void; compact?: boolean; className?: string }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await api(`/api/projects/${projectId}`, { method: "DELETE" });
      setOpen(false);
      toast("ok", t(`Projet « ${name} » supprimé.`, `Project "${name}" deleted.`));
      onDeleted();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {compact ? (
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} className={cx("grid size-9 place-items-center rounded-full bg-card/90 text-ink shadow-soft backdrop-blur transition hover:bg-bad hover:text-white", className)} aria-label={t(`Supprimer le projet ${name}`, `Delete project ${name}`)} title={t("Supprimer le projet", "Delete project")}>
          <Trash2 className="size-4" />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={cx("flex w-full items-center gap-2 rounded-xl p-2 text-sm font-medium text-bad hover:bg-paper-2", className)}>
          <Trash2 className="size-4" /> {t("Supprimer ce projet", "Delete this project")}
        </button>
      )}
      <Modal open={open} onClose={() => !busy && setOpen(false)} title={t(`Supprimer « ${name} » ?`, `Delete "${name}"?`)}>
        <ul className="grid gap-1.5 text-sm text-ink-2">
          <li>{t("Le projet disparaît de votre studio, avec sa marque, son site, ses images, vidéos et publications.", "The project disappears from your studio, with its brand, website, images, videos and posts.")}</li>
          <li>{t("Les créations en cours sont arrêtées et les publications programmées sont annulées.", "Work in progress is stopped and scheduled posts are canceled.")}</li>
          <li>{t("Un site déjà envoyé sur Shopify ou ailleurs n'est pas touché.", "A website already sent to Shopify or elsewhere is not affected.")}</li>
        </ul>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>{t("Annuler", "Cancel")}</Button>
          <Button variant="danger" icon={<Trash2 className="size-4" />} loading={busy} onClick={confirm}>{t("Supprimer le projet", "Delete project")}</Button>
        </div>
      </Modal>
    </>
  );
}
