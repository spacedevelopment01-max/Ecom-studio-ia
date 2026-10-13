"use client";
/**
 * Description du projet en deux temps : le client écrit quelques mots, puis « Rédiger avec l'IA » en fait un vrai
 * paragraphe (offert par la plateforme, hors budget IA). Les coordonnées déjà saisies plus haut dans le formulaire
 * (nom, zone, adresse, horaires) sont reprises. Le texte rédigé reste modifiable ; « Revenir à mes mots » annule.
 */
import { useEffect, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { api, Button, Textarea, useToast } from "../ui";
import { useLang, useT } from "../i18n";

const field = (id: string) => ((document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "").trim() || undefined;

export function AiDescription({ business, invalid, onText, placeholder, rows = 4 }: { business: "services" | "products"; invalid?: boolean; onText?: (text: string) => void; placeholder: string; rows?: number }) {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const [text, setText] = useState("");
  const [mine, setMine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Le texte peut changer sans frappe (rédaction par l'IA) : le formulaire est prévenu à chaque changement.
  useEffect(() => {
    onText?.(text);
  }, [text, onText]);

  const write = async () => {
    setBusy(true);
    try {
      const r = await api<{ text: string }>("/api/describe", {
        body: { business, brief: mine ?? text, name: field("brandName"), area: field("area"), address: field("address"), hours: field("hours"), phone: field("phone"), email: field("email"), lang: field("language") ?? lang },
      });
      if (mine === null) setMine(text);
      setText(r.text);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Textarea id="description" name="description" rows={mine !== null ? Math.max(rows, 7) : rows} autoGrow value={text} onChange={(e) => setText(e.target.value)} aria-required={business === "services" || undefined} aria-invalid={invalid || undefined} placeholder={placeholder} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={write} disabled={busy || (mine ?? text).trim().length < 3} icon={<Sparkles className="size-4" />} data-testid="ai-describe">
          {busy ? t("Rédaction en cours…", "Writing…") : mine !== null ? t("Une autre version", "Another version") : t("Rédiger ma description avec l'IA", "Write my description with AI")}
        </Button>
        {mine !== null && !busy && (
          <Button type="button" size="sm" variant="secondary" onClick={() => (setText(mine), setMine(null))} icon={<RotateCcw className="size-3.5" />}>
            {t("Revenir à mes mots", "Back to my words")}
          </Button>
        )}
        <span className="text-xs text-muted">{mine !== null ? t("Relisez et corrigez si besoin : ce texte servira de base à tout le projet.", "Read it over and correct it if needed: this text will be the basis of the whole project.") : t("Offert : ne consomme pas votre budget IA.", "Free: doesn't use your AI budget.")}</span>
      </div>
    </div>
  );
}
