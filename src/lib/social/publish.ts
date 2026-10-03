/**
 * Publication réelle sur les réseaux via leurs API officielles. Une
 * publication n'est marquée « publiée » qu'après confirmation de la
 * plateforme (identifiant distant). Les limites des API sont signalées
 * sans simuler d'automatisation.
 */
import { json, now, one, run } from "../db";
import { decrypt, encrypt } from "../secrets";
import { assetData, getAsset, type Asset } from "../library";
import { PermanentError, UserFacingError } from "../jobs";
import { isPublicAppUrl, publicMediaUrl } from "../public-url";
import { graphVersion, providerConfig } from "./oauth";

export type Connection = {
  id: string;
  user_id: string;
  provider: string;
  external_id: string;
  name: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  scopes: string;
  meta: string;
  status: string;
};

export type PostRow = {
  id: string;
  project_id: string;
  connection_id: string | null;
  network: string;
  format: string;
  status: string;
  scheduled_at: number | null;
  title: string;
  caption: string;
  hashtags: string;
  link: string | null;
  media: string;
  remote_id: string | null;
  publish_key: string | null;
  attempts: number;
};

export type PublishResult = { remoteId: string; url?: string; note?: string };

export function markConnection(c: Connection, status: "active" | "expired" | "revoked" | "error", message?: string) {
  run("UPDATE connections SET status = ?, status_message = ?, updated_at = ? WHERE id = ?", status, message ?? null, now(), c.id);
}

/** Rafraîchit un jeton expiré (TikTok, YouTube, Pinterest, Canva). */
export async function freshToken(c: Connection): Promise<string> {
  const access = decrypt(c.access_token);
  if (!access) throw new PermanentError("Jeton absent : reconnectez le compte.");
  if (!c.expires_at || c.expires_at > now() + 120_000) return access;
  const refresh = decrypt(c.refresh_token);
  if (!refresh) {
    markConnection(c, "expired", "Autorisation expirée : reconnectez le compte.");
    throw new PermanentError("Autorisation expirée : reconnectez le compte.");
  }
  const map: Record<string, { url: string; cfg: "tiktok" | "youtube" | "pinterest" | "canva" }> = {
    tiktok: { url: "https://open.tiktokapis.com/v2/oauth/token/", cfg: "tiktok" },
    youtube: { url: "https://oauth2.googleapis.com/token", cfg: "youtube" },
    pinterest: { url: "https://api.pinterest.com/v5/oauth/token", cfg: "pinterest" },
    canva: { url: "https://api.canva.com/rest/v1/oauth/token", cfg: "canva" },
  };
  const m = map[c.provider];
  if (!m) return access;
  const { clientId, clientSecret } = providerConfig(m.cfg);
  const body: Record<string, string> = { grant_type: "refresh_token", refresh_token: refresh };
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (c.provider === "tiktok") Object.assign(body, { client_key: clientId!, client_secret: clientSecret! });
  else if (c.provider === "youtube") Object.assign(body, { client_id: clientId!, client_secret: clientSecret! });
  else headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  const r = await fetch(m.url, { method: "POST", headers, body: new URLSearchParams(body) });
  const t: any = await r.json().catch(() => ({}));
  if (!r.ok || !t.access_token) {
    markConnection(c, "expired", "Le renouvellement de l'autorisation a échoué : reconnectez le compte.");
    throw new PermanentError("Autorisation expirée : reconnectez le compte.");
  }
  run(
    "UPDATE connections SET access_token = ?, refresh_token = COALESCE(?, refresh_token), expires_at = ?, status = 'active', status_message = NULL, updated_at = ? WHERE id = ?",
    encrypt(t.access_token),
    t.refresh_token ? encrypt(t.refresh_token) : null,
    now() + (t.expires_in ?? 3600) * 1000,
    now(),
    c.id,
  );
  return t.access_token;
}

function mediaOf(post: PostRow): Asset[] {
  return json<string[]>(post.media, [])
    .map((id) => getAsset(id))
    .filter((a): a is Asset => !!a && a.project_id === post.project_id && !a.deleted_at);
}

