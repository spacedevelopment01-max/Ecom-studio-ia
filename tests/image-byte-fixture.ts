/** Photo synthétique unie de recette, vrai PNG. Ne constitue ni une génération IA ni une preuve de qualité créative. */
import fs from 'node:fs';
export const imageByteFixture=()=>fs.readFileSync(new URL('./fixtures/neutral-photo.png',import.meta.url));
export const jpegByteFixture=()=>fs.readFileSync(new URL('./fixtures/neutral-photo.jpg',import.meta.url));
