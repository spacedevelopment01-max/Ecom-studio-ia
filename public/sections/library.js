
(function(){
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var euro=function(n){return n.toFixed(2).replace(".",",")+" €"};
  function bump(el){el.classList.remove("bump");void el.offsetWidth;el.classList.add("bump");setTimeout(function(){el.classList.remove("bump")},300)}
  function $(s,r){return (r||document).querySelector(s)}function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  // Filtres et vues
  var tabs=$$(".tabs button");
  tabs.forEach(function(b){b.addEventListener("click",function(){tabs.forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});var f=b.dataset.f;$$(".card").forEach(function(c){c.hidden=!(f==="all"||c.dataset.k.split(" ").indexOf(f)>=0)})})});
  function setView(card,v){card.classList.toggle("phone",v==="phone");$$(".view button",card).forEach(function(b){b.setAttribute("aria-pressed",b.dataset.v===v?"true":"false")});refresh(card)}
  $$(".card").forEach(function(card){$$(".view button",card).forEach(function(b){b.addEventListener("click",function(){setView(card,b.dataset.v)})})});
  $$(".seg button").forEach(function(b){b.addEventListener("click",function(){$$(".seg button").forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});$$(".card").forEach(function(c){if($(".view",c))setView(c,b.dataset.all)})})});
  function refresh(card){var fc=$("[data-fc]",card);if(fc)fc._prog&&fc._prog()}
  // Apparitions (dans la page ou dans un téléphone)
  var io="IntersectionObserver" in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.dispatchEvent(new Event("show"));io.unobserve(e.target)}})},{threshold:.25}):null;
  function onShow(el,fn){if(!io||reduce){fn();return}el.addEventListener("show",fn,{once:true});io.observe(el)}
  $$("[data-stagger]").forEach(function(g){onShow(g,function(){$$(".reveal",g).forEach(function(x,i){setTimeout(function(){x.classList.add("in")},i*110)})})});
  // Titre mot par mot
  $$("[data-words]").forEach(function(h){var i=0;function wrap(node){Array.prototype.slice.call(node.childNodes).forEach(function(n){if(n.nodeType===3){var f=document.createDocumentFragment();n.textContent.split(/(\s+)/).forEach(function(w){if(!w)return;if(/^\s+$/.test(w)){f.appendChild(document.createTextNode(w));return}var s=document.createElement("span");s.className="wd";s.textContent=w;s.style.animationDelay=(i++*0.09)+"s";f.appendChild(s)});n.replaceWith(f)}else wrap(n)})}wrap(h)});
  // Comptes à rebours (date d'exemple)
  var end=Date.now()+3*864e5+5*36e5+1234e3,total=end-Date.now();function pad(x){return String(x).padStart(2,"0")}
  function tick(){var s=Math.max(0,Math.floor((end-Date.now())/1000));$$("[data-cd]").forEach(function(el){var k=el.dataset.cd;el.textContent=k==="d"?Math.floor(s/86400):pad(k==="h"?Math.floor(s%86400/3600):k==="m"?Math.floor(s%3600/60):s%60)});$$("[data-fpcd]").forEach(function(el){el.textContent=pad(Math.floor(s/3600))+":"+pad(Math.floor(s%3600/60))+":"+pad(s%60)});$$("[data-cdbar] .drain").forEach(function(d){d.style.transform="scaleX("+((end-Date.now())/total*0.82+0.18).toFixed(4)+")"})}
  tick();setInterval(tick,1000);
  $$("[data-cdbar] .x").forEach(function(x){x.addEventListener("click",function(){var bar=x.closest("[data-cdbar]");bar.classList.add("closed");setTimeout(function(){bar.classList.remove("closed")},2500)})});
  // Produit vedette
  $$("[data-fp]").forEach(function(fp){
    var imgs=$$("[data-main] img",fp),thumbs=$("[data-thumbs]",fp),dots=$("[data-dots]",fp),cur=0,base=8.5,fmt=1,q=1;
    imgs.forEach(function(im,i){var b=document.createElement("button");b.type="button";b.setAttribute("aria-label","Photo "+(i+1));b.innerHTML='<img src="'+im.getAttribute("src")+'" alt="">';b.addEventListener("click",function(){show(i)});thumbs.appendChild(b);dots.appendChild(document.createElement("i"))});
    function show(i){cur=(i+imgs.length)%imgs.length;imgs.forEach(function(im,j){im.classList.toggle("on",j===cur)});$$("button",thumbs).forEach(function(b,j){b.setAttribute("aria-current",j===cur?"true":"false")});$$("i",dots).forEach(function(d,j){d.classList.toggle("on",j===cur)})}
    show(0);
    var main=$("[data-main]",fp),x0=null;main.addEventListener("pointerdown",function(e){x0=e.clientX});main.addEventListener("pointerup",function(e){if(x0!==null&&Math.abs(e.clientX-x0)>30)show(cur+(e.clientX<x0?1:-1));x0=null});
    function price(){var unit=base*(fmt===2?0.9:1)*0.85,el=$("[data-price]",fp);el.textContent=euro(unit*fmt*q);$("[data-was]",fp).textContent=euro(base*fmt*q);bump(el)}
    $$("[data-sw] button",fp).forEach(function(b){b.addEventListener("click",function(){$$("[data-sw] button",fp).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});base=+b.dataset.p;$("[data-flavor]",fp).textContent=b.dataset.n;var src=$("img",b).getAttribute("src");imgs[1].setAttribute("src",src);$$("button",thumbs)[1].querySelector("img").setAttribute("src",src);show(1);price()})});
    $$("[data-segm] button",fp).forEach(function(b,i){b.addEventListener("click",function(){fmt=+b.dataset.f;$("[data-segm] .pill",fp).style.transform="translateX("+(i*100)+"%)";price()})});
    $$("[data-q]",fp).forEach(function(b){b.addEventListener("click",function(){q=Math.max(1,Math.min(9,q+ +b.dataset.q));$("[data-qn]",fp).textContent=q;price()})});
    price();
  });
  // Collection en vedette
  $$("[data-fc]").forEach(function(fc){var t=$("[data-track]",fc),p=$("[data-prog]",fc);
    fc._prog=function(){var max=t.scrollWidth-t.clientWidth,ratio=t.clientWidth/t.scrollWidth;p.style.width=(ratio*100)+"%";p.style.transform="translateX("+(max>0?(t.scrollLeft/max)*(1/ratio-1)*100:0)+"%)"};
    t.addEventListener("scroll",fc._prog,{passive:true});addEventListener("resize",fc._prog);fc._prog();
    $$("[data-dir]",fc).forEach(function(b){b.addEventListener("click",function(){var c=$(".pc",t);t.scrollBy({left:(+b.dataset.dir)*(c.getBoundingClientRect().width+18),behavior:reduce?"auto":"smooth"})})})});
  // Avant / après
  $$("[data-ba]").forEach(function(ba){var r=$("input",ba);function set(){ba.style.setProperty("--x",r.value+"%")}r.addEventListener("input",set);set()});
  // Étapes
  $$("[data-steps]").forEach(function(s){onShow(s,function(){s.classList.add("in")})});
  // Chiffres clés
  $$("[data-kpis]").forEach(function(k){onShow(k,function(){$$("[data-to]",k).forEach(function(b){var to=+b.dataset.to,suf=b.dataset.suf||"",t0=performance.now(),d=reduce?0:1400;function step(t){var f=d?Math.min(1,(t-t0)/d):1;b.textContent=Math.round(to*(1-Math.pow(1-f,3)))+suf;if(f<1)requestAnimationFrame(step)}requestAnimationFrame(step)})})});
  // Lots
  $$("[data-addon]").forEach(function(a){var tot=$("[data-addon-total]",a);a.addEventListener("change",function(){var t=8.5;$$("input:checked",a).forEach(function(i){t+=+i.dataset.p});tot.textContent=euro(t);bump(tot)})});
  $$("[data-box]").forEach(function(box){var picked=[],slots=$$(".slot",box);function draw(){slots.forEach(function(s,i){s.innerHTML=picked[i]?'<img src="photos/'+picked[i]+'.jpg" alt="">':String(i+1)});$("[data-boxbar]",box).style.width=(picked.length/3*100)+"%";var left=3-picked.length;$("[data-boxmsg]",box).textContent=left?"Choisis encore "+left+" mélange"+(left>1?"s":"")+" pour obtenir −15 %.":"Coffret complet : −15 % appliqués.";$$(".choices button",box).forEach(function(b){b.setAttribute("aria-pressed",picked.indexOf(b.dataset.img)>=0?"true":"false")})}
    $$(".choices button",box).forEach(function(b){b.addEventListener("click",function(){var k=b.dataset.img,i=picked.indexOf(k);if(i>=0)picked.splice(i,1);else if(picked.length<3)picked.push(k);draw()})});draw()});
  $$("[data-gift]").forEach(function(g){var n=2;function draw(){$("[data-gn]",g).textContent=n;$("[data-gbar]",g).style.width=Math.min(100,n/4*100)+"%";var left=4-n;$("[data-giftline]",g).classList.toggle("on",left<=0);$("[data-gmsg]",g).innerHTML=left>0?"Plus que <b>"+left+" sachet"+(left>1?"s":"")+"</b> pour recevoir un infuseur offert.":"<b>Infuseur offert</b> ajouté à ton panier."}
    $$("[data-g]",g).forEach(function(b){b.addEventListener("click",function(){n=Math.max(1,Math.min(8,n+ +b.dataset.g));draw()})});draw()});
  $$("[data-fbt]").forEach(function(f){function draw(){var t=0,n=0,li="";$$("input",f).forEach(function(i){i.closest(".item").classList.toggle("off",!i.checked);if(i.checked){t+=+i.dataset.p;n++;li+="<li>✓ "+i.dataset.n+" — "+euro(+i.dataset.p)+"</li>"}});$("[data-fbtlist]",f).innerHTML=li;var el=$("[data-fbttotal]",f);el.textContent=euro(t);bump(el);$("[data-fbtbtn]",f).textContent=n===3?"Ajouter les 3":n?"Ajouter la sélection ("+n+")":"Rien de choisi"}f.addEventListener("change",draw);draw()});
  $$("[data-ship]").forEach(function(s){var a=25.5;function draw(){$("[data-sn]",s).textContent=euro(a);$("[data-sbar]",s).style.width=Math.min(100,a/35*100)+"%";var left=35-a;s.classList.toggle("done",left<=0);$("[data-smsg]",s).textContent=left>0?"Plus que "+euro(left)+" pour la livraison offerte.":"Livraison offerte !"}
    $$("[data-s]",s).forEach(function(b){b.addEventListener("click",function(){a=Math.max(0,a+(+b.dataset.s)*8.5);draw()})});draw()});
  $$("[data-mini]").forEach(function(m){var buy=$("[data-mainbuy]",m),st=$("[data-sticky]",m);m.addEventListener("scroll",function(){st.classList.toggle("show",buy.getBoundingClientRect().bottom<m.getBoundingClientRect().top+10)})});
  $$("[data-reviews]").forEach(function(r){var tr=$(".rtrack",r),dots=$(".rdots",r),n=tr.children.length,cur=0,timer;for(var i=0;i<n;i++){(function(k){var d=document.createElement("button");d.type="button";d.setAttribute("aria-label","Avis "+(k+1));d.addEventListener("click",function(){go(k);restart()});dots.appendChild(d)})(i)}
    function go(k){cur=k;tr.style.transform="translateX(-"+k*100+"%)";$$("button",dots).forEach(function(d,j){d.setAttribute("aria-current",j===k?"true":"false")})}
    function restart(){clearInterval(timer);if(!reduce)timer=setInterval(function(){go((cur+1)%n)},5000)}go(0);restart()});

  // En-têtes : scène qui défile, tiroir, recherche, méga-menus, panier
  $$("[data-vp]").forEach(function(vp){var sc=$(".sc",vp);
    function onScroll(){var y=sc.scrollTop;$$("[data-solid]",vp).forEach(function(h){h.classList.toggle("solid",y>40)});$$("[data-tight]",vp).forEach(function(h){h.classList.toggle("tight",y>30)});$$("[data-small]",vp).forEach(function(h){h.classList.toggle("small",y>30)})}
    sc.addEventListener("scroll",onScroll,{passive:true});onScroll();
    var dr=$("[data-drawer]",vp);$$("[data-open]",vp).forEach(function(b){b.addEventListener("click",function(){dr.classList.add("open")})});$$("[data-close]",vp).forEach(function(b){b.addEventListener("click",function(){dr.classList.remove("open")})});
    var sb=$("[data-searchbox]",vp);$$("[data-search]",vp).forEach(function(b){b.addEventListener("click",function(){sb.classList.add("open");setTimeout(function(){$("input",sb).focus()},250)})});$$("[data-sclose]",vp).forEach(function(b){b.addEventListener("click",function(){sb.classList.remove("open")})});
    $$("[data-add]",vp).forEach(function(b){b.addEventListener("click",function(){$$("[data-cartn]",vp).forEach(function(n){n.textContent=+n.textContent+1;n.classList.remove("bump");void n.offsetWidth;n.classList.add("bump");setTimeout(function(){n.classList.remove("bump")},300)})})});
    var veil=$("[data-veil]",vp),timer;
    $$("[data-megabtn]",vp).forEach(function(b){var m=$('[data-mega="'+b.dataset.megabtn+'"]',vp);
      function open(){clearTimeout(timer);m.classList.add("open");veil&&veil.classList.add("on");b.setAttribute("aria-expanded","true")}
      function close(){timer=setTimeout(function(){m.classList.remove("open");veil&&veil.classList.remove("on");b.setAttribute("aria-expanded","false")},180)}
      b.addEventListener("mouseenter",open);b.addEventListener("mouseleave",close);m.addEventListener("mouseenter",open);m.addEventListener("mouseleave",close);
      b.addEventListener("click",function(){m.classList.contains("open")?(clearTimeout(timer),m.classList.remove("open"),veil&&veil.classList.remove("on"),b.setAttribute("aria-expanded","false")):open()});
      veil&&veil.addEventListener("click",function(){m.classList.remove("open");veil.classList.remove("on");b.setAttribute("aria-expanded","false")})});
    var cats=$("[data-cats]",vp);if(cats){var data={the:[["jasmin","Thé vert jasmin"],["agrumes","Thé noir aux agrumes"],["rooibos","Rooibos vanille"]],inf:[["verveine","Verveine-menthe"],["camomille","Camomille-tilleul"],["hibiscus","Hibiscus-fruits rouges"]],cof:[["trois-bols","Coffret découverte"],["bol","Coffret du soir"],["trio-tasses","Coffret des trois moments"]],acc:[["infuseur","Infuseur"],["sachet-ouvert","Sachet refermable"],["bureau","Kit du bureau"]]},prev=$("[data-prev]",vp);
      function show(k){prev.innerHTML=data[k].map(function(x){return '<a href="#" onclick="return false"><img src="photos/'+x[0]+'.jpg" alt="">'+x[1]+'</a>'}).join("");$$("button",cats).forEach(function(b){b.setAttribute("aria-current",b.dataset.cat===k?"true":"false")})}
      $$("button",cats).forEach(function(b){b.addEventListener("mouseenter",function(){show(b.dataset.cat)});b.addEventListener("click",function(){show(b.dataset.cat)})});show("the")}
  });
  // Vague du pied de page
  $$("[data-wave]").forEach(function(w){if(reduce)return;var t0=performance.now();(function f(t){var k=(t-t0)/1000,a=12*Math.sin(k*1.2),b=12*Math.cos(k*1.1);w.setAttribute("d","M0 30 C 200 "+(0+a)+", 400 "+(50-b)+", 600 25 S 1000 "+(0+b)+", 1200 28 V50 H0z");requestAnimationFrame(f)})(t0)});


  // Ouvertures : arrivée, diaporama, profondeur, agrandissement
  $$("[data-inview]").forEach(function(el){onShow(el,function(){el.classList.add("in")})});
  $$("[data-slider]").forEach(function(sl){var slides=$$(".slide",sl),cap=$("[data-cap]",sl),bars=$("[data-bars]",sl),cur=0,timer,
    texts=[["Pose ton écran.","Ces quelques minutes sont à toi.","Choisis ton mélange"],["Trois moments, trois tasses.","Le matin, l\'après-midi, le soir : un mélange pour chacun.","Voir les mélanges"],["La pause au bureau.","Un sachet, un infuseur, et ta journée respire.","Composer mon coffret"]];
    slides.forEach(function(_,i){var b=document.createElement("button");b.type="button";b.setAttribute("aria-label","Image "+(i+1));b.innerHTML="<i></i>";b.addEventListener("click",function(){go(i)});bars.appendChild(b)});
    function go(i){cur=(i+slides.length)%slides.length;slides.forEach(function(x,j){x.classList.toggle("on",j===cur)});cap.classList.add("swap");setTimeout(function(){var t=texts[cur];$("h3",cap).textContent=t[0];$("p",cap).textContent=t[1];$("a",cap).textContent=t[2];cap.classList.remove("swap")},350);
      $$("button",bars).forEach(function(b,j){b.classList.remove("run");b.classList.toggle("done",j<cur);void b.offsetWidth;if(j===cur&&!reduce)b.classList.add("run")});clearTimeout(timer);if(!reduce)timer=setTimeout(function(){go(cur+1)},6000)}
    $$("[data-sd]",sl).forEach(function(b){b.addEventListener("click",function(){go(cur+ +b.dataset.sd)})});
    var x0=null;sl.addEventListener("pointerdown",function(e){x0=e.clientX});sl.addEventListener("pointerup",function(e){if(x0!==null&&Math.abs(e.clientX-x0)>40)go(cur+(e.clientX<x0?1:-1));x0=null});go(0)});
  $$("[data-parallax]").forEach(function(ps){var items=$$("[data-depth]",ps);if(reduce)return;
    function place(x,y){items.forEach(function(it){var d=+it.dataset.depth;it.style.transform="translate("+(x*d)+"px,"+(y*d)+"px)"})}
    ps.addEventListener("pointermove",function(e){var r=ps.getBoundingClientRect();place((e.clientX-r.left)/r.width-.5,(e.clientY-r.top)/r.height-.5)});
    ps.addEventListener("pointerleave",function(){place(0,0)});
    var t0=performance.now();(function idle(t){if(!ps.matches(":hover")){var k=(t-t0)/1000;place(Math.sin(k*.7)*.25,Math.cos(k*.6)*.25)}requestAnimationFrame(idle)})(t0)});
  $$("[data-growsc]").forEach(function(sc){var g=$("[data-grow]",sc),intro=$(".intro",sc);function f(){var start=intro.offsetHeight*.4,range=g.offsetHeight*.9,v=Math.max(0,Math.min(1,(sc.scrollTop-start)/range));g.style.setProperty("--g",v.toFixed(3))}sc.addEventListener("scroll",f,{passive:true});f()});


  // Ouverture vidéo : pause, film en grand
  $$("[data-hv]").forEach(function(hv){var v=$("video",hv),pp=$("[data-pp]",hv),lb=$("[data-lb]",hv),big=$("video",lb);
    if(reduce){v.removeAttribute("autoplay");v.pause()}
    function label(){var paused=v.paused;pp.textContent=paused?"▶":"❚❚";pp.setAttribute("aria-label",paused?"Lire la vidéo":"Mettre la vidéo en pause")}
    pp.addEventListener("click",function(){v.paused?v.play():v.pause();label()});v.addEventListener("play",label);v.addEventListener("pause",label);label();
    $("[data-watch]",hv).addEventListener("click",function(){lb.classList.add("open");v.pause();big.currentTime=0;var pr=big.play();pr&&pr.catch(function(){})});
    $("[data-lbclose]",hv).addEventListener("click",function(){lb.classList.remove("open");big.pause();if(!reduce)v.play()})});


  // Pages boutique
  $$("[data-catalog]").forEach(function(c){var grid=$("[data-grid]",c),its=$$(".it",c),cat="all",sort="def";
    function draw(){var shown=its.filter(function(x){return cat==="all"||x.dataset.cat===cat});its.forEach(function(x){var on=shown.indexOf(x)>=0;if(!on){x.classList.add("out");setTimeout(function(){if(x.classList.contains("out"))x.hidden=true},300)}else{x.hidden=false;requestAnimationFrame(function(){x.classList.remove("out")})}});
      var o=shown.slice();if(sort==="asc")o.sort(function(a,b){return a.dataset.p-b.dataset.p});if(sort==="desc")o.sort(function(a,b){return b.dataset.p-a.dataset.p});if(sort==="az")o.sort(function(a,b){return a.dataset.n.localeCompare(b.dataset.n,"fr")});o.forEach(function(x){grid.appendChild(x)});
      $("[data-cnt]",c).textContent=shown.length+" mélange"+(shown.length>1?"s":"")}
    $$("[data-fcat]",c).forEach(function(b){b.addEventListener("click",function(){cat=b.dataset.fcat;$$("[data-fcat]",c).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});draw()})});
    $("[data-sort]",c).addEventListener("change",function(e){sort=e.target.value;draw()})});
  $$("[data-cartdemo]").forEach(function(vp){var dr=$("[data-cart]",vp),sh=$("[data-shade]",vp),lines=[["jasmin","Thé vert jasmin",8.5,2],["camomille","Camomille-tilleul",7.5,1]],up=false;
    function draw(){var h="",sub=0;lines.forEach(function(l,i){sub+=l[2]*l[3];h+='<div class="ln" style="animation-delay:'+(i*0.08)+'s"><img src="photos/'+l[0]+'.jpg" alt=""><div><b style="font-size:.92rem">'+l[1]+'</b><div class="muted">'+euro(l[2])+'</div></div><span class="stepper"><button type="button" data-li="'+i+'" data-d="-1" aria-label="Moins">−</button><span>'+l[3]+'</span><button type="button" data-li="'+i+'" data-d="1" aria-label="Plus">+</button></span></div>'});
      if(up)sub+=6;$("[data-lines]",vp).innerHTML=h+(up?'<div class="ln"><img src="photos/infuseur.jpg" alt=""><div><b style="font-size:.92rem">Infuseur inox</b><div class="muted">6,00 €</div></div><span class="muted">× 1</span></div>':"");
      var el=$("[data-csub]",vp);el.textContent=euro(sub);bump(el);$("[data-csbar]",vp).style.width=Math.min(100,sub/35*100)+"%";$("[data-csmsg]",vp).textContent=sub>=35?"Livraison offerte !":"Plus que "+euro(35-sub)+" pour la livraison offerte.";$("[data-up]",vp).hidden=up;
      $$("[data-li]",vp).forEach(function(b){b.addEventListener("click",function(){var l=lines[+b.dataset.li];l[3]=Math.max(0,l[3]+ +b.dataset.d);if(!l[3])lines.splice(+b.dataset.li,1);draw()})})}
    function open(){draw();dr.classList.add("open");sh.classList.add("on")}function close(){dr.classList.remove("open");sh.classList.remove("on")}
    $("[data-cartopen]",vp).addEventListener("click",open);$("[data-cartclose]",vp).addEventListener("click",close);sh.addEventListener("click",close);$("[data-upadd]",vp).addEventListener("click",function(){up=true;draw()})});
  $$("[data-tabs2]").forEach(function(t){var btns=$$("[data-tp]",t),ind=$(".ind",t);function sel(i){btns.forEach(function(b,j){b.setAttribute("aria-selected",j===i?"true":"false")});$$("[data-pn]",t).forEach(function(p,j){p.hidden=j!==i});var b=btns[i];ind.style.left=b.offsetLeft+"px";ind.style.width=b.offsetWidth+"px"}
    btns.forEach(function(b,i){b.addEventListener("click",function(){sel(i)})});sel(0);addEventListener("resize",function(){sel(btns.findIndex(function(b){return b.getAttribute("aria-selected")==="true"}))});t._re=function(){sel(btns.findIndex(function(b){return b.getAttribute("aria-selected")==="true"}))}});
  $$("[data-search2]").forEach(function(s){var q=$("[data-q2]",s),rs=$$(".r",s),none=$("[data-none]",s);
    function norm(x){return x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
    q.addEventListener("input",function(){var v=norm(q.value.trim()),n=0;rs.forEach(function(r){var name=r.dataset.sn,ok=!v||norm(name).indexOf(v)>=0;r.hidden=!ok;if(ok){n++;var i=norm(name).indexOf(v),lab=$("[data-label]",r);lab.innerHTML=v?name.slice(0,i)+"<mark>"+name.slice(i,i+v.length)+"</mark>"+name.slice(i+v.length):name;r.style.animation="none";void r.offsetWidth;r.style.animation=""}});none.hidden=n>0})});
  $$("[data-acct]").forEach(function(a){var mode="in";$$("[data-mode]",a).forEach(function(b,i){b.addEventListener("click",function(){mode=b.dataset.mode;$(".sw2 i",a).style.transform="translateX("+(i*100)+"%)";$$("[data-only]",a).forEach(function(x){x.hidden=x.dataset.only!==mode});$("[data-acsub]",a).textContent=mode==="in"?"Se connecter":"Créer mon compte";$("[data-acmsg]",a).textContent=""})});
    $("[data-eye]",a).addEventListener("click",function(){var p=$("#ac-p",a);p.type=p.type==="password"?"text":"password"});
    $("[data-acsub]",a).addEventListener("click",function(){$("[data-acmsg]",a).textContent="Démonstration : rien n'est envoyé."})});
  $$("[data-quiz]").forEach(function(q){var Q=[["À quel moment de la journée ?",[["Le matin","pour démarrer"],["L'après-midi","entre deux réunions"],["Le soir","pour ralentir"]]],["Tu préfères…",[["Un goût fleuri","délicat"],["Un goût fruité","acidulé"],["Un goût doux","rond"]]],["Avec ou sans théine ?",[["Avec","un vrai thé"],["Sans","une infusion"],["Peu importe","surprends-moi"]]]],ans=[],R={the:{k:"jasmin",n:"Thé vert jasmin",p:"8,50 €",t:"Fleuri et délicat, pour une pause qui réveille en douceur."},agr:{k:"agrumes",n:"Thé noir aux agrumes",p:"8,50 €",t:"Le thé du matin, vif et parfumé."},soir:{k:"camomille",n:"Camomille-tilleul",p:"7,50 €",t:"Ronde et douce, pour fermer la journée."},fruit:{k:"hibiscus",n:"Hibiscus-fruits rouges",p:"7,50 €",t:"Acidulé, sans théine, à toute heure."}};
    function pick(){if(ans[2]===1)return ans[1]===1?R.fruit:R.soir;if(ans[0]===0)return R.agr;if(ans[0]===2)return R.soir;return ans[1]===1?R.fruit:R.the}
    function draw(){var i=ans.length,body=$("[data-qbody]",q);$("[data-qbar]",q).style.width=(i/3*100)+"%";
      if(i<3){$("[data-qstep]",q).textContent="Question "+(i+1)+" sur 3";body.innerHTML='<h3>'+Q[i][0]+'</h3><div class="opts">'+Q[i][1].map(function(o,j){return '<button type="button" data-a="'+j+'" style="animation-delay:'+(j*0.07)+'s">'+o[0]+'<small>'+o[1]+'</small></button>'}).join("")+'</div>';$$("[data-a]",body).forEach(function(b){b.addEventListener("click",function(){ans.push(+b.dataset.a);draw()})})}
      else{var r=pick();$("[data-qstep]",q).textContent="Ton mélange";body.innerHTML='<div class="result"><img src="photos/'+r.k+'.jpg" alt=""><div style="display:grid;gap:10px"><h3 style="margin:0">'+r.n+'</h3><p style="margin:0;opacity:.85">'+r.t+'</p><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><b style="font:600 1.4rem var(--f-title);color:var(--b-gold)">'+r.p+'</b><a class="btn live" href="#" onclick="return false">Ajouter au panier</a></div></div></div>'}}
    $("[data-qreset]",q).addEventListener("click",function(){ans=[];draw()});draw()});


  // Contenu et marque
  $$("[data-tline] li").forEach(function(li,i){onShow(li,function(){setTimeout(function(){li.classList.add("in")},i*120)})});
  $$("[data-journal]").forEach(function(j){$$("[data-jt]",j).forEach(function(b){b.addEventListener("click",function(){$$("[data-jt]",j).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});$$(".a",j).forEach(function(a){a.hidden=!(b.dataset.jt==="all"||a.dataset.tag===b.dataset.jt);a.style.animation="none";void a.offsetWidth;a.style.animation=""})})})});
  $$("[data-art]").forEach(function(a){var sc=$(".sc",a),p=$("[data-aprog]",a),links=$$("[data-to]",a);function f(){var max=sc.scrollHeight-sc.clientHeight;p.style.width=(max>0?sc.scrollTop/max*100:0)+"%";var cur=null;links.forEach(function(l){var h=$("#"+l.dataset.to,a);if(h&&h.getBoundingClientRect().top-sc.getBoundingClientRect().top<140)cur=l});links.forEach(function(l){l.classList.toggle("on",l===cur)})}
    sc.addEventListener("scroll",f,{passive:true});links.forEach(function(l){l.addEventListener("click",function(){var h=$("#"+l.dataset.to,a);sc.scrollTo({top:h.offsetTop-20,behavior:reduce?"auto":"smooth"})})});f()});
  $$("[data-quote]").forEach(function(q){var ws=$$("blockquote span",q);onShow(q,function(){ws.forEach(function(w,i){setTimeout(function(){w.classList.add("lit")},reduce?0:i*110)})})});
  $$("[data-gallery2]").forEach(function(g){var v=$("[data-viewer]",g),img=$("[data-vimg]",v),btns=$$("[data-gi]",g),cur=0;function show(i){cur=(i+btns.length)%btns.length;img.src=$("img",btns[cur]).getAttribute("src");img.style.animation="none";void img.offsetWidth;img.style.animation="";$("[data-vc]",v).textContent=(cur+1)+" / "+btns.length}
    btns.forEach(function(b,i){b.addEventListener("click",function(){show(i);v.classList.add("open")})});$$("[data-vpv]",v).forEach(function(b){b.addEventListener("click",function(){show(cur+ +b.dataset.vpv)})});$("[data-vx]",v).addEventListener("click",function(){v.classList.remove("open")});
    v.addEventListener("keydown",function(e){if(e.key==="ArrowRight")show(cur+1);if(e.key==="ArrowLeft")show(cur-1);if(e.key==="Escape")v.classList.remove("open")})});
  $$("[data-contact]").forEach(function(f){f.addEventListener("submit",function(){f.classList.add("done");setTimeout(function(){f.classList.remove("done")},4000)})});
  $$("[data-faq2]").forEach(function(f){var q=$("[data-fq]",f),k="all";function norm(x){return x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
    function draw(){var v=norm(q.value.trim()),n=0;$$("details",f).forEach(function(d){var ok=(k==="all"||d.dataset.ft===k)&&(!v||norm(d.textContent).indexOf(v)>=0);d.hidden=!ok;if(ok)n++});$("[data-fnone]",f).hidden=n>0}
    q.addEventListener("input",draw);$$("[data-fk]",f).forEach(function(b){b.addEventListener("click",function(){k=b.dataset.fk;$$("[data-fk]",f).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});draw()})})});
  $$("[data-popdemo]").forEach(function(d){var p=$("[data-pop]",d);onShow(d,function(){setTimeout(function(){p.classList.add("open")},1200)});$("[data-popopen]",d).addEventListener("click",function(){p.classList.add("open")});$$("[data-popclose]",d).forEach(function(b){b.addEventListener("click",function(){p.classList.remove("open")})})});
  $$("[data-press]").forEach(function(p){var f=$(".pqf",p),q=$("[data-pq]",p),src=$("[data-pqs]",p),d=$("[data-pqdots]",p),n=6,i=0,t;d.innerHTML=Array(n+1).join("<i></i>");var dots=$$("i",d);function show(k){i=(k+n)%n;q.textContent="[Citation réelle du média n° "+(i+1)+"]";src.textContent="[Nom du média "+(i+1)+"]";f.classList.remove("sw");void f.offsetWidth;f.classList.add("sw");dots.forEach(function(x,j){x.classList.toggle("on",j===i)})}function auto(){clearInterval(t);t=setInterval(function(){show(i+1)},4500)}$$("[data-pqd]",p).forEach(function(b){b.addEventListener("click",function(){show(i+ +b.dataset.pqd);auto()})});dots.forEach(function(x,j){x.addEventListener("click",function(){show(j);auto()})});show(0);auto()});


  // Services
  $$("[data-prc]").forEach(function(p){var P=[["[prix]","sur devis","[prix]"],["[prix HT]","sur devis","[prix HT]"]];$$("[data-aud]",p).forEach(function(b,i){b.addEventListener("click",function(){$$("[data-aud]",p).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});$(".tg i",p).style.transform="translateX("+(i*100)+"%)";["a","b","c"].forEach(function(k,j){var el=$('[data-pr="'+k+'"]',p);el.textContent=P[i][j];bump(el)})})})});
  $$("[data-bk]").forEach(function(bk){var st={svc:null,day:null,time:null},body=$("[data-bbody]",bk),days=["lun.","mar.","mer.","jeu.","ven.","sam.","dim."];
    function steps(n){$$("[data-bs]",bk).forEach(function(s,i){s.classList.toggle("on",i<=n)})}
    function s0(){steps(0);body.innerHTML='<div class="opts2">'+[["Diagnostic","1 h · [prix]"],["Dépannage","selon besoin"],["Visite de devis","45 min · gratuit"]].map(function(o,i){return '<button class="opt" type="button" data-o="'+i+'" style="animation:fadein .35s '+(i*0.06)+'s both">'+o[0]+'<small>'+o[1]+'</small></button>'}).join("")+'</div>';$$("[data-o]",body).forEach(function(b){b.addEventListener("click",function(){st.svc=b.firstChild.textContent;s1()})})}
    function s1(){steps(1);var h='<div class="days">';for(var i=0;i<7;i++){h+='<button class="day" type="button" data-d="'+i+'"'+(i>=5?" disabled":"")+'>'+days[i]+'<small>'+(10+i)+'</small></button>'}h+='</div><div class="slots2" data-slots></div><button class="btn ghost" type="button" data-back style="justify-self:start">← Changer de prestation</button>';body.innerHTML=h;
      $$(".day",body).forEach(function(d){d.addEventListener("click",function(){$$(".day",body).forEach(function(x){x.setAttribute("aria-pressed",x===d?"true":"false")});st.day=days[+d.dataset.d]+" "+(10+ +d.dataset.d);$("[data-slots]",body).innerHTML=["9:00","10:30","14:00","15:30","17:00"].map(function(t,i){return '<button type="button" data-t="'+t+'" style="animation-delay:'+(i*0.05)+'s">'+t+'</button>'}).join("");$$("[data-t]",body).forEach(function(t){t.addEventListener("click",function(){st.time=t.dataset.t;s2()})})})});$("[data-back]",body).addEventListener("click",s0)}
    function s2(){steps(2);body.innerHTML='<div class="done2"><svg width="64" height="64" viewBox="0 0 56 56" fill="none" stroke="#3F6B4E" stroke-width="2.5" aria-hidden="true"><circle cx="28" cy="28" r="26"/><path d="M17 29l7 7 15-16" stroke-linecap="round"/></svg><b style="font:500 1.5rem var(--f-title)">'+st.svc+' · '+st.day+' à '+st.time+'</b><span class="muted">Démonstration : aucun rendez-vous réel n\'est pris.</span><button class="btn" type="button" data-again>Recommencer</button></div>';$("[data-again]",body).addEventListener("click",s0)}
    s0()});
  $$("[data-pf]").forEach(function(p){$$("[data-wf]",p).forEach(function(b){b.addEventListener("click",function(){$$("[data-wf]",p).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});$$(".w2",p).forEach(function(w){w.hidden=!(b.dataset.wf==="all"||w.dataset.wt===b.dataset.wf);w.style.animation="none";void w.offsetWidth;w.style.animation=""})})})});
  $$("[data-cs]").forEach(function(c){var ap=$("[data-ap]",c);$$("[data-ba2]",c).forEach(function(b){b.addEventListener("click",function(){$$("[data-ba2]",c).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});ap.classList.toggle("hide",b.dataset.ba2==="0")})})});
  $$("[data-dv]").forEach(function(dv){var s=0,d={type:null,size:50,delay:"Dans le mois"},body=$("[data-dvbody]",dv);
    function draw(){$("[data-dvbar]",dv).style.width=((s+1)/4*100)+"%";var h="";
      if(s===0)h='<div class="st"><b>Quel type de travaux ?</b><div class="choice">'+[["⚡","Rénovation"],["🔧","Dépannage"],["💡","Éclairage"],["🏠","Neuf"]].map(function(o){return '<button type="button" aria-pressed="'+(d.type===o[1])+'" data-ty="'+o[1]+'"><span style="font-size:1.4rem">'+o[0]+'</span>'+o[1]+'</button>'}).join("")+'</div></div>';
      if(s===1)h='<div class="st"><div class="rng"><b>Surface concernée : <span data-sz>'+d.size+'</span> m²</b><input type="range" min="10" max="200" step="5" value="'+d.size+'" aria-label="Surface en mètres carrés" data-szr></div><b>Délai souhaité</b><div class="choice">'+["Urgent","Dans le mois","Dans 3 mois","Pas pressé"].map(function(o){return '<button type="button" aria-pressed="'+(d.delay===o)+'" data-dl="'+o+'">'+o+'</button>'}).join("")+'</div></div>';
      if(s===2)h='<div class="st"><div class="fl2"><input id="dv-n" placeholder=" "><label for="dv-n">Ton nom</label></div><div class="fl2"><input id="dv-e" type="email" placeholder=" "><label for="dv-e">Ton e-mail</label></div><div class="fl2"><input id="dv-v" placeholder=" "><label for="dv-v">Ta commune</label></div></div>';
      if(s===3)h='<div class="st"><b style="font:500 1.5rem var(--f-title)">Récapitulatif</b><div class="rec2"><span>Travaux : <b>'+(d.type||"—")+'</b></span><span>Surface : <b>'+d.size+' m²</b></span><span>Délai : <b>'+d.delay+'</b></span></div><span class="muted" style="color:#fff">Démonstration : la demande n\'est pas envoyée. Sur le vrai site, l\'entreprise la reçoit par e-mail.</span></div>';
      h+='<div class="nav3">'+(s>0?'<button class="btn ghost" type="button" data-prev>← Retour</button>':'<span></span>')+(s<3?'<button class="btn live" type="button" data-next'+(s===0&&!d.type?" disabled":"")+'>Continuer →</button>':'<button class="btn" type="button" data-restart>Recommencer</button>')+'</div>';body.innerHTML=h;
      $$("[data-ty]",body).forEach(function(b){b.addEventListener("click",function(){d.type=b.dataset.ty;draw()})});$$("[data-dl]",body).forEach(function(b){b.addEventListener("click",function(){d.delay=b.dataset.dl;draw()})});
      var r=$("[data-szr]",body);r&&r.addEventListener("input",function(){d.size=+r.value;$("[data-sz]",body).textContent=d.size});
      var n=$("[data-next]",body);n&&n.addEventListener("click",function(){s++;draw()});var p=$("[data-prev]",body);p&&p.addEventListener("click",function(){s--;draw()});var rs=$("[data-restart]",body);rs&&rs.addEventListener("click",function(){s=0;d.type=null;draw()})}
    draw()});
  $$("[data-zone]").forEach(function(z){var nz=function(t){return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[\s'’-]+/g," ").trim()};var towns=$$(".towns span",z).map(function(x){return nz(x.textContent)});function check(){var v=nz($("[data-zin]",z).value),a=$("[data-zans]",z);if(!v){a.textContent="";return}var ok=towns.indexOf(v)>=0;a.textContent=ok?"Oui, nous intervenons dans ta commune.":"Ta commune n'est pas dans la liste : appelle-nous, on regarde ensemble.";a.style.color=ok?"var(--b-primary)":"#9a6b12";a.style.animation="none";void a.offsetWidth;a.style.animation=""}
    $("[data-zbtn]",z).addEventListener("click",check);$("[data-zin]",z).addEventListener("keydown",function(e){if(e.key==="Enter")check()})});
  $$("[data-proc]").forEach(function(p){onShow(p,function(){p.classList.add("in")})});


  // Immobilier, restaurant, beauté
  $$("[data-re]").forEach(function(r){var tx="achat",ty="all",hs=$$(".h",r),bdr=$("[data-bdr]",r);function lim(){bdr.min=tx==="achat"?100000:400;bdr.max=tx==="achat"?600000:2000;bdr.step=tx==="achat"?10000:50;bdr.value=bdr.max}
    function fm(v){return Number(v).toLocaleString("fr-FR")+" €"+(tx==="location"?"/mois":"")}
    function draw(){var n=0,max=+bdr.value;$("[data-bud]",r).textContent=fm(max);hs.forEach(function(h){var ok=h.dataset.tx===tx&&(ty==="all"||h.dataset.ty===ty)&&+h.dataset.pr<=max;h.hidden=!ok;if(ok){n++;h.style.animation="none";void h.offsetWidth;h.style.animation=""}});$("[data-recnt]",r).textContent=n+" bien"+(n>1?"s":"")}
    $$("[data-tx2]",r).forEach(function(b,i){b.addEventListener("click",function(){tx=b.dataset.tx2;$$("[data-tx2]",r).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});$(".bt2 i",r).style.transform="translateX("+(i*100)+"%)";lim();draw()})});
    $("[data-ty2]",r).addEventListener("change",function(e){ty=e.target.value;draw()});bdr.addEventListener("input",draw);lim();draw()});
  $$("[data-loan]").forEach(function(l){function v(k){return +$('[data-l="'+k+'"]',l).value}
    function draw(){var p=v("p"),a=Math.min(v("a"),p),d=v("d"),t=v("t"),C=p-a,r=t/100/12,n=d*12,m=r?C*r/(1-Math.pow(1+r,-n)):C/n,tot=m*n,int=tot-C;
      $('[data-lv="p"]',l).textContent=p.toLocaleString("fr-FR")+" €";$('[data-lv="a"]',l).textContent=a.toLocaleString("fr-FR")+" €";$('[data-lv="d"]',l).textContent=d+" ans";$('[data-lv="t"]',l).textContent=t.toFixed(2).replace(".",",")+" %";
      var el=$("[data-lm]",l);el.textContent=Math.round(m).toLocaleString("fr-FR")+" €";$("[data-li]",l).textContent=Math.round(int).toLocaleString("fr-FR")+" €";var share=tot?C/tot*100:0;$("[data-ld]",l).setAttribute("stroke-dasharray",share.toFixed(1)+" "+(100-share).toFixed(1))}
    $$("[data-l]",l).forEach(function(i){i.addEventListener("input",draw)});draw()});
  $$("[data-est]").forEach(function(e){$$("[data-et]",e).forEach(function(b){b.addEventListener("click",function(){$$("[data-et]",e).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")})})});var r=$("[data-esr]",e);r.addEventListener("input",function(){$("[data-es]",e).textContent=r.value+" m²"});
    $("[data-eok]",e).addEventListener("click",function(){var t=$('[data-et][aria-pressed="true"]',e).dataset.et,m=$("[data-emsg]",e);m.textContent="Démonstration : la demande ("+t+", "+r.value+" m²) n'est pas envoyée. Sur le vrai site, l'agence te rappelle.";m.style.animation="none";void m.offsetWidth;m.style.animation="fadein .4s both"})});
  $$("[data-menu]").forEach(function(m){var data=JSON.parse(m.getAttribute("data-menu")),btns=$$("[data-mt]",m),ind=$(".tl i",m),ul=$("[data-ml]",m),pv=$("[data-mp]",m);
    function sel(i){btns.forEach(function(b,j){b.setAttribute("aria-selected",j===i?"true":"false")});ind.style.left=btns[i].offsetLeft+"px";ind.style.width=btns[i].offsetWidth+"px";var list=data[btns[i].dataset.mt];ul.innerHTML=list.map(function(d,j){return '<li data-img="'+d[0]+'" style="animation-delay:'+(j*0.06)+'s"><b>'+d[1]+(d[3]?'<span class="tagv">'+d[3]+'</span>':"")+'</b><span>'+d[2]+'</span><span class="dots2">[À compléter : description du plat]</span></li>'}).join("");pv.src="photos/"+list[0][0]+".jpg";
      $$("li",ul).forEach(function(li){li.addEventListener("mouseenter",function(){pv.style.opacity=0;setTimeout(function(){pv.src="photos/"+li.dataset.img+".jpg";pv.style.opacity=1},200)})})}
    btns.forEach(function(b,i){b.addEventListener("click",function(){sel(i)})});sel(0)});
  $$("[data-tbl]").forEach(function(t){var n=2,svc="midi",d=$("[data-tbd]",t);var today=new Date();d.value=today.toISOString().slice(0,10);
    function times(){var arr=svc==="midi"?["12:00","12:30","13:00","13:30"]:["19:00","19:30","20:00","20:30","21:00"];$("[data-tt]",t).innerHTML=arr.map(function(x,i){return '<button type="button" aria-pressed="false" data-th="'+x+'" style="animation-delay:'+(i*0.05)+'s">'+x+'</button>'}).join("");$("[data-tok]",t).textContent="";
      $$("[data-th]",t).forEach(function(b){b.addEventListener("click",function(){$$("[data-th]",t).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});$("[data-tok]",t).textContent="Démonstration : table pour "+n+" le "+new Date(d.value).toLocaleDateString("fr-FR")+" à "+b.dataset.th+" (non réservée)."})})}
    $$("[data-tc]",t).forEach(function(b){b.addEventListener("click",function(){n=Math.max(1,Math.min(12,n+ +b.dataset.tc));$("[data-tcn]",t).textContent=n})});
    $$("[data-ts]",t).forEach(function(b,i){b.addEventListener("click",function(){svc=b.dataset.ts;$$("[data-ts]",t).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});$(".svc2 i",t).style.transform="translateX("+(i*100)+"%)";times()})});times()});
  $$("[data-hrs]").forEach(function(h){var H=[["Lundi",null],["Mardi",[12,14.5,19,22.5]],["Mercredi",[12,14.5,19,22.5]],["Jeudi",[12,14.5,19,22.5]],["Vendredi",[12,14.5,19,23]],["Samedi",[12,15,19,23]],["Dimanche",[12,15]]];
    function f(x){var hh=Math.floor(x),mm=Math.round((x-hh)*60);return hh+" h"+(mm?String(mm).padStart(2,"0"):"")}
    var now=new Date(),di=(now.getDay()+6)%7,cur=now.getHours()+now.getMinutes()/60,open=false;
    $("[data-ht]",h).innerHTML=H.map(function(r,i){var s=r[1]?(f(r[1][0])+" – "+f(r[1][1])+(r[1][2]?" · "+f(r[1][2])+" – "+f(r[1][3]):"")):"Fermé";if(i===di&&r[1]){for(var k=0;k<r[1].length;k+=2)if(cur>=r[1][k]&&cur<r[1][k+1])open=true}return '<tr'+(i===di?' class="td"':"")+'><td>'+(i===di?"<b>"+r[0]+"</b>":r[0])+'</td><td>'+(i===di?"<b>"+s+"</b>":s)+'</td></tr>'}).join("");
    var b=$("[data-now]",h);b.classList.add(open?"open":"closed");$("span",b).textContent=open?"Ouvert maintenant":"Fermé pour le moment"});
  $$("[data-care]").forEach(function(c){var picked=[];function mins(d){var m=d.match(/(\d+) h(?: (\d+))?|(\d+) min/);if(!m)return 0;return m[3]?+m[3]:(+m[1])*60+(+(m[2]||0))}
    function draw(){var ul=$("[data-cb]",c);ul.innerHTML=picked.length?picked.map(function(p){return "<li>✓ "+p.n+" · "+p.d+"</li>"}).join(""):'<li class="muted" style="color:#fff">Ajoute une prestation.</li>';var t=picked.reduce(function(a,p){return a+mins(p.d)},0);var el=$("[data-cd2]",c);el.textContent=(t>=60?Math.floor(t/60)+" h "+(t%60?String(t%60).padStart(2,"0"):""):t+" min").trim();bump(el)}
    $$(".sv3",c).forEach(function(s){var b=$("button",s);b.addEventListener("click",function(){var n=s.dataset.cn,i=picked.findIndex(function(p){return p.n===n});if(i>=0)picked.splice(i,1);else picked.push({n:n,d:$(".du",s).textContent.split(" · ")[0]});b.setAttribute("aria-pressed",i<0?"true":"false");draw()})});
    $$("[data-ck]",c).forEach(function(b){b.addEventListener("click",function(){$$("[data-ck]",c).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});$$(".sv3",c).forEach(function(s){s.hidden=!(b.dataset.ck==="all"||s.dataset.cc===b.dataset.ck);s.style.animation="none";void s.offsetWidth;s.style.animation=""})})});draw()});
  $$("[data-sess]").forEach(function(s){var D=[[["Durée","1 h"],["Lieu","[Adresse du cabinet]"],["Tarif","[prix]"],["Accès","[À compléter]"]],[["Durée","1 h"],["Lieu","En visio, depuis chez toi"],["Tarif","[prix]"],["Matériel","Un ordinateur ou un téléphone"]]];
    function sel(i){$(".md i",s).style.transform="translateX("+(i*100)+"%)";$("[data-s2]",s).classList.toggle("hide",i===0);$("[data-s1]",s).classList.toggle("hide",i===1);var det=$("[data-sdet]",s);det.innerHTML=D[i].map(function(x){return "<div><span>"+x[0]+"</span><b>"+x[1]+"</b></div>"}).join("");det.style.animation="none";void det.offsetWidth;det.style.animation=""}
    $$("[data-sm]",s).forEach(function(b,i){b.addEventListener("click",function(){sel(i)})});sel(0)});
  $$("[data-gift2]").forEach(function(g){var card=$("[data-gcard]",g),msg=$("[data-gm]",g);function draw(){$("[data-gb]",g).textContent="« "+msg.value+" »"}
    $$("[data-ga]",g).forEach(function(b){b.addEventListener("click",function(){$$("[data-ga]",g).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});var v=$("[data-gv]",g);v.textContent=b.dataset.ga+" €";bump(v);card.classList.remove("flip");$("[data-gflip]",g).textContent="Voir le verso"})});
    msg.addEventListener("input",function(){draw();card.classList.add("flip");$("[data-gflip]",g).textContent="Voir le recto"});
    $("[data-gflip]",g).addEventListener("click",function(){card.classList.toggle("flip");this.textContent=card.classList.contains("flip")?"Voir le recto":"Voir le verso"});draw()});

  $$("[data-marquee]").forEach(function(t){t.addEventListener("mouseenter",function(){t.style.animationPlayState="paused"});t.addEventListener("mouseleave",function(){t.style.animationPlayState="running"})});
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function eur(v){return v.toFixed(2).replace(".",",")+" €"}
  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Comptes à rebours (date d'exemple : dans 3 j 5 h 20 min)
  var end=Date.now()+((3*24+5)*60+20)*60000;
  var units=[["d","J"],["h","H"],["m","MIN"],["s","S"]];
  qa("[data-xt]").forEach(function(t){
    var inXp=!!t.closest(".xp"),lab=inXp?["Jours","Heures","Min","Sec"]:["Jours","Heures","Min","Sec"];
    t.innerHTML=units.map(function(u,i){return (i?"<i>:</i>":"")+'<span class="u"><b data-u="'+u[0]+'">00</b><small>'+lab[i]+'</small></span>'}).join("");
  });
  function tick(){
    var r=Math.max(0,end-Date.now()),v={d:Math.floor(r/864e5),h:Math.floor(r/36e5)%24,m:Math.floor(r/6e4)%60,s:Math.floor(r/1e3)%60};
    qa("[data-xt] b").forEach(function(b){var n=String(v[b.dataset.u]).padStart(2,"0");if(b.textContent!==n){b.textContent=n;if(!reduce){b.classList.remove("tick");void b.offsetWidth;b.classList.add("tick")}}});
    if(r===0)qa("[data-xb]").forEach(function(b){b.classList.add("gone")});
  }
  tick();setInterval(tick,1000);
  qa("[data-xb] .x").forEach(function(x){x.addEventListener("click",function(){var b=x.closest("[data-xb]");b.classList.add("gone");setTimeout(function(){b.classList.remove("gone")},2500)})});
  // Titre mot par mot
  qa("[data-xwords]").forEach(function(h){
    var i=0;function wrap(node){Array.prototype.slice.call(node.childNodes).forEach(function(c){
      if(c.nodeType===3){var f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(function(w){if(!w)return;if(/^\s+$/.test(w)){f.appendChild(document.createTextNode(w));return}var s=document.createElement("span");s.className="xw";s.style.animationDelay=(0.15+i++*0.09)+"s";s.textContent=w;f.appendChild(s)});node.replaceChild(f,c)}
      else wrap(c)})}
    wrap(h);
  });
  // Produit vedette
  qa("[data-xp]").forEach(function(p){
    var main=q("[data-xmain]",p),imgs=qa("img",main),th=q("[data-xth]",p),cur=0,price=8.5,mult=1,qty=1;
    imgs.forEach(function(im,i){var b=document.createElement("button");b.type="button";b.setAttribute("aria-label","Photo "+(i+1));b.innerHTML='<img src="'+im.getAttribute("src")+'" alt="">';b.addEventListener("click",function(){show(i)});th.insertBefore(b,q(".ar",th))});
    function show(i){cur=(i+imgs.length)%imgs.length;imgs.forEach(function(im,k){im.classList.toggle("on",k===cur)});qa("button[aria-label^='Photo ']",th).forEach(function(b,k){b.setAttribute("aria-current",k===cur?"true":"false")})}
    show(0);
    qa("[data-xa]",p).forEach(function(b){b.addEventListener("click",function(){show(cur+ +b.dataset.xa)})});
    var sx=null;main.addEventListener("touchstart",function(e){sx=e.touches[0].clientX},{passive:true});main.addEventListener("touchend",function(e){if(sx===null)return;var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>40)show(cur+(d<0?1:-1));sx=null});
    function upd(){if(p._po)p._po.setBase(price,q("h3",p).textContent.replace(/\.\s*$/,"").trim())}
    qa("[data-xflavs] button",p).forEach(function(b){b.addEventListener("click",function(){
      qa("[data-xflavs] button",p).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});
      price=+b.dataset.p;q("[data-xflav]",p).textContent=b.dataset.n;
      var t=b.dataset.t.split("|");q(".xp h3",p).firstChild.textContent=t[0]+" ";q("[data-xname]",p).innerHTML=t[1]+"<i>.</i>";
      imgs[1].src=b.dataset.img;imgs[1].alt=b.dataset.n;var tb=qa("button[aria-label^='Photo ']",th)[1];if(tb)q("img",tb).src=b.dataset.img;show(1);upd()})});
    upd();
  });
  // Collection en vedette : carrousel 3D
  qa("[data-xc]").forEach(function(c){
    var st=q("[data-xcs]",c),its=qa(".it",st),cur=0,timer=null;
    function place(){
      var w=st.clientWidth,step=Math.min(230,w*0.42);
      its.forEach(function(it,i){
        var d=i-cur,n=its.length;if(d>n/2)d-=n;if(d<-n/2)d+=n;var a=Math.abs(d);
        it.classList.toggle("c",d===0);
        it.style.transform="translateX("+(d*step)+"px) scale("+(d===0?1:(a===1?.84:.7))+") rotateY("+(d*-8)+"deg)";
        it.style.opacity=a>2?0:(a===0?1:(a===1?.55:.25));it.style.zIndex=10-a;it.style.filter=a?"saturate(.7)":"none";it.style.pointerEvents=a>2?"none":"auto";
      });
    }
    function go(k){cur=(cur+k+its.length)%its.length;place()}
    its.forEach(function(it,i){it.addEventListener("click",function(e){if(i!==cur){e.preventDefault();var d=i-cur,n=its.length;if(d>n/2)d-=n;if(d<-n/2)d+=n;go(d)}})});
    qa("[data-xcd]",c).forEach(function(b){b.addEventListener("click",function(){go(+b.dataset.xcd)})});
    var sx=null;st.addEventListener("touchstart",function(e){sx=e.touches[0].clientX},{passive:true});st.addEventListener("touchend",function(e){if(sx===null)return;var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>40)go(d<0?1:-1);sx=null});
    function auto(){if(reduce)return;clearInterval(timer);timer=setInterval(function(){go(1)},3800)}
    c.addEventListener("mouseenter",function(){clearInterval(timer)});c.addEventListener("mouseleave",auto);
    place();auto();
    if(window.ResizeObserver)new ResizeObserver(place).observe(st);
  });
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Apparition au défilement
  var io=window.IntersectionObserver?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("zin");io.unobserve(e.target)}})},{threshold:.2}):null;
  qa("[data-zsec] [data-zr]").forEach(function(el,i){el.style.transitionDelay=((i%7)*0.08)+"s"});
  qa("[data-zr],.zc,.zf").forEach(function(el){if(io&&!reduce)io.observe(el);else el.classList.add("zin")});
  // Comparatif : halo sur la colonne de la marque
  qa("[data-zcmp]").forEach(function(s){var w=q(".zc-wrap",s),h=q("thead .us",s);function pos(){var a=w.getBoundingClientRect(),b=h.getBoundingClientRect();w.style.setProperty("--usx",(b.left-a.left)+"px");w.style.setProperty("--usw",b.width+"px")}pos();if(window.ResizeObserver)new ResizeObserver(pos).observe(w)});
  // Points forts : profondeur de la photo
  qa("[data-zpar]").forEach(function(img){if(reduce)return;function f(){var r=img.parentNode.getBoundingClientRect(),vh=window.innerHeight;var p=(r.top+r.height/2-vh/2)/vh;img.style.transform="translateY("+(-6-p*8)+"%)"}window.addEventListener("scroll",f,{passive:true});f()});
  // Défilements horizontaux (collection, cartes familles)
  function slider(tr,btns,counter){
    var items=qa(":scope > *",tr);
    function step(){var a=items[0],b=items[1];return b?b.offsetLeft-a.offsetLeft:tr.clientWidth}
    btns.forEach(function(b){b.addEventListener("click",function(){tr.scrollBy({left:(+b.dataset.d)*step(),behavior:"smooth"})})});
    if(counter){function c(){var i=Math.round(tr.scrollLeft/step());var last=tr.scrollLeft+tr.clientWidth>=tr.scrollWidth-4;counter.textContent=(last?items.length:Math.min(items.length,i+1))+" / "+items.length}tr.addEventListener("scroll",c,{passive:true});c()}
  }
  qa("[data-zg]").forEach(function(s){var b=qa("[data-zgd]",s);b.forEach(function(x){x.dataset.d=x.dataset.zgd});slider(q("[data-zgt]",s),b)});
  qa("[data-zk]").forEach(function(s){var b=qa("[data-zkd]",s);b.forEach(function(x){x.dataset.d=x.dataset.zkd});slider(q("[data-zkt]",s),b,q("[data-zkc]",s))});
  // Éventail
  qa("[data-ze]").forEach(function(s){
    var st=q("[data-zest]",s),its=qa(".ze-it",st),cur=0,t=null;
    function place(){var n=its.length,w=st.clientWidth,sp=Math.min(150,w*0.2);
      its.forEach(function(it,i){var d=i-cur;if(d>n/2)d-=n;if(d<-n/2)d+=n;var a=Math.abs(d);
        it.style.transform="translateX("+(d*sp)+"px) rotate("+(d*9)+"deg) scale("+(a===0?1:a===1?.86:.74)+")";
        it.style.zIndex=10-a;it.style.opacity=a>2?0:1;it.style.filter=a?"brightness(.82)":"none";it.style.pointerEvents=a>2?"none":"auto"})}
    function go(k){cur=(cur+k+its.length)%its.length;place()}
    its.forEach(function(it,i){it.addEventListener("click",function(){var d=i-cur,n=its.length;if(d>n/2)d-=n;if(d<-n/2)d+=n;if(d)go(d)})});
    qa("[data-zed]",s).forEach(function(b){b.addEventListener("click",function(){go(+b.dataset.zed)})});
    var sx=null;st.addEventListener("touchstart",function(e){sx=e.touches[0].clientX},{passive:true});st.addEventListener("touchend",function(e){if(sx===null)return;var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>40)go(d<0?1:-1);sx=null});
    function auto(){if(reduce)return;clearInterval(t);t=setInterval(function(){go(1)},3600)}
    s.addEventListener("mouseenter",function(){clearInterval(t)});s.addEventListener("mouseleave",auto);
    place();auto();if(window.ResizeObserver)new ResizeObserver(place).observe(st);
  });
  // Livraison estimée : 2 à 3 jours ouvrés après l'envoi (envoi le jour même avant 14 h)
  qa("[data-zl]").forEach(function(s){
    var J=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."],M=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
    function addBiz(d,n){d=new Date(d);while(n>0){d.setDate(d.getDate()+1);if(d.getDay()!==0&&d.getDay()!==6)n--}return d}
    var now=new Date(),ship=new Date(now);if(now.getHours()>=14||now.getDay()===0||now.getDay()===6){ship=addBiz(now,1)}
    var a=addBiz(ship,2),b=addBiz(ship,3);
    function f(d){return J[d.getDay()]+" "+d.getDate()+" "+M[d.getMonth()]}
    q('[data-zld="a"]',s).textContent=f(a);q('[data-zld="b"]',s).textContent=f(b);
    qa("[data-zlr]",s).forEach(function(e){e.textContent=a.getDate()+(a.getMonth()===b.getMonth()?"":" "+M[a.getMonth()])+" – "+b.getDate()+" "+M[b.getMonth()]});
    var wk=q("[data-zlw]",s),start=new Date(a);start.setDate(start.getDate()-3);
    for(var i=0;i<7;i++){var d=new Date(start);d.setDate(start.getDate()+i);var on=d>=new Date(a.toDateString())&&d<=b,td=d.toDateString()===now.toDateString();
      var sp=document.createElement("span");if(on)sp.className="on";if(td)sp.className+=" td";sp.innerHTML="<i>"+J[d.getDay()]+"</i><em>"+d.getDate()+"</em>";if(on)q("em",sp).style.animationDelay=(i*0.12)+"s";wk.appendChild(sp)}
  });
  // Emballage cadeau
  qa("[data-zw]").forEach(function(s){
    var c=q("[data-zwc]",s),m=q("[data-zwm]",s),t=q("[data-zwt]",s),p=q("[data-zwp]",s),v=q("[data-zwv]",s),n=q("[data-zwn]",s),tot=q("[data-zwtot]",s);
    function u(){m.classList.toggle("on",c.checked);p.classList.toggle("on",c.checked);tot.textContent=(c.checked?"11,00 €":"8,50 €");n.textContent=t.value.length;v.textContent=t.value.trim()||t.placeholder}
    c.addEventListener("change",u);t.addEventListener("input",u);u();
  });
  // Code promo
  qa("[data-zqb]").forEach(function(b){b.addEventListener("click",function(){var code=q("[data-zqc]",b.closest(".zq")).textContent;try{navigator.clipboard&&navigator.clipboard.writeText(code).catch(function(){})}catch(e){}var l=q("span",b);b.classList.add("ok");l.textContent="Copié !";setTimeout(function(){b.classList.remove("ok");l.textContent="Copier"},1800)})});
  // Grand texte défilant (accélère au défilement de la page)
  qa("[data-zt]").forEach(function(s){
    var rows=qa("[data-ztr]",s),pos=rows.map(function(){return 0}),boost=0,last=window.scrollY;
    window.addEventListener("scroll",function(){var y=window.scrollY;boost=Math.min(14,boost+Math.abs(y-last)*0.08);last=y},{passive:true});
    function tick(){rows.forEach(function(r,i){var dir=+r.dataset.ztr,half=r.scrollWidth/2;pos[i]-=dir*(0.6+boost);if(pos[i]<=-half)pos[i]+=half;if(pos[i]>0)pos[i]-=half;r.style.transform="translateX("+pos[i]+"px)"});boost*=0.92;requestAnimationFrame(tick)}
    if(!reduce)requestAnimationFrame(tick);
  });
  // Guide d'infusion
  var G={vert:[["Quantité","1 cuillère (2 g) par tasse"],["Eau","75 à 80 °C"],["Temps","2 à 3 min"]],noir:[["Quantité","1 cuillère (2 g) par tasse"],["Eau","90 à 95 °C"],["Temps","3 à 4 min"]],rooibos:[["Quantité","1 cuillère (2 g) par tasse"],["Eau","95 à 100 °C"],["Temps","5 à 7 min"]],inf:[["Quantité","1 cuillère (2 g) par tasse"],["Eau","95 à 100 °C"],["Temps","5 à 8 min"]]};
  var GI=['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><ellipse cx="12" cy="7" rx="3.5" ry="4.5"/><path d="M12 11.5V21"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z"/><path d="M12 9v7"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>'];
  qa("[data-zi]").forEach(function(s){
    var bd=q("[data-zibd]",s);
    function show(k){bd.innerHTML=G[k].map(function(r,i){return '<div class="zi-rw" style="animation-delay:'+(i*0.1)+'s"><span class="ic2">'+GI[i]+'</span><span>'+r[0]+'</span><b>'+r[1]+'</b></div>'}).join("")}
    qa("[data-zitb] button",s).forEach(function(b){b.addEventListener("click",function(){qa("[data-zitb] button",s).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});show(b.dataset.g)})});
    show("vert");
    q("[data-zio]",s).addEventListener("click",function(){s.classList.add("open")});
    qa("[data-zic]",s).forEach(function(b){b.addEventListener("click",function(){s.classList.remove("open")})});
  });
  // Profil du mélange
  qa("[data-zp]").forEach(function(s){
    var imgs=qa(".zp-ph img",s),gs=qa(".zp-g .tr",s);
    function set(i,v){imgs.forEach(function(im,k){im.classList.toggle("on",k===i)});v.split(",").forEach(function(x,k){q("i",gs[k]).style.width=x+"%";q("b",gs[k]).style.left=x+"%"})}
    var bs=qa("[data-zptb] button",s);
    bs.forEach(function(b,i){b.addEventListener("click",function(){bs.forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});set(i,b.dataset.zv)})});
    setTimeout(function(){set(0,bs[0].dataset.zv)},300);
  });
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function eur(v){return v.toFixed(2).replace(".",",")+" €"}
  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var P={jasmin:["Thé vert jasmin","Thé vert · 100 g",8.5,"jasmin.jpg"],agrumes:["Thé noir aux agrumes","Thé noir · 100 g",8.5,"agrumes.jpg"],rooibos:["Rooibos vanille","Rooibos · 100 g",8.5,"rooibos.jpg"],
    verveine:["Verveine-menthe","Infusion · 100 g",7.5,"verveine.jpg"],camomille:["Camomille-tilleul","Infusion · 100 g",7.5,"camomille.jpg"],hibiscus:["Hibiscus-fruits rouges","Infusion · 100 g",7.5,"hibiscus.jpg"]};
  function Cart(init){this.items=init.map(function(a){return {id:a[0],q:a[1],m:1}})}
  Cart.prototype.find=function(id){for(var i=0;i<this.items.length;i++)if(this.items[i].id===id)return this.items[i];return null};
  Cart.prototype.add=function(id){var it=this.find(id);if(it){it.q++;return false}this.items.push({id:id,q:1,m:1});return true};
  Cart.prototype.set=function(id,d){var it=this.find(id);if(!it)return;it.q=Math.max(1,Math.min(20,it.q+d))};
  Cart.prototype.rm=function(id){this.items=this.items.filter(function(x){return x.id!==id})};
  Cart.prototype.line=function(it){return P[it.id][2]*it.m*it.q};
  Cart.prototype.total=function(){var s=0,me=this;this.items.forEach(function(it){s+=me.line(it)});return s};
  Cart.prototype.count=function(){return this.items.reduce(function(a,b){return a+b.q},0)};
  function stepper(it){return '<span class="pa-st"><button type="button" data-q="-1" data-id="'+it.id+'" aria-label="Moins">−</button><span>'+it.q+'</span><button type="button" data-q="1" data-id="'+it.id+'" aria-label="Plus">+</button></span>'}
  function countUp(el,to){var from=parseFloat((el.dataset.v||"0"));el.dataset.v=to;if(reduce||from===to){el.textContent=eur(to);return}var t0=performance.now();function f(t){var k=Math.min(1,(t-t0)/450);el.textContent=eur(from+(to-from)*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)}requestAnimationFrame(f)}
  function badge(root,n){var b=q("[data-n]",root);if(!b)return;b.textContent=n;b.classList.remove("bump");void b.offsetWidth;b.classList.add("bump")}
  function eta(){var J=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."],M=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
    function add(d,n){d=new Date(d);while(n>0){d.setDate(d.getDate()+1);if(d.getDay()%6)n--}return d}var n=new Date(),s=(n.getHours()>=14||!(n.getDay()%6))?add(n,1):n,a=add(s,2),b=add(s,3);
    return J[a.getDay()]+" "+a.getDate()+" – "+J[b.getDay()]+" "+b.getDate()+" "+M[b.getMonth()]}

  // 1. Tiroir à paliers
  qa("[data-pa1]").forEach(function(r){
    var c=new Cart([["jasmin",2],["rooibos",1]]),dr=q(".pa1-dr",r),vl=q(".pa-veil",r),ls=q("[data-ls]",r),fresh=null,reached={};
    function open(){dr.classList.add("on");vl.classList.add("on")}function close(){dr.classList.remove("on");vl.classList.remove("on")}
    function draw(){
      ls.innerHTML=c.items.map(function(it){var p=P[it.id];return '<div class="pa1-it'+(it.id===fresh?" in":"")+'" data-row="'+it.id+'"><img src="photos/'+p[3]+'" alt=""><div><b>'+p[0]+'</b><small>'+p[1]+'</small>'+stepper(it)+'</div><div class="r"><span class="p">'+eur(c.line(it))+'</span><button class="rm" type="button" data-rm="'+it.id+'">Retirer</button></div></div>'}).join("");
      fresh=null;var t=c.total();countUp(q("[data-tot]",r),t);q("[data-cnt]",r).textContent="("+c.count()+")";badge(r,c.count());
      q("[data-bar]",r).style.width=Math.min(100,t/50*100)+"%";
      qa("[data-ms]",r).forEach(function(m){var v=+m.dataset.ms,ok=t>=v;m.classList.toggle("ok",ok);if(ok&&!reached[v]){m.classList.remove("pop");void m.offsetWidth;m.classList.add("pop")}reached[v]=ok});
      q("[data-msg]",r).innerHTML=t<35?"Plus que <b>"+eur(35-t)+"</b> pour la livraison offerte":t<50?"Livraison offerte ✓ · Plus que <b>"+eur(50-t)+"</b> pour un échantillon offert":"Livraison offerte et échantillon offert ✓";
      var up=Object.keys(P).filter(function(k){return !c.find(k)}).slice(0,3);
      q("[data-up]",r).innerHTML=up.map(function(k){var p=P[k];return '<div class="pa1-uc"><img src="photos/'+p[3]+'" alt=""><div><b>'+p[0]+'</b><span>'+eur(p[2])+'</span></div><button type="button" data-up="'+k+'">+ Ajouter</button></div>'}).join("");
    }
    r.addEventListener("click",function(e){var b=e.target.closest("button,[data-close]");if(!b)return;
      if(b.hasAttribute("data-close")){close();return}if(b.hasAttribute("data-open")){open();return}
      if(b.dataset.add||b.dataset.up){var id=b.dataset.add||b.dataset.up;if(c.add(id))fresh=id;draw();open();return}
      if(b.dataset.q){c.set(b.dataset.id,+b.dataset.q);draw();return}
      if(b.dataset.rm){var row=q('[data-row="'+b.dataset.rm+'"]',r);row.classList.add("out");setTimeout(function(){c.rm(b.dataset.rm);draw()},350)}});
    draw();setTimeout(open,500);
  });

  // 2. Page panier complète
  qa("[data-pa2]").forEach(function(r){
    var c=new Cart([["jasmin",1],["agrumes",2],["camomille",1]]),disc=0,last=null,tm=null,flash=null;
    function draw(){
      q("[data-ls]",r).innerHTML=c.items.map(function(it){var p=P[it.id];return '<div class="pa2-it" data-row="'+it.id+'"><img src="photos/'+p[3]+'" alt=""><div><b>'+p[0]+'</b><select data-fmt="'+it.id+'" aria-label="Format"><option value="1"'+(it.m===1?" selected":"")+'>100 g</option><option value="1.8"'+(it.m===1.8?" selected":"")+'>2 × 100 g</option></select>'+stepper(it)+'</div><div class="r"><span class="p'+(flash===it.id?" fl":"")+'">'+eur(c.line(it))+'</span><button class="rm" type="button" data-rm="'+it.id+'">✕ Retirer</button></div></div>'}).join("");
      flash=null;var sub=c.total(),d=sub*disc,gift=q("[data-pgift]",r).checked?2.5:0,ship=(sub-d)>=35?0:null,tot=sub-d+gift+(ship||0);
      q("[data-cnt]",r).textContent=c.count()+" article"+(c.count()>1?"s":"");
      q("[data-sub]",r).textContent=eur(sub);
      q("[data-dcw]",r).innerHTML=disc?'<div class="pa2-rw dc"><span>Remise BIENVENUE10</span><span>−'+eur(d)+'</span></div>':"";
      q("[data-giftrow]",r).style.display=gift?"flex":"none";
      q("[data-pship]",r).textContent=ship===0?"Offerte":"Calculée à l'étape suivante";
      qa("[data-tot]",r).forEach(function(e){countUp(e,tot)});
      q("[data-eta]",r).textContent=eta();
    }
    r.addEventListener("change",function(e){if(e.target.dataset.fmt){c.find(e.target.dataset.fmt).m=+e.target.value;flash=e.target.dataset.fmt;draw()}if(e.target.hasAttribute("data-pgift"))draw()});
    r.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
      if(b.dataset.q){c.set(b.dataset.id,+b.dataset.q);flash=b.dataset.id;draw()}
      if(b.dataset.rm){var id=b.dataset.rm,row=q('[data-row="'+id+'"]',r),idx=c.items.findIndex(function(x){return x.id===id});last={it:c.find(id),i:idx};row.classList.add("gone");
        setTimeout(function(){c.rm(id);draw();var t=q("[data-toast]",r);q("[data-tmsg]",r).textContent=P[id][0]+" retiré";t.classList.remove("on");void t.offsetWidth;t.classList.add("on");clearTimeout(tm);tm=setTimeout(function(){t.classList.remove("on");last=null},5000)},380)}
      if(b.hasAttribute("data-undo")&&last){c.items.splice(last.i,0,last.it);last=null;q("[data-toast]",r).classList.remove("on");draw()}
      if(b.hasAttribute("data-apply")){var inp=q("[data-code]",r),v=inp.value.trim().toUpperCase(),m=q("[data-cm]",r);inp.classList.remove("bad");
        if(v==="BIENVENUE10"){disc=.1;m.textContent="Code appliqué : −10 %";m.style.color="var(--b-primary)";draw()}else{void inp.offsetWidth;inp.classList.add("bad");m.textContent=v?"Ce code n'existe pas.":"Écris un code.";m.style.color="#c0504d"}}});
    draw();
  });

  // 3. Mini-panier déroulant
  qa("[data-pa3]").forEach(function(r){
    var c=new Cart([["rooibos",1],["verveine",1]]),po=q("[data-po]",r),hot=null,tm=null,hover=false;
    function draw(){var its=c.items.slice().reverse(),show=its.slice(0,3);
      q("[data-ls]",r).innerHTML=show.map(function(it){var p=P[it.id];return '<div class="pa3-it'+(it.id===hot?" hl":"")+'"><img src="photos/'+p[3]+'" alt=""><div><b>'+p[0]+'</b><small>Quantité : '+it.q+'</small></div><span class="p">'+eur(c.line(it))+'</span></div>'}).join("")+(its.length>3?'<div class="pa3-more">et '+(its.length-3)+' autre'+(its.length-3>1?"s":"")+' article'+(its.length-3>1?"s":"")+'</div>':"");
      q("[data-tot]",r).textContent=eur(c.total());q("[data-n]",r).textContent=c.count();
      if(hot)setTimeout(function(){var h=q(".pa3-it.hl",r);if(h)h.classList.remove("hl")},1400)}
    function open(){po.classList.add("on");po.classList.remove("run");void po.offsetWidth;if(!hover)po.classList.add("run");clearTimeout(tm);if(!hover)tm=setTimeout(close,6000)}
    function close(){po.classList.remove("on","run")}
    po.addEventListener("mouseenter",function(){hover=true;clearTimeout(tm);po.classList.remove("run")});po.addEventListener("mouseleave",function(){hover=false;tm=setTimeout(close,2500)});
    function fly(img,done){if(reduce||!img.animate){done();return}var R=r.getBoundingClientRect(),a=img.getBoundingClientRect(),cart=q(".pmk-cart",r).getBoundingClientRect();
      var f=document.createElement("img");f.src=img.src;f.className="pa3-fly";var x0=a.left-R.left+a.width/2-28,y0=a.top-R.top+a.height/2-28,x1=cart.left-R.left+cart.width/2-28,y1=cart.top-R.top+cart.height/2-28;f.style.left=x0+"px";f.style.top=y0+"px";r.appendChild(f);
      var mx=(x1-x0)/2,my=Math.min(y0,y1)-120-y0;
      f.animate([{transform:"translate(0,0) scale(1)",opacity:1},{transform:"translate("+mx+"px,"+my+"px) scale(.8)",opacity:1,offset:.5},{transform:"translate("+(x1-x0)+"px,"+(y1-y0)+"px) scale(.25)",opacity:.6}],{duration:750,easing:"cubic-bezier(.5,0,.5,1)"}).onfinish=function(){f.remove();done()}}
    r.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
      if(b.dataset.add){var id=b.dataset.add;fly(q("img",b.closest(".pmk-c")),function(){c.add(id);hot=id;draw();badge(r,c.count());open()})}
      if(b.hasAttribute("data-open")){if(po.classList.contains("on"))close();else{hot=null;draw();open()}}});
    c.add("jasmin");hot="jasmin";draw();setTimeout(function(){po.classList.add("on")},600);
  });

  // 4. Feuille du bas
  qa("[data-pa4]").forEach(function(r){
    var c=new Cart([["jasmin",1],["camomille",2],["hibiscus",1]]),sh=q("[data-sh]",r),vl=q(".pa-veil",r),tr=q("[data-tr]",r);
    function open(){sh.classList.add("on");vl.classList.add("on")}function close(){sh.classList.remove("on");vl.classList.remove("on")}
    function draw(anim){
      tr.innerHTML=c.items.map(function(it,i){var p=P[it.id];return '<div class="pa4-it" style="animation-delay:'+(anim?i*0.1:0)+'s"><img src="photos/'+p[3]+'" alt=""><button class="rm" type="button" data-rm="'+it.id+'" aria-label="Retirer">✕</button><div class="tx"><b>'+p[0]+'</b><span class="p">'+eur(c.line(it))+'</span>'+stepper(it)+'</div></div>'}).join("");
      q("[data-pk]",r).textContent=c.count()+" article"+(c.count()>1?"s":"")+" · "+eur(c.total());
      q("[data-pay]",r).textContent="Payer "+eur(c.total());badge(r,c.count());dots()}
    function dots(){var its=qa(".pa4-it",tr),d=q("[data-dots]",r);if(!its.length){d.innerHTML="";return}var w=its[0].offsetWidth+12,i=Math.round(tr.scrollLeft/(w||1));d.innerHTML=its.map(function(_,k){return '<i class="'+(k===Math.min(i,its.length-1)?"on":"")+'"></i>'}).join("")}
    tr.addEventListener("scroll",dots,{passive:true});
    q("[data-sw]",r).addEventListener("change",function(e){q("[data-ms]",r).classList.toggle("on",e.target.checked)});
    r.addEventListener("click",function(e){var b=e.target.closest("button,[data-close]");if(!b)return;
      if(b.hasAttribute("data-close")){close();return}if(b.hasAttribute("data-open")){open();return}
      if(b.dataset.add){c.add(b.dataset.add);draw(true);open();return}
      if(b.dataset.q){c.set(b.dataset.id,+b.dataset.q);draw(false);return}
      if(b.dataset.rm){c.rm(b.dataset.rm);draw(false)}});
    // glisser la poignée
    var hd=q("[data-hd]",r),y0=null,base=0,moved=false;
    hd.addEventListener("pointerdown",function(e){y0=e.clientY;moved=false;base=sh.classList.contains("on")?0:sh.offsetHeight-74;sh.classList.add("drag");hd.setPointerCapture(e.pointerId)});
    hd.addEventListener("pointermove",function(e){if(y0===null)return;var dy=e.clientY-y0;if(Math.abs(dy)>4)moved=true;var y=Math.max(0,Math.min(sh.offsetHeight-74,base+dy));sh.style.transform="translate(-50%,"+y+"px)"});
    hd.addEventListener("pointerup",function(e){if(y0===null)return;var dy=e.clientY-y0;sh.classList.remove("drag");sh.style.transform="";y0=null;
      if(!moved){sh.classList.contains("on")?close():open();return}if(dy<-40)open();else if(dy>40)close();else if(sh.classList.contains("on"))open();else close()});
    draw(true);setTimeout(open,600);
  });

  // 5. Panier en étapes
  qa("[data-pa5]").forEach(function(r){
    var c=new Cart([["verveine",2],["rooibos",1]]),step=0,tk=q("[data-tk]",r);
    function ship(){var dom=q('[data-p5dv][value="dom"]',r).checked;return dom?(c.total()>=35?0:4.9):3.9}
    function draw(){
      q("[data-ls]",r).innerHTML=c.items.map(function(it){var p=P[it.id];return '<div class="pa5-it"><img src="photos/'+p[3]+'" alt=""><div><b>'+p[0]+'</b><small>'+eur(P[it.id][2])+' l\'unité</small></div>'+stepper(it)+'</div>'}).join("");
      q("[data-sub]",r).textContent=eur(c.total());q("[data-shipdom]",r).textContent=c.total()>=35?"Offerte":"4,90 €";
      var s=ship(),dom=q('[data-p5dv][value="dom"]',r).checked,v=function(id){return q("#"+id,r).value.trim()};
      q("[data-rc]",r).innerHTML=c.items.map(function(it){return '<div style="display:flex;justify-content:space-between"><span>'+it.q+' × '+P[it.id][0]+'</span><b>'+eur(c.line(it))+'</b></div>'}).join("")+
        '<div style="display:flex;justify-content:space-between"><span>'+(dom?"Colissimo à domicile":"Point relais")+'</span><b>'+(s?eur(s):"Offerte")+'</b></div><div>Livré à : <b>'+[v("p5a")+" "+v("p5b"),v("p5c"),v("p5d")+" "+v("p5e")].join(", ")+'</b></div>';
      q("[data-tot]",r).textContent=eur(c.total()+s)}
    function go(n){step=n;tk.style.transform="translateX("+(-100*n)+"%)";qa("[data-sp] .s",r).forEach(function(s,i){s.classList.toggle("on",i===n);s.classList.toggle("dn",i<n)});qa("[data-sp] .ln",r).forEach(function(l,i){l.classList.toggle("dn",i<n)});draw();fit()}
    function fit(){var pn=qa(".pa5-pn",r)[step];q(".pa5-vw",r).style.height=pn.offsetHeight+"px"}
    if(window.ResizeObserver)new ResizeObserver(fit).observe(r);
    r.addEventListener("change",function(e){if(e.target.hasAttribute("data-p5dv"))draw()});
    r.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
      if(b.dataset.q){c.set(b.dataset.id,+b.dataset.q);draw()}
      if(b.hasAttribute("data-next")){if(step===1){var bad=qa("[data-req]",r).filter(function(i){return !i.value.trim()});bad.forEach(function(i){i.classList.remove("bad");void i.offsetWidth;i.classList.add("bad")});if(bad.length){bad[0].focus({preventScroll:true});return}}go(step+1)}
      if(b.hasAttribute("data-prev"))go(step-1);
      if(b.hasAttribute("data-pay")){b.closest(".pa5-pn").classList.add("done");fit()}
      if(b.hasAttribute("data-reset")){b.closest(".pa5-pn").classList.remove("done");go(0)}if(b.dataset.q)fit()});
    qa("[data-req]",r).forEach(function(i){i.addEventListener("input",function(){i.classList.remove("bad")})});
    go(0);
  });
})();

