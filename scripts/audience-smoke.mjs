import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {POPULARITY_URL,PUBLIC_KEY,PUBLIC_FUNCTION_JWT} from '../public-config.js';
const albums=JSON.parse(await readFile(new URL('../data/featured.json',import.meta.url)));
for(const artist of ['Radiohead','Τρύπες']){
 const album=albums.find(a=>a.artist===artist);
 const response=await fetch(POPULARITY_URL.replace('toneary-popularity','toneary-album-audience'),{method:'POST',headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+PUBLIC_FUNCTION_JWT,'Content-Type':'application/json'},body:JSON.stringify({id:album.id,artist:album.artist,title:album.title}),signal:AbortSignal.timeout(25000)});
 assert.equal(response.status,200);const data=await response.json();
 console.log(artist,JSON.stringify(data));
 assert.ok(data.audience?.listeners>0,'Expected a real audience count');
 if(artist==='Radiohead')assert.equal(data.audience.source,'Last.fm','Verify Last.fm extraction against live album');
 assert.equal(data.chartStatus,'checked','Verify official Greece chart');
}
console.log('PASS live international and Greek album audience, official Greece chart');
