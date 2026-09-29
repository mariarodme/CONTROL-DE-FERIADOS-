const CACHE_NAME="monte-carlo-unificado-v1";
const BASE="/CONTROL-DE-FERIADOS-/";
const CORE=["index.html","styles.css","app.js","unified.js","cloud.js","firebase-config.js","xlsx.js","manifest.webmanifest","app-icon.svg","icon-180.png","icon-192.png","icon-512.png","monte_carlo_pool_hero.jpg","monte_carlo_office_hero.jpg"].map((name)=>BASE+name);
self.addEventListener("install",(event)=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(async(cache)=>{
    await cache.add(BASE+"index.html");
    await Promise.allSettled(CORE.map((url)=>cache.add(url)));
  }));
});
self.addEventListener("activate",(event)=>{
  event.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((key)=>key.startsWith("monte-carlo-unificado-")&&key!==CACHE_NAME).map((key)=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch",(event)=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).then((response)=>{
      if(response.ok)caches.open(CACHE_NAME).then((cache)=>cache.put(BASE+"index.html",response.clone()));
      return response;
    }).catch(()=>caches.match(BASE+"index.html")));
    return;
  }
  event.respondWith(fetch(request).then((response)=>{
    if(response.ok)caches.open(CACHE_NAME).then((cache)=>cache.put(request,response.clone()));
    return response;
  }).catch(()=>caches.match(request,{ignoreSearch:true})));
});