function fullCaption(post: PostRow) {
  const tags = post.hashtags
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => `#${t.replace(/^#/, "")}`)
    .join(" ");
  return [post.caption.trim(), tags].filter(Boolean).join("\n\n");
}

async function graph(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST") {
  const url = `https://graph.facebook.com/${graphVersion()}/${path}`;
  const r = method === "GET" ? await fetch(`${url}?${new URLSearchParams(params)}`) : await fetch(url, { method: "POST", body: new URLSearchParams(params) });
  const j: any = await r.json().catch(() => ({}));
  if (j.error) {
    const code = j.error.code;
    if (code === 190) throw Object.assign(new PermanentError("Autorisation Meta expirée ou révoquée : reconnectez le compte."), { reconnect: true });
    if (code === 10 || code === 200) throw new PermanentError(`Autorisation manquante chez Meta : ${j.error.message}`);
    if (code === 4 || code === 17 || code === 32 || code === 613) throw new Error(`Limite de débit Meta atteinte, nouvel essai plus tard : ${j.error.message}`);
    throw new Error(`Meta : ${j.error.message}`);
  }
  return j;
}

function requirePublicMedia() {
  if (!isPublicAppUrl()) throw new UserFacingError("Meta télécharge les médias depuis une adresse publique HTTPS. Définissez l'adresse publique du studio (APP_URL) dans l'administration, ou utilisez l'export manuel.");
}

const ext = (a: Asset) => (a.mime === "video/mp4" ? "mp4" : a.mime === "image/png" ? "png" : "jpg");

async function publishFacebook(c: Connection, post: PostRow): Promise<PublishResult> {
  const token = decrypt(c.access_token)!;
  const pageId = c.external_id;
  const media = mediaOf(post);
  const message = fullCaption(post);
  if (!media.length) {
    const j = await graph(`${pageId}/feed`, { message, ...(post.link ? { link: post.link } : {}), access_token: token });
    return { remoteId: j.id, url: `https://www.facebook.com/${j.id}` };
  }
  requirePublicMedia();
  const first = media[0];
  if (first.kind === "video") {
    const j = await graph(`${pageId}/videos`, { file_url: publicMediaUrl(first.id, "mp4"), description: message, title: post.title, access_token: token });
    return { remoteId: j.id, url: `https://www.facebook.com/${pageId}/videos/${j.id}` };
  }
  if (media.length === 1) {
    const j = await graph(`${pageId}/photos`, { url: publicMediaUrl(first.id, ext(first)), caption: message, access_token: token });
    return { remoteId: j.post_id ?? j.id, url: `https://www.facebook.com/${j.post_id ?? j.id}` };
  }
  const ids: string[] = [];
  for (const a of media.slice(0, 10)) ids.push((await graph(`${pageId}/photos`, { url: publicMediaUrl(a.id, ext(a)), published: "false", access_token: token })).id);
  const j = await graph(`${pageId}/feed`, { message, ...Object.fromEntries(ids.map((id, i) => [`attached_media[${i}]`, JSON.stringify({ media_fbid: id })])), access_token: token });
  return { remoteId: j.id, url: `https://www.facebook.com/${j.id}` };
}

async function waitContainer(id: string, token: string) {
  for (let i = 0; i < 40; i++) {
    const s = await graph(id, { fields: "status_code,status", access_token: token }, "GET");
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new PermanentError(`Instagram a refusé le média : ${s.status ?? s.status_code}`);
    await new Promise((r) => setTimeout(r, 6000));
  }
  throw new Error("Traitement du média Instagram trop long, nouvel essai plus tard.");
}

