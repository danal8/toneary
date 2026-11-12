export function text(s){return String(s||'').replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{try{return String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))}catch{return''}}).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/&ndash;|&mdash;/g,'-').replace(/\s+/g,' ').trim()}
export function key(s){return text(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ς/g,'σ').replace(/[^\p{L}\p{N}]/gu,'')}
export function urlSafe(value,hosts){try{const u=new URL(value);return u.protocol==='https:'&&(!hosts||hosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h)))?u.href:''}catch{return''}}
export function avopolisLinks(html,artist,title){const expected=key(artist+' '+title),links=[];for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){let u;try{u=new URL(m[1].replace(/&amp;/g,'&'),'https://www.avopolis.gr')}catch{continue}if(u.hostname!=='www.avopolis.gr'||!/^\/albums\/(?:greek|international)-albums\/\d/.test(u.pathname))continue;if(key(m[2])!==expected)continue;u.search='';u.hash='';if(!links.includes(u.href))links.push(u.href)}return links.slice(0,2)}
export function avopolisReview(html,url,artist,title){if(!urlSafe(url,['avopolis.gr']))return null;const heading=text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);if(key(heading)!==key(artist+' '+title))return null;
 const field=html.match(/<li\b[^>]*class=["'][^"']*\bbathmologia\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/i)?.[1];const fieldValue=field?.match(/<span\b[^>]*class=["'][^"']*field-value[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];const row=fieldValue?'Βαθμολογία: '+text(fieldValue):[...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>text(m[1])).find(t=>/^Βαθμολογία\s*:/i.test(t));const match=row?.match(/^Βαθμολογία\s*:\s*(10|[0-9](?:[.,]\d+)?)\s*$/);if(!match)return null;const value=Number(match[1].replace(',','.'));if(!Number.isFinite(value)||value<0||value>10)return null;return{source:'Avopolis',score:String(value),scale:'10',url,via:null,direct:true,kind:'critic'};}
const allowed=['AllMusic','Classic Rock','Pitchfork','Rolling Stone','The Guardian','NME','Q','Spin','Uncut','Mojo','Robert Christgau','PopMatters','Slant Magazine','The A.V. Club','Sputnikmusic','Entertainment Weekly','Los Angeles Times','The Independent','The Daily Telegraph','Record Collector','The Rolling Stone Album Guide','The Encyclopedia of Popular Music'];
export function wikiReviews(html,pageURL,artist,title,{linked=false}={}){
 html=html.replace(/&#95;/g,'_');
 const box=html.match(/<table\b[^>]*class=["'][^"']*infobox[^"']*["'][\s\S]*?<\/table>/i)?.[0]||'';
 const boxText=key(box);if(!boxText.includes(key(title))||(!linked&&!boxText.includes(key(artist))))return[];
 const refs=new Map([...html.matchAll(/<li\b[^>]*id=["'](cite_note[^"']+)["'][^>]*>([\s\S]*?)<\/li>/gi)].map(m=>[m[1],m[2]]));
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]).filter(t=>/Review scores|Professional ratings|Κριτικές|Αξιολογήσεις/i.test(text(t)));
 const out=[];for(const table of tables)for(const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
 const cells=[...row[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(m=>m[1]);if(cells.length<2)continue;
 const source=text(cells[0]).replace(/\s*\[\d+\]/g,'').trim();if(!allowed.some(s=>key(s)===key(source)))continue;
 const numericStars=cells[1].match(/title=["'](\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?) stars?["']/i);
 const star=numericStars||cells[1].match(/(?:alt|aria-label)=["'](\d+(?:\.\d+)?) (?:out of|of) (\d+(?:\.\d+)?) stars?["']/i);
 let score=star?.[1],scale=star?.[2];if(!star){const val=text(cells[1]).replace(/\[\d+\]/g,'').trim();const fraction=val.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);if(fraction){score=fraction[1];scale=fraction[2]}else if(/^[A-F][+-]?$/.test(val)){score=val;scale='letter'}else continue}
 if(scale!=='letter'&&(!(Number(scale)>0)||Number(score)>Number(scale)||Number(score)<0))continue;
 const note=cells[1].match(/href=["']#(cite_note[^"']+)["']/i)?.[1];const reference=refs.get(note)||'';if(!reference)continue;
 const href=[...reference.matchAll(/href=["'](https:[^"']+)["']/gi)].map(m=>m[1].replace(/&amp;/g,'&')).find(u=>!u.includes('web.archive.org')&&!u.includes('wikipedia.org')&&!u.includes('books.google.'));
 out.push({source,score,scale,url:urlSafe(href)||pageURL,direct:!!urlSafe(href),via:'Wikipedia',referenceURL:pageURL+(note?'#'+note:''),kind:'critic'});
 }return [...new Map(out.map(r=>[key(r.source),r])).values()].slice(0,12)
}
