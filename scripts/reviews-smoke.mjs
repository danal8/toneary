import assert from 'node:assert/strict';
import {POPULARITY_URL,PUBLIC_KEY,PUBLIC_FUNCTION_JWT} from '../public-config.js';
const cases=[
 {id:'00000000-0000-0000-0000-000000000001',artist:'Jethro Tull',title:'Rock Island',year:'1989',pages:[{lang:'en',title:'Rock Island (Jethro Tull album)'}],source:'AllMusic',score:'3.5'},
 {id:'00000000-0000-0000-0000-000000000002',artist:'Διάφανα Κρίνα',title:"Ό,τι απόμεινε απ' την ευτυχία",year:'2003',source:'Avopolis',score:'8'},
 {id:'00000000-0000-0000-0000-000000000003',artist:'Radiohead',title:'OK Computer',year:'1997',pages:[{lang:'en',title:'OK Computer'}],source:'AllMusic',score:'5'}
];
for(const item of cases){const r=await fetch(POPULARITY_URL.replace('toneary-popularity','toneary-reviews'),{method:'POST',headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+PUBLIC_FUNCTION_JWT,'Content-Type':'application/json'},body:JSON.stringify(item),signal:AbortSignal.timeout(28000)});assert.equal(r.status,200);const data=await r.json();console.log(item.artist,item.title,JSON.stringify(data));const row=data.reviews.find(x=>x.source===item.source);assert.ok(row,'Missing verified '+item.source+' review');assert.equal(row.score,item.score);assert.ok(row.url.startsWith('https://'));assert.ok(!('average' in data));}
console.log('PASS dynamic Greek and international review matching, original scales, sources');