;

(function(){
  Array.prototype.forEach.call(document.querySelectorAll("[data-mailbody]"),function(h){
    var t=document.getElementById(h.dataset.mailbody);if(!t||!h.attachShadow)return;
    var r=h.attachShadow({mode:"open"});r.appendChild(t.content.cloneNode(true));
  });
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function eur(v){return v.toFixed(2).replace(".",",")+" €"}
  function eur0(v){return Math.round(v).toLocaleString("fr-FR")+" €"}
  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var J=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."],M=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
  // titres cinétiques
  qa("[data-tsec] .kt").forEach(function(h){function glue(n){Array.prototype.slice.call(n.childNodes).forEach(function(c){if(c.nodeType===3){var m=c.textContent.match(/^[.,;:!?\u2026\u00bb]+/);if(m&&c.previousSibling&&c.previousSibling.nodeType===1){c.previousSibling.appendChild(document.createTextNode(m[0]));c.textContent=c.textContent.slice(m[0].length)}}else glue(c)})}glue(h);h.normalize();function wrap(n){Array.prototype.slice.call(n.childNodes).forEach(function(c){if(c.nodeType===3){var f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(function(w){if(!w)return;if(/^\s+$/.test(w)){f.appendChild(document.createTextNode(w));return}var o=document.createElement("span");o.className="kw";var i=document.createElement("span");i.textContent=w;o.appendChild(i);f.appendChild(o)});n.replaceChild(f,c)}else wrap(c)})}wrap(h);qa(".kw>span",h).forEach(function(s,i){s.style.transitionDelay=(i*0.07)+"s"})});
  var io=window.IntersectionObserver&&!reduce?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("zin");io.unobserve(e.target)}})},{threshold:.3}):null;
  qa("[data-tsec] .kt").forEach(function(h){function glue(n){Array.prototype.slice.call(n.childNodes).forEach(function(c){if(c.nodeType===3){var m=c.textContent.match(/^[.,;:!?\u2026\u00bb]+/);if(m&&c.previousSibling&&c.previousSibling.nodeType===1){c.previousSibling.appendChild(document.createTextNode(m[0]));c.textContent=c.textContent.slice(m[0].length)}}else glue(c)})}glue(h);h.normalize();io?io.observe(h):h.classList.add("zin")});
  function toast(sec,msg){var t=q("[data-tsw]",sec);if(!t)return;t.textContent=msg;t.classList.add("on");clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove("on")},2600)}
  function hm(min){var h=Math.floor(min/60),m=min%60;return h+" h "+(m<10?"0":"")+m}
  // S1 réservation
  qa("[data-ts1]").forEach(function(s){
    var dy=q("[data-s1d]",s),sl=q("[data-s1s]",s),day=0,dur=45,slot=null,now=new Date();
    for(var i=0;i<6;i++){var d=new Date(now);d.setDate(now.getDate()+i);var b=document.createElement("button");b.type="button";b.setAttribute("aria-pressed",i===0?"true":"false");b.innerHTML=(i===0?"Auj.":J[d.getDay()])+"<b>"+d.getDate()+"</b>";b.dataset.i=i;dy.appendChild(b)}
    function slots(){var base=[540,600,660,780,840,930,990,1050],seed=(day*7+dur)%5;var out=base.filter(function(m,k){return (k+seed)%3!==0});if(day===0){var cur=now.getHours()*60+now.getMinutes();out=out.filter(function(m){return m>cur+30});if(!out.length)out=[]}
      sl.innerHTML=out.length?out.map(function(m,k){return '<button type="button" aria-pressed="'+(k===0?"true":"false")+'" style="animation-delay:'+(k*0.05)+'s" data-m="'+m+'">'+hm(m)+'</button>'}).join(""):'<span style="font-size:.82rem;opacity:.8">Plus de créneau aujourd\'hui : choisissez un autre jour.</span>';slot=out[0]||null}
    s.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
      if(b.parentNode===q("[data-s1p]",s)){qa("button",b.parentNode).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});dur=+b.dataset.d;slots()}
      else if(b.parentNode===dy){qa("button",dy).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});day=+b.dataset.i;slots()}
      else if(b.parentNode===sl){qa("button",sl).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});slot=+b.dataset.m}
      else if(b.hasAttribute("data-s1go")){if(slot===null)return;var d=new Date(now);d.setDate(now.getDate()+day);toast(s,"Démonstration : rendez-vous "+J[d.getDay()]+" "+d.getDate()+" "+M[d.getMonth()]+" à "+hm(slot)+" (non enregistré)")}});
    slots();if(!slot){var b1=qa("button",dy)[1];qa("button",dy).forEach(function(x){x.setAttribute("aria-pressed",x===b1?"true":"false")});day=1;slots()}
  });
  // S2 temps restant
  qa("[data-ts2]").forEach(function(s){function u(){qa("[data-s2r]",s).forEach(function(e){var m=+e.dataset.s2r;e.textContent=m<1440?"Dans "+(m>=60?Math.floor(m/60)+" h "+(m%60? (m%60)+" min":""):m+" min"):"Demain matin"})}u()});
  // S3 devis
  qa("[data-ts3]").forEach(function(s){
    var rng=q("[data-s3s]",s),pv=q("[data-s3p]",s),cur=[0,0];
    function val(sel){var b=q(sel+' button[aria-pressed="true"]',s);return b}
    function calc(){var r=val("[data-s3t]").dataset.r.split(",").map(Number),m=+val("[data-s3e]").dataset.m*+val("[data-s3f]").dataset.m,a=+rng.value;
      var lo=a*r[0]*m,hi=a*r[1]*m;q("[data-s3sv]",s).textContent=a+" m²";animate(lo,hi);
      var parts=[["a",.55],["m",.3],["x",.15]];parts.forEach(function(p){q("[data-s3"+p[0]+"]",s).textContent=eur0(lo*p[1])+" – "+eur0(hi*p[1]);q("[data-s3"+p[0]+"b]",s).style.width=(p[1]*100*Math.min(1,0.5+a/300))+"%"})}
    function animate(lo,hi){var f0=cur.slice(),t0=performance.now();cur=[lo,hi];if(reduce){pv.textContent=eur0(lo)+" – "+eur0(hi);return}function st(t){var k=Math.min(1,(t-t0)/500),e=1-Math.pow(1-k,3);pv.textContent=eur0(f0[0]+(lo-f0[0])*e)+" – "+eur0(f0[1]+(hi-f0[1])*e);if(k<1)requestAnimationFrame(st)}requestAnimationFrame(st)}
    s.addEventListener("click",function(e){var b=e.target.closest(".s3-ch button");if(!b)return;qa("button",b.parentNode).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});calc()});
    rng.addEventListener("input",calc);calc();
  });
  // S4 photo qui suit
  qa("[data-s4]").forEach(function(s){var ls=q("[data-s4l]",s),fl=q("[data-s4f]",s),im=q("img",fl);
    qa(".s4-it",s).forEach(function(it){it.addEventListener("mouseenter",function(){im.src=it.dataset.img;fl.classList.add("on")});it.addEventListener("mouseleave",function(){fl.classList.remove("on")});
      it.addEventListener("click",function(){var on=it.classList.contains("on");qa(".s4-it",s).forEach(function(x){x.classList.remove("on")});if(!on)it.classList.add("on")})});
    ls.addEventListener("mousemove",function(e){var r=ls.getBoundingClientRect();fl.style.left=(e.clientX-r.left)+"px";fl.style.top=(e.clientY-r.top)+"px"})});
  // S5 accordéon
  qa("[data-s5]").forEach(function(s){var ps=qa(".s5-p",s);ps.forEach(function(p){function on(){ps.forEach(function(x){x.classList.toggle("on",x===p)})}p.addEventListener("mouseenter",on);p.addEventListener("click",on)})});
  // S6 carte
  qa("[data-s6]").forEach(function(s){var cd=q("[data-s6c]",s),pins=qa(".s6-pin",s);
    function show(p){pins.forEach(function(x){x.classList.toggle("on",x===p)});cd.innerHTML='<div class="ab"><div><img src="photos/'+p.dataset.a+'" alt="Avant"><small>Avant</small></div><div><img src="photos/'+p.dataset.b+'" alt="Après"><small>Après</small></div></div><span class="eb">'+p.dataset.c+'</span><b>'+p.dataset.t+'</b><span class="tx" style="margin:0;font-size:.82rem">[À compléter : durée et détails du chantier]</span>';cd.classList.remove("sw");void cd.offsetWidth;cd.classList.add("sw")}
    pins.forEach(function(p){p.addEventListener("click",function(){show(p)})});show(pins[0])});
  // S7 justificatifs
  qa("[data-s7w]").forEach(function(s){var md=q("[data-s7m]",s);qa("[data-s7]",s).forEach(function(b){b.addEventListener("click",function(){q("[data-s7d]",s).textContent="[Ici : "+b.dataset.s7+", déposé par l'entreprise dans le Studio]";md.classList.add("on")})});q("[data-s7x]",s).addEventListener("click",function(){md.classList.remove("on")});md.addEventListener("click",function(e){if(e.target===md)md.classList.remove("on")})});
  // S9 sommaire
  qa("[data-s9]").forEach(function(s){var bd=q("[data-s9b]",s),ls=qa("[data-s9n] a",s);
    ls.forEach(function(a){a.addEventListener("click",function(e){e.preventDefault();var t=q("#"+a.dataset.to,s);if(bd.scrollHeight>bd.clientHeight+4)bd.scrollTo({top:t.offsetTop-bd.offsetTop,behavior:"smooth"});ls.forEach(function(x){x.classList.toggle("on",x===a)})})});
    bd.addEventListener("scroll",function(){var y=bd.scrollTop+40,cur=ls[0];ls.forEach(function(a){if(q("#"+a.dataset.to,s).offsetTop-bd.offsetTop<=y)cur=a});ls.forEach(function(x){x.classList.toggle("on",x===cur)})},{passive:true})});
  // S10 retournement
  qa("[data-s10]").forEach(function(c){c.addEventListener("mouseenter",function(){c.classList.add("fl")});c.addEventListener("mouseleave",function(){c.classList.remove("fl")});c.addEventListener("click",function(e){if(e.target.closest("a"))return;c.classList.toggle("fl")})});
  // P1 points
  qa("[data-p1]").forEach(function(s){var D=[["sachet-bois.jpg","Sachet Thé vert jasmin · 100 g","8,50 €"],["infuseur.jpg","Tasse à infuseur","[À compléter : prix]"]],pop=q("[data-p1p]",s),dots=qa(".p1-dot",s),li=qa("[data-p1l] button",s);
    function show(i,user){var d=dots[i],on=d.classList.contains("on");dots.forEach(function(x){x.classList.remove("on")});li.forEach(function(x){x.classList.remove("on")});if(on){pop.classList.remove("on");d.parentNode.style.marginBottom="";return}
      d.classList.add("on");li[i].classList.add("on");q("img",pop).src="photos/"+D[i][0];q("b",pop).textContent=D[i][1];q("small",pop).textContent=D[i][2];
      var ph=d.parentNode,W=ph.clientWidth,Hh=ph.clientHeight,pw=pop.offsetWidth||220,ptop=parseFloat(d.style.top)/100*Hh,px=parseFloat(d.style.left)/100*W;if(W<520){pop.style.width=W+"px";pop.style.left="0px";pop.style.top=(Hh+12)+"px";ph.style.marginBottom=(pop.offsetHeight+24)+"px";ph.style.transition="margin .35s"}else{pop.style.width="";ph.style.marginBottom="";pop.style.left=Math.max(8,Math.min(W-pw-8,px-pw/2))+"px";pop.style.top=(ptop+24)+"px"}pop.classList.remove("on");void pop.offsetWidth;pop.classList.add("on");if(user&&pop.getBoundingClientRect().bottom>window.innerHeight)pop.scrollIntoView({block:"nearest",behavior:"smooth"})}
    dots.forEach(function(d,i){d.addEventListener("click",function(){show(i,true)})});li.forEach(function(b,i){b.addEventListener("click",function(){show(i,true)})});setTimeout(function(){show(0)},400)});
  // P2 défilement narratif
  qa("[data-p2]").forEach(function(s){var vp=q("[data-p2v]",s),sp=qa(".p2-sp",s),im=qa("[data-p2i] img",s),ring=q(".p2-ring",s);
    // Téléphone (retour du propriétaire du 9 novembre 2026 : « l'animation arrive beaucoup trop vite ») : plus de boîte qui
    // défile toute seule, c'est la page qui défile ; le rond photo reste sous l'en-tête et chaque étape a le temps d'être lue.
    function inner(){return vp.scrollHeight>vp.clientHeight+4}
    function u(){var k=0,r;if(inner()){var mid=vp.scrollTop+vp.clientHeight/2;sp.forEach(function(e,i){if(e.offsetTop<=mid)k=i});r=vp.scrollTop/(vp.scrollHeight-vp.clientHeight||1)}
      else{var pb=q(".p2-st",s).getBoundingClientRect().bottom,line=pb+(innerHeight-pb)*.4;sp.forEach(function(e,i){if(e.getBoundingClientRect().top<=line)k=i});var b=s.getBoundingClientRect();r=Math.min(1,Math.max(0,-b.top/((b.height-innerHeight)||1)))}
      sp.forEach(function(e,i){e.classList.toggle("on",i===k)});im.forEach(function(e,i){e.classList.toggle("on",i===k)});
      q("[data-p2i]",s).style.transform="rotate("+(r*40)+"deg) scale("+(1+r*.06)+")";ring.style.transform="rotate("+(-r*120)+"deg)"}
    // le rond photo reste juste sous les barres collées en haut (barre du Studio, en-tête du site s'il reste visible)
    function top(){var t=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tb-h"))||0,hd=document.querySelector('[data-ct-role="header"]');
      if(hd){var st=[hd].concat([].slice.call(hd.querySelectorAll("*"))).filter(function(e){var p=getComputedStyle(e).position;return p==="sticky"||p==="fixed"})[0];if(st)t+=st.getBoundingClientRect().height}
      s.style.setProperty("--p2-top",t+"px")}
    vp.addEventListener("scroll",u,{passive:true});addEventListener("scroll",u,{passive:true});addEventListener("resize",function(){top();u()});top();u()});
  // P4 stories
  qa("[data-p4]").forEach(function(s){var S=[["video","film-brindi.mp4"],["img","tasse.jpg"],["img","sachet-bois.jpg"],["img","tasse-fruits.jpg"],["img","fenetre.jpg"]],vw=q("[data-p4v]",s),bars=q("[data-p4b]",s),md=q("[data-p4m]",s),i=0,t=null,raf=null;
    bars.innerHTML=S.map(function(){return "<i><b></b></i>"}).join("");
    function play(k){i=k;cancelAnimationFrame(raf);md.innerHTML=S[i][0]==="video"?'<video src="'+S[i][1]+'" autoplay muted playsinline></video>':'<img src="photos/'+S[i][1]+'" alt="">';
      qa("i b",bars).forEach(function(b,j){b.style.width=j<i?"100%":"0%"});var dur=S[i][0]==="video"?8000:5000,t0=performance.now(),bar=qa("i b",bars)[i];
      function st(tm){var p=Math.min(1,(tm-t0)/dur);bar.style.width=(p*100)+"%";if(p<1)raf=requestAnimationFrame(st);else if(i<S.length-1)play(i+1);else close()}raf=requestAnimationFrame(st)}
    function close(){cancelAnimationFrame(raf);vw.classList.remove("on");md.innerHTML=""}
    qa(".p4-b",s).forEach(function(b){b.addEventListener("click",function(){vw.classList.add("on");play(+b.dataset.i)})});
    q("[data-p4x]",s).addEventListener("click",close);qa("[data-p4n]",s).forEach(function(b){b.addEventListener("click",function(){var n=i+ +b.dataset.p4n;if(n<0)n=0;if(n>=S.length)close();else play(n)})})});
  // P5 comparateur
  var PR={jasmin:["Thé vert jasmin","jasmin.jpg","Thé vert","Sencha, fleurs de jasmin",55,"Matin, après-midi",8.5],agrumes:["Thé noir aux agrumes","agrumes.jpg","Thé noir","Assam, orange, bergamote",80,"Matin",8.5],
    rooibos:["Rooibos vanille","rooibos.jpg","Rooibos","Rooibos, gousse de vanille",0,"Toute la journée, soir",8.5],verveine:["Verveine-menthe","verveine.jpg","Infusion","Verveine, menthe poivrée",0,"Après le repas, soir",7.5],
    camomille:["Camomille-tilleul","camomille.jpg","Infusion","Camomille, tilleul",0,"Soir",7.5],hibiscus:["Hibiscus-fruits rouges","hibiscus.jpg","Infusion","Hibiscus, pomme, fraise, framboise",0,"Après-midi, soir",7.5]};
  qa("[data-p5]").forEach(function(s){var ch=q("[data-p5c]",s),tb=q("[data-p5t]",s),sel=["jasmin","rooibos","hibiscus"];
    ch.innerHTML=Object.keys(PR).map(function(k){return '<button type="button" aria-pressed="'+(sel.indexOf(k)>=0)+'" data-k="'+k+'"><img src="photos/'+PR[k][1]+'" alt="">'+PR[k][0]+'</button>'}).join("");
    function draw(){var ps=sel.map(function(k){return PR[k]}),n=ps.length;tb.style.setProperty("--n",n);
      function rw(lab,f,cmp){var vals=ps.map(cmp||f),diff=vals.some(function(v){return v!==vals[0]});return '<div class="p5-r'+(diff&&lab?" p5-df":"")+'" style="--n:'+n+'"><div>'+lab+'</div>'+ps.map(function(p,i){return '<div style="animation-delay:'+(i*0.08)+'s">'+f(p)+'</div>'}).join("")+'</div>'}
      tb.innerHTML='<div class="p5-r p5-hd" style="--n:'+n+'"><div></div>'+ps.map(function(p,i){return '<div style="animation-delay:'+(i*0.08)+'s"><img src="photos/'+p[1]+'" alt=""><b>'+p[0]+'</b></div>'}).join("")+'</div>'+
        rw("Famille",function(p){return p[2]})+rw("Ingrédients",function(p){return p[3]})+rw("Théine",function(p){return (p[4]?(p[4]>60?"Élevée":"Moyenne"):"Aucune")+'<span class="p5-ga"><b style="width:'+p[4]+'%"></b></span>'},function(p){return p[4]})+rw("Moment conseillé",function(p){return p[5]})+rw("Prix · 100 g",function(p){return eur(p[6])},function(p){return p[6]})}
    ch.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var k=b.dataset.k,i=sel.indexOf(k);if(i>=0){if(sel.length>2)sel.splice(i,1)}else{if(sel.length>=3)sel.shift();sel.push(k)}qa("button",ch).forEach(function(x){x.setAttribute("aria-pressed",sel.indexOf(x.dataset.k)>=0)});draw()});draw()});
  // P6 drop
  qa("[data-p6]").forEach(function(s){var t=q("[data-p6t]",s),w=t.textContent;t.innerHTML=w.split("").map(function(c,i){return '<span style="animation-delay:'+(i*0.07)+'s">'+c+'</span>'}).join("");
    var end=Date.now()+((5*24+3)*60+12)*60000,cd=q("[data-p6c]",s);cd.innerHTML=["Jours","Heures","Min","Sec"].map(function(l){return '<div><b>00</b><small>'+l+'</small></div>'}).join("");
    function tk(){var r=Math.max(0,end-Date.now()),v=[Math.floor(r/864e5),Math.floor(r/36e5)%24,Math.floor(r/6e4)%60,Math.floor(r/1e3)%60];qa("b",cd).forEach(function(b,i){b.textContent=String(v[i]).padStart(2,"0")})}tk();setInterval(tk,1000);
    q("form",s).addEventListener("submit",function(){q("[data-p6o]",s).textContent="Démonstration : tu serais prévenu·e par e-mail le jour de la sortie."})});
  // P7 abonnement
  qa("[data-p7]").forEach(function(s){var w=4;function u(){var sub=q('input[value="2"]',s).checked,d=new Date();d.setDate(d.getDate()+3);q("[data-p7d]",s).textContent=J[d.getDay()]+" "+d.getDate()+" "+M[d.getMonth()]+", puis toutes les "+w+" semaines";q("[data-p7b]",s).textContent=sub?"S'abonner · 6,75 €":"Ajouter au panier · 7,50 €"}
    qa("input",s).forEach(function(i){i.addEventListener("change",u)});qa("[data-p7f] button",s).forEach(function(b){b.addEventListener("click",function(e){e.preventDefault();qa("[data-p7f] button",s).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});w=+b.dataset.w;u()})});u()});
  // P8 scène
  qa("[data-p8]").forEach(function(s){var its=qa(".p8-it",s),mk=qa(".p8-mk",s);function tot(){var t=0;qa("input",s).forEach(function(i){if(i.checked)t+=+i.dataset.p});q("[data-p8b]",s).textContent="Tout ajouter · "+eur(t)}
    its.forEach(function(it,i){it.addEventListener("mouseenter",function(){mk[i].classList.add("on");it.classList.add("on")});it.addEventListener("mouseleave",function(){mk[i].classList.remove("on");it.classList.remove("on")})});qa("input",s).forEach(function(i){i.addEventListener("change",tot)});tot()});
  // P9 composition
  var CO={jasmin:["jasmin.jpg",[["Thé vert Sencha","seches.jpg"],["Fleurs de jasmin","fleurs.jpg"]]],hibiscus:["hibiscus.jpg",[["Hibiscus",null],["Pomme",null],["Fraise",null],["Framboise",null]]],verveine:["verveine.jpg",[["Verveine",null],["Menthe poivrée",null]]]};
  var CN={jasmin:"Thé vert jasmin",hibiscus:"Hibiscus-fruits rouges",verveine:"Verveine-menthe"};
  qa("[data-p9]").forEach(function(s){var tb=q("[data-p9t]",s),st=q("[data-p9s]",s),cd=q("[data-p9c]",s),k="jasmin";
    tb.innerHTML=Object.keys(CO).map(function(x){return '<button type="button" aria-pressed="'+(x===k)+'" data-k="'+x+'">'+CN[x]+'</button>'}).join("");
    function card(i){var g=CO[k][1][i];qa(".p9-in",st).forEach(function(b,j){b.classList.toggle("on",j===i)});cd.innerHTML=(g[1]?'<img src="photos/'+g[1]+'" alt="">':'<span style="width:90px;height:90px;border-radius:14px;border:2px dashed rgba(35,58,46,.25);display:grid;place-items:center;font-size:.66rem;text-align:center;color:#6b6f6c;padding:6px">[Photo de l\'ingrédient]</span>')+'<div><b>'+g[0]+'</b><small>Origine : [À compléter par la marque]</small><small>Bio</small></div>';cd.classList.remove("sw");void cd.offsetWidth;cd.classList.add("sw")}
    function draw(){var g=CO[k][1],n=g.length;st.innerHTML='<div class="p9-c"><img src="photos/'+CO[k][0]+'" alt="'+CN[k]+'"></div>'+g.map(function(x,i){var a=-Math.PI/2+i*2*Math.PI/n,r=46;return '<button class="p9-in" type="button" style="left:'+(50+r*Math.cos(a))+'%;top:'+(50+r*Math.sin(a))+'%;animation-delay:'+(i*0.1)+'s" data-i="'+i+'">'+x[0]+'</button>'}).join("");
      qa(".p9-in",st).forEach(function(b){b.addEventListener("click",function(){card(+b.dataset.i)})});card(0)}
    tb.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;k=b.dataset.k;qa("button",tb).forEach(function(x){x.setAttribute("aria-pressed",x===b)});draw()});draw()});
  // P10 moment (déplacement animé des cartes)
  var MO={matin:["agrumes","jasmin"],aprem:["jasmin","hibiscus","rooibos"],soir:["camomille","verveine","rooibos"]};
  qa("[data-p10]").forEach(function(s){var g=q("[data-p10g]",s),tb=q("[data-p10t]",s),pill=q("i",tb),keys=Object.keys(PR);
    g.innerHTML=keys.map(function(k){return '<div class="p10-c" data-k="'+k+'"><img src="photos/'+PR[k][1]+'" alt=""><div><span><b>'+PR[k][0]+'</b><small>'+eur(PR[k][6])+'</small></span><span class="bd" hidden>Idéal</span></div></div>'}).join("");
    function setPill(b){pill.style.left=b.offsetLeft+"px";pill.style.width=b.offsetWidth+"px"}
    function apply(m){var cs=qa(".p10-c",g),first={};cs.forEach(function(c){first[c.dataset.k]=c.getBoundingClientRect()});var ok=MO[m];
      cs.sort(function(a,b){return (ok.indexOf(a.dataset.k)<0)-(ok.indexOf(b.dataset.k)<0)}).forEach(function(c){g.appendChild(c);var on=ok.indexOf(c.dataset.k)>=0;c.classList.toggle("off",!on);q(".bd",c).hidden=!on});
      if(reduce)return;cs.forEach(function(c){var a=first[c.dataset.k],b=c.getBoundingClientRect();if(!c.animate)return;c.animate([{transform:"translate("+(a.left-b.left)+"px,"+(a.top-b.top)+"px)"},{transform:"none"}],{duration:550,easing:"cubic-bezier(.2,.8,.2,1)"})})}
    qa("button",tb).forEach(function(b){b.addEventListener("click",function(){qa("button",tb).forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});setPill(b);apply(b.dataset.m)})});
    var b0=q('button[aria-pressed="true"]',tb);setTimeout(function(){setPill(b0)},50);if(window.ResizeObserver)new ResizeObserver(function(){setPill(q('button[aria-pressed="true"]',tb))}).observe(tb);apply("matin")});
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // titres cinétiques (même effet que le lot 1)
  qa("[data-nxs] .kt").forEach(function(h){function glue(n){Array.prototype.slice.call(n.childNodes).forEach(function(c){if(c.nodeType===3){var m=c.textContent.match(/^[.,;:!?\u2026\u00bb]+/);if(m&&c.previousSibling&&c.previousSibling.nodeType===1){c.previousSibling.appendChild(document.createTextNode(m[0]));c.textContent=c.textContent.slice(m[0].length)}}else glue(c)})}glue(h);h.normalize();function wrap(n){Array.prototype.slice.call(n.childNodes).forEach(function(c){if(c.nodeType===3){var f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(function(w){if(!w)return;if(/^\s+$/.test(w)){f.appendChild(document.createTextNode(w));return}var o=document.createElement("span");o.className="kw";var i=document.createElement("span");i.textContent=w;o.appendChild(i);f.appendChild(o)});n.replaceChild(f,c)}else wrap(c)})}wrap(h);qa(".kw>span",h).forEach(function(s,i){s.style.transitionDelay=(i*0.07)+"s"})});
  var io=window.IntersectionObserver&&!reduce?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("zin");io.unobserve(e.target)}})},{threshold:.3}):null;
  qa("[data-nxs] .kt,[data-nx5]").forEach(function(h){io?io.observe(h):h.classList.add("zin")});
  function prog(vp){var m=vp.scrollHeight-vp.clientHeight;return m>0?vp.scrollTop/m:0}
  function onScroll(vp,f){vp.addEventListener("scroll",function(){f(prog(vp))},{passive:true});f(0);qa(".nx-hint",vp.parentNode).forEach(function(h){vp.addEventListener("scroll",function(){h.style.opacity=vp.scrollTop>40?"0":"1"},{passive:true})})}
  // 1 défilement horizontal
  qa("[data-nx1]").forEach(function(s){var vp=q("[data-vp2]",s),tr=q("[data-nx1t]",s),pg=q("[data-nx1p]",s),st=q(".nx1-st",s);
    onScroll(vp,function(p){var max=Math.max(0,tr.scrollWidth-st.clientWidth+10);tr.style.transform="translateX("+(-p*max)+"px)";pg.style.width=(p*100)+"%"})});
  // 2 cartes empilées
  qa("[data-nx2]").forEach(function(s){var vp=q("[data-vp2]",s),cs=qa(".nx2-cd",s);
    function u(){cs.forEach(function(c,i){var nx=cs[i+1];if(!nx){c.style.transform="";c.style.filter="";return}var a=c.getBoundingClientRect(),b=nx.getBoundingClientRect(),k=Math.max(0,Math.min(1,1-(b.top-a.top)/a.height));c.style.transform="scale("+(1-k*0.06)+")";c.style.filter="brightness("+(1-k*0.25)+")"})}
    vp.addEventListener("scroll",u,{passive:true});u()});
  // 3 texte qui s'allume
  qa("[data-nx3]").forEach(function(s){var t=q("[data-nx3t]",s);t.innerHTML=t.textContent.split(/\s+/).map(function(w){var ac=w.indexOf("*")>=0;w=w.replace(/\*/g,"");return '<span'+(ac?' class="ac"':'')+'>'+w+'</span>'}).join(" ");var ws=qa("span",t);
    onScroll(q("[data-vp2]",s),function(p){var n=Math.round(Math.min(1,p*1.15)*ws.length);ws.forEach(function(w,i){w.classList.toggle("on",i<n)})})});
  // 4 photo dévoilée
  qa("[data-nx4]").forEach(function(s){var im=q("[data-nx4i]",s),tx=q("[data-nx4x]",s),tg=q("[data-nx4g]",s);
    onScroll(q("[data-vp2]",s),function(p){var r=14+Math.min(1,p*1.25)*76;im.style.clipPath="circle("+r+"% at 50% 50%)";tx.classList.toggle("on",p>.6);tg.style.opacity=p>.5?"0":"1"})});
  // 5 pied de page géant
  qa("[data-nx5b]").forEach(function(b){var w=b.textContent;b.innerHTML=w.split("").map(function(c,i){return '<span style="transition-delay:'+(i*0.08)+'s">'+c+'</span>'}).join("")});
  // 6 menu plein écran
  qa("[data-nx6]").forEach(function(s){var b=q("[data-nx6b]",s),ims=qa(".nx6-ph img",s);
    b.addEventListener("click",function(){var o=s.classList.toggle("open");b.setAttribute("aria-expanded",o);q("[data-nx6l]",s).textContent=o?"Fermer":"Menu"});
    qa(".nx6-ls a",s).forEach(function(a){a.addEventListener("mouseenter",function(){ims.forEach(function(im,i){im.classList.toggle("on",i===+a.dataset.i)})})});
    setTimeout(function(){s.classList.add("open");b.setAttribute("aria-expanded","true");q("[data-nx6l]",s).textContent="Fermer"},900)});
  // 7 photos qui défilent
  qa("[data-nx7]").forEach(function(s){var vp=q("[data-vp2]",s),ims=qa("[data-nx7p] img",s),ds=qa("[data-nx7d] i",s),ph=q("[data-nx7p]",s);
    function u(){var k=0;if(ph.scrollWidth>ph.clientWidth+4){k=Math.round(ph.scrollLeft/(ims[0].offsetWidth+14))}else{var mid=vp.scrollTop+vp.clientHeight/2;ims.forEach(function(im,i){if(im.offsetTop<=mid)k=i})}ds.forEach(function(d,i){d.classList.toggle("on",i===Math.min(k,ims.length-1))})}
    vp.addEventListener("scroll",u,{passive:true});ph.addEventListener("scroll",u,{passive:true});u()});
  // 8 rotation 360°
  qa("[data-nx8]").forEach(function(s){var st=q("[data-nx8s]",s),im=q("[data-nx8i]",s),d=q("[data-nx8d]",s),a=0,v=0,x0=null,raf=null;
    function set(){im.style.transform="rotate("+a+"deg)";d.textContent=(((Math.round(a)%360)+360)%360)+"°"}
    st.addEventListener("pointerdown",function(e){x0=e.clientX;v=0;cancelAnimationFrame(raf);st.setPointerCapture(e.pointerId)});
    st.addEventListener("pointermove",function(e){if(x0===null)return;var dx=e.clientX-x0;x0=e.clientX;v=dx*0.8;a+=v;set()});
    st.addEventListener("pointerup",function(){x0=null;function glide(){v*=0.94;a+=v;set();if(Math.abs(v)>0.1)raf=requestAnimationFrame(glide)}if(!reduce)raf=requestAnimationFrame(glide)});set()});
  // 9 avis (emplacements)
  qa("[data-nx9]").forEach(function(s){var ls=q("[data-nx9l]",s);function draw(f){var n=f===1?2:4;ls.innerHTML=Array.apply(null,{length:n}).map(function(_,i){return '<div class="nx9-c" style="animation-delay:'+(i*0.08)+'s"><span style="color:#C9A04E;letter-spacing:2px">★★★★★</span>'+(f===1?'<div class="ph">[Photo jointe à l\'avis]</div>':'')+'<span>[Avis réel n° '+(i+1)+', repris tel quel]</span><b style="color:#233A2E">[Prénom] · [date]</b></div>'}).join("")}
    var bs=qa("[data-nx9f] button",s);bs.forEach(function(b,i){b.addEventListener("click",function(){bs.forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});draw(i)})});draw(0)});
  // 10 jauge de fidélité
  qa("[data-nx10]").forEach(function(s){var c=q("[data-nx10c]",s),n=q("[data-nx10n]",s),done=false;function go(){if(done)return;done=true;var pts=120;c.style.strokeDashoffset=691*(1-pts/200);var t0=performance.now();function st(t){var k=Math.min(1,(t-t0)/1600);n.textContent=Math.round(pts*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(st)}requestAnimationFrame(st)}
    if(window.IntersectionObserver){new IntersectionObserver(function(es,o){if(es[0].isIntersecting){go();o.disconnect()}},{threshold:.4}).observe(s)}else go()});
  // 11 carte à gratter
  qa("[data-nx11]").forEach(function(s){var cd=q("[data-nx11c]",s),cv=q("[data-nx11v]",s),ctx=cv.getContext("2d"),down=false,checks=0;
    function paint(){var r=cd.getBoundingClientRect(),dpr=window.devicePixelRatio||1;cv.width=r.width*dpr;cv.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);var g=ctx.createLinearGradient(0,0,r.width,r.height);g.addColorStop(0,"#d8b46a");g.addColorStop(.5,"#f3dfa8");g.addColorStop(1,"#c9a04e");ctx.globalCompositeOperation="source-over";ctx.fillStyle=g;ctx.fillRect(0,0,r.width,r.height);ctx.fillStyle="rgba(35,58,46,.75)";ctx.font="700 18px Karla, sans-serif";ctx.textAlign="center";ctx.fillText("Gratte ici",r.width/2,r.height/2+6);ctx.globalCompositeOperation="destination-out";ctx.fillStyle="#000"}
    function scr(e){var r=cv.getBoundingClientRect();ctx.beginPath();ctx.arc(e.clientX-r.left,e.clientY-r.top,22,0,Math.PI*2);ctx.fill();if(++checks%12===0)test()}
    function test(){var d=ctx.getImageData(0,0,cv.width,cv.height).data,c=0,t=0;for(var i=3;i<d.length;i+=64){t++;if(d[i]<40)c++}if(c/t>.5&&!cd.classList.contains("done")){cd.classList.add("done");burst()}}
    function burst(){if(reduce)return;for(var i=0;i<26;i++){var p=document.createElement("i");p.className="nx11-sp";p.style.left="50%";p.style.top="50%";p.style.background=["#C9A04E","#3F6B4E","#E9C9A8","#fff"][i%4];var a=Math.random()*Math.PI*2,d=80+Math.random()*120;p.style.setProperty("--x",Math.cos(a)*d+"px");p.style.setProperty("--y",Math.sin(a)*d+"px");cd.appendChild(p);setTimeout(function(x){return function(){x.remove()}}(p),1100)}}
    cv.addEventListener("pointerdown",function(e){down=true;cv.setPointerCapture(e.pointerId);scr(e)});cv.addEventListener("pointermove",function(e){if(down)scr(e)});cv.addEventListener("pointerup",function(){down=false;test()});
    paint();if(window.ResizeObserver)new ResizeObserver(function(){if(!cd.classList.contains("done"))paint()}).observe(cd)});
  // 12 recherche guidée (règles simples, sans IA)
  var PR={jasmin:["Thé vert jasmin","jasmin.jpg","8,50 €"],agrumes:["Thé noir aux agrumes","agrumes.jpg","8,50 €"],rooibos:["Rooibos vanille","rooibos.jpg","8,50 €"],verveine:["Verveine-menthe","verveine.jpg","7,50 €"],camomille:["Camomille-tilleul","camomille.jpg","7,50 €"],hibiscus:["Hibiscus-fruits rouges","hibiscus.jpg","7,50 €"]};
  var RU=[[/soir|dorm|nuit|calme|détente|detente/,["camomille","verveine","rooibos"],"Pour le soir : des infusions et un rooibos, sans théine."],[/fruit|rouge|frais|été|ete/,["hibiscus","agrumes"],"Côté fruité : l'hibiscus aux fruits rouges et le thé noir aux agrumes."],
    [/sans th|théine|theine|caf|enceinte|enfant/,["rooibos","verveine","camomille","hibiscus"],"Sans théine : le rooibos et toutes les infusions."],[/matin|réveil|reveil|énergie|energie|tonus/,["agrumes","jasmin"],"Pour le matin : les deux thés, noir ou vert."],
    [/offr|cadeau|coffret|anniv/,["jasmin","rooibos","hibiscus"],"Pour offrir : trois mélanges qui plaisent à coup sûr (et les coffrets)."],[/fleur|jasmin|vert|doux/,["jasmin"],"Doux et fleuri : le thé vert jasmin."],[/vanille|gourmand|sucr/,["rooibos"],"Gourmand : le rooibos vanille."],[/menthe|digest|repas/,["verveine"],"Après le repas : la verveine-menthe."]];
  qa("[data-nx12]").forEach(function(s){var i=q("[data-nx12i]",s),an=q("[data-nx12a]",s),rs=q("[data-nx12r]",s);
    function go(t){t=(t||"").toLowerCase();var r=null;RU.forEach(function(x){if(!r&&x[0].test(t))r=x});if(!t.trim()){an.textContent="";rs.innerHTML="";return}
      if(!r){an.textContent="Pas de mélange trouvé pour « "+t+" ». Essaie : soir, fruité, sans théine, matin, offrir.";rs.innerHTML="";return}
      an.textContent=r[2];rs.innerHTML=r[1].map(function(k,j){var p=PR[k];return '<div class="nx12-r" style="animation-delay:'+(j*0.08)+'s"><img src="photos/'+p[1]+'" alt=""><div><b>'+p[0]+'</b><small>'+p[2]+'</small></div></div>'}).join("")}
    q("[data-nx12f]",s).addEventListener("submit",function(){go(i.value)});qa("[data-nx12s] button",s).forEach(function(b){b.addEventListener("click",function(){i.value=b.textContent;go(b.textContent)})});
    var tm;i.addEventListener("input",function(){clearTimeout(tm);tm=setTimeout(function(){go(i.value)},350)});go("Pour le soir");i.value="Pour le soir"});
  // 13 journal de chantier
  qa("[data-nx13]").forEach(function(s){var vp=q("[data-vp2]",s),ds=qa(".nx13-d",s),ln=q("[data-nx13l]",s);
    onScroll(vp,function(p){ln.style.height=(Math.min(1,p*1.05)*100)+"%";var mid=vp.scrollTop+vp.clientHeight*0.7;ds.forEach(function(d){d.classList.toggle("on",d.offsetTop<mid)})})});
  // 14 questions en bulles
  var QA=[["Combien de temps pour la livraison ?","Ton colis part de Bordeaux en Colissimo : compte 48 à 72 h. La livraison est offerte dès 35 €."],["Tout est bio ?","Oui : tous les thés et toutes les plantes des mélanges sont bio."],
    ["Je peux renvoyer un article ?","Oui, tu disposes de 14 jours après réception pour changer d'avis. [À compléter : conditions de retour de la marque]"],["Comment conserver mon thé ?","[À compléter : conseils de conservation de la marque]"],["Où se trouve l'atelier ?","À Bordeaux, au 14 rue Notre-Dame. Les mélanges y sont assemblés à la main."]];
  qa("[data-nx14]").forEach(function(s){var ql=q("[data-nx14q]",s),ch=q("[data-nx14c]",s),busy=false;
    ql.innerHTML=QA.map(function(x,i){return '<button type="button" data-i="'+i+'">'+x[0]+'</button>'}).join("");
    function add(cls,t){var b=document.createElement("div");b.className="nx14-b "+cls;b.textContent=t;ch.appendChild(b);ch.scrollTop=ch.scrollHeight;return b}
    ql.addEventListener("click",function(e){var b=e.target.closest("button");if(!b||busy)return;busy=true;b.classList.add("dn");var x=QA[+b.dataset.i];add("me",x[0]);
      var ty=document.createElement("div");ty.className="nx14-ty";ty.innerHTML="<i></i><i></i><i></i>";setTimeout(function(){ch.appendChild(ty);ch.scrollTop=ch.scrollHeight},250);
      setTimeout(function(){ty.remove();var a=add("it","");var k=0;(function tp(){a.textContent=x[1].slice(0,k);ch.scrollTop=ch.scrollHeight;if(k<x[1].length){k+=3;setTimeout(tp,16)}else busy=false})()},1100)})});
  // 15 bulle vidéo
  qa("[data-nx15]").forEach(function(s){var b=q("[data-nx15b]",s),v=q("video",b);b.addEventListener("click",function(e){if(e.target.closest("[data-nx15x]")||e.target.closest("a"))return;if(!b.classList.contains("big")){b.classList.add("big");v.muted=false;v.currentTime=0;var p=v.play();if(p&&p.catch)p.catch(function(){v.muted=true;v.play()})}});
    q("[data-nx15x]",s).addEventListener("click",function(e){e.stopPropagation();b.classList.remove("big");v.muted=true})});
  // 16 on vous rappelle
  qa("[data-nx16]").forEach(function(s){var f=q("[data-nx16f]",s),i=q("[data-nx16i]",s),bs=qa("[data-nx16s] button",s),when=bs[0].textContent;
    bs.forEach(function(b){b.addEventListener("click",function(){bs.forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});when=b.textContent})});
    i.addEventListener("input",function(){var d=i.value.replace(/\D/g,"").slice(0,10);i.value=d.replace(/(\d{2})(?=\d)/g,"$1 ");i.classList.remove("bad")});
    f.addEventListener("submit",function(){if(i.value.replace(/\D/g,"").length!==10){i.classList.remove("bad");void i.offsetWidth;i.classList.add("bad");return}q("[data-nx16o]",s).textContent="Démonstration : demande non envoyée. Rappel souhaité : "+when.toLowerCase()+", au "+i.value+".";f.classList.add("done");setTimeout(function(){f.classList.remove("done");i.value=""},5000)})});
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function eur(v){return v.toFixed(2).replace(".",",")+" €"}
  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function countUp(el,to){var from=+(el.dataset.v||to);el.dataset.v=to;if(reduce||from===to){el.textContent=eur(to);return}var t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/450);el.textContent=eur(from+(to-from)*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)})(t0)}
  function ok(b,txt){var h=b.innerHTML;b.textContent=txt;setTimeout(function(){b.innerHTML=h},1600)}
  var J=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."],M=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
  function addBiz(d,n){d=new Date(d);while(n>0){d.setDate(d.getDate()+1);if(d.getDay()%6)n--}return d}
  // V1
  qa("[data-fv1]").forEach(function(s){
    var ph=q("[data-fv1p]",s),ims=qa("img",ph),bars=q(".fv1-bars",ph),i=0,raf=null,T=[8.5,15.3,21.675];
    bars.innerHTML=ims.map(function(){return "<i><b></b></i>"}).join("");var bs=qa("i b",bars);
    function show(k){i=(k+ims.length)%ims.length;cancelAnimationFrame(raf);ims.forEach(function(im,j){im.classList.toggle("on",j===i)});bs.forEach(function(b,j){b.style.width=j<i?"100%":"0%"});if(reduce)return;var t0=performance.now();(function f(t){var p=Math.min(1,(t-t0)/4500);bs[i].style.width=(p*100)+"%";if(p<1)raf=requestAnimationFrame(f);else show(i+1)})(t0)}
    ph.addEventListener("click",function(e){var r=ph.getBoundingClientRect();show(i+(e.clientX-r.left<r.width/3?-1:1))});
    show(0)});
  // V2
  qa("[data-fv2]").forEach(function(s){
    var mn=q("[data-fv2m]",s),im=q("[data-fv2i]",s),ln=q("[data-fv2l]",s),Z=2.6;
    function lens(x,y){var r=mn.getBoundingClientRect(),lx=x-r.left,ly=y-r.top;ln.style.left=(lx-85)+"px";ln.style.top=(ly-85)+"px";ln.style.backgroundImage="url("+im.getAttribute("src")+")";ln.style.backgroundSize=(r.width*Z)+"px "+(r.height*Z)+"px";ln.style.backgroundPosition=(-(lx*Z-85))+"px "+(-(ly*Z-85))+"px"}
    mn.addEventListener("pointerenter",function(){mn.classList.add("z")});mn.addEventListener("pointerleave",function(){mn.classList.remove("z")});
    mn.addEventListener("pointermove",function(e){mn.classList.add("z");lens(e.clientX,e.clientY)});mn.addEventListener("pointerdown",function(e){mn.classList.add("z");lens(e.clientX,e.clientY)});mn.addEventListener("pointerup",function(e){if(e.pointerType!=="mouse")mn.classList.remove("z")});
    qa("[data-fv2t] button",s).forEach(function(b){b.addEventListener("click",function(){qa("[data-fv2t] button",s).forEach(function(x){x.setAttribute("aria-current",x===b?"true":"false")});im.style.opacity=0;setTimeout(function(){im.src=b.dataset.src;im.style.opacity=1},200)})});
    var P=['<p style="margin:0">Un thé vert Sencha bio parfumé par de vraies fleurs de jasmin, sans arôme ajouté. Doux et fleuri, pour le matin ou l\'après-midi.</p>','<ul><li>1 cuillère (environ 2 g) par tasse</li><li>Eau autour de 80 °C</li><li>2 à 3 minutes</li></ul><p style="margin:6px 0 0;font-size:.78rem;color:#8a918c">Repères généraux, à valider par la marque.</p>','<ul><li>Thé vert Sencha bio</li><li>Fleurs de jasmin bio</li></ul>'];
    var tb=q("[data-fv2tb]",s),ul=q("i",tb),pn=q("[data-fv2pn]",s);
    function tab(b){qa("button",tb).forEach(function(x){x.setAttribute("aria-selected",x===b?"true":"false")});ul.style.left=b.offsetLeft+"px";ul.style.width=b.offsetWidth+"px";pn.innerHTML=P[+b.dataset.t];pn.style.animation="none";void pn.offsetWidth;pn.style.animation=""}
    qa("button",tb).forEach(function(b){b.addEventListener("click",function(){tab(b)})});
    function lay(){tab(q('[aria-selected="true"]',tb))}
    setTimeout(lay,60);if(window.ResizeObserver)new ResizeObserver(lay).observe(s);
    var n=new Date(),sh=(n.getHours()>=14||!(n.getDay()%6))?addBiz(n,1):n,a=addBiz(sh,2),bb=addBiz(sh,3);var d2=q("[data-fv2d]",s);if(d2)d2.textContent=J[a.getDay()]+" "+a.getDate()+" et "+J[bb.getDay()]+" "+bb.getDate()+" "+M[bb.getMonth()];});
  // V4
  var G=[["jasmin","Thé vert jasmin","Thé vert","Sencha et fleurs de jasmin, sans arôme ajouté.",["Fleuri","Doux","Végétal"],8.5,"#E6EEDF"],["agrumes","Thé noir aux agrumes","Thé noir","Assam relevé d'orange et de bergamote.",["Vif","Fruité","Corsé"],8.5,"#F5E6D1"],
    ["rooibos","Rooibos vanille","Rooibos","Rooibos rond et gousse de vanille, sans théine.",["Gourmand","Rond","Sans théine"],8.5,"#F1E1D4"],["verveine","Verveine-menthe","Infusion","Verveine et menthe poivrée.",["Frais","Mentholé","Sans théine"],7.5,"#E1EFE2"],
    ["camomille","Camomille-tilleul","Infusion","Camomille et tilleul à parts égales.",["Doux","Floral","Sans théine"],7.5,"#F5EED3"],["hibiscus","Hibiscus-fruits rouges","Infusion","Hibiscus, pomme, fraise et framboise.",["Acidulé","Fruité","Sans théine"],7.5,"#F4DEE1"]];
  qa("[data-fv4]").forEach(function(s){var ls=q("[data-fv4l]",s),st=q("[data-fv4s]",s),cur=-1;
    ls.innerHTML=G.map(function(g,i){return '<button type="button" data-i="'+i+'"><img src="photos/'+g[0]+'.jpg" alt="">'+g[1]+'</button>'}).join("");
    function show(i){if(i===cur)return;cur=i;var g=G[i];s.style.setProperty("--fv4",g[6]);qa("button",ls).forEach(function(b,j){b.setAttribute("aria-current",j===i?"true":"false")});
      var im=document.createElement("img");im.src="photos/"+g[0]+".jpg";im.alt=g[1];if(st.children.length&&!reduce)im.className="nw";st.appendChild(im);while(st.children.length>2)st.removeChild(st.firstChild);
      q("[data-fv4e]",s).textContent=g[2]+" · bio · 100 g";q("[data-fv4n]",s).innerHTML=g[1].split("").map(function(c,k){return '<span style="animation-delay:'+(k*0.025)+'s">'+(c===" "?"&nbsp;":c)+'</span>'}).join("");
      q("[data-fv4d]",s).textContent=g[3];q("[data-fv4t]",s).innerHTML=g[4].map(function(t,k){return '<span style="animation-delay:'+(0.2+k*0.08)+'s">'+t+'</span>'}).join("");if(s._po)s._po.setBase(g[5],g[1])}
    ls.addEventListener("click",function(e){var b=e.target.closest("button");if(b)show(+b.dataset.i)});show(0)});
  // V5
  var CUP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9h13v4a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/></svg>';
  qa("[data-fv5]").forEach(function(s){var r=q("[data-fv5r]",s),cups=q("[data-fv5c]",s),last=null,fmt="100 g";
    function upd(){var n=+r.value,g=n*2,wk=100/g,mo=g*4.33;q("[data-fv5v]",s).textContent=n;
      while(cups.children.length<n){var d=document.createElement("span");d.innerHTML=CUP;cups.appendChild(d.firstChild)}while(cups.children.length>n)cups.removeChild(cups.lastChild);
      q("[data-fv5w]",s).textContent=wk>=10?Math.round(wk):wk.toFixed(1).replace(".",",");q("[data-fv5t]",s).textContent=eur(8.5/50).replace(" €","")+" €";q("[data-fv5m]",s).textContent=Math.round(mo)+" g";
      var big=mo>100;fmt=big?"2 × 100 g":"100 g";var k=q("[data-fv5k]",s);k.innerHTML=big?"Conseil : <b>2 sachets</b>, pour environ "+Math.round(200/g)+" semaines.":"Conseil : le sachet de <b>100 g</b> te suffit pour environ "+Math.round(wk)+" semaines.";
      if(last!==big&&last!==null){k.classList.remove("fl");void k.offsetWidth;k.classList.add("fl")}last=big;if(s._po&&last!==null)s._po.setQty(big?2:1)}
    r.addEventListener("input",upd);upd()});
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function eur(v){return v.toFixed(2).replace(".",",")+" €"}
  var H=document.documentElement,D=H.dataset;
  // réglages de départ (ce que la fiche produit de Brindi propose)
  if(!D.poInit){D.poInit="1";D.poCouleur="0";D.poPromo="0";D.poAbo="1";D.poRituel="1";D.poPaliers="1";D.poOffre="lots";D.poGamme="1";D.poLivraison="1";D.poFidelite="0";D.poTaille="1"}
  var PROMO_END=Date.now()+((2*24+5)*60+14)*60000;
  var COLORS=[["Sauge","#A7B9A0"],["Terracotta","#C58463"],["Nuit","#2E3B4E"],["Sable","#D8C4A6"]];
  var all=[];
  // la gamme du client (fiche de chaque produit dans le Studio ; prix d'exemple)
  var GAMME=[["jasmin","Thé vert jasmin",8.5,"Thé vert","Un Sencha bio parfumé par de vraies fleurs de jasmin, sans arôme ajouté."],["agrumes","Thé noir aux agrumes",8.5,"Thé noir","Un Assam relevé d'orange et de bergamote."],["rooibos","Rooibos vanille",8.5,"Rooibos","Un rooibos rond et une vraie gousse de vanille. Sans théine : il se boit aussi le soir."],["verveine","Verveine-menthe",7.5,"Infusion","La verveine et la menthe poivrée, pour finir le repas en douceur."],["camomille","Camomille-tilleul",7.5,"Infusion","Camomille et tilleul à parts égales, pour le soir."],["hibiscus","Hibiscus-fruits rouges",7.5,"Infusion","Hibiscus, pomme, fraise et framboise. Chaud ou glacé."]];
  // délai réel du client (ici 2 à 3 jours ouvrés d'exemple, commande avant 14 h)
  var SHIP=(function(d){var m=/^(\d+)-(\d+)-(\d*)$/.exec(d.poShip||"");return m?{min:+m[1],max:+m[2],cut:m[3]===""?null:+m[3],real:1}:{min:2,max:3,cut:14}})(document.documentElement.dataset);
  var JOURS=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."],MOIS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
  function addBiz(d,n){d=new Date(d);while(n>0){d.setDate(d.getDate()+1);if(d.getDay()!==0&&d.getDay()!==6)n--}return d}
  function fmtD(d){return JOURS[d.getDay()]+" "+d.getDate()+" "+MOIS[d.getMonth()]}
  function shipLine(){var n=new Date(),late=(SHIP.cut!=null&&n.getHours()>=SHIP.cut)||n.getDay()===0||n.getDay()===6,start=new Date(n);if(late){start=addBiz(n,1)}
    var a=addBiz(start,SHIP.min),b=addBiz(start,SHIP.max),cut=new Date(n);cut.setHours(SHIP.cut==null?0:SHIP.cut,0,0,0);var left=cut-n,lead;
    if(SHIP.cut!=null&&!late&&left>0){var h=Math.floor(left/36e5),m=Math.floor(left/6e4)%60;lead="Commande dans les <b>"+(h?h+" h ":"")+String(m).padStart(2,"0")+" min</b>, reçois-le "}else lead="Reçois-le ";
    return lead+(+a===+b?"le <b>"+fmtD(a)+"</b>":"entre le <b>"+fmtD(a)+"</b> et le <b>"+fmtD(b)+"</b>")+(SHIP.real?"":"<br><small>délai d'exemple : 2 à 3 jours ouvrés</small>")}
  function Po(el){
    var st={base:+el.dataset.base,name:el.dataset.name,unit:el.dataset.unit||"sachet",q:1,sub:false,w:4,color:0,rit:[false,false],pts:-1},got={},sec0=el.closest("section");
    var cfg=null;try{cfg=JSON.parse(el.dataset.cfg||"null")}catch(e){}
    var COL=cfg&&cfg.colors||COLORS,GAM=cfg&&cfg.gamme||GAMME,SZ=cfg&&cfg.sizes||null,TI=cfg&&cfg.tiers||null;st.size=null;
    function gsrc(g){return "photos/"+g[0]+(/\./.test(g[0])?"":".jpg")}
    function overlay(src,alt,on){if(!sec0)return;qa("[data-pomain]",sec0).forEach(function(m){var ov=q("img.po-ov",m);if(!on){if(ov)ov.remove();m.classList.remove("po-solo");return}
      if(!ov){ov=document.createElement("img");ov.className="po-ov";m.appendChild(ov)}ov.src=src;ov.alt=alt;ov.classList.remove("po-swap");void ov.offsetWidth;ov.classList.add("po-swap");m.classList.add("po-solo")});qa("[data-pothumbs]",sec0).forEach(function(t){t.hidden=on})}
    var gi=Math.max(0,GAM.findIndex(function(g){return g[1]===st.name}));
    function units(n){return n+" "+st.unit+(n>1?"s":"")}
    function ritItems(){if(cfg&&cfg.bundle)return cfg.bundle;var other=/jasmin/i.test(st.name)?["camomille.jpg","Camomille-tilleul",7.5]:["jasmin.jpg","Thé vert jasmin",8.5];return [["infuseur.jpg","Infuseur inox",12],other]}
    q("[data-posw]",el).innerHTML=COL.map(function(c,i){return '<button type="button" style="--c:'+c[1]+'" aria-label="'+c[0]+'" aria-pressed="'+(i===0)+'" data-i="'+i+'"></button>'}).join("");
    var gm=q("[data-pogam]",el);if(gm)gm.innerHTML=GAM.map(function(g,i){return '<button type="button" data-g="'+i+'" aria-pressed="'+(i===gi)+'"><img src="'+gsrc(g)+'" alt="">'+g[1]+'</button>'}).join("");
    // change de produit : photo, nom, famille et description du produit choisi (repères data-po* de la section)
    var gi0=gi;
    function nm(n){var k=n.lastIndexOf(" "),h=n.lastIndexOf("-"),c=Math.max(k,h);return c<0?n:n.slice(0,c+1)+"<em>"+n.slice(c+1)+"</em>"}
    function pick(i){if(i===gi)return;gi=i;var g=GAM[i];
      if(sec0){var solo=i!==gi0;qa("[data-pomain]",sec0).forEach(function(m){var ov=q("img.po-ov",m);if(!solo){if(ov)ov.remove();m.classList.remove("po-solo");return}
          if(!ov){ov=document.createElement("img");ov.className="po-ov";m.appendChild(ov)}ov.src=gsrc(g);ov.alt=g[1];ov.classList.remove("po-swap");void ov.offsetWidth;ov.classList.add("po-swap");m.classList.add("po-solo")});
        qa("[data-pothumbs]",sec0).forEach(function(t){t.hidden=solo});
        qa("[data-poname]",sec0).forEach(function(e){if(!e.dataset.o)e.dataset.o=e.innerHTML;e.innerHTML=solo?nm(g[1]):e.dataset.o});
        qa("[data-poeb]",sec0).forEach(function(e){if(!e.dataset.o)e.dataset.o=e.innerHTML;e.innerHTML=solo?(cfg?g[3]:e.dataset.poeb==="name"?g[1]+" · 100 g":g[3]+" · bio · 100 g"):e.dataset.o});
        qa("[data-pods]",sec0).forEach(function(e){if(!e.dataset.o)e.dataset.o=e.innerHTML;e.innerHTML=solo?g[4]:e.dataset.o});
        // le grand mot derrière la photo suit le produit affiché (son nom court, sinon le dernier mot de son nom)
        qa("[data-poword]",sec0).forEach(function(e){if(!e.dataset.o)e.dataset.o=e.textContent;e.textContent=solo?(g[5]||String(g[1]).split(" ").pop()):e.dataset.o})}
      qa("[data-pogam] button",el).forEach(function(b){b.setAttribute("aria-pressed",String(+b.dataset.g===i))});st.base=g[2];st.name=g[1];drawRit();draw(true)}
    var zs=q("[data-poszs]",el);if(zs&&SZ)zs.innerHTML=SZ.map(function(z){return '<button type="button" data-z="'+z+'" aria-pressed="false">'+z+'</button>'}).join("");
    function drawRit(){q("[data-pori]",el).innerHTML=ritItems().map(function(r,i){return '<label class="po-ri"><input type="checkbox" data-r="'+i+'"'+(st.rit[i]?" checked":"")+'><img src="photos/'+r[0]+'" alt=""><span>'+r[1]+'</span><b>'+eur(r[2])+'</b></label>'}).join("")}
    function priceFor(n,unit){var of=D.poOffre;if(of==="lots"){return unit*n*(n===2?.9:n===3?.85:1)}if(of==="bogo"){return unit*(n===3?2:n)}return unit*n}
    function calc(){var unit=st.base*(D.poPromo==="1"?.85:1)*(D.poAbo==="1"&&st.sub?.9:1),prod=priceFor(st.q,unit),orig=st.base*st.q,rit=0,ritO=0;
      if(D.poRituel==="1"){var it=ritItems(),on=0;st.rit.forEach(function(c,i){if(c){rit+=it[i][2];on++}});ritO=rit;if(on===2)rit*=.9}
      return {tot:prod+rit,orig:orig+ritO}}
    function draw(pop){var of=D.poOffre;
      q("[data-poq]",el).innerHTML=[1,2,3].map(function(n){var lab=of==="lots"?(n===2?"−10 %":n===3?"−15 %":eur(st.base)):of==="bogo"?(n===3?"1 offert":eur(st.base*n)):eur(st.base*n),tag=of==="bogo"&&n===3?"<i>2 + 1 offert</i>":of==="lots"&&n===3?"<i>Meilleur prix</i>":"";
        return '<button type="button" data-q="'+n+'" aria-pressed="'+(st.q===n)+'">'+tag+'<b>'+units(n)+'</b><small>'+lab+'</small></button>'}).join("");
      var c=calc();q("[data-pon]",el).textContent=eur(c.tot);var o=q("[data-poo]",el),b=q("[data-pob]",el),save=c.orig-c.tot;o.hidden=save<.01;o.textContent=eur(c.orig);b.hidden=save<.01;b.textContent="Économise "+eur(save);
      var pt=q("[data-pot]",el);if(pt)pt.textContent=eur(c.tot);var gn=q("[data-pogn]",el);if(gn)gn.textContent=st.name;
      var dl=q("[data-podl]",el);if(dl)dl.innerHTML=shipLine();var fi=q("[data-pofi]",el),pts=Math.floor(c.tot);if(fi){fi.innerHTML="Tu gagnes <b>"+pts+" point"+(pts>1?"s":"")+"</b> de fidélité avec cet achat<br><small>1 point par euro · 100 points = 5 € offerts (programme d'exemple)</small>";if(pts!==st.pts&&st.pts>=0){var bb=q("b",fi);bb.classList.add("pop")}st.pts=pts}q("[data-poc]",el).textContent=COL[st.color][0];
      var tg=q("[data-potg]",el);tg.classList.toggle("sub",st.sub);qa("button",tg).forEach(function(x){x.setAttribute("aria-pressed",String(+x.dataset.s===(st.sub?1:0)))});
      var T2=TI?TI[1][0]:35;q("[data-pogb]",el).style.width=Math.min(100,c.tot/T2*100)+"%";
      qa(".po-gl span",el).forEach(function(s){var at=+s.dataset.at,ok=c.tot>=at;s.classList.toggle("ok",ok);if(ok&&!got[at]&&pop){s.classList.remove("pogp");void s.offsetWidth;s.classList.add("pogp")}got[at]=ok});
      q("[data-pogm]",el).innerHTML=TI?(c.tot<TI[0][0]?"Plus que <b>"+eur(TI[0][0]-c.tot)+"</b> pour "+TI[0][1]+".":c.tot<TI[1][0]?TI[0][2]+" ✓ · plus que <b>"+eur(TI[1][0]-c.tot)+"</b> pour "+TI[1][1]+".":TI[0][2]+" et "+TI[1][2].toLowerCase()+" ✓"):c.tot<20?"Plus que <b>"+eur(20-c.tot)+"</b> pour un échantillon offert.":c.tot<35?"Échantillon offert ✓ · plus que <b>"+eur(35-c.tot)+"</b> pour la livraison offerte.":"Échantillon et livraison offerts ✓"}
    el.addEventListener("click",function(e){var t=e.target.closest("button");if(!t||!el.contains(t))return;
      if(t.dataset.q){st.q=+t.dataset.q;draw(true)}
      else if(t.dataset.g!==undefined){pick(+t.dataset.g)}
      else if(t.parentNode.hasAttribute("data-posw")){st.color=+t.dataset.i;qa("[data-posw] button",el).forEach(function(x){x.setAttribute("aria-pressed",String(x===t))});var cc=COL[st.color];if(cc[2])overlay("photos/"+cc[2],cc[0],st.color!==0);draw()}
      else if(t.dataset.z!==undefined){st.size=t.dataset.z;qa("[data-poszs] button",el).forEach(function(x){x.setAttribute("aria-pressed",String(x===t))});q("[data-posz]",el).textContent=st.size;var zm=q("[data-poszm]",el);zm.textContent="";zm.classList.remove("ko")}
      else if(t.parentNode.hasAttribute("data-potg")){st.sub=t.dataset.s==="1";draw(true)}
      else if(t.parentNode.hasAttribute("data-pofq")){st.w=+t.dataset.w;qa("[data-pofq] button",el).forEach(function(x){x.setAttribute("aria-pressed",String(x===t))})}
      else if(t.hasAttribute("data-pogo")){if(SZ&&D.poTaille==="1"&&!st.size){var zb=q("[data-poszs]",el),zm2=q("[data-poszm]",el);zb.classList.remove("po-sh");void zb.offsetWidth;zb.classList.add("po-sh");zm2.textContent="Choisis ta taille pour ajouter au panier.";zm2.classList.add("ko");e.stopImmediatePropagation();return}var h=t.innerHTML;t.classList.add("ok");t.textContent="Ajouté au panier ✓";setTimeout(function(){t.classList.remove("ok");t.innerHTML=h},1500)}});
    el.addEventListener("change",function(e){if(e.target.dataset.r!==undefined){st.rit[+e.target.dataset.r]=e.target.checked;draw(true)}});
    var api={setBase:function(p,n){st.base=p;if(n){st.name=n;var k=GAM.findIndex(function(g){return g[1]===n});if(k>-1){gi=k;qa("[data-pogam] button",el).forEach(function(b){b.setAttribute("aria-pressed",String(+b.dataset.g===k))})}}drawRit();draw()},pick:pick,gam:GAM,g0:gi0,setQty:function(n){st.q=Math.max(1,Math.min(3,n));draw(true)},draw:draw,state:st,calc:calc};
    el._po=api;var sec=el.closest("section");if(sec)sec._po=api;drawRit();draw();return api}
  qa("[data-pvb]").forEach(function(el){all.push(Po(el))});
  function tick(){var r=Math.max(0,PROMO_END-Date.now()),h=Math.floor(r/36e5),m=Math.floor(r/6e4)%60,s=Math.floor(r/1e3)%60;var t=(h>=24?Math.floor(h/24)+" j ":"")+String(h%24).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");qa("[data-pocd]").forEach(function(e){e.textContent=t})}
  tick();setInterval(tick,1000);setInterval(function(){qa("[data-podl]").forEach(function(e){e.innerHTML=shipLine()})},30000);
  function sync(){qa("[data-popanel]").forEach(function(p){qa("[data-pt]",p).forEach(function(b){var k="po"+b.dataset.pt.charAt(0).toUpperCase()+b.dataset.pt.slice(1);b.setAttribute("aria-pressed",String(D[k]==="1"))});qa("[data-po-of]",p).forEach(function(b){b.setAttribute("aria-pressed",String(D.poOffre===b.dataset.poOf))})});all.forEach(function(a){a.draw()})}
  document.addEventListener("click",function(e){var b=e.target.closest("[data-popanel] button");if(!b)return;if(b.dataset.pt){var k="po"+b.dataset.pt.charAt(0).toUpperCase()+b.dataset.pt.slice(1);D[k]=D[k]==="1"?"0":"1"}else if(b.dataset.poOf){D.poOffre=b.dataset.poOf}sync()});
  sync();
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches,hover=window.matchMedia&&matchMedia("(hover:hover)").matches;
  function io(els,cb,th){if(!window.IntersectionObserver||reduce){els.forEach(cb);return}var o=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){cb(e.target);o.unobserve(e.target)}})},{threshold:th||.2});els.forEach(function(e){o.observe(e)})}
  // EL1 : trois tenues (mannequin détouré, assis ou debout), fond de la miniature
  var S1=[["sl-h1.webp","Mannequin en robe à motifs géométriques orange et bleu sarcelle",1,"#F5F1EB"],["sl-h2.webp","Mannequin en haut orange et pantalon large crème",0,"#E8622C"],["sl-h3.webp","Mannequin en chemise vert olive et pantalon beige",0,"#1F7A78"]];
  qa("[data-el1]").forEach(function(s){var md=q("[data-el1p]",s),th=q("[data-el1t]",s),cur=0;
    th.innerHTML=S1.map(function(x,i){return '<button type="button" style="--b:'+x[3]+'" aria-label="Voir la tenue '+(i+1)+'" aria-current="'+(i===0)+'"><img src="photos/'+x[0]+'" alt=""><i></i></button>'}).join("");
    function show(i){if(i===cur)return;cur=i;var x=S1[i],old=q("img:not(.out)",md),im=document.createElement("img");im.src="photos/"+x[0];im.alt=x[1];im.className="nw";
      if(old){old.classList.add("out");setTimeout(function(){old.remove()},650)}md.appendChild(im);md.classList.toggle("st",!x[2]);
      qa("button",th).forEach(function(b,k){b.setAttribute("aria-current",String(k===i))})}
    th.addEventListener("click",function(e){var b=e.target.closest("button");if(b)show(qa("button",th).indexOf(b))});
    th.addEventListener("animationend",function(e){if(e.animationName==="el1bar")show((cur+1)%S1.length)});
    s.addEventListener("mouseenter",function(){s.classList.add("is-ps")});
    s.addEventListener("mouseleave",function(){s.classList.remove("is-ps");["--mx","--my","--px","--py"].forEach(function(k){s.style.removeProperty(k)})});
    if(hover&&!reduce)s.addEventListener("mousemove",function(e){var r=s.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      s.style.setProperty("--mx",(x*-24)+"px");s.style.setProperty("--my",(y*-10)+"px");s.style.setProperty("--px",(x*14)+"px");s.style.setProperty("--py",(y*8)+"px")})});
  // EL2 : cartes qui montent
  qa("[data-el2]").forEach(function(g){io(qa(".el2-c",g),function(c){c.classList.add("in")},.15)});
  // EL3 : favoris et panier (la pastille vole jusqu'au compteur)
  qa("[data-el3]").forEach(function(g){var sec=g.closest("section"),k=q("[data-el3k]",sec),bk=q("b",k),n=0;
    io(qa(".el3-c",g),function(c){c.classList.add("in")},.15);
    g.addEventListener("click",function(e){var f=e.target.closest(".el3-fv");
      if(f){f.setAttribute("aria-pressed",String(f.getAttribute("aria-pressed")!=="true"));f.classList.remove("pp");void f.offsetWidth;f.classList.add("pp");return}
      var a=e.target.closest(".el3-ad,.el3-qa");if(!a||a.classList.contains("ok"))return;var ad=a.classList.contains("el3-qa")?q(".el3-ad",a.parentNode):a;ad.classList.add("ok");setTimeout(function(){ad.classList.remove("ok")},1500);
      if(a.classList.contains("el3-qa")){var t=a.textContent;a.textContent="Ajouté ✓";setTimeout(function(){a.textContent=t},1500)}
      var r1=a.getBoundingClientRect(),r2=k.getBoundingClientRect(),dot=document.createElement("i");dot.className="el3-dot";document.body.appendChild(dot);
      dot.style.left=(r1.left+r1.width/2-7)+"px";dot.style.top=(r1.top+r1.height/2-7)+"px";
      var dx=r2.left+r2.width/2-(r1.left+r1.width/2),dy=r2.top+r2.height/2-(r1.top+r1.height/2);
      function done(){dot.remove();n++;bk.textContent=n;k.classList.remove("bp");void k.offsetWidth;k.classList.add("bp")}
      if(dot.animate&&!reduce){var an=dot.animate([{transform:"translate(0,0) scale(1)"},{transform:"translate("+(dx/2)+"px,"+(Math.min(dy,0)-90)+"px) scale(1.25)",offset:.5},{transform:"translate("+dx+"px,"+dy+"px) scale(.45)",opacity:.7}],{duration:800,easing:"cubic-bezier(.45,0,.55,1)"});an.onfinish=done}else done()})});
  // EL4 : la carte s'ouvre (on observe la section : la carte fermée n'a pas de surface visible)
  io(qa(".el4"),function(s){var c=q("[data-el4]",s);if(c)c.classList.add("in")},.3);
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches,hover=window.matchMedia&&matchMedia("(hover:hover)").matches;
  function io(els,cb,th){if(!window.IntersectionObserver||reduce){els.forEach(cb);return}var o=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){cb(e.target);o.unobserve(e.target)}})},{threshold:th||.2});els.forEach(function(e){o.observe(e)})}
  // DQ1 : compte à rebours (date d'exemple : dans 2 j 14 h 37 min 48 s) et produit qui suit la souris
  var END=Date.now()+(((2*24+14)*60+37)*60+48)*1000;
  qa("[data-dq1]").forEach(function(s){var c=q("[data-dq1c]",s),pr=q("[data-dq1p]",s),last={};
    function tick(){var r=Math.max(0,END-Date.now()),v={j:Math.floor(r/864e5),h:Math.floor(r/36e5)%24,m:Math.floor(r/6e4)%60,s:Math.floor(r/1e3)%60};
      qa("b[data-u]",c).forEach(function(b){var k=b.dataset.u,t=String(v[k]).padStart(2,"0");if(last[k]!==t){b.textContent=t;if(last[k]!==undefined&&!reduce){b.classList.remove("tk");void b.offsetWidth;b.classList.add("tk")}last[k]=t}})}
    tick();setInterval(tick,1000);
    if(hover&&!reduce){s.addEventListener("mousemove",function(e){var r=s.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;pr.style.setProperty("--px",(x*30)+"px");pr.style.setProperty("--py",(y*18)+"px");pr.style.setProperty("--rz",(x*8)+"deg")});
      s.addEventListener("mouseleave",function(){["--px","--py","--rz"].forEach(function(k){pr.style.removeProperty(k)})})}});
  // DQ2 : bandes en sens opposé, plus rapides quand on fait défiler la page
  var bands=qa("[data-dq2] .dq2-t");if(bands.length&&!reduce){var pos=bands.map(function(){return 0}),boost=0,lastY={};
    document.addEventListener("scroll",function(e){var t=e.target===document?document.scrollingElement:e.target,y=t.scrollTop,k=t===document.scrollingElement?"w":"f";if(lastY[k]!==undefined)boost=Math.min(14,boost+Math.abs(y-lastY[k])*.08);lastY[k]=y},{passive:true,capture:true});
    (function loop(){boost*=.92;bands.forEach(function(t,i){if(!t.offsetParent)return;var w=t.scrollWidth/2,d=+t.dataset.dir;pos[i]+=d*(.6+boost);if(pos[i]<=-w)pos[i]+=w;if(pos[i]>0)pos[i]-=w;t.style.transform="translateX("+pos[i]+"px)"});requestAnimationFrame(loop)})()}
  // DQ3 : tailles et ajout rapide (une taille est demandée avant l'ajout)
  qa("[data-dq3]").forEach(function(g){io(qa(".dq3-t",g),function(c){c.classList.add("in")},.15);
    g.addEventListener("click",function(e){var sb=e.target.closest(".dq3-sz button");
      if(sb){qa("button",sb.parentNode).forEach(function(x){x.setAttribute("aria-pressed",String(x===sb))});var m0=q(".dq3-ms",sb.closest(".dq3-in"));m0.className="dq3-ms";m0.textContent="";return}
      var a=e.target.closest(".dq3-ad");if(!a||a.classList.contains("ok"))return;var box=a.closest(".dq3-in"),sz=q(".dq3-sz",box),pick=q('[aria-pressed="true"]',sz),m=q(".dq3-ms",box);
      if(!pick){sz.classList.remove("sh");void sz.offsetWidth;sz.classList.add("sh");m.className="dq3-ms ko";m.textContent="Choisis ta taille.";return}
      a.classList.add("ok");a.textContent="✓";m.className="dq3-ms";m.textContent="Ajouté en taille "+pick.textContent+".";setTimeout(function(){a.classList.remove("ok");a.textContent="+"},1600)})});
  // DQ4 : photos qui arrivent ; DQ5 : engagements ; DQ6 : éclair
  qa("[data-dq4]").forEach(function(g){io(qa(".dq4-c",g),function(c){c.classList.add("in")},.15)});
  io(qa("[data-dq5]"),function(l){l.classList.add("in")},.3);
  io(qa(".dq6"),function(s){s.classList.add("in")},.3);
  // DQ6 : guide des tailles qui s'ouvre sur place
  qa("[data-dq6b]").forEach(function(b){var t=q("[data-dq6t]",b.parentNode);b.addEventListener("click",function(){var on=!t.classList.contains("on");t.classList.toggle("on",on);b.setAttribute("aria-expanded",String(on))})});
  // DQ7 : inscription (démonstration : rien n'est envoyé)
  qa("[data-dq7]").forEach(function(f){var m=q("[data-dq7m]",f.parentNode),i=q("input",f);
    f.addEventListener("submit",function(e){e.preventDefault();var ok=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.value.trim());f.classList.remove("err","done");void f.offsetWidth;
      if(!ok){f.classList.add("err");m.className="dq7-m ko";m.textContent="Cette adresse ne semble pas complète.";i.focus();return}
      f.classList.add("done");m.className="dq7-m ok";m.textContent="C'est noté ✓ Tu recevras le lien avant tout le monde. (Démonstration : aucune inscription envoyée.)";i.value=""})});
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches,hover=window.matchMedia&&matchMedia("(hover:hover)").matches;
  function io(els,cb,th){if(!window.IntersectionObserver||reduce){els.forEach(cb);return}var o=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){cb(e.target);o.unobserve(e.target)}})},{threshold:th||.2});els.forEach(function(e){o.observe(e)})}
  function copy(t){try{navigator.clipboard&&navigator.clipboard.writeText(t).catch(function(){})}catch(e){}}
  // MZ1 : grand menu et menu téléphone
  qa("[data-mz1]").forEach(function(s){var b=q("[data-mz1m]",s),m=q("[data-mz1b]",s),t=null;
    function set(o){s.classList.toggle("op",o);b.setAttribute("aria-expanded",String(o))}
    b.addEventListener("click",function(){set(!s.classList.contains("op"))});
    if(hover){b.addEventListener("mouseenter",function(){clearTimeout(t);set(true)});s.addEventListener("mouseleave",function(){t=setTimeout(function(){set(false)},250)})}
    m.addEventListener("click",function(){var o=!s.classList.contains("is-mob");s.classList.toggle("is-mob",o);m.setAttribute("aria-expanded",String(o))})});
  // MZ2 : repère qui glisse dans la pilule, menu téléphone
  qa("[data-mz2]").forEach(function(s){var n=q("[data-mz2n]",s),ind=q(".mz2-in",n),ls=qa("a",n),bt=q("[data-mz2b]",s);
    function go(a){ind.style.left=a.offsetLeft+"px";ind.style.width=a.offsetWidth+"px";ls.forEach(function(x){x.classList.toggle("mz2-hv",x===a)})}
    function home(){go(q("a.on",n)||ls[0])}
    ls.forEach(function(a){a.addEventListener("mouseenter",function(){go(a)});a.addEventListener("focus",function(){go(a)});a.addEventListener("click",function(){ls.forEach(function(x){x.classList.toggle("on",x===a)})})});
    n.addEventListener("mouseleave",home);setTimeout(home,80);if(window.ResizeObserver)new ResizeObserver(home).observe(n);
    bt.addEventListener("click",function(){var o=!s.classList.contains("op");s.classList.toggle("op",o);bt.setAttribute("aria-expanded",String(o))})});
  // MZ4 : diaporama (barres, glisser au doigt, pause au survol)
  qa("[data-mz4]").forEach(function(s){var sl=qa(".mz4-s",s),pg=q("[data-mz4p]",s),bs=qa("button",pg),cur=0,x0=null;
    function show(i){i=(i+sl.length)%sl.length;if(i===cur)return;cur=i;sl.forEach(function(e,k){e.classList.toggle("on",k===i)});bs.forEach(function(b,k){if(k===i)b.setAttribute("aria-current","true");else b.removeAttribute("aria-current")})}
    pg.addEventListener("click",function(e){var b=e.target.closest("button");if(b)show(bs.indexOf(b))});
    pg.addEventListener("animationend",function(e){if(e.animationName==="mz4bar")show(cur+1)});
    s.addEventListener("mouseenter",function(){s.classList.add("is-ps")});s.addEventListener("mouseleave",function(){s.classList.remove("is-ps")});
    s.addEventListener("pointerdown",function(e){x0=e.clientX});s.addEventListener("pointerup",function(e){if(x0===null)return;var d=e.clientX-x0;x0=null;if(Math.abs(d)>50)show(cur+(d<0?1:-1))})});
  // MZ5 : la photo du rayon suit la souris
  qa("[data-mz5]").forEach(function(s){var f=q("[data-mz5f]",s);if(!hover)return;
    qa(".mz5-l a",s).forEach(function(a,i){a.addEventListener("mouseenter",function(){f.src=a.dataset.img;f.style.setProperty("--r",(i%2?4:-5)+"deg");f.classList.add("on")});a.addEventListener("mouseleave",function(){f.classList.remove("on")})});
    s.addEventListener("mousemove",function(e){var r=s.getBoundingClientRect();f.style.left=(e.clientX-r.left+130)+"px";f.style.top=(e.clientY-r.top)+"px"})});
  // MZ6 : la bande avance avec le défilement, et se feuillette à la souris ou au doigt
  qa("[data-mz6]").forEach(function(s){var v=q("[data-mz6v]",s),t=q("[data-mz6t]",s),bar=q("[data-mz6b]",s),off=0,drag=null,manual=0;
    function max(){return Math.max(0,t.scrollWidth-v.clientWidth)}
    function apply(){off=Math.max(0,Math.min(max(),off));t.style.transform="translateX("+(-off)+"px)";var m=max();bar.style.width=(m?20+80*off/m:100)+"%"}
    function onScroll(){if(drag||Date.now()-manual<1500||!s.offsetParent)return;var r=s.getBoundingClientRect(),vh=window.innerHeight,p=(vh-r.top)/(vh+r.height);off=max()*Math.max(0,Math.min(1,(p-.15)/.7));apply()}
    if(!reduce)document.addEventListener("scroll",onScroll,{passive:true,capture:true});
    v.addEventListener("pointerdown",function(e){drag={x:e.clientX,o:off};v.classList.add("dr");v.setPointerCapture(e.pointerId)});
    v.addEventListener("pointermove",function(e){if(!drag)return;off=drag.o-(e.clientX-drag.x);apply()});
    function end(){if(drag){drag=null;manual=Date.now();v.classList.remove("dr")}}v.addEventListener("pointerup",end);v.addEventListener("pointercancel",end);
    v.addEventListener("wheel",function(e){if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){off+=e.deltaX;manual=Date.now();apply();e.preventDefault()}},{passive:false});
    apply()});
  // MZ7 : les vues du produit
  qa(".mz7").forEach(function(s){var m=q("[data-mz7m]",s),th=q(".mz7-th",s);th.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
    qa("button",th).forEach(function(x){if(x===b)x.setAttribute("aria-current","true");else x.removeAttribute("aria-current")});m.classList.add("fd");setTimeout(function(){m.src=b.dataset.src;m.alt=q("img",b).alt;m.classList.remove("fd")},200)})});
  // MZ9 : porté / à plat, compte à rebours et stock (valeurs d'exemple)
  var END9=Date.now()+((5*60+42)*60+18)*1000;
  qa("[data-mz9]").forEach(function(s){var ims=qa(".mz9-ph img",s),tg=q(".mz9-tg",s),c=q("[data-mz9c]",s),sn=q("[data-mz9s]",s),br=q("[data-mz9b]",s);
    tg.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;qa("button",tg).forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});ims.forEach(function(im,k){im.classList.toggle("on",k===+b.dataset.v)})});
    function tick(){var r=Math.max(0,END9-Date.now());c.textContent=[Math.floor(r/36e5),Math.floor(r/6e4)%60,Math.floor(r/1e3)%60].map(function(x){return String(x).padStart(2,"0")}).join(":")}tick();setInterval(tick,1000);
    io([s],function(){var n=0,goal=12;br.style.width=(goal/150*100)+"%";(function up(){n=Math.min(goal,n+1);sn.textContent=n;if(n<goal)setTimeout(up,60)})()},.3)});
  // MZ10 : pourcentage qui compte et code à copier
  qa("[data-mz10]").forEach(function(s){var n=q("[data-mz10n]",s),c=q("[data-mz10c]",s);
    io([s],function(){if(reduce){n.textContent=30;return}var v=0;(function up(){v=Math.min(30,v+1);n.textContent=v;if(v<30)setTimeout(up,30)})()},.4);
    c.addEventListener("click",function(){copy("ETE30");var i=q("i",c),t=i.textContent;c.classList.add("ok");i.textContent="Copié ✓";setTimeout(function(){c.classList.remove("ok");i.textContent=t},1600)})});
  // MZ11 : une réponse ouverte à la fois
  qa("[data-mz11]").forEach(function(w){w.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var o=b.getAttribute("aria-expanded")!=="true";qa("button",w).forEach(function(x){x.setAttribute("aria-expanded",String(x===b&&o))})})});
  // MZ12 : code de bienvenue (démonstration : rien n'est envoyé)
  qa("[data-mz12]").forEach(function(s){var f=q("[data-mz12f]",s),i=q("input",f),ok=q("[data-mz12o]",s),m=q("[data-mz12m]",s);
    f.addEventListener("submit",function(e){e.preventDefault();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.value.trim())){f.classList.remove("err");void f.offsetWidth;f.classList.add("err");m.textContent="Cette adresse ne semble pas complète.";i.focus();return}
      m.textContent="";f.hidden=true;ok.hidden=false});
    q("[data-mz12c]",s).addEventListener("click",function(e){var b=e.currentTarget,t=q("i",b);copy("BIENVENUE10");b.classList.add("ok");t.textContent="Copié ✓";setTimeout(function(){b.classList.remove("ok");t.textContent="Copier"},1600)})});
  // MZ13 : le nom monte en arrivant en bas
  io(qa("[data-mz13]"),function(s){s.classList.add("in")},.35);
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function eur(v){return (Math.round(v*100)/100).toFixed(2).replace(".",",").replace(",00","")+" €"}
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TRASH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>';
  function qty(n){return '<span class="kc-q"><button type="button" data-d="-1" aria-label="Retirer un">−</button><span>'+n+'</span><button type="button" data-d="1" aria-label="Ajouter un">+</button></span>'}
  function gauge(box,tot,goal){var p=q("p",box),b=q("i b",box);b.style.width=Math.min(100,tot/goal*100)+"%";box.classList.toggle("ok",tot>=goal);p.innerHTML=tot>=goal?"Livraison offerte ✓":"Plus que <b>"+eur(goal-tot)+"</b> pour la livraison offerte (seuil d'exemple)."}
  function removeRow(li,done){li.classList.add("rm");setTimeout(done,reduce?0:380)}
  // KC1 : tiroir néon (réservation, jauge, quantités, look à compléter, code DROP10)
  qa("[data-kc1]").forEach(function(s){var items=[{img:"rp-d2.webp",n:"Baskets RS-1",o:"Pointure 42",p:129,q:1},{img:"rp-d3.webp",n:"Sweat à capuche",o:"Taille L",p:69,q:1}],up=[{img:"rp-d5.webp",n:"T-shirt oversize",o:"Taille M",p:35},{img:"rp-d4.webp",n:"Pantalon cargo",o:"Taille 40",p:79}],off=0,GOAL=250,END=Date.now()+600000;
    var L=q("[data-kcl]",s),U=q("[data-kcu]",s);
    function draw(){var sub=items.reduce(function(a,x){return a+x.p*x.q},0),tot=sub*(1-off);
      L.innerHTML=items.map(function(x,i){return '<li data-i="'+i+'"><img src="photos/'+x.img+'" alt=""><div><b>'+x.n+'</b><small>'+x.o+'</small>'+qty(x.q)+'</div><div class="kc-pr">'+eur(x.p*x.q)+'<button type="button" class="kc-rm" aria-label="Retirer '+x.n+'">'+TRASH+'</button></div></li>'}).join("")||'<li style="display:block;color:var(--q-mu)">Ton panier est vide.</li>';
      U.innerHTML=up.map(function(x,i){return '<article><img src="photos/'+x.img+'" alt=""><div><b>'+x.n+'</b><small>'+eur(x.p)+'</small></div><button type="button" data-u="'+i+'" aria-label="Ajouter '+x.n+'">+</button></article>'}).join("");q(".kc1-up",s).hidden=!up.length;
      q("[data-kcn]",s).textContent=items.reduce(function(a,x){return a+x.q},0);q("[data-kcs]",s).textContent=eur(tot);gauge(q(".kc1-gg",s),tot,GOAL)}
    s.addEventListener("click",function(e){var t=e.target.closest("button");if(!t)return;var li=t.closest("li[data-i]");
      if(t.hasAttribute("data-kco")){s.classList.add("op");return}if(t.hasAttribute("data-kcx")){s.classList.remove("op");return}
      if(li&&t.dataset.d){var x=items[+li.dataset.i];x.q=Math.max(1,x.q+ +t.dataset.d);draw();return}
      if(li&&t.classList.contains("kc-rm")){removeRow(li,function(){items.splice(+li.dataset.i,1);draw()});return}
      if(t.dataset.u){var u=up.splice(+t.dataset.u,1)[0];items.push({img:u.img,n:u.n,o:u.o,p:u.p,q:1});draw();return}
      if(t.hasAttribute("data-kcgo")){var h=t.innerHTML;t.textContent="Démonstration : aucune commande ✓";setTimeout(function(){t.innerHTML=h},1600)}});
    q("[data-kcc]",s).addEventListener("submit",function(e){e.preventDefault();var v=q("input",e.target).value.trim().toUpperCase(),m=q("[data-kccm]",s);if(v==="DROP10"){off=.1;m.className="kc1-cm";m.textContent="Code DROP10 appliqué : −10 %."}else{off=0;m.className="kc1-cm ko";m.textContent="Ce code n'existe pas."}draw()});
    function tick(){var r=Math.max(0,END-Date.now());q("[data-kct]",s).textContent=String(Math.floor(r/6e4)).padStart(2,"0")+":"+String(Math.floor(r/1e3)%60).padStart(2,"0")}tick();setInterval(tick,1000);
    draw();setTimeout(function(){s.classList.add("op")},400)});
  // KC2 : page panier (couleur et taille modifiables, mettre de côté, cadeau, code ETE10, panier vide)
  var JOURS=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."],MOIS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
  function addBiz(d,n){d=new Date(d);while(n>0){d.setDate(d.getDate()+1);if(d.getDay()%6)n--}return d}
  qa("[data-kc2]").forEach(function(s){var items=[{n:"Sac Demi-lune",p:129,q:1,c:0,col:[["Cognac","#9A5A2E","sl-b2.webp"],["Noir","#141414","mo-s1.webp"],["Crème","#EFE6D6","mo-s2.webp"]]},{n:"Robe en lin",p:79,q:1,img:"sl-b4.webp",sz:["XS","S","M","L"],z:"M"},{n:"Lunettes de soleil",p:89,q:1,img:"sl-b1.webp"}],saved=[],off=0;
    var L=q("[data-kcl]",s),SL=q("[data-kcsl]",s),gf=q("[data-kcgf]",s);
    function img(x){return x.col?x.col[x.c][2]:x.img}
    function draw(){var sub=items.reduce(function(a,x){return a+x.p*x.q},0),disc=sub*off,gift=gf.checked&&items.length?3.5:0,tot=sub-disc+gift;
      L.innerHTML=items.map(function(x,i){var op=x.col?x.col.map(function(c,k){return '<button type="button" class="sw" style="background:'+c[1]+'" aria-label="'+c[0]+'" aria-pressed="'+(k===x.c)+'" data-c="'+k+'"></button>'}).join("")+'<small>'+x.col[x.c][0]+'</small>':x.sz?'<select data-z aria-label="Taille">'+x.sz.map(function(z){return '<option'+(z===x.z?" selected":"")+'>'+z+'</option>'}).join("")+'</select>':"";
        return '<li data-i="'+i+'"><img src="photos/'+img(x)+'" alt="'+x.n+'"><div><h4>'+x.n+'</h4><div class="kc2-op">'+op+'</div>'+qty(x.q)+'<div class="kc2-ln"><button type="button" data-rm>Retirer</button><button type="button" data-sv>Mettre de côté</button></div></div><span class="kc-pr">'+eur(x.p*x.q)+'</span></li>'}).join("");
      SL.innerHTML=saved.map(function(x,i){return '<li><img src="photos/'+img(x)+'" alt=""><span>'+x.n+'</span><button type="button" data-back="'+i+'">Remettre au panier</button></li>'}).join("");
      q("[data-kcsv]",s).hidden=!saved.length;q("[data-kce]",s).hidden=!!items.length;L.hidden=!items.length;
      q("[data-kcn]",s).textContent=items.reduce(function(a,x){return a+x.q},0);q("[data-kcs]",s).textContent=eur(sub);
      q("[data-kcdr]",s).hidden=!off;q("[data-kcdv]",s).textContent="−"+eur(disc);q("[data-kcgr]",s).hidden=!gift;q("[data-kctt]",s).textContent=eur(tot);
      var n=new Date(),a=addBiz(n,2),b=addBiz(n,3);q("[data-kcdl]",s).innerHTML="Livraison estimée entre le <b>"+JOURS[a.getDay()]+" "+a.getDate()+" "+MOIS[a.getMonth()]+"</b> et le <b>"+JOURS[b.getDay()]+" "+b.getDate()+" "+MOIS[b.getMonth()]+"</b> (délai d'exemple)."}
    s.addEventListener("click",function(e){var t=e.target.closest("button");if(!t)return;var li=t.closest("li[data-i]"),x=li?items[+li.dataset.i]:null;
      if(x&&t.dataset.d){x.q=Math.max(1,x.q+ +t.dataset.d);draw()}
      else if(x&&t.dataset.c!==undefined){x.c=+t.dataset.c;draw()}
      else if(x&&t.hasAttribute("data-rm")){removeRow(li,function(){items.splice(items.indexOf(x),1);draw()})}
      else if(x&&t.hasAttribute("data-sv")){removeRow(li,function(){items.splice(items.indexOf(x),1);saved.push(x);draw()})}
      else if(t.dataset.back!==undefined){items.push(saved.splice(+t.dataset.back,1)[0]);draw()}
      else if(t.hasAttribute("data-kcgo")){var h=t.textContent;t.textContent="Démonstration : aucune commande ✓";setTimeout(function(){t.textContent=h},1600)}});
    s.addEventListener("change",function(e){if(e.target.hasAttribute("data-z")){items[+e.target.closest("li").dataset.i].z=e.target.value}if(e.target===gf)draw()});
    q("[data-kcc]",s).addEventListener("submit",function(e){e.preventDefault();var v=q("input",e.target).value.trim().toUpperCase(),m=q("[data-kccm]",s);if(v==="ETE10"){off=.1;m.className="kc2-cm";m.textContent="Code ETE10 appliqué : −10 %."}else{off=0;m.className="kc2-cm ko";m.textContent="Ce code n'existe pas."}draw()});
    draw()});
  // KC3 : mini-panier qui surgit
  qa("[data-kc3]").forEach(function(s){var ts=q("[data-kcts]",s),pl=q("[data-kcp]",s),n=0,tot=0,tm=null,GOAL=150;
    function hide(){ts.classList.remove("on")}
    s.addEventListener("click",function(e){var a=e.target.closest("[data-kca]");
      if(a){n++;tot+=+a.dataset.price;q("[data-kcti]",ts).src=a.dataset.img;q("[data-kctn]",ts).textContent=a.dataset.name;q("[data-kctp]",ts).textContent=eur(+a.dataset.price);
        q("[data-kcn]",pl).textContent=n;q("[data-kcs]",ts).textContent=eur(tot);gauge(q(".kc3-gg",ts),tot,GOAL);
        pl.classList.remove("bp");void pl.offsetWidth;pl.classList.add("bp");ts.classList.remove("on");void ts.offsetWidth;ts.classList.add("on");clearTimeout(tm);tm=setTimeout(hide,5000);return}
      if(e.target.closest("[data-kctx]"))hide();
      if(e.target.closest("[data-kcp]")&&n){ts.classList.toggle("on")}});
    ts.addEventListener("mouseenter",function(){clearTimeout(tm)});ts.addEventListener("mouseleave",function(){tm=setTimeout(hide,2500)})});
})();