async function publishInstagram(c: Connection, post: PostRow): Promise<PublishResult> {
  requirePublicMedia();
  const token = decrypt(c.access_token)!;
  const ig = c.external_id;
  const media = mediaOf(post);
  if (!media.length) throw new PermanentError("Instagram exige au moins une image ou une vidéo.");
  const caption = fullCaption(post);
  let creation: string;
  if (media.length > 1) {
    const children: string[] = [];
    for (const a of media.slice(0, 10)) {
      const ch = await graph(`${ig}/media`, a.kind === "video" ? { media_type: "VIDEO", video_url: publicMediaUrl(a.id, "mp4"), is_carousel_item: "true", access_token: token } : { image_url: publicMediaUrl(a.id, ext(a)), is_carousel_item: "true", access_token: token });
      if (a.kind === "video") await waitContainer(ch.id, token);
      children.push(ch.id);
    }
    creation = (await graph(`${ig}/media`, { media_type: "CAROUSEL", children: children.join(","), caption, access_token: token })).id;
  } else if (media[0].kind === "video") {
    creation = (await graph(`${ig}/media`, { media_type: post.format === "story" ? "STORIES" : "REELS", video_url: publicMediaUrl(media[0].id, "mp4"), caption, share_to_feed: "true", access_token: token })).id;
    await waitContainer(creation, token);
  } else {
    creation = (await graph(`${ig}/media`, post.format === "story" ? { media_type: "STORIES", image_url: publicMediaUrl(media[0].id, ext(media[0])), access_token: token } : { image_url: publicMediaUrl(media[0].id, ext(media[0])), caption, access_token: token })).id;
    await waitContainer(creation, token);
  }
  const pub = await graph(`${ig}/media_publish`, { creation_id: creation, access_token: token });
  const info = await graph(pub.id, { fields: "permalink", access_token: token }, "GET").catch(() => ({}));
  return { remoteId: pub.id, url: (info as any).permalink };
}

