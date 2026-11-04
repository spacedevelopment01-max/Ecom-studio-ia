import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {aspectLabel} from '@/lib/aspect-label';
it('le badge de la Banque Images annonce le format réel de la photo',()=>{
 expect(aspectLabel(640,480)).toBe('4:3');expect(aspectLabel(1920,1080)).toBe('16:9');expect(aspectLabel(1080,1920)).toBe('9:16');
 expect(aspectLabel(1080,1350)).toBe('4:5');expect(aspectLabel(1000,1000)).toBe('1:1');expect(aspectLabel(1500,1000)).toBe('3:2');expect(aspectLabel(480,640)).toBe('3:4');
 expect(aspectLabel(0,480)).toBeNull();
 expect(readFileSync('src/components/studio/tab-images.tsx','utf8')).toContain('aspectLabel(a.width, a.height)');
});
