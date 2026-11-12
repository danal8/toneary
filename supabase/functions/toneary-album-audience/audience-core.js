// Public album signals stay separate: a scrobble, listener and chart position are not ratings.
export function nameKey(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ς/g,'σ').replace(/[^\p{L}\p{N}]/gu,'')}
export function sameAlbum(a,b){return !!nameKey(a)&&nameKey(a)===nameKey(b)}
export function countValue(s){const n=String(s??'').trim();if(!/^[\d, ]+$/.test(n))return null;const v=Number(n.replace(/[, ]/g,''));return Number.isSafeInteger(v)&&v>=0?v:null}
export function chartMatch(rows,artist,title){const i=rows.findIndex(r=>sameAlbum(r.artistName,artist)&&sameAlbum(r.name,title));if(i<0)return null;const r=rows[i];let url;try{url=new URL(r.url);if(url.protocol!=='https:'||!['music.apple.com','itunes.apple.com'].includes(url.hostname))return null}catch{return null}return{position:i+1,country:'GR',source:'Apple Music',url:url.href}}