async function publishTikTok(c: Connection, post: PostRow): Promise<PublishResult> {
  const token = await freshToken(c);
  const video = mediaOf(post).find((a) => a.kind === "video");
  if (!video) throw new PermanentError("TikTok : seule la publication de vidéos est prise en charge depuis le studio (les photos exigent un domaine vérifié).");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" };
  const ci: any = await (await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", { method: "POST", headers })).json();
  if (ci.error?.code && ci.error.code !== "ok") throw new PermanentError(`TikTok : ${ci.error.message}`);
  const levels: string[] = ci.data?.privacy_level_options ?? ["SELF_ONLY"];
  const privacy = levels.includes("PUBLIC_TO_EVERYONE") ? "PUBLIC_TO_EVERYONE" : levels[0];
  const data = assetData(video);
  const chunk = data.length <= 64 * 1024 * 1024 ? data.length : 10 * 1024 * 1024;
  const total = Math.ceil(data.length / chunk);
  const init: any = await (
    await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers,
      body: JSON.stringify({ post_info: { title: fullCaption(post).slice(0, 2200), privacy_level: privacy, disable_duet: false, disable_comment: false, disable_stitch: false }, source_info: { source: "FILE_UPLOAD", video_size: data.length, chunk_size: chunk, total_chunk_count: total } }),
    })
  ).json();
  if (init.error?.code && init.error.code !== "ok") {
    if (/scope|unaudited|privacy/i.test(init.error.code + init.error.message)) throw new PermanentError(`TikTok refuse la publication : ${init.error.message}`);
    throw new Error(`TikTok : ${init.error.message}`);
  }
  for (let i = 0; i < total; i++) {
    const part = data.subarray(i * chunk, Math.min(data.length, (i + 1) * chunk));
    const up = await fetch(init.data.upload_url, { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Range": `bytes ${i * chunk}-${i * chunk + part.length - 1}/${data.length}`, "Content-Length": String(part.length) }, body: new Uint8Array(part) });
    if (!up.ok && up.status !== 206 && up.status !== 201) throw new Error(`Envoi TikTok interrompu (${up.status}).`);
  }
  const publishId = init.data.publish_id;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const st: any = await (await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", { method: "POST", headers, body: JSON.stringify({ publish_id: publishId }) })).json();
    const s = st.data?.status;
    if (s === "PUBLISH_COMPLETE") return { remoteId: (st.data.publicaly_available_post_id ?? [publishId])[0]?.toString() ?? publishId, note: privacy === "SELF_ONLY" ? "Publiée en « moi uniquement » : l'application TikTok n'est pas encore auditée." : undefined };
    if (s === "FAILED") throw new PermanentError(`TikTok a rejeté la vidéo : ${st.data.fail_reason}`);
  }
  return { remoteId: publishId, note: "Envoyée ; TikTok termine le traitement." };
}

async function publishYouTube(c: Connection, post: PostRow): Promise<PublishResult> {
  const token = await freshToken(c);
  const video = mediaOf(post).find((a) => a.kind === "video");
  if (!video) throw new PermanentError("YouTube n'accepte que des vidéos.");
  const isShort = (video.height ?? 0) > (video.width ?? 0) && (video.duration ?? 0) <= 180;
  const title = (post.title || post.caption.split("\n")[0]).slice(0, 95) + (isShort && !/#shorts/i.test(post.title) ? " #Shorts" : "");
  const meta = { snippet: { title: title.slice(0, 100), description: fullCaption(post).slice(0, 4900), categoryId: "22" }, status: { privacyStatus: json<any>(c.meta, {}).privacy ?? "public", selfDeclaredMadeForKids: false } };
  const data = assetData(video);
  const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(data.length) }, body: JSON.stringify(meta) });
  if (start.status === 401) throw Object.assign(new PermanentError("Autorisation YouTube expirée : reconnectez le compte."), { reconnect: true });
  if (start.status === 403) throw new PermanentError(`YouTube refuse la mise en ligne : ${(await start.text()).slice(0, 300)}`);
  const loc = start.headers.get("location");
  if (!loc) throw new Error(`YouTube : session d'envoi non ouverte (${start.status}).`);
  const up = await fetch(loc, { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Length": String(data.length) }, body: new Uint8Array(data) });
  const j: any = await up.json().catch(() => ({}));
  if (!up.ok || !j.id) throw new Error(`YouTube : envoi échoué (${up.status}).`);
  return { remoteId: j.id, url: isShort ? `https://www.youtube.com/shorts/${j.id}` : `https://www.youtube.com/watch?v=${j.id}`, note: j.status?.privacyStatus === "private" ? "Mise en ligne privée (application non vérifiée par Google)." : undefined };
}

async function publishPinterest(c: Connection, post: PostRow): Promise<PublishResult> {
  const token = await freshToken(c);
  const meta = json<any>(c.meta, {});
  const boardId = meta.boardId;
  if (!boardId) throw new PermanentError("Choisissez un tableau Pinterest dans les connexions.");
  const media = mediaOf(post);
  const first = media[0];
  if (!first) throw new PermanentError("Pinterest exige une image ou une vidéo.");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  let media_source: any;
  if (first.kind === "video") {
    const reg: any = await (await fetch("https://api.pinterest.com/v5/media", { method: "POST", headers, body: JSON.stringify({ media_type: "video" }) })).json();
    const form = new FormData();
    for (const [k, v] of Object.entries(reg.upload_parameters ?? {})) form.append(k, String(v));
    form.append("file", new Blob([new Uint8Array(assetData(first))], { type: "video/mp4" }));
    const up = await fetch(reg.upload_url, { method: "POST", body: form });
    if (!up.ok && up.status !== 204) throw new Error(`Envoi vidéo Pinterest échoué (${up.status}).`);
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const st: any = await (await fetch(`https://api.pinterest.com/v5/media/${reg.media_id}`, { headers })).json();
      if (st.status === "succeeded") break;
      if (st.status === "failed") throw new PermanentError("Pinterest a refusé la vidéo.");
    }
    const poster = media.find((a) => a.kind === "image");
    media_source = { source_type: "video_id", media_id: reg.media_id, ...(poster ? { cover_image_content_type: "image/jpeg", cover_image_data: assetData(poster).toString("base64") } : {}) };
  } else {
    media_source = { source_type: "image_base64", content_type: first.mime === "image/png" ? "image/png" : "image/jpeg", data: assetData(first).toString("base64") };
  }
  const r = await fetch("https://api.pinterest.com/v5/pins", { method: "POST", headers, body: JSON.stringify({ board_id: boardId, title: post.title.slice(0, 100), description: fullCaption(post).slice(0, 800), ...(post.link ? { link: post.link } : {}), media_source }) });
  const j: any = await r.json().catch(() => ({}));
  if (r.status === 401) throw Object.assign(new PermanentError("Autorisation Pinterest expirée : reconnectez le compte."), { reconnect: true });
  if (!r.ok) throw new Error(`Pinterest : ${j.message ?? r.status}`);
  return { remoteId: j.id, url: `https://www.pinterest.com/pin/${j.id}/` };
}

