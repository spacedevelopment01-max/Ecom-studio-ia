/** Double de transport explicite des suites de moteurs : réutilise leur faux fetch. Les contrôles DNS natifs sont testés séparément dans mission171-public-download. */
export async function publicDownload(url:string,_options?:unknown):Promise<Response>{return fetch(url);}
