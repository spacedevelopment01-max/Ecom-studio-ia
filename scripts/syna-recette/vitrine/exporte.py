# python3 exporte.py <brut.html> <dossier de sortie> <titre> — une page autonome (feuilles et scripts dans la page, images et polices à côté).
import re, sys, os, sqlite3, shutil, io
from PIL import Image
brut, out, titre = sys.argv[1], sys.argv[2], sys.argv[3]
ROOT='/home/user/Ecom-studio-ia'; DATA=os.environ['DATA_DIR']
os.makedirs(out+'/img', exist_ok=True); os.makedirs(out+'/polices', exist_ok=True)
h=open(brut,encoding='utf8').read()
head=re.search(r'<head>(.*?)</head>',h,re.S).group(1); body=re.search(r'<body[^>]*>(.*)</body>',h,re.S).group(1)
db=sqlite3.connect(DATA+'/studio.db'); files={}
def img(m):
    i=m.group(1)
    if i not in files:
        r=db.execute('select storage_key,mime from assets where id=?',(i,)).fetchone()
        if not r: files[i]=None; return m.group(0)
        src=DATA+'/storage/'+r[0]; im=Image.open(src); alpha=im.mode in('RGBA','LA','P') and 'A' in im.convert('RGBA').getbands() and im.convert('RGBA').getextrema()[3][0]<255
        im.thumbnail((1600,1600))
        if alpha: name=i+'.png'; im.save(out+'/img/'+name,optimize=True)
        else: name=i+'.jpg'; im.convert('RGB').save(out+'/img/'+name,quality=82,optimize=True)
        files[i]=name
    return 'img/'+files[i] if files[i] else m.group(0)
def police(m):
    f=m.group(1); src=ROOT+'/assets/fonts/'+f
    if os.path.exists(src): shutil.copy(src,out+'/polices/'+f); return 'polices/'+f
    return m.group(0)
def css(m):
    p=ROOT+'/public'+m.group(1); c=open(p,encoding='utf8').read()
    return '<style>'+c+'</style>'
def js(m):
    p=ROOT+'/public'+m.group(1); c=open(p,encoding='utf8').read().replace('</script','<\\/script')
    return '<script>'+c+'</script>'
head=re.sub(r'<meta[^>]*>|<base[^>]*>|<title>.*?</title>','',head,flags=re.S)
doc=f'<title>{titre}</title>\n'+head+'\n<style>.tb-bar{display:none!important}body{background:var(--tn-fond,#fff)}</style>\n'+body
doc=re.sub(r'<link rel="stylesheet" href="(/sections/[^"]+\.css)">',css,doc)
doc=re.sub(r'<script src="(/sections/[^"]+\.js)"[^>]*></script>',js,doc)
doc=re.sub(r'/api/files/([a-z0-9]+)',img,doc)
doc=re.sub(r'/api/syna/fonts/([\w.-]+)',police,doc)
open(out+'/index.html','w',encoding='utf8').write(doc)
reste=sorted(set(re.findall(r'(?:url\(|src=|href=)["\']?(/(?:api|sections)[^"\')\s]*|photos/[^"\')\s]*)',doc)))
print(len(doc)//1024,'Ko ;',len([f for f in files.values() if f]),'images ;',sum(os.path.getsize(out+'/img/'+f) for f in os.listdir(out+'/img'))//1024,'Ko ; restes:',reste[:12])
