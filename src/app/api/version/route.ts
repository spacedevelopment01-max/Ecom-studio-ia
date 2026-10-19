/** Code compilé, accessible sans données client ni appel fournisseur. */
export function GET(){return Response.json({commit:process.env.STUDIO_BUILD_COMMIT||null,source:"compiled-build"});}
