import {key,text,avopolisLinks,avopolisReview,wikiReviews} from './review-core.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const ua={'User-Agent':'Toneary/1.5 (https://github.com/danal8/toneary)'};
const cache=new Map(),pending=new Map();
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'public, max-age=3600'}})}
async function get(url,timeout=6500){const r=await fetch(url,{headers:ua,signal:AbortSignal.timeout(timeout)});if(!r.ok)throw Error('Upstream unavailable');return r}
async function avopolis(artist,title){
 const query='"'+artist+'" "'+title+'"';const html=await(await get('https://www.avopolis.gr/component/finder/search?'+new URLSearchParams({q:query}),8000)).text();
 if(html.length>2000000)throw Error('Search too large');let links=avopolisLinks(html,artist,title);if(!links.length){const broad=await(await get('https://www.avopolis.gr/component/finder/search?'+new URLSearchParams({q:artist}),6500)).text();if(broad.length<2000000)links=avopolisLinks(broad,artist,title)}const reviews=[];
 for(const url of links){try{const html=await(await get(url,5000)).text();const r=avopolisReview(html,url,artist,title);if(r)reviews.push(r)}catch{}}
 return reviews;
}
async function wikipedia(b){
 let pages=[],linked=false;
 if(b.wikidata){const d=await(await get('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:b.wikidata,props:'sitelinks',format:'json'}),5000)).json();for(const lang of ['en','el'])if(d.entities?.[b.wikidata]?.sitelinks?.[lang+'wiki'])pages.push({lang,title:d.entities[b.wikidata].sitelinks[lang+'wiki'].title});linked=pages.length>0}
 if(!pages.length&&b.pages.length){pages=b.pages;linked=true}
 if(!pages.length){const d=await(await get('https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',list:'search',srsearch:'"'+b.title+'" "'+b.artist+'" album',srlimit:'2',format:'json'}),5000)).json();pages=(d.query?.search||[]).map(p=>({lang:'en',title:p.title}))}
 for(const page of pages.slice(0,2)){try{const d=await(await get('https://'+page.lang+'.wikipedia.org/w/api.php?'+new URLSearchParams({action:'parse',page:page.title,prop:'text',format:'json',redirects:'1'}),6000)).json();const html=d.parse?.text?.['*'];if(!html)continue;const pageURL='https://'+page.lang+'.wikipedia.org/wiki/'+encodeURIComponent(d.parse.title);const reviews=wikiReviews(html,pageURL,b.artist,b.title,{linked});if(reviews.length)return reviews}catch{}}
 return[];
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{if(Number(req.headers.get('content-length')||0)>5000)return json({error:'Too large'},413);const b=await req.json();
 if(typeof b.artist!=='string'||typeof b.title!=='string'||!b.artist.trim()||!b.title.trim()||b.artist.length>300||b.title.length>300||typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id))return json({error:'Invalid album'},400);
 b.wikidata=typeof b.wikidata==='string'&&/^Q\d+$/.test(b.wikidata)?b.wikidata:'';
 b.pages=Array.isArray(b.pages)?b.pages.filter(p=>p&&['en','el'].includes(p.lang)&&typeof p.title==='string'&&p.title.length<200).slice(0,2):[];
 const k=b.id+'|'+key(b.artist)+'|'+key(b.title)+'|'+b.wikidata+'|'+JSON.stringify(b.pages);const saved=cache.get(k);if(saved&&Date.now()-saved.at<86400000)return json(saved.data);if(pending.has(k))return json(await pending.get(k));
 const work=(async()=>{const results=await Promise.allSettled([avopolis(b.artist,b.title),wikipedia(b)]);const reviews=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);const data={id:b.id,reviews:[...new Map(reviews.map(r=>[key(r.source),r])).values()],unavailable:results.every(r=>r.status==='rejected'),checkedAt:new Date().toISOString()};if(cache.size>=250)cache.delete(cache.keys().next().value);cache.set(k,{at:Date.now(),data});return data})().finally(()=>pending.delete(k));pending.set(k,work);return json(await work);
 }catch{return json({error:'Reviews temporarily unavailable'},503)}
});
