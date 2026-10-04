/**
 * CapCut ne propose pas d'API publique permettant de créer ou d'ouvrir un
 * projet de montage depuis une application tierce. Le studio prépare donc un
 * pack de transfert propre : médias (vidéo, plans, images, détourages PNG
 * transparents, logos), sous-titres SRT, musique, découpage et mode d'emploi.
 * Le montage obtenu dans CapCut peut ensuite être réimporté dans le projet.
 */
import { zipSync, strToU8 } from "fflate";
import { json } from "../db";
import { assetData, getAsset, type Asset } from "../library";
import { all } from "../db";
import { sceneText, synthMusic, type VideoSpec } from "../media/video";
import { L } from "../i18n-server";

export async function capcutPack(projectId: string, videoId: string): Promise<{ zip: Buffer; name: string }> {
  const video = getAsset(videoId);
  if (!video || video.project_id !== projectId || video.kind !== "video") throw new Error(L("Vidéo introuvable dans ce projet.", "Video not found in this project."));
  const meta = json<any>(video.meta, {});
  const plan: VideoSpec | undefined = meta.plan;
  const files: Record<string, Uint8Array> = {};
  // Noms des fichiers du pack dans la langue de l'interface.
  const n = {
    video: L("01-video-finale.mp4", "01-final-video.mp4"),
    srt: L("02-sous-titres.srt", "02-subtitles.srt"),
    poster: L("03-affiche.jpg", "03-poster.jpg"),
    music: L("04-musique.wav", "04-music.wav"),
    media: L("medias", "media"),
  };
  files[n.video] = new Uint8Array(assetData(video));
  const related = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND source_asset_id = ? AND deleted_at IS NULL", projectId, videoId);
  for (const r of related) {
    if (r.role === "subtitles") files[n.srt] = new Uint8Array(assetData(r));
    if (r.role === "video-poster") files[n.poster] = new Uint8Array(assetData(r));
  }
  const add = (folder: string, list: Asset[]) => list.forEach((a, i) => (files[`${folder}/${String(i + 1).padStart(2, "0")}-${a.name}`] = new Uint8Array(assetData(a))));
  const by = (role: string, n: number) => all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT ?", projectId, role, n);
  add(`${n.media}/${L("produit-detoure-png", "product-cutout-png")}`, by("cutout", 2));
  add(`${n.media}/details`, by("detail", 3));
  add(`${n.media}/scenes`, by("scene", 4));
  add(`${n.media}/${L("plans-generes", "generated-shots")}`, by("clip", 2));
  add(`${n.media}/logos`, [...by("logo", 1), ...by("logo-light", 1), ...by("logo-mark", 1)]);
  if (plan && plan.music !== "none") {
    const total = plan.scenes.reduce((s, x) => s + x.duration, 0);
    files[n.music] = new Uint8Array(synthMusic(total, plan.music, []));
  }
  const storyboard = plan
    ? plan.scenes
        .map((s, i) => {
          const txt = sceneText(s);
          return `| ${i + 1} | ${s.kind} | ${s.duration.toFixed(1)} s | ${txt ?? ""} |`;
        })
        .join("\n")
    : "";
  files[L("LISEZ-MOI.md", "README.md")] = strToU8(
    L(
      `# Pack de montage CapCut — ${video.name}

Ce pack contient tout le nécessaire pour reprendre la vidéo dans CapCut (ordinateur ou mobile).
CapCut ne permet pas, à ce jour, d'ouvrir automatiquement un projet créé par une autre application :
l'import se fait donc à la main, en quelques gestes.

## Contenu
- \`${n.video}\` : la vidéo livrée par le studio (${meta.delivered ?? ""}).
- \`${n.srt}\` : les textes à l'écran, minutés.
- \`${n.music}\` : la musique d'accompagnement (création originale, libre d'utilisation).
- \`${n.media}/\` : produit détouré (PNG transparent), détails, scènes, plans générés et logos.

## Reprendre le montage dans CapCut
1. Créez un nouveau projet au format ${plan?.format ?? "souhaité"}.
2. Importez le dossier \`${n.media}\` et la vidéo finale (Importer › choisir les fichiers).
3. Pour les sous-titres : Texte › Sous-titres › Importer un fichier de sous-titres (\`.srt\`), si votre version le propose ; sinon, recopiez les textes du découpage ci-dessous.
4. Ajoutez la musique (\`${n.music}\`) sur une piste audio.
5. Exportez en MP4 (1080p, 30 i/s) puis réimportez le fichier dans le studio (Fichiers › Imports externes › CapCut) pour le programmer.

## Découpage
| Plan | Type | Durée | Texte |
|---|---|---|---|
${storyboard}
`,
      `# CapCut editing pack — ${video.name}

This pack contains everything you need to keep editing the video in CapCut (desktop or mobile).
CapCut does not currently let you automatically open a project created by another app,
so the import is done by hand in a few steps.

## Contents
- \`${n.video}\`: the video delivered by the studio (${meta.delivered ?? ""}).
- \`${n.srt}\`: the on-screen text, timed.
- \`${n.music}\`: the background music (original creation, free to use).
- \`${n.media}/\`: cutout product (transparent PNG), details, scenes, generated shots and logos.

## Continue editing in CapCut
1. Create a new project in ${plan?.format ?? "the desired"} format.
2. Import the \`${n.media}\` folder and the final video (Import › select the files).
3. For subtitles: Text › Captions › Import a caption file (\`.srt\`), if your version offers it; otherwise, copy the text from the shot list below.
4. Add the music (\`${n.music}\`) on an audio track.
5. Export as MP4 (1080p, 30 fps), then re-import the file into the studio (Files › External imports › CapCut) to schedule it.

## Shot list
| Shot | Type | Duration | Text |
|---|---|---|---|
${storyboard}
`,
    ),
  );
  return { zip: Buffer.from(zipSync(files, { level: 1 })), name: `${video.name.replace(/\.mp4$/i, "")}-${L("pack-capcut", "capcut-pack")}.zip` };
}
