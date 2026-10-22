/** Official Kling v3 contract checked 2026-10-22. No model/configuration migration.
 * The native catalogue currently exposes these routes for silent shots only.
 * French voiceover is a separately consented, quoted audio track, never native lip sync. */
export function falVideoRequest(model:string,input:{prompt:string;image:string;seconds:number}) {
  const common={prompt:input.prompt,duration:String(input.seconds)};
  if(/^fal-ai\/kling-video\/v3\/(standard|pro)\/image-to-video$/.test(model))return {...common,start_image_url:input.image,generate_audio:false};
  return {...common,image_url:input.image};
}
