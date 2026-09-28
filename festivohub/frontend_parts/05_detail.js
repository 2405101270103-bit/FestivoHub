// ============ EVENT DETAIL PAGE ============
async function renderEventDetail(id){
  const pc=$('#page');
   pc.innerHTML='';
  try{
    const ev=await api('/events/'+id);
    S._evData=ev;
    const sold=metric(ev.sold),soldPct=ev.total_seats?Math.round((sold/ev.total_seats)*100):0;
    const src=ev.image||(ev.images&&ev.images[0])||'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=500&fit=crop';
     const FB='https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=500&fit=crop';
     preloadImage(src,[640,960,1400],'100vw');

     let h='<section class="section" style="padding-top:calc(var(--nav-h)+1rem)"><div class="container">';
     // Hero
     h+='<div class="detail-hero"><img src="'+img(src,960)+'" srcset="'+srcSetWidths(src,[640,960,1400])+'" sizes="100vw" width="1400" height="500" alt="'+esc(ev.title)+'" decoding="async" loading="eager" fetchpriority="high" onerror="imageFallback(this,\''+img(FB,1400)+'\')"><div class="dh-overlay"></div><div class="dh-content"><div style="display:flex;gap:.4rem;margin-bottom:.5rem;flex-wrap:wrap"><span class="badge b-purple">'+esc(ev.category_name||'')+'</span><span class="badge b-'+badgeClass(ev.event_status||ev.status)+'">'+esc(ev.event_status||ev.status)+'</span></div><h1 style="font-family:Space Grotesk;font-weight:700;font-size:clamp(1.5rem,3vw,2.2rem);margin-bottom:.5rem">'+esc(ev.title)+'</h1><div style="display:flex;gap:1.5rem;flex-wrap:wrap;color:var(--text-2);font-size:.88rem;margin-top:.3rem"><span>'+stars(ev.avg_rating||0)+' '+(ev.avg_rating||0)+'</span><span><i class="bi bi-calendar-fill"></i> '+fmtD(ev.event_date)+'</span><span><i class="bi bi-clock-fill"></i> '+(ev.event_time||'TBA')+'</span><span><i class="bi bi-geo-alt-fill"></i> '+esc(ev.venue||'')+', '+esc(ev.city||'')+'</span></div></div></div>';

    // Grid
    h+='<div class="detail-grid"><div>';
    // About
    h+='<div class="card" style="padding:1.5rem;margin-bottom:1.2rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:.8rem"><i class="bi bi-info-circle-fill" style="color:var(--purple-l)"></i> About This Event</h5><p style="color:var(--text-2);line-height:1.8;white-space:pre-line;font-size:.92rem">'+esc(ev.description||'')+'</p></div>';
    // Capacity
    h+='<div class="card" style="padding:1.5rem;margin-bottom:1.2rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:.8rem"><i class="bi bi-bar-chart-fill" style="color:var(--purple-l)"></i> Capacity</h5><div style="display:flex;justify-content:space-between;margin-bottom:.5rem;font-size:.85rem"><span class="t2">'+sold+' / '+ev.total_seats+' sold</span><span style="font-weight:600">'+soldPct+'%</span></div><div style="height:6px;background:var(--bg-3);border-radius:4px;overflow:hidden"><div style="height:100%;width:'+soldPct+'%;background:var(--g1);border-radius:4px;transition:width .6s"></div></div></div>';
    // Reviews
    if(ev.reviews&&ev.reviews.length){
      h+='<div class="card" style="padding:1.5rem;margin-bottom:1.2rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:.8rem"><i class="bi bi-chat-left-text-fill" style="color:var(--purple-l)"></i> Reviews ('+ev.reviews.length+')</h5>';
      ev.reviews.forEach(r=>{h+='<div class="rev-card" style="background:var(--bg-3);border-color:var(--border)"><div class="rev-head"><div class="rev-av" style="background:var(--g3)">'+initials(r.user_name)+'</div><div><div style="font-weight:600;font-size:.88rem">'+esc(r.user_name)+'</div><div class="rev-stars" style="font-size:.75rem">'+[1,2,3,4,5].map(i=>'<i class="bi bi-star'+(i<=r.rating?'-fill':'')+'"></i>').join('')+'</div></div></div><p class="rev-text" style="font-size:.85rem">'+esc(r.text||'')+'</p></div>'});
      h+='</div>';
    }
    // Write review
    if(S.user&&S.user.role==='user'){
      h+='<div class="card" style="padding:1.5rem;margin-bottom:1.2rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:.8rem"><i class="bi bi-pencil-fill" style="color:var(--purple-l)"></i> Write a Review</h5><div class="fg"><label>Rating</label><select id="rvR"><option value="5">5 Stars</option><option value="4">4 Stars</option><option value="3">3 Stars</option><option value="2">2 Stars</option><option value="1">1 Star</option></select></div><div class="fg"><label>Your Review</label><textarea id="rvT" rows="3" placeholder="Share your experience..."></textarea></div><button class="btn btn-p" onclick="submitReview(\''+id+'\')"><i class="bi bi-send"></i> Submit Review</button></div>';
    }
    h+='</div>';

    // SIDEBAR
    h+='<div>';
    // Tickets
    h+='<div class="card" style="padding:1.3rem;margin-bottom:1.2rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:.8rem"><i class="bi bi-ticket-perforated-fill" style="color:var(--purple-l)"></i> Select Tickets</h5>';
    const tts=ev.ticket_types&&ev.ticket_types.length?ev.ticket_types:[{name:'General',price:ev.price||0,quantity:ev.total_seats||0,sold:ev.sold||0}];
    tts.forEach((tt,i)=>{
      const avail=tt.quantity-(tt.sold||0);
      h+='<div class="tt-card'+(i===0?' sel':'')+'" onclick="selTT(this,\''+esc(tt.name)+'\','+tt.price+')" data-name="'+esc(tt.name)+'" data-price="'+tt.price+'"><div style="display:flex;justify-content:space-between;align-items:start"><div><div class="tt-name">'+esc(tt.name)+'</div><div class="tt-avail">'+avail+' available</div></div><div class="tt-price">'+fmt(tt.price)+'</div></div></div>';
    });
    h+='<div class="qty-row"><button onclick="qtyCh(-1)"><i class="bi bi-dash"></i></button><div class="qty" id="bkQty">1</div><button onclick="qtyCh(1)"><i class="bi bi-plus"></i></button></div>';
    h+='<div class="order-box"><div class="ob-row"><span class="t2">Subtotal</span><span id="osSub">'+fmt(tts[0].price)+'</span></div><div class="ob-row"><span class="t2">Booking Fee</span><span>'+fmt(10)+'</span></div><div class="ob-row ob-total"><span>Total</span><span id="osTotal">'+fmt(tts[0].price+10)+'</span></div></div>';
    h+='<button class="btn btn-p btn-lg" style="width:100%;justify-content:center;margin-top:.8rem" onclick="startBooking(\''+id+'\')"><i class="bi bi-ticket-perforated"></i> Book Now</button></div>';

    // Organizer
    if(ev.organizer){
      h+='<div class="card" style="padding:1.3rem;margin-bottom:1.2rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:.8rem"><i class="bi bi-building" style="color:var(--purple-l)"></i> Organizer</h5><div style="display:flex;align-items:center;gap:.7rem"><div class="rev-av" style="width:42px;height:42px;font-size:.9rem;background:var(--g1)">'+initials(ev.organizer.org_name||'')+'</div><div><div style="font-weight:600">'+esc(ev.organizer.org_name||'')+'</div><div class="t3" style="font-size:.8rem">'+esc(ev.organizer.email||'')+'</div></div></div></div>';
    }

    // Related
    if(ev.related&&ev.related.length){
      h+='<div class="card" style="padding:1.3rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:.8rem"><i class="bi bi-collection-fill" style="color:var(--purple-l)"></i> Similar Events</h5>';
      ev.related.slice(0,3).forEach(r=>{
         const rsrc=r.image||(r.images&&r.images[0])||FB;
         h+='<div style="display:flex;gap:.6rem;margin-bottom:.5rem;cursor:pointer;padding:.4rem;border-radius:var(--radius-sm);transition:background .2s" onclick="navigate(\'/events/'+r._id+'\')" onmouseover="this.style.background=\'var(--surface-2)\'" onmouseout="this.style.background=\'transparent\'"><div style="width:52px;height:52px;border-radius:var(--radius-sm);overflow:hidden;flex-shrink:0"><img src="'+img(rsrc,200)+'" width="52" height="52" style="width:100%;height:100%;object-fit:cover" loading="lazy" decoding="async" onerror="imageFallback(this,\''+img(FB,200)+'\')" alt="'+esc(r.title||'')+'"></div><div><div style="font-weight:600;font-size:.85rem">'+esc(r.title||'')+'</div><div class="t3" style="font-size:.75rem">'+fmtD(r.event_date)+' &bull; '+fmt(r.price||0)+'</div></div></div>';
      });
      h+='</div>';
    }

     h+='</div></div></div></section>';
     if(ev.related&&ev.related.length)prefetchEventImages(ev.related,3,200,'52px');
     pc.innerHTML=h;
  }catch(e){pc.innerHTML=empty('exclamation-triangle','Event Not Found',e.message,'<button class="btn btn-p" onclick="navigate(\'/events\')">Browse Events</button>')}
}

