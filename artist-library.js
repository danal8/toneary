// Artist favourites use typed records in the existing private, owner-scoped library.
// Old album records have no kind and remain unchanged.
export const isArtistEntry=entry=>entry?.album?.kind==='artist';
export function artistRecord(artist){const name=String(artist.name||artist.title||artist.artist||'').slice(0,300),tags=Array.isArray(artist.genres)?artist.genres:Array.isArray(artist.tags)?artist.tags:[];return{id:artist.id,kind:'artist',title:name,artist:name,artistId:artist.id,artistType:String(artist.artistType||artist.type||'').slice(0,80),tags:tags.slice().sort((a,b)=>(b?.count||0)-(a?.count||0)).map(t=>typeof t==='string'?t:t?.name).filter(t=>typeof t==='string').slice(0,12)}}
export function artistFavourites(library){return Object.values(library).filter(e=>isArtistEntry(e)&&e.favorite).map(e=>({id:e.album.id,name:e.album.title,type:e.album.artistType,tags:e.album.tags||[]}))}
export function albumEntries(library){return Object.values(library).filter(e=>e.album&&!isArtistEntry(e))}
