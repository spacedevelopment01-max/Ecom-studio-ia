/** Une recette SDK native nécessite le build hôte et le garde réseau, jamais le seul job Docker. */
import {it,expect} from 'vitest';
import fs from 'node:fs';
import {parse} from 'yaml';
it('exécute la marque dans les recettes compilées, conserve le garde réseau et sa preuve',()=>{const w=parse(fs.readFileSync('.github/workflows/ci.yml','utf8')),steps=w.jobs.natif.steps,recipe=steps.find((s:any)=>s.run?.includes('--brand-ui'));expect(recipe).toBeTruthy();expect(recipe.env.NODE_OPTIONS).toContain('network-guard.mjs');expect(steps.findIndex((s:any)=>s.run==='npm run build')).toBeLessThan(steps.indexOf(recipe));expect(steps.some((s:any)=>s.uses==='actions/upload-artifact@v4'&&s.if==='always()'&&s.with.path==='reports/ci-agent211-native-brand')).toBe(true);expect(w.jobs['image-docker'].steps.some((s:any)=>s.run?.includes('--brand-ui'))).toBe(false);});
