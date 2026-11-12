// Public album signals stay separate: a scrobble, listener and chart position are not ratings.
export function nameKey(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ς/g,'σ').replace(/[^\p{L}\p{N}]/gu,'')}
export function sameAlbum(a,b){return !!nameKey(a)&&nameKey(a)===nameKey(b)}
export function countValue(s){const n=String(s??'').trim();if(!/^[\d, ]+$/.test(n))return null;const v=Number(n.replace(/[, ]/g,''));return Number.isSafeInteger(v)&&v>=0?v:null}
export function lastfmPage(html,artist,title){
 const canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1]||html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1];
 if(!canonical)return null;let u;try{u=new URL(canonical)}catch{return null}
 const parts=u.pathname.split('/').filter(Boolean).map(p=>{try{return decodeURIComponent(p.replace(/\+/g,' '))}catch{return''}});
 if(u.hostname!=='www.last.fm'||parts.length!==3||parts[0]!=='music'||!sameAlbum(parts[1],artist)||!sameAlbum(parts[2],title))return null;
 // Read only the header totals; never track-list listeners or rounded K/M display values.
 const header=html.split(/class=["'][^"']*chartlist/i)[0].slice(0,180000);
 const stat=label=>{const i=header.search(new RegExp('>\\s*'+label+'\\s*<','i'));if(i<0)return null;const part=header.slice(i,i+2000);const display=part.match(/class=["'][^"']*header-metadata-display[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div|span)>/i);if(!display)return null;const abbr=display[1].match(/<abbr\b[^>]*title=["']([\d, ]+)["']/i);return countValue(abbr?abbr[1]:display[1].replace(/<[^>]*>/g,''))};
 const listeners=stat('Listeners'),listens=stat('Scrobbles');
 return listeners>0?{source:'Last.fm',listeners,listens,url:u.href}:null;
}
export function chartMatch(rows,artist,title){const i=rows.findIndex(r=>sameAlbum(r.artistName,artist)&&sameAlbum(r.name,title));if(i<0)return null;const r=rows[i];let url;try{url=new URL(r.url);if(url.protocol!=='https:'||url.hostname!=='music.apple.com')return null}catch{return null}return{position:i+1,country:'GR',source:'Apple Music',url:url.href}}
