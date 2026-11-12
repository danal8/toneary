import {lastfmPage,chartMatch,sameAlbum,countValue} from './audience-core.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const cache=new Map();const pending=new Map();
const ua={'User-Agent':'Toneary/1.4 (https://github.com/danal8/toneary)'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'public, max-age=3600'}})}
async function cached(key,ttl,work){const old=cache.get(key);if(old&&Date.now()-old.at<ttl)return old.data;if(pending.has(key))return pending.get(key);const task=work().then(data=>{if(cache.size>=300)cache.delete(cache.keys().next().value);cache.set(key,{at:Date.now(),data});return data}).finally(()=>pending.delete(key));pending.set(key,task);return task}
async function lastfm(artist,title){return cached('last:'+artist+'|'+title,86400000,async()=>{
 const key=Deno.env.get('LASTFM_API_KEY');
 if(key){const u=new URL('https://ws.audioscrobbler.com/2.0/');u.search=new URLSearchParams({method:'album.getInfo',api_key:key,artist,album:title,format:'json',autocorrect:'0'}).toString();const r=await fetch(u,{headers:ua,signal:AbortSignal.timeout(6500)});if(!r.ok)throw Error('Last.fm unavailable');const d=await r.json(),a=d.album;if(!a||!sameAlbum(a.artist,artist)||!sameAlbum(a.name,title))return null;const listeners=countValue(a.listeners),listens=countValue(a.playcount);return listeners>0?{source:'Last.fm',listeners,listens,url:'https://www.last.fm/music/'+encodeURIComponent(artist)+'/'+encodeURIComponent(title)}:null}
 // No borrowed API key: read the publicly displayed album totals. A blocked or changed page is unknown.
 const url='https://www.last.fm/music/'+encodeURIComponent(artist)+'/'+encodeURIComponent(title);
 const r=await fetch(url,{headers:ua,signal:AbortSignal.timeout(6500)});if(!r.ok)return null;const text=await r.text();return lastfmPage(text,artist,title);
})}
async function charts(){return cached('apple-gr',3600000,async()=>{const r=await fetch('https://rss.marketingtools.apple.com/api/v2/gr/music/most-played/100/albums.json',{headers:ua,signal:AbortSignal.timeout(6500)});if(!r.ok)throw Error('Chart unavailable');const d=await r.json();if(!Array.isArray(d.feed?.results))throw Error('Invalid chart');return{rows:d.feed.results,updated:d.feed.updated||null}})}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{if(Number(req.headers.get('content-length')||0)>3000)return json({error:'Too large'},413);const b=await req.json();if(typeof b.artist!=='string'||typeof b.title!=='string'||!b.artist.trim()||!b.title.trim()||b.artist.length>300||b.title.length>300||typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id))return json({error:'Invalid album'},400);
 const [last,chart]=await Promise.allSettled([lastfm(b.artist,b.title),charts()]);
 let audience=last.status==='fulfilled'?last.value:null;
 if(!audience){try{const r=await fetch('https://api.listenbrainz.org/1/popularity/release-group',{method:'POST',headers:{...ua,'Content-Type':'application/json'},body:JSON.stringify({release_group_mbids:[b.id]}),signal:AbortSignal.timeout(5000)});if(r.ok){const rows=await r.json();const row=Array.isArray(rows)?rows.find(x=>x.release_group_mbid===b.id):null;if(row?.total_user_count>0)audience={source:'ListenBrainz',listeners:row.total_user_count,listens:row.total_listen_count??null,url:'https://listenbrainz.org/release-group/'+b.id}}}catch{}}
 const match=chart.status==='fulfilled'?chartMatch(chart.value.rows,b.artist,b.title):null;
 return json({audience,chart:match?{...match,updated:chart.value.updated}:null,chartStatus:chart.status==='fulfilled'?'checked':'unavailable',checkedAt:new Date().toISOString()});
 }catch{return json({error:'Album signals temporarily unavailable'},503)}
});
