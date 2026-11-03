/** Browser regression for the native exported theme stylesheet; no network or supplier. */
import fs from 'node:fs';import assert from 'node:assert/strict';import{chromium}from'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),args:['--no-sandbox','--disable-background-networking']});
try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());
 const css=fs.readFileSync('theme-base/assets/theme.css','utf8');
 await page.setContent('<style>'+css+'</style><body class="es-body" style="--c-bg:#f4f5f2;--c-text:#182521"><section id="default" class="color-scheme-1" style="--c-bg:#ffffff;--c-text:#111111">Default</section><section id="edited" class="color-es-selected" style="--c-bg:#1d4ed8;--c-text:#ffffff">Native section colour</section><section id="other" class="color-scheme-2" style="--c-bg:#ff0000;--c-text:#111111">Other section</section></body>');
 const values=await page.evaluate(()=>Object.fromEntries(['default','edited','other'].map(id=>{const s=getComputedStyle(document.getElementById(id)!);return[id,{background:s.backgroundColor,text:s.color}];})));
 assert.deepEqual(values,{default:{background:'rgb(255, 255, 255)',text:'rgb(17, 17, 17)'},edited:{background:'rgb(29, 78, 216)',text:'rgb(255, 255, 255)'},other:{background:'rgb(255, 0, 0)',text:'rgb(17, 17, 17)'}});
 console.log(JSON.stringify({status:'PASS',stylesheet:'native theme.css, also exported by compileTheme',computed:values,realProviderCalls:0}));
}finally{await browser.close();}
