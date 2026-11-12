import {chromium} from 'playwright';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:'inherit'});
let browser;try{
 for(let i=0;i<30;i++){try{if((await fetch('http://127.0.0.1:4173/toneary/')).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const albumId='b1392450-e666-3926-a536-22c65f834433',artistId='a74b1b7f-71a5-4011-9441-d0b5e4122711',releaseId='00000000-0000-0000-0000-000000000001';
 await page.route('https://musicbrainz.org/ws/2/**',async route=>{const p=new URL(route.request().url()).pathname;let data={};if(p.includes('/release-group/'+albumId))data={id:albumId,title:'OK Computer','first-release-date':'1997-05-21','primary-type':'Album','artist-credit':[{name:'Radiohead',artist:{id:artistId,name:'Radiohead'}}],genres:[{name:'alternative rock',count:10}],rating:{value:5,'votes-count':2},releases:[{id:releaseId,status:'Official',date:'1997',country:'GB'}],relations:[]};else if(p.endsWith('/release/'))data={releases:[]};else if(p.includes('/release/'+releaseId))data={id:releaseId,country:'GB',media:[{position:1,tracks:[{position:1,title:'Airbag',length:285000,recording:{id:releaseId,title:'Airbag'}}]}],relations:[]};await route.fulfill({json:data})});
 await page.route('**/functions/v1/toneary-reviews',route=>route.fulfill({json:{id:albumId,reviews:[{source:'AllMusic',score:'5',scale:'5',url:'https://www.allmusic.com/album/ok-computer-mw0000024289',via:'Wikipedia',direct:true}]}}));
 await page.goto('http://127.0.0.1:4173/toneary/#/album/'+albumId);
 await page.getByRole('heading',{name:'Κριτικές & βαθμολογίες',exact:true}).waitFor();
 await page.getByText('AllMusic',{exact:true}).waitFor();await page.getByRole('button',{name:'Airbag',exact:true}).waitFor();
 assert.equal(await page.locator('.track-title').evaluate(e=>getComputedStyle(e).fontSize),'16px');
 assert.equal(await page.locator('#album-audience').count(),0);
 assert.ok(!(await page.locator('main').innerText()).includes('Δεν υπάρχουν αρκετές ψήφοι'));
 assert.ok(!(await page.locator('main').innerText()).includes('Δεν εμφανίζεται στο τρέχον'));
 assert.equal(await page.getByText('Βαθμολογίες κοινού',{exact:true}).count(),0);
 await mkdir('_qa',{recursive:true});await page.screenshot({path:'_qa/reviews-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'_qa/reviews-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile must fit viewport');
 await page.getByRole('tab',{name:'Πληροφορίες',exact:true}).click();await page.getByText('Στοιχεία ακρόασης & charts',{exact:true}).click();
 await page.getByRole('button',{name:'Εμφάνιση στοιχείων ακρόασης',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS desktop/mobile critic cards, 16px tracks, no audience clutter, lazy extra info, no page errors');
}finally{await browser?.close();server.kill()}
