import type { Locator } from 'playwright';
import { expect } from 'playwright/test';
import sharp from 'sharp';

const refreshError = (error:unknown) => error instanceof Error && /^(?:locator\.evaluate: )?(?:Frame was detached|Execution context was destroyed, most likely because of a navigation\.?)(?:\n|$)/.test(error.message);

/** Same 15s deadline as the native preview recipe. Each assertion resolves the current iframe. */
export async function waitForPreviewImage(image:Locator,expectedSrc:string,timeout=15_000){
 const end=Date.now()+timeout;
 const remaining=()=>{const n=end-Date.now();if(n<=0)throw Error('Preview image deadline exceeded');return n;};
 const encoded=/^data:image\/[^;]+;base64,([\s\S]+)$/.exec(expectedSrc);
 if(!encoded)throw Error('An exact embedded preview image is required');
 const {width,height}=await sharp(Buffer.from(encoded[1],'base64')).metadata();
 if(!width||!height)throw Error('Expected preview dimensions are missing');
 for(;;){
  if(image.page().isClosed())throw Error('Preview page is closed');
  try{
   await expect(image).toHaveJSProperty('currentSrc',expectedSrc,{timeout:remaining()});
   await expect(image).toHaveJSProperty('naturalWidth',width,{timeout:remaining()});
   await expect(image).toHaveJSProperty('naturalHeight',height,{timeout:remaining()});
   await expect(image).toHaveJSProperty('complete',true,{timeout:remaining()});
   await image.evaluate(async(el,expected)=>{const img=el as HTMLImageElement;if(img.currentSrc!==expected.src||img.naturalWidth!==expected.width||img.naturalHeight!==expected.height)throw Error('Preview image changed before decode');await img.decode();if(img.currentSrc!==expected.src||img.naturalWidth!==expected.width||img.naturalHeight!==expected.height)throw Error('Preview image changed during decode');},{src:expectedSrc,width,height},{timeout:remaining()});
   return;
  }catch(error){
   // Only refresh invalidation is transient. Decode errors, mismatches, closed pages and deadlines fail.
   if(!refreshError(error)||image.page().isClosed())throw error;
   remaining();
  }
 }
}
