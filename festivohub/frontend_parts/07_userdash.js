// ============ DASHBOARD SHELL ============
function dashShell(role,active){
  const pages={
    user:[{id:'overview',icon:'speedometer2',label:'Dashboard'},{id:'bookings',icon:'ticket-perforated',label:'My Bookings'},{id:'tickets',icon:'qr-code',label:'My Tickets'},{id:'favorites',icon:'heart',label:'Favorites'},{id:'profile',icon:'person',label:'Profile'}],
    organizer:[{id:'overview',icon:'speedometer2',label:'Dashboard'},{id:'events',icon:'calendar-event',label:'My Events'},{id:'create-event',icon:'plus-circle',label:'Create Event'},{id:'bookings',icon:'ticket-perforated',label:'Bookings'},{id:'checkin',icon:'qr-code-scan',label:'Check-In'},{id:'analytics',icon:'bar-chart',label:'Analytics'},{id:'revenue',icon:'currency-rupee',label:'Revenue'},{id:'profile',icon:'person',label:'Profile'}],
    admin:[{id:'overview',icon:'speedometer2',label:'Dashboard'},{id:'events',icon:'calendar-event',label:'Events'},{id:'categories',icon:'tags',label:'Categories'},{id:'users',icon:'people',label:'Users'},{id:'organizers',icon:'building',label:'Organizers'},{id:'bookings',icon:'ticket-perforated',label:'Bookings'},{id:'reviews',icon:'star',label:'Reviews'},{id:'contacts',icon:'envelope',label:'Contacts'},{id:'audit',icon:'shield-lock',label:'Audit Log'},{id:'settings',icon:'gear',label:'Settings'}]
  };
  const items=pages[role]||pages.user;
  const pg=active||'overview';
  const uname=S.user?S.user.name||S.user.email:'User';
  const pc=$('#page');
  pc.innerHTML='<div class="dash"><aside class="dash-side"><div class="brand" style="margin-bottom:1.5rem;cursor:pointer" onclick="navigate(\'/\')"><div class="brand-icon" style="width:28px;height:28px;font-size:.8rem;border-radius:8px"><i class="bi bi-calendar2-event"></i></div><span style="font-size:1rem">FestivoHub</span></div><div style="flex:1">'+items.map(i=>'<div class="sb-link'+(i.id===pg?' active':'')+'" onclick="dashNav(\''+i.id+'\')"><i class="bi bi-'+i.icon+'"></i>'+i.label+'</div>').join('')+'</div><div style="margin-top:auto;padding-top:.8rem;border-top:1px solid var(--border)"><div class="sb-link" onclick="logout()"><i class="bi bi-box-arrow-right"></i>Logout</div></div></aside><main class="dash-main"><div class="dash-hdr"><div><h1 id="dTitle">'+(items.find(i=>i.id===pg)||{}).label+'</h1><p class="t2" style="font-size:.85rem;margin:0">Welcome back, '+esc(uname)+'</p></div><button class="btn btn-g btn-sm" onclick="navigate(\'/\')"><i class="bi bi-house"></i> Home</button></div><div class="dash-body" id="dBdy"></div></main></div>';
}
function dashNav(p){navigate('/dashboard/'+p)}

