import {writePersonal,syncFailure} from './storage.js?v=7';
const clone=value=>JSON.parse(JSON.stringify(value));
const fields=['favorite','listenLater','rating','note'];
const fieldValue=(entry,key)=>key==='rating'?(entry?.rating||null):key==='note'?(entry?.note||''):!!entry?.[key];
export const activeEntry=e=>!!(e?.favorite||e?.listenLater||e?.rating||e?.note);
export function changesBetween(before={},after={}){const patches=[];for(const id of new Set([...Object.keys(before),...Object.keys(after)])){const album=after[id]?.album||before[id]?.album;if(!album)continue;const changes={};for(const key of fields)if(fieldValue(before[id],key)!==fieldValue(after[id],key))changes[key]=fieldValue(after[id],key);if(Object.keys(changes).length)patches.push({id,album,changes})}return patches}
export function rowsToLibrary(rows){const library={};for(const r of rows){const e={album:r.album,favorite:r.favorite,listenLater:r.listen_later,rating:r.rating,note:r.note,added:Date.parse(r.added_at)||Date.now()};if(activeEntry(e))library[r.album_id]=e}return library}
export function overlay(library,patches){const result=clone(library);for(const p of Object.values(patches)){const entry={...(result[p.id]||{added:Date.now()}),album:p.album,...p.changes};if(activeEntry(entry))result[p.id]=entry;else delete result[p.id]}return result}
export class LibrarySync{
  constructor({storage,remote,onChange=()=>{},onStatus=()=>{}}){this.storage=storage;this.remote=remote;this.onChange=onChange;this.onStatus=onStatus;this.uid=null;this.generation=0;this.running=null;this.pending={};this.baseline={};this.revision=0}
  read(key,fallback={}){try{return JSON.parse(this.storage.getItem(key))||fallback}catch{return fallback}}
  write(key,value){writePersonal(this.storage,key,JSON.stringify(value))}
  keys(uid=this.uid){return{cache:'toneary:account:'+uid,outbox:'toneary:outbox:'+uid}}
  emit(value){this.baseline=clone(value);this.write(this.keys().cache,value);this.onChange(value)}
  async connect(uid,guest={}){this.generation++;this.uid=uid;this.pending=this.read(this.keys().outbox);this.baseline=overlay(this.read(this.keys().cache),this.pending);this.onChange(clone(this.baseline));
    await this.sync();
    // Read the existing cloud library before importing guest records.
    if(this.uid===uid&&!this.lastError&&Object.keys(guest).length){const merged=clone(this.baseline);for(const[id,e]of Object.entries(guest)){const old=merged[id];merged[id]=old?{...e,...old,favorite:!!(e.favorite||old.favorite),listenLater:!!(e.listenLater||old.listenLater),rating:old.rating||e.rating,note:old.note||e.note}:e}this.edit(merged,false);this.storage.removeItem('toneary:library');await this.sync()}
  }
  disconnect(){this.generation++;this.uid=null;this.baseline={};this.pending={};this.onStatus('guest');this.onChange(this.read('toneary:library'))}
  edit(value,start=true){if(!this.uid)return;for(const patch of changesBetween(this.baseline,value)){const old=this.pending[patch.id];this.pending[patch.id]={...patch,changes:{...old?.changes,...patch.changes},revision:++this.revision}}this.baseline=clone(value);this.write(this.keys().cache,value);this.write(this.keys().outbox,this.pending);this.onStatus(Object.keys(this.pending).length?'pending':'saved');if(start)this.sync()}
  async sync(){if(!this.uid)return;if(this.running){const previous=this.running;await previous;if(this.uid&&Object.keys(this.pending).length)return this.sync();return}const uid=this.uid,generation=this.generation;const current=()=>this.uid===uid&&this.generation===generation;this.onStatus('syncing');
    const work=(async()=>{try{this.lastError=null;await this.storage.flush?.();while(current()&&Object.keys(this.pending).length){const batch=clone(Object.values(this.pending).slice(0,300));await this.storage.flush?.();await this.remote.push(uid,batch);if(!current())return;for(const p of batch){const latest=this.pending[p.id];if(!latest)continue;if(latest.revision===p.revision)delete this.pending[p.id];else{for(const[k,v]of Object.entries(p.changes))if(latest.changes[k]===v)delete latest.changes[k];if(!Object.keys(latest.changes).length)delete this.pending[p.id]}}this.write(this.keys(uid).outbox,this.pending)}if(!current())return;const rows=await this.remote.pull(uid);if(!current())return;this.emit(overlay(rowsToLibrary(rows),this.pending));await this.storage.flush?.();this.onStatus(Object.keys(this.pending).length?'pending':'saved')}catch(error){if(current()){this.lastError=error;this.onStatus(syncFailure(error),error.message)}}})();this.running=work;await work;if(this.running===work)this.running=null;
  }
}
