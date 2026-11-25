// les plans sont écrits sur la voix accélérée de 12 % ; la voix est maintenant accélérée de 25 %
const K = 1.12 / 1.25;
export const versNouveau = (t: number) => t * K;
export const versAncien = (t: number) => t / K;
