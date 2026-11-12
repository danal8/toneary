import test from 'node:test';
import assert from 'node:assert/strict';
import {lastfmPage,chartMatch,countValue} from '../supabase/functions/toneary-album-audience/audience-core.js';
import {trustedRating,audienceHTML} from '../audience.js';
const page=(a,t,stats)=>'<link rel="canonical" href="https://www.last.fm/music/'+encodeURIComponent(a)+'/'+encodeURIComponent(t)+'">'+stats;
test('Last.fm parser accepts exact Greek album and exact header totals only',()=>{
 const html=page('Τρύπες','Κεφάλι γεμάτο χρυσάφι','<h4>Listeners</h4><p class="header-metadata-display">1,220</p><h4>Scrobbles</h4><p class="header-metadata-display"><abbr title="30,740">30.7K</abbr></p>');
 assert.equal(lastfmPage(html,'ΤΡΥΠΕΣ','Κεφάλι γεμάτο χρυσάφι').listeners,1220);
 assert.equal(lastfmPage(html,'Τρύπες','Κεφάλι γεμάτο χρυσάφι').listens,30740);
 assert.equal(lastfmPage(html,'Other band','Κεφάλι γεμάτο χρυσάφι'),null);
 assert.equal(lastfmPage(html,'Τρύπες','Other album'),null);
});
test('rounded or unrelated counters are not converted to invented exact counts',()=>{
 assert.equal(countValue('30.7K'),null);
 assert.equal(lastfmPage(page('A','B','<h4>Listeners</h4><p class="header-metadata-display">1.2K</p>'),'A','B'),null);
 assert.equal(lastfmPage(page('A','B','<table class="chartlist"><h4>Listeners</h4><p class="header-metadata-display">100</p></table>'),'A','B'),null);
});
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
