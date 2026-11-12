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
 assert.ok(['Last.fm','ListenBrainz'].includes(data.audience.source));assert.equal(typeof data.lastfmConfigured,'boolean');
 assert.equal(data.chartStatus,'checked','Verify official Greece chart');
}
const feed=await (await fetch('https://itunes.apple.com/gr/rss/topalbums/limit=100/json')).json();const top=feed.feed.entry[0];
const chartResponse=await fetch(POPULARITY_URL.replace('toneary-popularity','toneary-album-audience'),{method:'POST',headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+PUBLIC_FUNCTION_JWT,'Content-Type':'application/json'},body:JSON.stringify({id:'00000000-0000-0000-0000-000000000000',artist:top['im:artist'].label,title:top['im:name'].label}),signal:AbortSignal.timeout(25000)});
const chart=await chartResponse.json();console.log('GREECE_CHART_MATCH',JSON.stringify(chart.chart));assert.equal(chart.chart?.position,1);assert.equal(chart.chart?.source,'iTunes');assert.equal(chart.chart?.kind,'sales');
console.log('PASS live international and Greek album audience, official Greece chart with exact top album match');
