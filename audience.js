import {POPULARITY_URL,PUBLIC_KEY,PUBLIC_FUNCTION_JWT} from './public-config.js?v=7';
import {writePublic} from './storage.js?v=7';
export const MIN_RATING_VOTES=20;
export function trustedRating(r){return Number(r?.['votes-count'])>=MIN_RATING_VOTES&&Number.isFinite(Number(r?.value))}
const key=id=>'toneary:audience:v1:'+id;
const pending=new Map();
export function savedAudience(id){try{const c=JSON.parse(localStorage.getItem(key(id)));return c&&Date.now()-c.at<86400000?c.data:null}catch{return null}}
export async function albumAudience(album){
 const saved=savedAudience(album.id);if(saved)return saved;if(pending.has(album.id))return pending.get(album.id);
 const task=(async()=>{const r=await fetch(POPULARITY_URL.replace(/toneary-popularity$/,'toneary-album-audience'),{method:'POST',headers:{'Content-Type':'application/json',apikey:PUBLIC_KEY,Authorization:'Bearer '+PUBLIC_FUNCTION_JWT},body:JSON.stringify({id:album.id,artist:album.artist,title:album.title}),signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error('Audience unavailable');const d=await r.json();if(!d||typeof d!=='object'||!['checked','unavailable'].includes(d.chartStatus))throw Error('Invalid audience');writePublic(localStorage,key(album.id),JSON.stringify({at:Date.now(),data:d}));return d})().finally(()=>pending.delete(album.id));pending.set(album.id,task);return task;
}
export function audienceHTML(data,escape,pending=false){
 const n=v=>Number(v).toLocaleString('el-GR'),a=data?.audience,c=data?.chart;
 const safe=(url,hosts)=>{try{const u=new URL(url);return u.protocol==='https:'&&hosts.includes(u.hostname)?u.href:''}catch{return''}};
 const aURL=a&&safe(a.url,['www.last.fm','listenbrainz.org']),cURL=c&&safe(c.url,['music.apple.com']);
 return '<h3>Δημοτικότητα</h3>'+(pending?'<p class="muted" role="status">Ελέγχουμε ακροατές και ελληνικό chart…</p>':
 '<div class="audience-values">'+(aURL&&a.listeners>0?'<a href="'+escape(aURL)+'" target="_blank" rel="noopener noreferrer"><strong>'+n(a.listeners)+'</strong><span>ακροατές · '+escape(a.source)+'</span></a>'+(Number.isFinite(a.listens)&&a.listens>0?'<div><strong>'+n(a.listens)+'</strong><span>καταγεγραμμένες ακροάσεις · '+escape(a.source)+'</span></div>':''):'<p class="muted">Δεν υπάρχουν διαθέσιμα στοιχεία ακροατών.</p>')+
 (cURL?'<a href="'+escape(cURL)+'" target="_blank" rel="noopener noreferrer"><strong>#'+n(c.position)+'</strong><span>Apple Music · Ελλάδα · Top 100 άλμπουμ</span></a>':'')+'</div><p class="audience-note">'+(a?'Οι μετρητές αφορούν την κοινότητα του '+escape(a.source)+', όχι το σύνολο των streams. ':'')+(data?.chartStatus==='checked'&&!c?'Δεν εμφανίζεται στο τρέχον ελληνικό Top 100 άλμπουμ της Apple Music.':data?.chartStatus==='unavailable'?'Το ελληνικό chart δεν είναι διαθέσιμο αυτή τη στιγμή.':'')+' Δεν αποτελεί βαθμολογία ποιότητας.</p>');
}
