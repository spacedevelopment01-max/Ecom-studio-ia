/** Real Chromium and native renderer, fictitious local assets. Never invokes an AI or CMS API. */
import {afterEach,describe,it,expect,vi} from 'vitest';
import {captureThemeEvidence} from '@/lib/theme/snapshot';
import {seedCompositionSite,COMPOSITION_SCENES} from '../scripts/composition211-ui-fixtures';
import {account,project} from './conversation209-fixtures';
import {currentTheme} from '@/lib/projects';
import sharp from 'sharp';
afterEach(()=>vi.unstubAllEnvs());
describe('#211 E3 — native render evidence',()=>{
 it('reports unavailable Chromium without pretending to have reviewed a page',async()=>{vi.stubEnv('ES_NO_CHROMIUM','1');await expect(captureThemeEvidence({} as never,['/'])).rejects.toThrow('browser_unavailable');});
 it('rejects remote/arbitrary paths and oversized page selections',async()=>{await expect(captureThemeEvidence({} as never,['https://remote.invalid'])).rejects.toThrow('paths_invalid');await expect(captureThemeEvidence({} as never,['/','/cart','/search'])).rejects.toThrow('paths_invalid');});
 it('captures the full native product and service pages at desktop/mobile sizes with decoded own media',async()=>{vi.stubEnv('CHROMIUM','/usr/bin/chromium');for(const scene of [COMPOSITION_SCENES[0],COMPOSITION_SCENES[2]]){const u=await account(),pid=project(u,scene.business);await seedCompositionSite(pid,scene);const spec=currentTheme(pid)!.spec,shots=await captureThemeEvidence(spec,['/']);expect(shots.map(s=>s.width)).toEqual([1440,390]);for(const shot of shots){const img=await sharp(shot.jpeg).metadata();expect(img.width).toBe(shot.width);expect(img.height).toBe(shot.pageHeight);expect(shot.imageCount).toBeGreaterThan(0);expect(shot.brokenImageIndexes).toEqual([]);expect(shot.horizontalOverflow).toBe(false);expect(shot.pageErrors).toEqual([]);expect(shot.jpeg.length).toBeGreaterThan(1000);}}},60000);
 it('does not silently capture a 404 as a successful Site page',async()=>{vi.stubEnv('CHROMIUM','/usr/bin/chromium');const u=await account(),pid=project(u);await seedCompositionSite(pid,COMPOSITION_SCENES[0]);await expect(captureThemeEvidence(currentTheme(pid)!.spec,['/pages/not-a-page'])).rejects.toThrow('page_unavailable');},30000);
});
