import {it,expect} from 'vitest';
import {localFileRestoreCandidate} from '@/lib/orchestrator/conversation/local-file-restore';
it.each([
 'Restaure le premier montage, en conservant les fichiers des deux versions.',
 'Restaure la version précédente du site et conserve les images.',
 'Remets le titre précédent sans perdre les photos.',
])('does not steal a native domain restoration because media are mentioned: %s',text=>{
 expect(localFileRestoreCandidate(text)).toBe(false);
});
it.each([
 'Restaure le fichier « ID » de la corbeille',
 'Peux-tu restaurer la photo « ID » de la corbeille ?',
 'Restaure cette image',
 'Restaure l’image « ID » de la corbeille puis régénère-la',
 'Montre la corbeille des images puis vide tout',
])('keeps exact and ambiguous file requests inside guarded free handling: %s',text=>{
 expect(localFileRestoreCandidate(text)).toBe(true);
});