;

(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function eur(v){return (Math.round(v*100)/100).toFixed(2).replace(".",",").replace(",00","")+" €"}
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches,hover=window.matchMedia&&matchMedia("(hover:hover)").matches;
  function io(els,cb,th){if(!window.IntersectionObserver||reduce){els.forEach(cb);return}var o=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){cb(e.target);o.unobserve(e.target)}})},{threshold:th||.25});els.forEach(function(e){o.observe(e)})}
  function view(el){var f=el.closest(".frame");if(f&&f.scrollHeight>f.clientHeight+4){var r=f.getBoundingClientRect();return{top:r.top,h:f.clientHeight}}return{top:0,h:window.innerHeight}}
  function count(el,to,ms,pad){if(reduce){el.textContent=pad?String(to).padStart(pad,"0"):to;return}var t0=null;function st(t){t0=t0||t;var k=Math.min(1,(t-t0)/ms),v=Math.round(to*(1-Math.pow(1-k,3)));el.textContent=pad?String(v).padStart(pad,"0"):v;if(k<1)requestAnimationFrame(st)}requestAnimationFrame(st)}
  function flash(b,txt){if(b.classList.contains("ok"))return;var h=b.innerHTML;b.classList.add("ok");b.textContent=txt;setTimeout(function(){b.classList.remove("ok");b.innerHTML=h},1500)}
  var scrollers=[];document.addEventListener("scroll",function(){scrollers.forEach(function(f){f()})},{passive:true,capture:true});window.addEventListener("resize",function(){scrollers.forEach(function(f){f()})});
  // ZM1 : volets
  qa("[data-zm1]").forEach(function(s){var vs=qa(".zm1-v",s);function on(v){vs.forEach(function(x){x.classList.toggle("on",x===v)})}
    vs.forEach(function(v){v.addEventListener("mouseenter",function(){if(hover)on(v)});v.addEventListener("focus",function(){on(v)})})});
  // ZM2 : le mot grandit avec le défilement et ouvre la photo
  qa("[data-zm2]").forEach(function(s){var st=q(".zm2-st",s);
    function upd(){if(!s.offsetParent)return;var v=view(s),r=s.getBoundingClientRect(),run=r.height-st.offsetHeight,p=Math.max(0,Math.min(1,(v.top-r.top)/Math.max(1,run)));st.style.setProperty("--p",p.toFixed(3));st.style.setProperty("--o",Math.min(1,p*1.6).toFixed(3))}
    scrollers.push(upd);upd();
    if(hover&&!reduce)s.addEventListener("mousemove",function(e){var r=s.getBoundingClientRect();st.style.setProperty("--mx",((e.clientX-r.left)/r.width-.5)*-24+"px");st.style.setProperty("--my",((e.clientY-r.top)/r.height-.5)*-12+"px")})});
  // ZM3 : tenue à points
  var LOOK=[["Lunettes de soleil",89,"sl-b1.webp"],["Robe en lin",79,"sl-b4.webp"],["Sac Demi-lune",129,"sl-b2.webp"],["Sandales croisées",65,"md-o5.webp"]];
  qa("[data-zm3]").forEach(function(s){var pop=q("[data-zm3p]",s),ph=q(".zm3-ph",s);
    function tot(){var on=qa("[data-zm3c]",s).filter(function(c){return c.checked}),sum=on.reduce(function(a,c){return a+LOOK[+c.dataset.zm3c][1]},0),all=on.length===LOOK.length;
      q("[data-zm3t]",s).textContent=eur(all?sum*.9:sum);q("[data-zm3d]",s).style.visibility=all?"visible":"hidden"}
    s.addEventListener("click",function(e){var pt=e.target.closest(".zm3-pt");
      if(pt){var i=+pt.dataset.i,was=pt.getAttribute("aria-expanded")==="true";qa(".zm3-pt",s).forEach(function(x){x.setAttribute("aria-expanded","false")});qa(".zm3-l li",s).forEach(function(l){l.classList.toggle("hl",!was&&+l.dataset.i===i)});
        if(was){pop.hidden=true;return}pt.setAttribute("aria-expanded","true");var it=LOOK[i];pop.innerHTML='<img src="photos/'+it[2]+'" alt=""><div><b>'+it[0]+'</b><span>'+eur(it[1])+'</span></div><button type="button">Ajouter</button>';
        var x=parseFloat(pt.style.left),y=parseFloat(pt.style.top);pop.style.left=(x>55?"auto":"calc("+x+"% + 24px)");pop.style.right=(x>55?"calc("+(100-x)+"% + 24px)":"auto");pop.style.top="calc("+Math.min(y,82)+"% - 30px)";pop.hidden=false;return}
      var b=e.target.closest(".zm3-pop button");if(b){flash(b,"Ajouté ✓");return}
      var g=e.target.closest("[data-zm3g]");if(g)flash(g,"Look ajouté ✓ (démonstration)")});
    s.addEventListener("change",tot);tot()});
  // ZM4 : compose ta tenue
  qa("[data-zm4]").forEach(function(s){var stage=q("[data-zm4s]",s),tt=q("[data-zm4t]",s),last=0;
    function pick(){var sel=qa(".zm4-r",s).map(function(r){return q('[aria-pressed="true"]',r)});stage.innerHTML=sel.map(function(b){return '<img src="'+q("img",b).getAttribute("src")+'" alt="'+q("span",b).textContent+'">'}).join("");
      var sum=sel.reduce(function(a,b){return a+parseFloat(q("small",b).textContent)},0);var from=last;last=sum;if(reduce){tt.textContent=eur(sum);return}var t0=null;(function st(t){t0=t0||t;var k=Math.min(1,(t-t0)/500);tt.textContent=eur(from+(sum-from)*k);if(k<1)requestAnimationFrame(st)})(performance.now())}
    s.addEventListener("click",function(e){var b=e.target.closest(".zm4-o button");if(b){qa("button",b.parentNode).forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});pick();return}
      var g=e.target.closest("[data-zm4g]");if(g)flash(g,"Tenue ajoutée ✓ (démonstration)")});pick()});
  // ZM5 : filtres et tri avec déplacement des tuiles (FLIP)
  qa("[data-zm5]").forEach(function(s){var g=q("[data-zm5g]",s),cs=qa(".zm5-c",g),cat="Tout";
    function apply(){var first=new Map(cs.map(function(c){return [c,c.getBoundingClientRect()]})),mode=q("[data-zm5s]",s).value;
      var sorted=cs.slice().sort(function(a,b){return mode==="up"?a.dataset.p-b.dataset.p:mode==="down"?b.dataset.p-a.dataset.p:a.dataset.o-b.dataset.o});
      sorted.forEach(function(c){g.appendChild(c);c.hidden=!(cat==="Tout"||c.dataset.c===cat)});var nv=sorted.filter(function(c){return !c.hidden}).length;q("[data-zm5n]",s).textContent=nv;var zw=q("[data-zm5w]",s);if(zw)zw.textContent=nv>1?"pièces":"pièce";
      if(reduce)return;sorted.forEach(function(c){if(c.hidden)return;var a=first.get(c),b=c.getBoundingClientRect();if(!a||!a.width){c.animate([{opacity:0,transform:"scale(.9)"},{opacity:1,transform:"none"}],{duration:400,easing:"ease-out"});return}
        c.animate([{transform:"translate("+(a.left-b.left)+"px,"+(a.top-b.top)+"px)"},{transform:"none"}],{duration:550,easing:"cubic-bezier(.2,.8,.2,1)"})})}
    s.addEventListener("click",function(e){var b=e.target.closest(".zm5-ch button");if(!b)return;cat=b.dataset.c;qa(".zm5-ch button",s).forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});apply()});
    q("[data-zm5s]",s).addEventListener("change",apply)});
  // ZM6 : ajout depuis le défilement
  qa("[data-zm6]").forEach(function(s){s.addEventListener("click",function(e){var b=e.target.closest(".zm6-c button");if(!b)return;e.preventDefault();flash(b,"✓")})});
  // ZM7 : compteur ; ZM8 : capsule
  io(qa("[data-zm7]"),function(n){var now=new Date(),end=new Date(now.getFullYear(),8,22);if(end<now)end=new Date(now.getFullYear()+1,8,22);count(n,Math.max(0,Math.round((end-now)/864e5)),1200)},.4);
  qa("[data-zm8]").forEach(function(s){io([s],function(){s.classList.add("in");count(q("[data-zm8n]",s),47,1400,4)},.3);q("[data-zm8g]",s).addEventListener("click",function(e){flash(e.currentTarget,"Réservée ✓ (démonstration)")})});
  // ZM9 : mots qui s'allument au défilement
  qa("[data-zm9]").forEach(function(s){var p=q("[data-zm9t]",s);
    [].slice.call(p.childNodes).forEach(function(n){if(n.nodeType===3){var f=document.createDocumentFragment();n.textContent.split(/(\s+)/).forEach(function(w){if(!w)return;if(/^\s+$/.test(w))f.appendChild(document.createTextNode(w));else{var sp=document.createElement("span");sp.className="zmw";sp.textContent=w;f.appendChild(sp)}});p.replaceChild(f,n)}});
    var parts=qa(".zmw, img",p);function upd(){if(!s.offsetParent)return;var v=view(s),r=p.getBoundingClientRect(),k=Math.max(0,Math.min(1,(v.top+v.h*.8-r.top)/(r.height+v.h*.3))),n=Math.round(k*parts.length);parts.forEach(function(x,i){x.classList.toggle("on",i<n)})}
    if(reduce)parts.forEach(function(x){x.classList.add("on")});else{scrollers.push(upd);upd()}});
  // ZM10 : loupe
  qa("[data-zm10]").forEach(function(b){var l=q("[data-zm10l]",b),Z=2.6;
    function mv(e){var r=b.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;l.style.left=x+"px";l.style.top=y+"px";l.style.backgroundSize=(r.width*Z)+"px "+(r.height*Z)+"px";l.style.backgroundPosition=(-x*Z+l.offsetWidth/2)+"px "+(-y*Z+l.offsetHeight/2)+"px"}
    b.addEventListener("pointerenter",function(e){b.classList.add("on");mv(e)});b.addEventListener("pointermove",mv);b.addEventListener("pointerleave",function(){b.classList.remove("on")});b.addEventListener("pointerdown",function(e){b.classList.add("on");mv(e)})});
  // ZM11 : tournée (ville allumée, trajet tracé)
  qa("[data-zm11]").forEach(function(s){var pts=qa(".zm11-pt",s),ls=qa(".zm11-l li",s),svg=q("[data-zm11l]",s);
    function on(i){pts.forEach(function(p,k){p.classList.toggle("on",k===i)});ls.forEach(function(l,k){l.classList.toggle("on",k===i)});
      var d=pts.slice(0,i+1).map(function(p,k){return (k?"L":"M")+parseFloat(p.style.left)+" "+parseFloat(p.style.top)}).join(" ");svg.innerHTML=i?'<path d="'+d+'"/>':""}
    ls.forEach(function(l,i){l.addEventListener("mouseenter",function(){on(i)});l.addEventListener("click",function(){on(i)})});on(0)});
  // ZM12 : vidéos verticales (celle du milieu joue, puis la suivante)
  qa("[data-zm12]").forEach(function(s){var vs=qa(".zm12-v",s),cur=1;
    function on(i){cur=(i+vs.length)%vs.length;vs.forEach(function(v,k){v.classList.toggle("on",k===cur);v.style.order=String((k-cur+1+vs.length)%vs.length)})}on(1);
    s.addEventListener("click",function(e){var b=e.target.closest("figcaption button");if(b){flash(b,"✓");return}var v=e.target.closest(".zm12-v");if(v&&!v.classList.contains("on"))on(+v.dataset.i)});
    s.addEventListener("animationend",function(e){if(e.animationName==="zm12bar"&&e.target.closest(".zm12-v.on"))on(cur+1)})});
  // ZM13 : filtres d'avis, jauge d'ajustement
  qa("[data-zm13]").forEach(function(s){io([s],function(){q("[data-zm13f]",s).style.left="50%"},.3);
    s.addEventListener("click",function(e){var b=e.target.closest(".zm13-ch button");if(!b)return;qa(".zm13-ch button",s).forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});var f=b.dataset.f;
      qa(".zm13-c",s).forEach(function(c){c.hidden=!(f==="all"||c.dataset.ph===f||c.dataset.sz===f)})})});
  // ZM14 : cartes qui se retournent au toucher
  document.addEventListener("click",function(e){var c=e.target.closest(".zm14-c");if(c)c.setAttribute("aria-pressed",String(c.getAttribute("aria-pressed")!=="true"))});
  // ZM17 : ouvert maintenant + formulaire
  qa("[data-zm17]").forEach(function(s){var d=new Date(),day=d.getDay()||7,row=q('tr[data-d="'+day+'"]',s),badge=q("[data-zm17o]",s);if(row)row.classList.add("td");
    var t=row?q("td",row).textContent:"",m=t.match(/(\d+)\s*h\s*–\s*(\d+)\s*h/),h=d.getHours()+d.getMinutes()/60,open=!!m&&h>=+m[1]&&h<+m[2];badge.textContent=open?"Ouvert maintenant":"Fermé pour le moment";badge.classList.toggle("on",open);
    var f=q("[data-zm17f]",s);f.addEventListener("submit",function(e){e.preventDefault();var fs=qa("input,textarea",f),ok=true;fs.forEach(function(x){var bad=!x.value.trim()||(x.type==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x.value.trim()));x.classList.toggle("ko",bad);if(bad)ok=false});
      var msg=q("[data-zm17m]",f);msg.className=ok?"":"ko";msg.textContent=ok?"Message prêt ✓ (démonstration : rien n'est envoyé)":"Complète les champs en rouge.";if(ok)fs.forEach(function(x){x.value=""})})});
  // ZM18 : recherche plein écran
  var CAT=window.ZM18_CAT||[["rp-d2.webp","Baskets RS-1",129],["rp-d3.webp","Sweat à capuche",69],["rp-d4.webp","Pantalon cargo",79],["rp-d5.webp","T-shirt oversize",35],["md-g1.webp","Casquette",29],["md-g2.webp","Sac banane",39],["md-g3.webp","Veste matelassée",119],["md-g4.webp","Bonnet côtelé",25]];
  function norm(t){return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}
  qa("[data-zm18]").forEach(function(s){var inp=q("[data-zm18i]",s),rs=q("[data-zm18r]",s);
    function find(){var v=norm(inp.value.trim());if(!v){rs.innerHTML="";return}var hit=CAT.filter(function(c){return norm(c[1]).indexOf(v)>-1});
      rs.innerHTML=hit.length?hit.map(function(c,i){var n=norm(c[1]),k=n.indexOf(v),name=c[1].slice(0,k)+"<mark>"+c[1].slice(k,k+v.length)+"</mark>"+c[1].slice(k+v.length);return '<a href="#" onclick="return false" style="animation-delay:'+(i*60)+'ms"><img src="photos/'+c[0]+'" alt=""><b>'+name+'</b><i>'+eur(c[2])+'</i></a>'}).join(""):'<p>Aucune pièce ne correspond à « '+inp.value.replace(/</g,"&lt;")+' ». '+(window.ZM18_HINT||'Essaie « sweat » ou « baskets ».')+'</p>'}
    q("[data-zm18o]",s).addEventListener("click",function(){s.classList.add("op");setTimeout(function(){inp.focus({preventScroll:true})},300)});
    q("[data-zm18x]",s).addEventListener("click",function(){s.classList.remove("op")});
    inp.addEventListener("input",find);inp.addEventListener("keydown",function(e){if(e.key==="Escape")s.classList.remove("op")});
    s.addEventListener("click",function(e){var b=e.target.closest("[data-q]");if(b){inp.value=b.dataset.q;find()}})});
  // ZM19 : fenêtre de bienvenue
  qa("[data-zm19]").forEach(function(s){var f=q("[data-zm19f]",s),o=q("[data-zm19o]",s);function open(){s.classList.add("op")}function close(){s.classList.remove("op")}
    io([s],function(){setTimeout(open,reduce?0:1200)},.5);
    qa("[data-zm19x]",s).forEach(function(b){b.addEventListener("click",close)});q("[data-zm19r]",s).addEventListener("click",open);
    f.addEventListener("submit",function(e){e.preventDefault();var i=q("input",f);if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.value.trim())){i.classList.remove("ko");void i.offsetWidth;i.classList.add("ko");return}
      f.hidden=true;o.className="ok";o.textContent="Ton code : SOLEIL10 (exemple) · démonstration : aucune inscription envoyée."})});
})();

