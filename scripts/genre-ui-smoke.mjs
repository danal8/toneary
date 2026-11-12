import {chromium} from 'playwright';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:'inherit'});let browser;
try{for(let i=0;i<30;i++){try{if((await fetch('http://127.0.0.1:4173/toneary/')).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const make=(genre,i)=>({id:'aaaaaaaa-aaaa-aaaa-aaaa-'+String(i).padStart(12,'0'),title:genre==='pop'?'Popular pop album':'Indie rock album','first-release-date':'2020','primary-type':'Album','artist-credit':[{name:'Artist',artist:{id:'artist',name:'Artist'}}],tags:[{name:genre,count:10}]});
 await page.route('**/data/popular-albums.json',route=>route.fulfill({json:{items:[]}}));
 await page.route('https://musicbrainz.org/ws/2/**',async route=>{const q=new URL(route.request().url()).searchParams.get('query')||'';await route.fulfill({headers:{'access-control-allow-origin':'*'},json:{'release-groups':[make(q.includes('indie rock')?'indie rock':'pop',q.includes('indie rock')?2:1)],count:1}})});
 await page.route('**/functions/v1/toneary-popularity',async route=>{const b=route.request().postDataJSON();await route.fulfill({headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS'},json:(b?.ids||[]).map(id=>({release_group_mbid:id,total_listen_count:100,total_user_count:10}))})});
 await page.goto('http://127.0.0.1:4173/toneary/');await page.locator('#browse-albums').click();
 await page.locator('select[name=genre]').waitFor();await page.locator('select[name=genre]').selectOption('pop');await page.getByRole('button',{name:'Εφαρμογή',exact:true}).click();await page.getByText('Popular pop album',{exact:true}).waitFor();
 await page.locator('select[name=genre]').selectOption('indie rock');await page.getByRole('button',{name:'Εφαρμογή',exact:true}).click();await page.getByText('Indie rock album',{exact:true}).waitFor();assert.equal(await page.locator('select[name=genre]').inputValue(),'indie rock');
 assert.equal(await page.locator('input[name=genre]').count(),0);assert.equal(await page.locator('select[name=sort]').inputValue(),'popular');
 await mkdir('_qa',{recursive:true});await page.screenshot({path:'_qa/genre-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'_qa/genre-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('PASS genre switch pop -> indie rock without deleting text, default popularity, desktop/mobile');
}finally{await browser?.close();server.kill()}
