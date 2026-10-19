"use client";
/**
 * Création guidée (publications et publicités, image ou vidéo) : le client choisit le produit ou le service du projet
 * avec lequel travailler, puis décrit librement le visuel voulu, comme dans une conversation. Le visuel part ainsi de
 * la bonne photo et de la bonne idée dès le premier essai.
 */
import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { cx, Field, Textarea, useApi } from "../ui";
import { useT } from "../i18n";
import { useProject } from "./project-context";

export type SubjectView = { kind: "product" | "service"; key: string; name: string; hasPhoto: boolean; photoId: string | null };
export type SubjectChoice = { kind: "product"; key: string } | { kind: "service"; name: string };

export const subjectChoice = (s: SubjectView | undefined): SubjectChoice | undefined => (s ? (s.kind === "service" ? { kind: "service", name: s.key } : { kind: "product", key: s.key }) : undefined);

export type IdeaSurface = "post_image" | "ad_image" | "post_video" | "ad_video";
type Ideas = { source: string; subjects: { kind: string; key: string; name: string; ideas: Record<IdeaSurface, { title: string; prompt: string }[]> }[] };

/** Bouton « Idées de prompts » : idées écrites pour CE produit ou service à la création du projet ; un clic remplit la demande. */
export function PromptIdeas({ subjectKey, surface, onPick }: { subjectKey: string; surface: IdeaSurface; onPick: (prompt: string) => void }) {
  const { id } = useProject();
  const t = useT();
  const [open, setOpen] = useState(false);
  const { data } = useApi<Ideas>(open ? `/api/projects/${id}/prompt-ideas` : null);
  const list = data?.subjects.find((s) => s.key === subjectKey)?.ideas[surface] ?? data?.subjects[0]?.ideas[surface] ?? [];
  return (
    <div className="grid gap-2" data-prompt-ideas>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-paper-2" data-prompt-ideas-toggle>
        <Lightbulb className="size-4" /> {t("Idées de prompts", "Prompt ideas")}
      </button>
      {open && (
        <div className="grid gap-2 rounded-2xl border border-line bg-paper-2 p-3">
          {!data ? (
            <p className="text-xs text-muted">{t("Chargement…", "Loading…")}</p>
          ) : (
            <>
              <p className="text-xs text-muted">{data.source} — {t("cliquez sur une idée pour la reprendre, puis modifiez-la à votre goût.", "click an idea to use it, then edit it as you like.")}</p>
              {list.map((i) => (
                <button key={i.title + i.prompt.slice(0, 20)} type="button" onClick={() => (onPick(i.prompt), setOpen(false))} className="rounded-xl border border-line bg-paper p-2.5 text-left text-sm hover:border-ink/40" data-prompt-idea>
                  <span className="block font-medium">{i.title}</span>
                  <span className="block text-xs text-muted">{i.prompt}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function SubjectPicker({ subjects, value, onChange, request, onRequest, idPrefix, video, surface,photoOptional }: { subjects: SubjectView[]; value: string; onChange: (key: string) => void; request: string; onRequest: (v: string) => void; idPrefix: string; video?: boolean;photoOptional?:boolean; /** Usage des idées proposées (publication ou publicité, image ou vidéo). */ surface?: IdeaSurface }) {
  const t = useT();
  const kind = subjects[0]?.kind ?? "product";
  return (
    <div className="grid gap-3" data-subject-picker>
      {subjects.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium">{kind === "service" ? t("Avec quel service travailler ?", "Which service to work with?") : t("Avec quel produit travailler ?", "Which product to work with?")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={kind === "service" ? t("Service", "Service") : t("Produit", "Product")}>
            {subjects.map((s) => (
              <button key={`${s.kind}:${s.key}`} type="button" role="radio" aria-checked={value === s.key} onClick={() => onChange(s.key)} data-subject={s.key} className={cx("flex items-center gap-2 rounded-2xl border p-2 text-left text-sm", value === s.key ? "border-ink bg-paper-2" : "border-line hover:border-ink/40")}>
                {s.photoId ? <img src={`/api/files/${s.photoId}?thumb=1`} alt="" className="size-10 shrink-0 rounded-lg bg-paper-2 object-contain" /> : <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-paper-2 text-xs text-muted" aria-hidden>{s.name.slice(0, 2).toUpperCase()}</span>}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.name}</span>
                  {s.kind === "product" && !s.hasPhoto&&!photoOptional && <span className="block text-[11px] text-warn">{t("Sans photo : ajoutez-en une pour l'IA", "No photo: add one for the AI")}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Field label={video ? t("Décrivez la vidéo voulue (facultatif)", "Describe the video you want (optional)") : t("Décrivez le visuel voulu (facultatif)", "Describe the visual you want (optional)")} htmlFor={`${idPrefix}-request`} hint={video ? t("Décrivez l’ambiance, le décor, la lumière et l’idée. Votre produit et votre marque servent de références ; les points non vérifiés sont signalés.", "Describe the mood, setting, light and idea. Your product and brand serve as references; unchecked points are flagged.") : t("Écrivez comme vous le diriez à un graphiste : ambiance, décor, lumière, idée. L'IA respecte toujours le vrai produit et votre marque.", "Write it as you would to a designer: mood, setting, light, idea. The AI always keeps the real product and your brand.")}>
        <PromptIdeas subjectKey={value} surface={surface ?? (video ? "post_video" : "post_image")} onPick={onRequest} />
        <Textarea id={`${idPrefix}-request`} value={request} maxLength={video ? 12000 : 600} rows={3} onChange={(e) => onRequest(e.target.value)} placeholder={video ? t("Ex. : le produit posé sur une table en bois au lever du soleil, la lumière révèle les détails, sans montrer de face absente des références…", "E.g. the product on a wooden table at sunrise, light reveals its details without exposing unreferenced sides…") : t("Ex. : le produit sur un rocher au bord de la mer, lumière dorée du soir, ambiance aventure…", "E.g. the product on a rock by the sea, golden evening light, adventure mood…")} data-subject-request />
      </Field>
    </div>
  );
}