export async function publishPost(post: PostRow, c: Connection): Promise<PublishResult> {
  if (c.status === "revoked" || c.status === "expired") throw new PermanentError(`Le compte ${c.name} doit être reconnecté.`);
  switch (c.provider) {
    case "facebook":
      return publishFacebook(c, post);
    case "instagram":
      return publishInstagram(c, post);
    case "tiktok":
      return publishTikTok(c, post);
    case "youtube":
      return publishYouTube(c, post);
    case "pinterest":
      return publishPinterest(c, post);
    default:
      throw new PermanentError(`Publication non prise en charge pour ${c.provider}.`);
  }
}

/** Vérifie côté plateforme qu'une publication n'existe pas déjà (reprise sans doublon). */
export async function alreadyPublished(post: PostRow, c: Connection): Promise<string | null> {
  if (post.remote_id) return post.remote_id;
  if (c.provider !== "facebook" && c.provider !== "instagram") return null;
  try {
    const token = decrypt(c.access_token)!;
    const path = c.provider === "facebook" ? `${c.external_id}/posts` : `${c.external_id}/media`;
    const j = await graph(path, { fields: c.provider === "facebook" ? "id,message,created_time" : "id,caption,timestamp", limit: "15", access_token: token }, "GET");
    const marker = fullCaption(post).slice(0, 80);
    const hit = (j.data ?? []).find((x: any) => (x.message ?? x.caption ?? "").startsWith(marker) && Date.parse(x.created_time ?? x.timestamp) > Date.now() - 6 * 3600_000);
    return hit?.id ?? null;
  } catch {
    return null;
  }
}

export function connectionFor(postConnectionId: string | null, userId: string): Connection | undefined {
  if (!postConnectionId) return undefined;
  return one<Connection>("SELECT * FROM connections WHERE id = ? AND user_id = ?", postConnectionId, userId);
}

/** Capacités affichées pour un compte connecté. */
export function capabilitiesOf(c: Pick<Connection, "provider" | "scopes">): { can: string[]; missing: string[] } {
  const s = c.scopes;
  const has = (x: string) => s.includes(x);
  switch (c.provider) {
    case "facebook":
      return { can: ["Texte et lien", "Image", "Plusieurs images", "Vidéo"].filter(() => has("pages_manage_posts")), missing: has("pages_manage_posts") ? [] : ["pages_manage_posts"] };
    case "instagram":
      return { can: has("instagram_content_publish") ? ["Image", "Carrousel", "Reel", "Story"] : [], missing: has("instagram_content_publish") ? [] : ["instagram_content_publish"] };
    case "tiktok":
      return { can: has("video.publish") ? ["Vidéo (publication directe)"] : has("video.upload") ? ["Vidéo en brouillon"] : [], missing: ["video.publish", "video.upload"].filter((x) => !has(x)) };
    case "youtube":
      return { can: has("youtube.upload") ? ["Vidéo", "Shorts"] : [], missing: has("youtube.upload") ? [] : ["youtube.upload"] };
    case "pinterest":
      return { can: has("pins:write") ? ["Épingle image", "Épingle vidéo"] : [], missing: ["pins:write", "boards:read"].filter((x) => !has(x)) };
    case "canva":
      return { can: ["Envoyer des médias", "Créer un design", "Exporter"], missing: ["asset:write", "design:content:write"].filter((x) => !has(x)) };
    case "shopify":
      return { can: ["Installer le thème", "Créer le produit", "Créer les pages"], missing: ["write_themes", "write_products"].filter((x) => !has(x)) };
    default:
      return { can: [], missing: [] };
  }
}
