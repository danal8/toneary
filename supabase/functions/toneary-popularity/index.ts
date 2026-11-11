const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400"};
const kinds={album:["release-group","release_group_mbids"],artist:["artist","artist_mbids"],track:["recording","recording_mbids"]} as const;
const cache=new Map<string,{at:number,data:unknown}>();
const pending=new Map<string,Promise<unknown>>();
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"public, max-age=21600"}})}
async function portraits(artists:Array<{id:string,name:string,type:string}>){
 const result:Record<string,unknown>={};
 for(const lang of ['en','el']){const selected=artists.filter(a=>/[\u0370-\u03ff]/.test(a.name)===(lang==='el'));if(!selected.length)continue;const titles=selected.flatMap(a=>a.type==='Group'?[a.name+' (band)',a.name]:[a.name,a.name+' (musician)',a.name+' (singer)']);
  const r=await fetch(`https://${lang}.wikipedia.org/w/api.php?`+new URLSearchParams({action:'query',titles:titles.join('|'),redirects:'1',prop:'pageimages|pageprops',piprop:'thumbnail',pithumbsize:'160',format:'json'}),{headers:{'User-Agent':'Toneary/1.1 (https://github.com/danal8/toneary)'},signal:AbortSignal.timeout(10000)});if(!r.ok)continue;const data=await r.json();const pages=Object.values(data.query?.pages||{}) as Array<any>;const redirects=new Map((data.query?.redirects||[]).map((x:any)=>[x.from,x.to]));
  for(const a of selected){const variants=a.type==='Group'?[a.name+' (band)',a.name]:[a.name,a.name+' (musician)',a.name+' (singer)'];const p=variants.map(title=>pages.find(p=>p.title===(redirects.get(title)||title))).find(p=>p?.thumbnail&&!Object.hasOwn(p.pageprops||{},'disambiguation'));if(p){const url=new URL(p.thumbnail.source);if(url.protocol==='https:'&&url.hostname.endsWith('.wikimedia.org'))result[a.id]={image:url.href,text:'',source:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title)}`}}}
 }return result;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{if(Number(req.headers.get('content-length')||0)>15000)return json({error:"Batch too large"},413);const body=await req.json();
  if(body.type==='cover'){
   if(typeof body.hash!=='string'||!/^[a-f0-9]{32}$/.test(body.hash))return json({error:'Invalid artwork'},400);
   const key='cover:'+body.hash;const saved=cache.get(key);if(saved&&Date.now()-saved.at<21600000)return json(saved.data);
   const r=await fetch('https://cdn-images.dzcdn.net/images/cover/'+body.hash+'/200x200-000000-80-0-0.jpg',{signal:AbortSignal.timeout(6000)});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/jpeg'))throw Error('Artwork unavailable');const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>20000||bytes[0]!==255||bytes[1]!==216)throw Error('Invalid artwork');const data={cover:'data:image/jpeg;base64,'+btoa(String.fromCharCode(...bytes))};if(cache.size>200)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),data});return json(data);
  }
  if(body.type==='genre'){
   if(typeof body.genre!=='string'||body.genre.length<2||body.genre.length>80||/["\\]/.test(body.genre))return json({error:'Invalid genre'},400);
   const key='genre:'+body.genre.toLowerCase();const saved=cache.get(key);if(saved&&Date.now()-saved.at<21600000)return json(saved.data);
   const query='tag:"'+body.genre+'" AND primarytype:album AND NOT secondarytype:compilation AND NOT secondarytype:live';const r=await fetch('https://musicbrainz.org/ws/2/release-group/?'+new URLSearchParams({query,limit:'100',fmt:'json'}),{headers:{'User-Agent':'Toneary/1.2 (https://github.com/danal8/toneary)'},signal:AbortSignal.timeout(7500)});if(!r.ok)throw Error('Discovery unavailable');const raw=await r.json();const data={'release-groups':raw['release-groups']||[]};if(cache.size>200)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),data});return json(data);
  }
  if(body.type==='catalog'){
   if(typeof body.query!=='string'||body.query.trim().length<2||body.query.length>180)return json({error:'Invalid query'},400);
   const key='catalog:'+body.query.toLowerCase();const saved=cache.get(key);if(saved&&Date.now()-saved.at<21600000)return json(saved.data);
   const r=await fetch('https://api.deezer.com/search?'+new URLSearchParams({q:body.query,limit:'30'}),{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Catalog unavailable');const raw=await r.json();if(raw.error)throw Error('Catalog unavailable');
   const data=(raw.data||[]).map((x:any)=>({title:x.title,artist:x.artist?.name||'',album:x.album?.title||'',cover:x.album?.cover_big||'',albumURL:x.album?.id?'https://www.deezer.com/album/'+x.album.id:''}));if(cache.size>200)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),data});return json(data);
  }
  if(body.type==='recording-search'){if(typeof body.query!=='string'||body.query.length<1||body.query.length>180)return json({error:'Invalid query'},400);const key='recording-search:'+body.query.toLowerCase();const saved=cache.get(key);if(saved&&Date.now()-saved.at<21600000)return json(saved.data);const r=await fetch('https://labs.api.listenbrainz.org/recording-search/json?'+new URLSearchParams({query:body.query}),{signal:AbortSignal.timeout(10000),headers:{'User-Agent':'Toneary/1.1 (https://github.com/danal8/toneary)'}});if(!r.ok)return json([],200);const raw=await r.json();const data=Array.isArray(raw)?raw.slice(0,40):[];if(cache.size>200)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),data});return json(data)}
  if(body.type==='snapshots'){if(!Array.isArray(body.artists)||body.artists.length>12||body.artists.some((a:any)=>!a||typeof a.id!=='string'||!a.id.match(/^[a-f0-9-]{36}$/i)||typeof a.name!=='string'||a.name.length>200))return json({error:'Invalid artists'},400);const key='snapshots:'+JSON.stringify(body.artists);const saved=cache.get(key);if(saved&&Date.now()-saved.at<21600000)return json(saved.data);const data=await portraits(body.artists);if(cache.size>200)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),data});return json(data)}
  const type=body.type as keyof typeof kinds;if(!Object.hasOwn(kinds,type)||!Array.isArray(body.ids)||body.ids.length<1||body.ids.length>100||body.ids.some((id:unknown)=>typeof id!=="string"||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)))return json({error:"Invalid batch"},400);
  const ids=[...new Set(body.ids as string[])].sort();const key=type+ids.join(',');const saved=cache.get(key);if(saved&&Date.now()-saved.at<21600000)return json(saved.data);
  let work=pending.get(key);if(!work){work=(async()=>{const[kind,field]=kinds[type];const r=await fetch('https://api.listenbrainz.org/1/popularity/'+kind,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Toneary/1.1 (https://github.com/danal8/toneary)'},body:JSON.stringify({[field]:ids}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Upstream unavailable');const data=await r.json();if(!Array.isArray(data))throw Error('Invalid upstream data');if(cache.size>200)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),data});return data})().finally(()=>pending.delete(key));pending.set(key,work)}return json(await work);
 }catch{return json({error:"Popularity temporarily unavailable"},503)}
});
