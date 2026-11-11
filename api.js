export const MB='https://musicbrainz.org/ws/2/';
const DAY=86400000;
const memory=new Map();
const inflight=new Map();
let queue=Promise.resolve(),lastMB=0;
export const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
export function lucene(value){return String(value).replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g,' ').replace(/\s+/g,' ').trim()}
export function artistName(item){return(item['artist-credit']||[]).map(a=>(a.name||a.artist?.name||'')+(a.joinphrase||'')).join('')}
export function normalizeAlbum(item){return{id:item.id,title:item.title,artist:artistName(item),artistId:item['artist-credit']?.[0]?.artist?.id||'',year:(item['first-release-date']||'').slice(0,4),date:item['first-release-date']||'',type:item['primary-type']||'Album',secondary:item['secondary-types']||[],tags:(item.genres?.length?item.genres:item.tags||[]).slice().sort((a,b)=>(b.count||0)-(a.count||0)).slice(0,5).map(t=>t.name),rating:item.rating||null,cover:`https://coverartarchive.org/release-group/${item.id}/front-500`}}
export function safeURL(value,hosts){try{const url=new URL(value);return url.protocol==='https:'&&(!hosts||hosts.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))?url.href:''}catch{return''}}
export function spotifySearch(query){return'https://open.spotify.com/search/'+encodeURIComponent(query)}
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
    try{localStorage.setItem('toneary:cache:'+url,JSON.stringify(entry))}catch{pruneCache()}
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
export async function getAlbum(id){const item=await mb('release-group/'+encodeURIComponent(id),{inc:'artists+genres+ratings+url-rels+releases'});return{...normalizeAlbum(item),relations:item.relations||[],releases:item.releases||[]}}
export async function getRelease(id){return mb('release/'+encodeURIComponent(id),{inc:'recordings+artist-credits+labels+url-rels+artist-rels+recording-rels'})}
export async function digitalRelease(id){const data=await mb('release/',{query:`rgid:${id} AND format:"Digital Media" AND status:official`,limit:12});const releases=(data.releases||[]).filter(r=>!(r.disambiguation||'').match(/deluxe|anniversary/i));return releases.find(r=>(r.media||[]).reduce((sum,m)=>sum+(m['track-count']||0),0)<20)||releases[0]}
export function pickRelease(releases){return releases.slice().sort((a,b)=>{const score=r=>(r.status==='Official'?10:0)+(r.date?2:0)+(r.country==='XW'?3:r.country==='US'||r.country==='GB'||r.country==='GR'?1:0);return score(b)-score(a)||(a.date||'9999').localeCompare(b.date||'9999')})[0]}
export function releaseTracks(release){return(release.media||[]).flatMap(m=>(m.tracks||[]).map(t=>({id:t.recording?.id||t.id,title:t.title||t.recording?.title||'',length:t.length||t.recording?.length||0,position:t.position,disc:m.position||1,artist:artistName(t)||artistName(t.recording||{})})))}
export async function getArtist(id){return mb('artist/'+encodeURIComponent(id),{inc:'genres+url-rels+artist-rels+ratings'})}
export async function artistAlbums(id,offset=0){const data=await mb('release-group/',{artist:id,type:'album|ep',limit:100,offset,inc:'artist-credits'});return{items:(data['release-groups']||[]).map(normalizeAlbum),count:data['release-group-count']||0}}
export async function getRecording(id){return mb('recording/'+encodeURIComponent(id),{inc:'artists+artist-rels+work-rels+url-rels+isrcs+releases'})}
export async function artwork(album){const lang=/[\u0370-\u03ff]/.test(album.title)?'el':'en';const data=await request(`https://${lang}.wikipedia.org/w/api.php?`+new URLSearchParams({action:'query',generator:'search',gsrsearch:`intitle:"${album.title.replace(/"/g,'')}" "${album.artist.replace(/"/g,'')}"`,gsrlimit:'3',prop:'pageimages',piprop:'thumbnail',pilicense:'any',pithumbsize:'400',format:'json',origin:'*'}));const page=Object.values(data.query?.pages||{}).sort((a,b)=>(a.index||0)-(b.index||0)).find(p=>p.thumbnail?.source);return page?{cover:safeURL(page.thumbnail.source,['wikimedia.org']),coverSource:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title)}`}:null}
export async function discogsRating(relations=[]){
  for(const r of relations){const url=safeURL(r.url?.resource,['discogs.com']);if(!url)continue;const match=new URL(url).pathname.match(/\/(release|master)\/(\d+)/);if(!match)continue;
    let kind=match[1],id=match[2];if(kind==='master'){const master=await request(`https://api.discogs.com/masters/${id}`,{ttl:6*3600000});id=master.main_release;if(!id)continue}
    const release=await request(`https://api.discogs.com/releases/${id}`,{ttl:6*3600000});const rating=release.community?.rating;
    if(rating?.count>0)return{...rating,url:`https://www.discogs.com/release/${id}`,edition:[release.country,release.year,release.formats?.[0]?.name].filter(Boolean).join(' · ')};
  }return null;
}
export async function getLyrics(track,artist,album,duration){
  const url=new URL('https://lrclib.net/api/get');url.searchParams.set('track_name',track);url.searchParams.set('artist_name',artist);if(album)url.searchParams.set('album_name',album);if(duration)url.searchParams.set('duration',Math.round(duration/1000));
  try{return await request(url.href)}catch(error){if(error.status!==404)throw error}
  const candidates=await request('https://lrclib.net/api/search?'+new URLSearchParams({track_name:track,artist_name:artist}));
  return candidates.filter(c=>normalize(c.trackName)===normalize(track)&&normalize(c.artistName)===normalize(artist)).sort((a,b)=>Math.abs(a.duration-(duration/1000||a.duration))-Math.abs(b.duration-(duration/1000||b.duration)))[0]||null;
}
export async function biography(relations=[]){
  let pages={};
  for(const r of relations){const wiki=safeURL(r.url?.resource,['wikipedia.org']);if(wiki){const u=new URL(wiki);pages[u.hostname.split('.')[0]]=decodeURIComponent(u.pathname.replace('/wiki/',''))}const data=safeURL(r.url?.resource,['wikidata.org']);if(data){const id=new URL(data).pathname.match(/Q\d+/)?.[0];if(id){const entity=await request('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:id,props:'sitelinks',format:'json',origin:'*'}));const links=entity.entities?.[id]?.sitelinks||{};for(const lang of['el','en'])if(links[lang+'wiki'])pages[lang]=links[lang+'wiki'].title}}}
  for(const lang of['el','en']){if(!pages[lang])continue;const data=await request(`https://${lang}.wikipedia.org/w/api.php?`+new URLSearchParams({action:'query',titles:pages[lang],prop:'extracts|pageimages',exintro:'1',explaintext:'1',piprop:'original',format:'json',origin:'*',redirects:'1'}));const page=Object.values(data.query?.pages||{})[0];if(page?.extract)return{text:page.extract,image:safeURL(page.original?.source,['wikimedia.org']),url:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,lang,title:page.title}}
  return null;
}
