// ============ ORGANIZER DASHBOARD ============
async function renderOrgDash(sub){
  dashShell('organizer',sub||'overview');
  const c=$('#dBdy');if(!c)return;
  if(sub==='events')return oEvents(c);
  if(sub==='create-event')return oCreate(c);
  if(sub==='bookings')return oBookings(c);
  if(sub==='checkin')return oCheckin(c);
  if(sub==='analytics')return oAnalytics(c);
  if(sub==='revenue')return oRevenue(c);
  if(sub==='profile')return renderProfile(c,'organizer');
  oOverview(c);
}
async function oOverview(c){
  c.innerHTML=sp();
  try{
    const s=await api('/organizer/stats');
    c.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.8rem;margin-bottom:1.2rem">'
      +'<div class="sc clickable" onclick="dashNav(\'events\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g1)"><i class="bi bi-calendar-event"></i></div><div><div class="sc-val">'+metric(s.total_events)+'</div><div class="sc-lbl">Total Events</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'events\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g4)"><i class="bi bi-check-circle"></i></div><div><div class="sc-val">'+metric(s.published_events)+'</div><div class="sc-lbl">Published</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'bookings\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g2)"><i class="bi bi-ticket-perforated"></i></div><div><div class="sc-val">'+metric(s.tickets_sold)+'</div><div class="sc-lbl">Tickets Sold</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'revenue\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g5)"><i class="bi bi-currency-rupee"></i></div><div><div class="sc-val">'+fmt(metric(s.revenue))+'</div><div class="sc-lbl">Revenue</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'bookings\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g3)"><i class="bi bi-hourglass"></i></div><div><div class="sc-val">'+metric(s.pending_bookings)+'</div><div class="sc-lbl">Pending</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'events\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:linear-gradient(135deg,#ec4899,#8b5cf6)"><i class="bi bi-calendar-check"></i></div><div><div class="sc-val">'+metric(s.upcoming_events)+'</div><div class="sc-lbl">Upcoming</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'</div>';
    c.innerHTML+='<div class="card" style="padding:1.3rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:.8rem">Quick Actions</h5><div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn btn-p" onclick="dashNav(\'create-event\')"><i class="bi bi-plus-circle"></i> Create Event</button><button class="btn btn-g" onclick="dashNav(\'bookings\')"><i class="bi bi-ticket-perforated"></i> Bookings</button><button class="btn btn-g" onclick="dashNav(\'analytics\')"><i class="bi bi-bar-chart"></i> Analytics</button></div></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function oEvents(c){
  c.innerHTML=sp();
  try{
    const evs=await api('/organizer/my-events');
    if(!evs.length){c.innerHTML=empty('calendar-x','No Events','Create your first event!','<button class="btn btn-p" onclick="dashNav(\'create-event\')">Create Event</button>');return}
    c.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Event</th><th>Date</th><th>Price</th><th>Sold</th><th>Revenue</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+evs.map(e=>'<tr><td><strong>'+esc(e.title)+'</strong><br><span class="t3" style="font-size:.75rem">'+esc(e.venue||'')+'</span></td><td>'+fmtD(e.event_date)+'</td><td>'+fmt(e.price)+'</td><td>'+metric(e.tickets_booked)+'/'+metric(e.total_seats)+'</td><td>'+fmt(metric(e.revenue))+'</td><td><span class="badge b-'+badgeClass(e.status)+'">'+esc(e.status)+'</span></td><td><div style="display:flex;gap:.3rem;flex-wrap:wrap">'+(['Published','Approved'].includes(e.status)?'<button class="btn btn-g btn-sm" onclick="orgEvtSt(\''+e._id+'\',\'Unpublished\')">Unpublish</button>':'<button class="btn btn-p btn-sm" onclick="orgEvtSt(\''+e._id+'\',\'Published\')">Publish</button>')+'<button class="btn btn-danger btn-sm" onclick="orgDelEvt(\''+e._id+'\')"><i class="bi bi-trash"></i></button></div></td></tr>').join('')+'</tbody></table></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function orgEvtSt(id,st){try{await api('/organizer/events/'+id+'/status',{method:'POST',body:{status:st}});toast('Updated');oEvents($('#dBdy'))}catch(e){toast(e.message,'err')}}
async function orgDelEvt(id){if(!confirm('Delete?'))return;try{await api('/organizer/events/'+id,{method:'DELETE'});toast('Deleted');oEvents($('#dBdy'))}catch(e){toast(e.message,'err')}}
async function oCreate(c){
   let cats=S.categories;if(!cats.length)cats=await getCategories().catch(()=>[]);
  c.innerHTML='<div style="max-width:660px"><div class="card" style="padding:2rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:1.2rem"><i class="bi bi-plus-circle" style="color:var(--purple-l)"></i> Create New Event</h5><div class="fg"><label>Event Title *</label><input type="text" id="ceT" placeholder="e.g. Navratri Garba Night 2026"></div><div class="fg"><label>Description *</label><textarea id="ceD" rows="4" placeholder="Describe your event..."></textarea></div><div class="fg-row"><div class="fg"><label>Venue *</label><input type="text" id="ceV"></div><div class="fg"><label>City</label><input type="text" id="ceC"></div></div><div class="fg-row"><div class="fg"><label>Date *</label><input type="date" id="ceDate"></div><div class="fg"><label>Time *</label><input type="time" id="ceTime"></div></div><div class="fg-row"><div class="fg"><label>Category *</label><select id="ceCat">'+cats.map(c=>'<option>'+esc(c.name)+'</option>').join('')+'</select></div><div class="fg"><label>Price (\u20B9)</label><input type="number" id="ceP" min="0"></div></div><div class="fg-row"><div class="fg"><label>Seats *</label><input type="number" id="ceS" min="1"></div><div class="fg"><label>Image URL</label><input type="url" id="ceImg"></div></div><div class="fg"><label>Terms</label><textarea id="ceTerms" rows="2"></textarea></div><div style="display:flex;gap:.7rem"><button class="btn btn-p" onclick="submitEvt(false)"><i class="bi bi-send-fill"></i> Submit</button><button class="btn btn-g" onclick="submitEvt(true)"><i class="bi bi-save"></i> Draft</button></div></div></div>';
}
async function submitEvt(draft){
  const b={title:($('#ceT')||{}).value,description:($('#ceD')||{}).value,venue:($('#ceV')||{}).value,city:($('#ceC')||{}).value,event_date:($('#ceDate')||{}).value,event_time:($('#ceTime')||{}).value,category_name:($('#ceCat')||{}).value,price:parseFloat(($('#ceP')||{}).value||'0'),total_seats:parseInt(($('#ceS')||{}).value||'0',10),image:($('#ceImg')||{}).value||null,terms:($('#ceTerms')||{}).value||'',status:draft?'Draft':undefined};
  if(!b.title||!b.description||!b.venue||!b.event_date||!b.event_time){toast('Fill required fields','err');return}
  try{await api('/organizer/events',{method:'POST',body:b});toast('Event created!');dashNav('events')}catch(e){toast(e.message,'err')}
}
async function oBookings(c){
  c.innerHTML=sp();
  try{
    const d=await api('/organizer/bookings');
    if(!d.bookings||!d.bookings.length){c.innerHTML=empty('ticket-perforated','No Bookings','Bookings will appear here.');return}
    c.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:1rem"><div class="t2" style="font-size:.88rem">'+d.total+' bookings</div><button class="btn btn-g btn-sm" onclick="window.open(\'/api/organizer/bookings/export\',\'_blank\')"><i class="bi bi-download"></i> Export CSV</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>Customer</th><th>Event</th><th>Qty</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>'+d.bookings.map(b=>'<tr><td><code>'+esc(b.booking_id)+'</code></td><td>'+esc(b.user_name)+'<br><span class="t3" style="font-size:.75rem">'+esc(b.user_email)+'</span></td><td>'+esc(b.event_title)+'</td><td>'+metric(bookingQuantity(b))+'</td><td>'+fmt(bookingRevenue(b))+'</td><td><span class="badge b-'+badgeClass(b.booking_status)+'">'+esc(b.booking_status)+'</span></td><td>'+fmtD(b.booked_at)+'</td></tr>').join('')+'</tbody></table></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function oCheckin(c){
  c.innerHTML='<div style="max-width:460px;margin:0 auto"><div class="card" style="padding:2rem;text-align:center"><div style="font-size:2.5rem;color:var(--purple-l);margin-bottom:.8rem"><i class="bi bi-qr-code-scan"></i></div><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:1rem">QR Check-In</h5><div class="fg"><label>Enter QR Payload or Booking Code</label><input type="text" id="ciCode" placeholder="FHB123456"></div><button class="btn btn-p btn-lg" style="width:100%;justify-content:center" onclick="doCheckin()"><i class="bi bi-check-circle-fill"></i> Check In</button><div id="ciResult" style="margin-top:1rem"></div></div><div class="card mt-1" style="padding:1.3rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:.8rem">Recent Check-Ins</h5><div id="ciHist">'+sp()+'</div></div></div>';
  loadCiHist();
}
async function doCheckin(){
  const code=($('#ciCode')||{}).value;if(!code){toast('Enter a code','err');return}
  const r=$('#ciResult');
  try{
    const d=await api('/organizer/check-in',{method:'POST',body:{qr_payload:code}});
    if(d.already_checked_in)r.innerHTML='<div class="card" style="border-left:3px solid var(--amber);padding:1rem"><h5 style="color:var(--amber)"><i class="bi bi-exclamation-triangle-fill"></i> Already Checked In</h5><p class="t2" style="font-size:.85rem">'+esc(d.customer)+' | '+esc(d.event)+'</p></div>';
    else{r.innerHTML='<div class="card" style="border-left:3px solid var(--green);padding:1rem"><h5 style="color:var(--green)"><i class="bi bi-check-circle-fill"></i> Success!</h5><p class="t2" style="font-size:.85rem">'+esc(d.customer)+' | '+esc(d.event)+' | '+esc(d.ticket_type)+' x'+d.quantity+'</p></div>';toast('Check-in successful!');loadCiHist()}
    $('#ciCode').value='';
  }catch(e){r.innerHTML='<div class="card" style="border-left:3px solid var(--red);padding:1rem"><h5 style="color:var(--red)"><i class="bi bi-x-circle-fill"></i> Failed</h5><p class="t2" style="font-size:.85rem">'+esc(e.message)+'</p></div>'}
}
async function loadCiHist(){const el=$('#ciHist');if(!el)return;try{const ch=await api('/organizer/check-ins');if(!ch.length){el.innerHTML='<p class="t3 tc">No check-ins yet</p>';return}el.innerHTML=ch.slice(0,10).map(c=>'<div style="display:flex;justify-content:space-between;padding:.45rem 0;border-bottom:1px solid var(--border);font-size:.85rem"><div><strong>'+esc(c.user_name)+'</strong> <span class="t3">at '+esc(c.event_title)+'</span></div><div class="t3" style="font-size:.75rem">'+new Date(c.checked_in_at).toLocaleString()+'</div></div>').join('')}catch(e){el.innerHTML=''}}
async function oAnalytics(c){
  c.innerHTML=sp();
  try{
    const d=await api('/organizer/analytics');
    c.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.8rem;margin-bottom:1.2rem"><div class="sc"><div class="sc-icon" style="background:var(--g1)"><i class="bi bi-calendar-event"></i></div><div><div class="sc-val">'+metric(d.total_events)+'</div><div class="sc-lbl">Events</div></div></div><div class="sc"><div class="sc-icon" style="background:var(--g4)"><i class="bi bi-check-circle"></i></div><div><div class="sc-val">'+metric(d.published_events)+'</div><div class="sc-lbl">Published</div></div></div><div class="sc"><div class="sc-icon" style="background:var(--g2)"><i class="bi bi-ticket-perforated"></i></div><div><div class="sc-val">'+metric(d.tickets_sold)+'</div><div class="sc-lbl">Tickets Sold</div></div></div><div class="sc"><div class="sc-icon" style="background:var(--g5)"><i class="bi bi-currency-rupee"></i></div><div><div class="sc-val">'+fmt(metric(d.total_revenue))+'</div><div class="sc-lbl">Revenue</div></div></div><div class="sc"><div class="sc-icon" style="background:var(--g3)"><i class="bi bi-eye"></i></div><div><div class="sc-val">'+metric(d.total_views)+'</div><div class="sc-lbl">Views</div></div></div><div class="sc"><div class="sc-icon" style="background:linear-gradient(135deg,#ec4899,#8b5cf6)"><i class="bi bi-percent"></i></div><div><div class="sc-val">'+metric(d.conversion_rate)+'%</div><div class="sc-lbl">Conversion</div></div></div></div>';
    if(d.best_event)c.innerHTML+='<div class="card" style="padding:1.3rem;margin-bottom:1.2rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:.4rem"><i class="bi bi-trophy-fill" style="color:var(--amber)"></i> Best Event</h5><p style="font-weight:600">'+esc(d.best_event.title)+'</p><p class="t2" style="font-size:.85rem">'+metric(d.best_event.sold)+' tickets sold</p></div>';
    if(d.revenue_by_day&&Object.keys(d.revenue_by_day).length){
      const days=Object.entries(d.revenue_by_day).sort((a,b)=>a[0].localeCompare(b[0]));
      const mx=Math.max(...days.map(x=>x[1]),1);
      c.innerHTML+='<div class="card" style="padding:1.3rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:1rem"><i class="bi bi-graph-up" style="color:var(--purple-l)"></i> Revenue (30 Days)</h5><div style="display:flex;align-items:end;gap:3px;height:130px">'+days.map(([day,rev])=>'<div title="'+day+': '+fmt(rev)+'" style="flex:1;height:' + Math.max((rev/mx)*100,3) + '%;background:var(--g1);border-radius:3px 3px 0 0;min-width:6px"></div>').join('')+'</div></div>';
    }
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function oRevenue(c){
  c.innerHTML=sp();
  try{
    const d=await api('/organizer/revenue');
    c.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.8rem;margin-bottom:1.2rem"><div class="sc"><div class="sc-icon" style="background:var(--g1)"><i class="bi bi-currency-rupee"></i></div><div><div class="sc-val">'+fmt(metric(d.total_revenue))+'</div><div class="sc-lbl">Gross</div></div></div><div class="sc"><div class="sc-icon" style="background:linear-gradient(135deg,#ef4444,#dc2626)"><i class="bi bi-percent"></i></div><div><div class="sc-val">'+fmt(metric(d.platform_fee))+'</div><div class="sc-lbl">Fee</div></div></div><div class="sc"><div class="sc-icon" style="background:var(--g4)"><i class="bi bi-wallet2"></i></div><div><div class="sc-val">'+fmt(metric(d.net_revenue))+ '</div><div class="sc-lbl">Net</div></div></div></div>';
    if(d.recent_bookings&&d.recent_bookings.length)c.innerHTML+='<div class="card" style="padding:1.3rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:.8rem">Recent Transactions</h5><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>Event</th><th>Amount</th><th>Date</th></tr></thead><tbody>'+d.recent_bookings.map(b=>'<tr><td><code>'+esc(b.booking_id)+'</code></td><td>'+esc(b.event_title)+'</td><td>'+fmt(bookingRevenue(b))+'</td><td>'+fmtD(b.booked_at)+'</td></tr>').join('')+'</tbody></table></div></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
