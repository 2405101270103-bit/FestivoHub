// ============ EXPLORE EVENTS PAGE ============
async function renderEvents(){
  const pc=$('#page');
  const qIdx=S.route.indexOf('?');
  const qs=qIdx>-1?new URLSearchParams(S.route.slice(qIdx)):new URLSearchParams();
  const kw=qs.get('keyword')||'',city=qs.get('city')||'',cat=qs.get('category')||'';
  const date=qs.get('event_date')||'';
  const page=parseInt(qs.get('page')||'1',10);

   pc.innerHTML='<section class="section ev-section" style="padding-top:calc(var(--nav-h) + 1.5rem)"><div class="container ev-container"><div class="sec-hdr" style="text-align:left;margin-bottom:1.5rem"><h2>Discover Events</h2><p class="t2" style="margin:0">Find your next unforgettable experience</p></div><div class="ev-count-row"><span class="t2" style="font-size:.88rem" id="evCount"></span></div><div class="ev-grid" id="evGrid"></div><div class="pager" id="evPag"></div></div></section>';

  loadEventsList(kw,city,cat,page,date);
}

async function loadEventsList(kw,city,cat,page,date){
  const grid=$('#evGrid'),pag=$('#evPag'),count=$('#evCount');
  if(!grid)return;
  try{
    let q='?page='+page+'&per_page=12&sort=date';
    if(kw)q+='&keyword='+encodeURIComponent(kw);
    if(city)q+='&city='+encodeURIComponent(city);
    if(cat)q+='&category='+encodeURIComponent(cat);
    if(date)q+='&event_date='+date+'&';
     const d=await cachedGet('/events'+q,15000);
     if(count)count.textContent=d.total+' Events Found';
     if(!d.events||!d.events.length){grid.innerHTML=empty('search','No Events Found','Try adjusting your search terms.');pag.innerHTML='';return}
     prefetchEventImages(d.events,4);
     grid.innerHTML=d.events.map((ev,i)=>evCard(ev,i<4)).join('');
    const tp=Math.ceil(d.total/d.per_page);
    if(tp>1){let h='';if(page>1)h+='<button onclick="evGo('+(page-1)+')"><i class="bi bi-chevron-left"></i></button>';for(let i=Math.max(1,page-2);i<=Math.min(tp,page+2);i++)h+='<button class="'+(i===page?'active':'')+'" onclick="evGo('+i+')">'+i+'</button>';if(page<tp)h+='<button onclick="evGo('+(page+1)+')"><i class="bi bi-chevron-right"></i></button>';pag.innerHTML=h}else pag.innerHTML='';
  }catch(e){grid.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
function evGo(p){
  const qs=new URLSearchParams(S.route.indexOf('?')>-1?S.route.slice(S.route.indexOf('?')+1):'');
  qs.set('page',p);navigate('/events?'+qs.toString());
}