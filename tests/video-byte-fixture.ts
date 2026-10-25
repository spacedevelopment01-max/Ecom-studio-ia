/** Vrai conteneur MP4 local, cinq secondes de couleur unie. Double de transport seulement, pas une preuve créative IA. */
import fs from 'node:fs';
export const videoByteFixture = () => fs.readFileSync(new URL('./fixtures/neutral-clip.mp4', import.meta.url));