// ============ PROFILE ============
async function renderProfile(c,role){
  c.innerHTML=sp();
  try{
    const me=await api('/me');
    c.innerHTML='<div style="max-width:560px"><div class="card tc" style="padding:2rem;margin-bottom:1.2rem"><div class="rev-av" style="width:68px;height:68px;font-size:1.4rem;margin:0 auto .8rem;background:var(--g1)">'+initials(me.full_name||me.org_name||me.name||'')+'</div><h4 style="font-family:Space Grotesk">'+esc(me.full_name||me.org_name||me.name||'')+'</h4><p class="t2" style="font-size:.85rem">'+esc(me.email||'')+'</p><span class="badge b-purple" style="margin-top:.4rem">'+esc(role)+'</span></div><div class="card" style="padding:1.5rem;margin-bottom:1.2rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:1rem">Edit Profile</h5><div class="fg"><label>'+(role==='organizer'?'Organization Name':'Full Name')+'</label><input type="text" id="pName" value="'+esc(me.full_name||me.org_name||'')+'"></div><div class="fg"><label>Phone</label><input type="tel" id="pPhone" value="'+esc(me.phone||'')+'"></div><div class="fg"><label>Address</label><input type="text" id="pAddr" value="'+esc(me.address||'')+'"></div><div class="fg"><label>City</label><input type="text" id="pCity" value="'+esc(me.city||'')+'"></div>'+(role==='organizer'?'<div class="fg"><label>Description</label><textarea id="pDesc" rows="3">'+esc(me.description||'')+'</textarea></div><div class="fg"><label>Website</label><input type="url" id="pWeb" value="'+esc(me.website||'')+'"></div>':'')+'<button class="btn btn-p" onclick="saveProfile(\''+role+'\')"><i class="bi bi-check-lg"></i> Save Changes</button></div><div class="card" style="padding:1.5rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:1rem">Change Password</h5><div class="fg"><label>Current Password</label><input type="password" id="pCurr"></div><div class="fg"><label>New Password</label><input type="password" id="pNew" placeholder="Min 6 characters"></div><button class="btn btn-amber" onclick="changePass()"><i class="bi bi-lock-fill"></i> Update Password</button></div></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function saveProfile(role){
  const body={};if(role==='organizer'){body.org_name=($('#pName')||{}).value;body.description=($('#pDesc')||{}).value;body.website=($('#pWeb')||{}).value}else body.full_name=($('#pName')||{}).value;
  body.phone=($('#pPhone')||{}).value;body.address=($('#pAddr')||{}).value;body.city=($('#pCity')||{}).value;
  try{await api('/profile',{method:'PUT',body});toast('Profile updated!')}catch(e){toast(e.message,'err')}
}
async function changePass(){
  const current=($('#pCurr')||{}).value,next=($('#pNew')||{}).value;
  if(!current||!next){toast('Fill both fields','err');return}
  if(next.length<6){toast('Min 6 characters','err');return}
  try{await api('/profile/password',{method:'POST',body:{current,next}});toast('Password updated!');$('#pCurr').value='';$('#pNew').value=''}catch(e){toast(e.message,'err')}
}

// ============ USER DASHBOARD ============
async function renderUserDash(sub){
  dashShell('user',sub||'overview');
  const c=$('#dBdy');if(!c)return;
  if(sub==='bookings')return uBookings(c);
  if(sub==='tickets')return uTickets(c);
  if(sub==='favorites')return uFavs(c);
  if(sub==='profile')return renderProfile(c,'user');
  uOverview(c);
}
async function getUserBookings(){
  if(Array.isArray(S.bookings))return S.bookings;
  if(!S.bookingsPromise)S.bookingsPromise=api('/my-bookings').then(b=>{S.bookings=b;return b}).catch(e=>{S.bookingsPromise=null;throw e});
  return S.bookingsPromise;
}
async function getUserTickets(){
  if(Array.isArray(S.tickets))return S.tickets;
  if(!S.ticketsPromise)S.ticketsPromise=api('/user/tickets').then(t=>{S.tickets=t;return t}).catch(e=>{S.ticketsPromise=null;throw e});
  return S.ticketsPromise;
}
async function uOverview(c){
  c.innerHTML=sp();
  try{
     const[bk,tk]=await Promise.all([getUserBookings().catch(()=>[]),getUserTickets().catch(()=>[])]);
     const conf=bk.filter(confirmedBooking);
     const spent=conf.reduce((s,b)=>s+bookingRevenue(b),0);
    c.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.8rem;margin-bottom:1.2rem">'
      +'<div class="sc clickable" onclick="dashNav(\'bookings\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g1)"><i class="bi bi-ticket-perforated"></i></div><div><div class="sc-val">'+metric(bk.length)+'</div><div class="sc-lbl">Total Bookings</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'bookings\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g4)"><i class="bi bi-check-circle"></i></div><div><div class="sc-val">'+metric(conf.length)+'</div><div class="sc-lbl">Confirmed</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'tickets\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g3)"><i class="bi bi-qr-code"></i></div><div><div class="sc-val">'+metric(tk.length)+'</div><div class="sc-lbl">Digital Tickets</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'bookings\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g5)"><i class="bi bi-currency-rupee"></i></div><div><div class="sc-val">'+fmt(metric(spent))+'</div><div class="sc-lbl">Total Spent</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'</div>';
    if(bk.length){
      c.innerHTML+='<div class="card" style="padding:1.3rem"><div style="display:flex;justify-content:space-between;margin-bottom:.8rem"><h5 style="font-family:Space Grotesk;font-weight:600">Recent Bookings</h5></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>Event</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>'+bk.slice(0,5).map(b=>'<tr><td><code>'+esc(b.booking_id)+'</code></td><td>'+esc(b.event_title)+'</td><td>'+fmtD(b.event_date)+'</td><td>'+fmt(bookingRevenue(b))+'</td><td><span class="badge b-'+badgeClass(b.booking_status)+'">'+esc(b.booking_status)+'</span></td></tr>').join('')+'</tbody></table></div></div>';
    }else c.innerHTML+=empty('calendar-x','No Bookings Yet','Discover amazing events and book your first ticket!','<button class="btn btn-p" onclick="navigate(\'/events\')"><i class="bi bi-compass"></i> Browse Events</button>');
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function uBookings(c){
  c.innerHTML=sp();
  try{
     const bk=await getUserBookings();
    if(!bk.length){c.innerHTML=empty('ticket-perforated','No Bookings','Your bookings will appear here.','<button class="btn btn-p" onclick="navigate(\'/events\')">Browse Events</button>');return}
    c.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>Event</th><th>Date</th><th>Qty</th><th>Amount</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead><tbody>'+bk.map(b=>'<tr><td><code>'+esc(b.booking_id)+'</code></td><td><a href="#/events/'+esc(b.event_id)+'" onclick="navigate(\'/events/'+esc(b.event_id)+'\')">'+esc(b.event_title)+'</a></td><td>'+fmtD(b.event_date)+'</td><td>'+metric(bookingQuantity(b))+'</td><td>'+fmt(bookingRevenue(b))+'</td><td><span class="badge b-'+badgeClass(b.payment_status)+'">'+esc(b.payment_status)+'</span></td><td><span class="badge b-'+badgeClass(b.booking_status)+'">'+esc(b.booking_status)+'</span></td><td>'+(b.booking_status==='Confirmed'?'<button class="btn btn-danger btn-sm" onclick="cancelBk(\''+b._id+'\')">Cancel</button>':'')+'</td></tr>').join('')+'</tbody></table></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function cancelBk(id){if(!confirm('Cancel this booking?'))return;try{await api('/bookings/'+id+'/cancel',{method:'POST'});resetUserCaches();toast('Booking cancelled');uBookings($('#dBdy'))}catch(e){toast(e.message,'err')}}

async function uTickets(c){
  c.innerHTML=sp();
  try{
     const tk=await getUserTickets();
    if(!tk.length){c.innerHTML=empty('qr-code','No Tickets Yet','Book an event to get your digital QR ticket.','<button class="btn btn-p" onclick="navigate(\'/events\')">Browse Events</button>');return}
    c.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem">'+tk.map(t=>'<div class="ticket-disp" id="tkt-'+t._id+'"><div class="td-hdr"><h5 style="margin:0;font-family:Space Grotesk;font-size:1rem">'+esc(t.event_title)+'</h5><p style="margin:.3rem 0 0;opacity:.85;font-size:.85rem">'+fmtD(t.event_date)+' &bull; '+esc(t.event_time||'TBA')+'</p></div><div class="td-body"><div class="td-qr" id="qr-'+t._id+'"><div class="spinner" style="width:24px;height:24px;border-width:2px"></div></div><div style="font-size:.78rem;color:var(--text-3);margin:.3rem 0"><code>'+esc(t.ticket_number||'')+'</code></div><div class="td-tear"></div><div class="td-info"><div class="td-row"><span>Booking</span><span><code>'+esc(t.booking_code)+'</code></span></div><div class="td-row"><span>Type</span><span>'+esc(t.ticket_type)+'</span></div><div class="td-row"><span>Qty</span><span>'+metric(bookingQuantity(t))+'</span></div><div class="td-row"><span>Venue</span><span>'+esc(t.venue||'')+'</span></div><div class="td-row"><span>Amount</span><span>'+fmt(bookingRevenue(t))+'</span></div><div class="td-row"><span>Status</span><span class="badge b-'+badgeClass(t.status)+'">'+esc(t.status)+'</span></div></div></div></div>').join('')+'</div>';
    tk.forEach(t=>loadQR(t._id));
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function loadQR(tid){
  const el=$('#qr-'+tid);if(!el)return;
  try{
    let qr=S.qrCache[tid];
    if(!qr){const d=await api('/tickets/'+tid+'/qr');qr=d.qr;S.qrCache[tid]=qr}
    if($('#qr-'+tid)===el&&qr)el.innerHTML='<img src="'+qr+'" width="240" height="240" loading="eager" decoding="async" alt="Ticket QR code">';
  }catch(e){if($('#qr-'+tid)===el)el.innerHTML='<p class="t3" style="font-size:.78rem">QR unavailable</p>'}
}

async function uFavs(c){
  c.innerHTML='';
  try{
     const favs=await api('/favorites');
     if(!favs.length){c.innerHTML=empty('heart','No Favorites','Save events you love to find them easily later.','<button class="btn btn-p" onclick="navigate(\'/events\')">Browse Events</button>');return}
     prefetchEventImages(favs,4);
     c.innerHTML='<div class="ev-grid">'+favs.map((ev,i)=>evCard(ev,i<4)).join('')+'</div>';
   }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
