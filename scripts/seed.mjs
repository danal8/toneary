import {writeFile,mkdir} from 'node:fs/promises';
const entries=[
 ['Nirvana','Nevermind',false],['Metallica','Master of Puppets',false],['Διάφανα Κρίνα','Έγινε η απώλεια συνήθειά μας',true],['Radiohead','OK Computer',false],['System of a Down','Toxicity',false],['Τρύπες','Κεφάλι γεμάτο χρυσάφι',true],['Massive Attack','Mezzanine',false],['The Cure','Disintegration',false],['Pink Floyd','Wish You Were Here',false],['David Bowie','Blackstar',false],['Μάνος Χατζιδάκις','Το χαμόγελο της Τζοκόντας',true],['Παύλος Σιδηρόπουλος','Φλου',true]
];
const result=[];
for(const[artist,title,greek]of entries){
  const query=`releasegroup:"${title}" AND artist:"${artist}" AND primarytype:album`;
  try{const r=await fetch('https://musicbrainz.org/ws/2/release-group/?'+new URLSearchParams({query,fmt:'json',limit:3}),{headers:{'User-Agent':'Toneary/1.0 (https://github.com/danal8/toneary)'}});if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();const a=data['release-groups']?.[0];if(!a){console.log('NOT FOUND',artist,title);continue}const artistCredit=a['artist-credit']||[];result.push({id:a.id,title:a.title,artist:artistCredit.map(c=>(c.name||c.artist?.name||'')+(c.joinphrase||'')).join(''),artistId:artistCredit[0]?.artist?.id||'',year:(a['first-release-date']||'').slice(0,4),date:a['first-release-date']||'',type:a['primary-type'],secondary:a['secondary-types']||[],tags:(a.tags||[]).slice().sort((a,b)=>b.count-a.count).slice(0,4).map(t=>t.name),cover:`https://coverartarchive.org/release-group/${a.id}/front-500`,greek});console.log('OK',a.title,a.id)}catch(e){console.log('ERROR',title,e.message)}await new Promise(r=>setTimeout(r,1200));
}
await mkdir(new URL('../data/',import.meta.url),{recursive:true});await writeFile(new URL('../data/featured.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log('Seed records:',result.length);
