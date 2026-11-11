const CACHE='toneary-shell-v4';
const SHELL=['./','./index.html','./style.css','./app.js','./api.js','./public-config.js','./account.js','./account-ui.js','./sync-store.js','./search.js','./ui-search.js','./discovery.js','./vendor/supabase-2.119.0.js','./data/featured.json','./manifest.webmanifest','./assets/logo.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('toneary-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)))}return response}).catch(async()=>{const cached=await caches.match(event.request);if(cached)return cached;if(event.request.mode==='navigate')return caches.match('./index.html');return Response.error()}));
});