;
/* CM:JS */
(function(){
  var qa=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
  var eur=function(c){return (c/100).toFixed(2).replace(".",",")+" €"};
  var mailOk=function(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)};
  // Vérifie les champs requis : un champ oublié tremble et se souligne ; renvoie vrai si tout est bon.
  function check(form){var ok=true;qa("input[required]",form).forEach(function(i){if(i.offsetParent===null)return;var bad=!i.value.trim()||(i.type==="email"&&!mailOk(i.value.trim()));i.classList.remove("cm-bad");if(bad){void i.offsetWidth;i.classList.add("cm-bad");ok=false}});return ok}
  var go=function(p){if(typeof window.TB_GO==="function")window.TB_GO(p)};
  // commande : étape en cours, total selon la livraison, envoi
  qa("[data-cm1]").forEach(function(s){
    var f=s.querySelector("[data-cm1f]"),r=s.querySelector("[data-cm1r]"),sub=+r.dataset.sub,st=qa(".cm1-st li",s),m=s.querySelector("[data-cm1m]");
    function total(){var c=s.querySelector("input[name=cm1d]:checked");var l=c?+c.dataset.c:0;s.querySelector("[data-cm1l]").textContent=eur(l);s.querySelector("[data-cm1tt]").textContent=eur(sub+l);s.querySelector("[data-cm1t]").textContent=eur(sub+l)}
    f.addEventListener("change",total);
    f.addEventListener("focusin",function(e){var fs=e.target.closest("fieldset");if(!fs)return;st.forEach(function(li,i){li.classList.toggle("on",i<=+fs.dataset.s)})});
    f.addEventListener("submit",function(e){e.preventDefault();if(!check(f)){m.textContent="Il manque une information : regarde les champs soulignés.";m.classList.remove("ok");return}
      st.forEach(function(li){li.classList.add("on")});m.textContent="Commande d'exemple validée (démonstration : aucun paiement).";m.classList.add("ok");setTimeout(function(){go("merci")},700)});
    total();
  });
  // compte : onglets, connexion, espace client, déconnexion
  qa("[data-cm3]").forEach(function(s){
    var bx=s.querySelector(".cm3-bx"),f=s.querySelector("[data-cm3f]"),me=s.querySelector(".cm3-me"),m=s.querySelector("[data-cm3m]"),lab=s.querySelector("[data-cm3l]"),tb=s.querySelector(".cm3-tb");
    s.addEventListener("click",function(e){var t=e.target.closest("[data-cm3t]");if(t){bx.dataset.cm3v=t.dataset.cm3t;qa("[data-cm3t]",s).forEach(function(x){x.setAttribute("aria-selected",String(x===t))});lab.textContent=t.dataset.cm3t==="in"?"Se connecter":"Créer mon compte";return}
      if(e.target.closest("[data-cm3x]")){me.hidden=true;f.hidden=false;tb.hidden=false;f.reset()}});
    f.addEventListener("submit",function(e){e.preventDefault();if(!check(f)){m.textContent="Il manque une information.";m.classList.remove("ok");return}
      var p=f.querySelector('input[autocomplete="given-name"]').value.trim();me.querySelector(".cm3-hi").textContent="Bonjour"+(p&&bx.dataset.cm3v==="up"?" "+p:"")+" !";f.hidden=true;tb.hidden=true;me.hidden=false});
  });
  // aide : suivi d'exemple
  qa("[data-cm4]").forEach(function(s){
    var f=s.querySelector("[data-cm4f]"),st=s.querySelector("[data-cm4s]"),m=s.querySelector("[data-cm4m]");
    f.addEventListener("submit",function(e){e.preventDefault();if(!check(f)){m.textContent="Indique le numéro et l'e-mail de la commande.";m.classList.remove("ok");st.hidden=true;return}
      st.hidden=false;m.textContent="Exemple de suivi (démonstration : aucune commande réelle n'est recherchée).";m.classList.add("ok")});
  });
  // légal : onglets
  qa("[data-cm5]").forEach(function(s){
    s.addEventListener("click",function(e){var t=e.target.closest("[data-cm5t]");if(!t)return;qa("[data-cm5t]",s).forEach(function(x){x.setAttribute("aria-selected",String(x===t))});
      qa("[data-cm5p]",s).forEach(function(p){p.hidden=p.dataset.cm5p!==t.dataset.cm5t})});
  });
  // article : barre de lecture, photo qui glisse
  var arts=qa("[data-cm6]");
  if(arts.length){var tick=function(){arts.forEach(function(s){if(!s.offsetParent)return;var r=s.getBoundingClientRect(),h=r.height-innerHeight;var p=Math.max(0,Math.min(1,-r.top/(h>0?h:1)));s.querySelector("[data-cm6p]").style.width=(p*100)+"%";
      var ph=s.querySelector(".cm6-ph");if(ph){var q=ph.getBoundingClientRect();s.style.setProperty("--cm6y",(-7.5+Math.max(-1,Math.min(1,q.top/innerHeight))*7.5)+"%")}})};
    addEventListener("scroll",tick,{passive:true});addEventListener("resize",tick);tick()}
})();

;
/* En-tête classique : menu téléphone */
(function(){document.addEventListener("click",function(e){var bd=document.querySelector("[data-bd]");if(!bd)return;
  if(e.target.closest("[data-bdo]"))bd.classList.add("on");else if(e.target.closest("[data-bdx]")||e.target===bd||e.target.closest(".bd-nv a"))bd.classList.remove("on")});
  document.querySelectorAll(".bd-nv a").forEach(function(x,i){x.style.transitionDelay=(.15+i*.06)+"s"});
  document.addEventListener("keydown",function(e){var bd=document.querySelector("[data-bd]");if(bd&&e.key==="Escape")bd.classList.remove("on")})})();