// ============ BOOKING HELPERS ============
let _selTT=null,_selPrice=0;
function selTT(el,name,price){$$('.tt-card').forEach(c=>c.classList.remove('sel'));el.classList.add('sel');_selTT=name;_selPrice=price;updOS()}
function qtyCh(d){const el=$('#bkQty');let q=parseInt(el.textContent,10)+d;if(q<1)q=1;if(q>10)q=10;el.textContent=q;updOS()}
function updOS(){const q=parseInt(($('#bkQty')||{}).textContent||'1',10);const sub=_selPrice*q;const fee=10*q;if($('#osSub'))$('#osSub').textContent=fmt(sub);if($('#osTotal'))$('#osTotal').textContent=fmt(sub+fee)}
async function startBooking(evId){
  if(!S.user){toast('Please log in to book','err');navigate('/login');return}
  if(S.user.role!=='user'){toast('Only users can book tickets','err');return}
  const q=parseInt(($('#bkQty')||{}).textContent||'1',10);
  const tt=_selTT||'General';
  try{
    toast('Creating booking...');
    const d=await api('/bookings',{method:'POST',body:{event_id:evId,ticket_type:tt,quantity:q}});
    toast('Confirming payment...');
     await api('/payments/verify',{method:'POST',body:{booking_id:d.booking_id,order_id:d.order.order_id}});
     resetUserCaches();
     toast('Booking confirmed! Your ticket is ready.');
     navigate('/dashboard/tickets');
  }catch(e){toast(e.message,'err')}
}
async function submitReview(evId){
  const rating=($('#rvR')||{}).value;const text=($('#rvT')||{}).value;
  if(!text||text.length<5){toast('Review must be at least 5 characters','err');return}
  try{await api('/reviews',{method:'POST',body:{event_id:evId,rating:parseInt(rating,10),text}});toast('Review submitted!');renderEventDetail(evId)}catch(e){toast(e.message,'err')}
}
