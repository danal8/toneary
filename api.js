import {writePublic} from './storage.js?v=7';
import {POPULARITY_URL,PUBLIC_KEY,PUBLIC_FUNCTION_JWT} from './public-config.js?v=7';
export const MB='https://musicbrainz.org/ws/2/';
const DAY=86400000;
const memory=new Map();
const inflight=new Map();
let queue=Promise.resolve(),lastMB=0;
export const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
export function lucene(value){return String(value).replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g,' ').replace(/\s+/g,' ').trim()}
export function artistName(item){return(item['artist-credit']||[]).map(a=>(a.name||a.artist?.name||'')+(a.joinphrase||'')).join('')}
export function normalizeAlbum(item){return{id:item.id,title:item.title,artist:artistName(item),artistId:item['artist-credit']?.[0]?.artist?.id||'',year:(item['first-release-date']||'').slice(0,4),date:item['first-release-date']||'',type:item['primary-type']||'Album',secondary:item['secondary-types']||[],tags:(item.genres?.length?item.genres:item.tags||[]).slice().sort((a,b)=>(b.count||0)-(a.count||0)).slice(0,5).map(t=>t.name),genreWeights:Object.fromEntries((item.genres?.length?item.genres:item.tags||[]).map(t=>[t.name,t.count||0])),rating:item.rating||null,cover:`https://coverartarchive.org/release-group/${item.id}/front-500`}}
export function safeURL(value,hosts){try{const url=new URL(value);return url.protocol==='https:'&&(!hosts||hosts.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))?url.href:''}catch{return''}}
export function spotifySearch(query){return'https://open.spotify.com/search/'+encodeURIComponent(query)}
export function spotifyAppURI(value){const safe=safeURL(value,['open.spotify.com']);if(!safe)return'';const path=new URL(safe).pathname.replace(/^\/intl-[a-z]{2}(?=\/)/i,'');const match=path.match(/^\/(album|artist|track|playlist|show|episode)\/([A-Za-z0-9]{22})\/?$/);if(match)return'spotify:'+match[1]+':'+match[2];if(path.startsWith('/search/')){try{return'spotify:search:'+encodeURIComponent(decodeURIComponent(path.slice(8)))}catch{return''}}return''}
export function spotifyLink(relations=[],kind){for(const relation of relations){const url=safeURL(relation.url?.resource,['open.spotify.com']);if(url&&(!kind||new URL(url).pathname.startsWith('/'+kind+'/')))return url}return''}
export async function request(url,{ttl=DAY,provider='default'}={}){
  let cached=memory.get(url);
  if(!cached)try{cached=JSON.parse(localStorage.getItem('toneary:cache:'+url)||'null')}catch{}
  if(cached&&Date.now()-cached.at<ttl)return cached.data;
  if(inflight.has(url))return inflight.get(url);
  const run=async()=>{
    if(provider==='mb'){await wait(Math.max(0,1150-(Date.now()-lastMB)));lastMB=Date.now()}
    let response;
    for(let attempt=0;attempt<3;attempt++){
      response=await fetch(url,{signal:AbortSignal.timeout(18000),headers:provider==='mb'?{'Accept':'application/json','User-Agent':'Toneary/1.0 (https://github.com/danal8/toneary)'}:{}});
      if(![429,503].includes(response.status))break;
      if(attempt<2)await wait(1600*(attempt+1));
    }
    if(!response.ok){const error=new Error(response.status===404?'Δεν βρέθηκαν στοιχεία.':`Η πηγή δεδομένων δεν ανταποκρίνεται (${response.status}).`);error.status=response.status;throw error}
    const data=await response.json();const entry={at:Date.now(),data};memory.set(url,entry);
    try{writePublic(localStorage,'toneary:cache:'+url,JSON.stringify(entry))}catch{pruneCache()}
    return data;
  };
  const promise=(provider==='mb'?(queue=queue.catch(()=>{}).then(run)):run()).finally(()=>inflight.delete(url));
  inflight.set(url,promise);return promise;
}
function pruneCache(){try{for(const key of Object.keys(localStorage)){if(key.startsWith('toneary:cache:')){const c=JSON.parse(localStorage.getItem(key));if(!c||Date.now()-c.at>DAY)localStorage.removeItem(key)}}}catch{}}
export function mb(path,params={}){const url=new URL(path,MB);for(const[key,value]of Object.entries({...params,fmt:'json',client:'Toneary-1.0'}))url.searchParams.set(key,value);return request(url.href,{provider:'mb'})}
export async function searchAlbums(query,offset=0){const q=lucene(query);if(!q)return{items:[],count:0};const data=await mb('release-group/',{query:`(${q}) AND (primarytype:album OR primarytype:ep)`,limit:24,offset});return{items:(data['release-groups']||[]).map(normalizeAlbum),count:data.count||0}}
export async function genreAlbums(genre,offset=0){const data=await mb('release-group/',{query:`tag:"${lucene(genre)}" AND primarytype:album AND NOT secondarytype:compilation AND NOT secondarytype:live`,limit:24,offset});return{items:(data['release-groups']||[]).map(normalizeAlbum),count:data.count||0}}
export async function searchArtists(query,offset=0){const q=lucene(query);if(!q)return{items:[],count:0};const data=await mb('artist/',{query:q,limit:24,offset});return{items:data.artists||[],count:data.count||0}}
export async function searchTracks(query,offset=0){const q=lucene(query);if(!q)return{items:[],count:0};const data=await mb('recording/',{query:q,limit:24,offset});return{items:data.recordings||[],count:data.count||0}}
export function savedRating(id){try{const r=JSON.parse(localStorage.getItem('toneary:rating:'+id));return r&&Date.now()-r.at<86400000?r.rating:null}catch{return null}}
export function cacheRating(id,rating){if(!rating||!Number.isInteger(rating['votes-count'])||rating['votes-count']<0)return;try{writePublic(localStorage,'toneary:rating:'+id,JSON.stringify({at:Date.now(),rating}))}catch{}}
export async function getAlbum(id){const item=await mb('release-group/'+encodeURIComponent(id),{inc:'artists+genres+ratings+url-rels+releases'});cacheRating(id,item.rating);return{...normalizeAlbum(item),relations:item.relations||[],releases:item.releases||[]}}
export async function getRelease(id){return mb('release/'+encodeURIComponent(id),{inc:'recordings+artist-credits+labels+url-rels+artist-rels+recording-rels+work-rels+recording-level-rels+work-level-rels'})}
export async function digitalRelease(id){const data=await mb('release/',{query:`rgid:${id} AND format:"Digital Media" AND status:official`,limit:12});const releases=(data.releases||[]).filter(r=>!(r.disambiguation||'').match(/deluxe|anniversary/i));return releases.find(r=>(r.media||[]).reduce((sum,m)=>sum+(m['track-count']||0),0)<20)||releases[0]}
export function pickRelease(releases){return releases.slice().sort((a,b)=>{const score=r=>(r.status==='Official'?10:0)+(r.date?2:0)+(r.country==='XW'?3:r.country==='US'||r.country==='GB'||r.country==='GR'?1:0);return score(b)-score(a)||(a.date||'9999').localeCompare(b.date||'9999')})[0]}
export function releaseTracks(release){return(release.media||[]).flatMap(m=>(m.tracks||[]).map(t=>({id:t.recording?.id||t.id,title:t.title||t.recording?.title||'',length:t.length||t.recording?.length||0,position:t.position,disc:m.position||1,artist:artistName(t)||artistName(t.recording||{})})))}
export async function getArtist(id){return mb('artist/'+encodeURIComponent(id),{inc:'genres+url-rels+artist-rels+ratings+aliases'})}
export async function artistAlbums(id,offset=0){const data=await mb('release-group/',{artist:id,type:'album|ep',limit:100,offset,inc:'artist-credits+ratings'});for(const a of data['release-groups']||[])cacheRating(a.id,a.rating);return{items:(data['release-groups']||[]).map(normalizeAlbum),count:data['release-group-count']||0}}
export async function getRecording(id){return mb('recording/'+encodeURIComponent(id),{inc:'artists+artist-rels+work-rels+url-rels+isrcs+releases'})}
export async function artwork(album){const lang=/[\u0370-\u03ff]/.test(album.title)?'el':'en';const data=await request(`https://${lang}.wikipedia.org/w/api.php?`+new URLSearchParams({action:'query',generator:'search',gsrsearch:`intitle:"${album.title.replace(/"/g,'')}" "${album.artist.replace(/"/g,'')}"`,gsrlimit:'3',prop:'pageimages',piprop:'thumbnail',pilicense:'any',pithumbsize:'400',format:'json',origin:'*'}));const page=Object.values(data.query?.pages||{}).sort((a,b)=>(a.index||0)-(b.index||0)).find(p=>p.thumbnail?.source);return page?{cover:safeURL(page.thumbnail.source,['wikimedia.org']),coverSource:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title)}`}:null}
export async function discogsRating(relations=[]){
  for(const r of relations){const url=safeURL(r.url?.resource,['discogs.com']);if(!url)continue;const match=new URL(url).pathname.match(/\/(release|master)\/(\d+)/);if(!match)continue;
    let kind=match[1],id=match[2];if(kind==='master'){const master=await request(`https://api.discogs.com/masters/${id}`,{ttl:6*3600000});id=master.main_release;if(!id)continue}
    const release=await request(`https://api.discogs.com/releases/${id}`,{ttl:6*3600000});const rating=release.community?.rating;
    return{...rating,average:rating?.average??null,count:rating?.count||0,url:`https://www.discogs.com/release/${id}`,edition:[release.country,release.year,release.formats?.[0]?.name].filter(Boolean).join(' · '),credits:release.extraartists||[],trackCredits:(release.tracklist||[]).flatMap(t=>(t.extraartists||[]).map(a=>({...a,track:t.title})))};
  }return null;
}
export function romanizeGreek(value,phonetic=false){
 const greek={'α':'a','β':'v','γ':'g','δ':'d','ε':'e','ζ':'z','η':'i','θ':'th','ι':'i','κ':'k','λ':'l','μ':'m','ν':'n','ξ':'x','ο':'o','π':'p','ρ':'r','σ':'s','ς':'s','τ':'t','υ':'y','φ':'f','χ':'ch','ψ':'ps','ω':'o'};
 let text=normalize(value).replace(/ου/g,'ou');if(phonetic)text=text.replace(/αι/g,'e').replace(/ει|οι|υι/g,'i').replace(/ευ/g,'ef').replace(/αυ/g,'af');
 return text.split('').map(c=>greek[c]||c).join('');
}
export function lyricKey(value){return romanizeGreek(value).replace(/\([^)]*(?:remaster|live|version)[^)]*\)/gi,'').replace(/ph/g,'f').replace(/ch/g,'h').replace(/y/g,'u').replace(/[^a-z0-9]/g,'')}
export function lyricTitleKey(value){return lyricKey(String(value).replace(/\b(tin|ti)\b/gi,'ti').replace(/την|τη(?=\s)/gi,'τη'))}
function lyricMatches(a,b){const keys=value=>[lyricKey(value),lyricKey(romanizeGreek(value,true))];return keys(a).some(k=>keys(b).includes(k))}
export async function dailyGenre(genre){const r=await fetch(POPULARITY_URL,{method:'POST',headers:{'Content-Type':'application/json',apikey:PUBLIC_KEY,Authorization:'Bearer '+PUBLIC_FUNCTION_JWT},body:JSON.stringify({type:'genre',genre}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Discovery unavailable');const data=await r.json();return {items:(data['release-groups']||[]).map(normalizeAlbum)}}
export async function catalog(query,{signal}={}){
 const key='toneary:catalog:'+normalize(query);try{const c=JSON.parse(localStorage.getItem(key));if(c&&Date.now()-c.at<86400000)return c.data}catch{}
 const r=await fetch(POPULARITY_URL,{method:'POST',headers:{'Content-Type':'application/json',apikey:PUBLIC_KEY,Authorization:'Bearer '+PUBLIC_FUNCTION_JWT},body:JSON.stringify({type:'catalog',query:romanizeGreek(query)}),signal:signal||AbortSignal.timeout(12000)});if(!r.ok)throw Error('Η αναζήτηση δεν είναι διαθέσιμη αυτή τη στιγμή.');const data=await r.json();try{writePublic(localStorage,key,JSON.stringify({at:Date.now(),data}))}catch{}return data;
}
export function safeCover(value){return typeof value==='string'&&value.length<28000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)?value:safeURL(value,['coverartarchive.org','archive.org','wikimedia.org','dzcdn.net'])}
export async function embeddedCover(url){const safe=safeURL(url,['dzcdn.net']);const hash=safe&&new URL(safe).pathname.match(/\/images\/cover\/([a-f0-9]{32})\//)?.[1];if(!hash)return null;const key='toneary:art:'+hash;try{const cover=localStorage.getItem(key);if(safeCover(cover)?.startsWith('data:'))return {cover}}catch{}try{const r=await fetch(POPULARITY_URL,{method:'POST',headers:{'Content-Type':'application/json',apikey:PUBLIC_KEY,Authorization:'Bearer '+PUBLIC_FUNCTION_JWT},body:JSON.stringify({type:'cover',hash}),signal:AbortSignal.timeout(8000)});if(!r.ok)return null;const data=await r.json();const cover=safeCover(data.cover);if(!cover?.startsWith('data:'))return null;try{writePublic(localStorage,key,cover)}catch{}return{cover}}catch{return null}}
export async function catalogArtwork(album){try{const rows=await catalog(album.artist+' '+album.title);const row=rows.find(r=>lyricMatches(r.artist,album.artist)&&lyricMatches(r.album,album.title));const cover=safeURL(row?.cover,['dzcdn.net']);return cover?{cover,coverSource:row.albumURL}:null}catch{return null}}
export async function getLyrics(track,artist,album,duration){
 const variants=[{track,artist,album}];if(/[\u0370-\u03ff]/.test(track+artist))for(const phonetic of [false,true])variants.push({track:romanizeGreek(track,phonetic),artist:romanizeGreek(artist,phonetic),album:romanizeGreek(album,phonetic)});
 for(const v of [...variants]){if(/\bti\b/i.test(v.track))variants.push({...v,track:v.track.replace(/\bti\b/gi,'tin')});if(/\btin\b/i.test(v.track))variants.push({...v,track:v.track.replace(/\btin\b/gi,'ti')})}
 // Query both writing systems; Greek recordings are often indexed under romanized metadata.
 for(const v of variants){const exact=new URL('https://lrclib.net/api/get');exact.searchParams.set('track_name',v.track);exact.searchParams.set('artist_name',v.artist);if(v.album)exact.searchParams.set('album_name',v.album);if(duration)exact.searchParams.set('duration',Math.round(duration/1000));try{const found=await request(exact.href);if(found?.plainLyrics||found?.syncedLyrics||found?.instrumental)return found}catch{}}
 for(const v of variants){for(const params of [new URLSearchParams({track_name:v.track,artist_name:v.artist}),new URLSearchParams({q:v.track+' '+v.artist}),new URLSearchParams({q:v.track}),new URLSearchParams({artist_name:v.artist})]){try{const candidates=await request('https://lrclib.net/api/search?'+params);const valid=candidates.filter(c=>(lyricMatches(c.trackName,track)||lyricTitleKey(c.trackName)===lyricTitleKey(track))&&lyricMatches(c.artistName,artist)&&(c.plainLyrics||c.syncedLyrics||c.instrumental));valid.sort((a,b)=>Math.abs(a.duration-(duration/1000||a.duration))-Math.abs(b.duration-(duration/1000||b.duration)));if(valid[0])return valid[0]}catch{}}}
 return null;
}
export async function biography(relations=[]){
  let pages={};
  for(const r of relations){const wiki=safeURL(r.url?.resource,['wikipedia.org']);if(wiki){const u=new URL(wiki);pages[u.hostname.split('.')[0]]=decodeURIComponent(u.pathname.replace('/wiki/',''))}const data=safeURL(r.url?.resource,['wikidata.org']);if(data){const id=new URL(data).pathname.match(/Q\d+/)?.[0];if(id){const entity=await request('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:id,props:'sitelinks',format:'json',origin:'*'}));const links=entity.entities?.[id]?.sitelinks||{};for(const lang of['el','en'])if(links[lang+'wiki'])pages[lang]=links[lang+'wiki'].title}}}
  for(const lang of['el','en']){if(!pages[lang])continue;const data=await request(`https://${lang}.wikipedia.org/w/api.php?`+new URLSearchParams({action:'query',titles:pages[lang],prop:'extracts|pageimages',exintro:'1',explaintext:'1',piprop:'original',format:'json',origin:'*',redirects:'1'}));const page=Object.values(data.query?.pages||{})[0];if(page?.extract)return{text:page.extract,image:safeURL(page.original?.source,['wikimedia.org']),url:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,lang,title:page.title}}
  return null;
}

export function releaseCredits(release){const rows=[];const add=(relations,track='')=>{for(const r of relations||[]){if(r.artist)rows.push({id:r.artist.id,name:r.artist.name,role:[r.type,...(r.attributes||[])].join(' · '),track});if(r.work)add(r.work.relations,track)}};add(release?.relations);for(const m of release?.media||[])for(const t of m.tracks||[])add(t.recording?.relations,t.title||t.recording?.title||'');return [...new Map(rows.map(r=>[r.name+'|'+r.role+'|'+r.track,r])).values()]}
export async function songCredits(id){if(!id)return[];const recording=await getRecording(id);const rows=releaseCredits({relations:recording.relations});for(const relation of recording.relations||[]){if(!relation.work)continue;try{const work=await mb('work/'+relation.work.id,{inc:'artist-rels'});rows.push(...releaseCredits({relations:work.relations}))}catch{}}return [...new Map(rows.map(r=>[r.name+'|'+r.role,r])).values()]}
