/** Une origine ou une licence déclarée n'est pas une certification des droits. Aucun accord n'est inféré. */
export function provenanceState(origin:string,meta:Record<string,any>={}){
  const demo=meta.demo?.isDemo===true||meta.lot2a?.demo===true;
  const ai=meta.aiGenerated===true||meta.artwork?.aiGenerated===true||!!meta.aiPost||meta.aiAd===true;
  const declaredLicense=typeof meta.licence==="string"?meta.licence:typeof meta.license==="string"?meta.license:typeof meta.stock?.license==="string"?meta.stock.license:null;
  const evidence=typeof meta.rightsReview?.evidenceRef==="string"&&meta.rightsReview.evidenceRef.trim()?meta.rightsReview.evidenceRef:null;
  return{origin:demo?"studio_demo":ai?"ai_generated_declared":origin==="upload"?"provided_file":origin==="site"?"imported_website":origin==="generated"?"generated_or_transformed_unspecified":origin,rightsStatus:evidence?"evidence_declared_requires_review":"to_confirm",declaredLicense,evidenceRef:evidence,ownershipCertified:false,peopleConsent:meta.peopleConsent===true?"declared_requires_scope_review":"not_documented",thirdPartyBrands:"to_confirm",claims:"requires_project_evidence",demoOnly:demo};
}
