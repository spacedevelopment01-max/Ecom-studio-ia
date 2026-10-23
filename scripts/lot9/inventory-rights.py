"""Registre des ressources suivies distribuables : aucun fichier client/secret/environnement."""
import pathlib, subprocess, json, hashlib, datetime
root=pathlib.Path.cwd()
entries=[]
for e in subprocess.check_output(['git','ls-files','--stage','-z']).split(b'\0'):
 if not e:continue
 h,n=e.split(b'\t',1);name=n.decode();sha=h.decode().split()[1]
 if not name.startswith(('public/','assets/')) or pathlib.Path(name).suffix.lower() not in {'.png','.jpg','.jpeg','.webp','.avif','.svg','.gif','.ico','.woff','.woff2','.ttf','.otf','.sf2','.mp3','.wav','.ogg','.mp4','.webm'}:continue
 p=root/name;data=p.read_bytes() if p.exists() else subprocess.check_output(['git','cat-file','blob',sha]);suffix=p.suffix.lower();font=suffix in {'.woff','.woff2','.ttf','.otf'}
 license_file=next((str(x.relative_to(root)) for x in root.glob('assets/fonts/licenses/*') if p.stem.split('-')[0].lower() in x.name.lower()),None) if font else None
 entries.append({'file':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'kind':'font' if font else 'audio' if suffix in {'.sf2','.mp3','.wav','.ogg'} else 'video' if suffix in {'.mp4','.webm'} else 'image_or_logo','origin':'bundled_font_name_not_author_proof' if font else 'studio_demo_reference_or_interface_resource','author':'not_verified','rightsStatus':'license_file_present_scope_review' if license_file else 'to_confirm','evidenceRef':license_file,'attribution':'review_license' if license_file else 'not_documented','usage':'studio_interface_or_demo; client adaptation must use project-owned media','peopleConsent':'not_documented','brandClaims':'review_before_client_distribution'})
try:
 p=root/'node_modules/generaluser/LICENSE.txt';data=p.read_bytes();entries.append({'file':'node_modules/generaluser/GeneralUser.sf2','kind':'soundfont_dependency','origin':'npm generaluser; composer media/song.ts','author':'S. Christian Collins (package statement)','evidenceRef':'node_modules/generaluser/LICENSE.txt','licenseSha256':hashlib.sha256(data).hexdigest(),'rightsStatus':'permission_declared_with_sample_origin_uncertainty','usage':'local music creation; source license expressly notes incomplete sample provenance','attribution':'retain package license; review distribution terms'})
except FileNotFoundError:pass
result={'schema':'lot9-distributed-rights-1','capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scope':'tracked public/ and assets/ image/font/audio/video files; source code composition and client private storage excluded','ownershipCertified':False,'entries':entries,'limitations':['Per-file checksum proves identity, not ownership or legal clearance.','All theme-assets and supplied pictures remain demo/reference unless project evidence authorizes reuse. No resource replaced.','NOCTIL new pack separately identified in noctil-manifeste-source.json; newer Claude #167 not integrated.','AI authorship, model terms, releases and external-trademark licenses are not inferred from accessibility.','Dependency package and CMS third-party licenses require separate legal review.']}
(root/'reports/lot9/registre-ressources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(entries),'licenseEvidence':sum(bool(e.get('evidenceRef')) for e in entries)},ensure_ascii=False))
