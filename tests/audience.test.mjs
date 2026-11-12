import test from 'node:test';
import assert from 'node:assert/strict';
import {chartMatch,countValue} from '../supabase/functions/toneary-album-audience/audience-core.js';
import {trustedRating,audienceHTML} from '../audience.js';
test('rounded counts are not converted into invented exact totals',()=>{assert.equal(countValue('30.7K'),null);assert.equal(countValue('30,740'),30740)});
test('chart requires artist and album match and uses position in official feed',()=>{
 const rows=[{artistName:'Other',name:'Same',url:'https://music.apple.com/gr/album/1'},{artistName:'Τρύπες',name:'Same',url:'https://music.apple.com/gr/album/2'}];
 assert.equal(chartMatch(rows,'ΤΡΥΠΕΣ','Same').position,2);
 assert.equal(chartMatch(rows,'Missing','Same'),null);
 assert.equal(chartMatch([{artistName:'A',name:'B',url:'https://evil.test'}],'A','B'),null);
});
test('one or two votes never become a headline score',()=>{
 assert.equal(trustedRating({'votes-count':2,value:5}),false);
 assert.equal(trustedRating({'votes-count':20,value:4}),true);
 const html=audienceHTML({audience:null,chart:null,chartStatus:'unavailable'},String);
 assert.ok(html.includes('Δεν υπάρχουν διαθέσιμα στοιχεία'));
 assert.ok(html.includes('δεν είναι διαθέσιμο'));
 assert.ok(!html.includes('0 ακροατές'));
});
