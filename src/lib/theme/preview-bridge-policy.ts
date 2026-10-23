/** Politique pure partagée avec les régressions : un iframe ne peut pas transformer le parent en proxy d'API. */
export function previewBridgeTarget(frameSrc: string, requestUrl: string, method: string, origin: string): URL | null {
  try {
    const src = new URL(frameSrc, origin), url = new URL(requestUrl, origin);
    if (src.origin !== origin || url.origin !== origin || !["GET", "POST"].includes(method)) return null;
    const project = src.pathname.match(/^\/preview\/([a-z0-9]+)\/v\//)?.[1] ?? src.pathname.match(/^\/api\/projects\/([a-z0-9]+)\/theme\/section-preview$/)?.[1];
    if (!project || !url.pathname.startsWith(`/preview/${project}/v/`) || /%2f|%5c|%2e|\\/i.test(url.pathname)) return null;
    if (method === "POST" && !/^\/preview\/[a-z0-9]+\/v\/[^/]+\/(?:cart(?:\/(?:add|change|update))?(?:\.js)?|contact)$/.test(url.pathname)) return null;
    return url;
  } catch { return null; }
}
