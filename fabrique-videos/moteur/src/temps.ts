// voix accélérée de 15 % : les plans gardent leurs temps d'origine
const K = 1 / 1.15;
export const versNouveau = (t: number) => t * K;
export const versAncien = (t: number) => t / K;
