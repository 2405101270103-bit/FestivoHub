// ============ ADMIN DASHBOARD ============
async function renderAdminDash(sub){
  dashShell('admin',sub||'overview');
  const c=$('#dBdy');if(!c)return;
  if(sub==='events')return aEvents(c);
  if(sub==='categories')return aCategories(c);
  if(sub==='users')return aUsers(c);
  if(sub==='organizers')return aOrgs(c);
  if(sub==='bookings')return aBookings(c);
  if(sub==='reviews')return aReviews(c);
  if(sub==='contacts')return aContacts(c);
  if(sub==='audit')return aAudit(c);
  if(sub==='settings')return aSettings(c);
  aOverview(c);
}
async function aOverview(c){
  c.innerHTML=sp();
  try{
    const d=await api('/admin/stats');
    c.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.8rem;margin-bottom:1.2rem">'
      +'<div class="sc clickable" onclick="dashNav(\'users\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g1)"><i class="bi bi-people"></i></div><div><div class="sc-val">'+metric(d.total_users)+'</div><div class="sc-lbl">Users</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'organizers\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g2)"><i class="bi bi-building"></i></div><div><div class="sc-val">'+metric(d.total_organizers)+'</div><div class="sc-lbl">Organizers</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'events\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g4)"><i class="bi bi-calendar-event"></i></div><div><div class="sc-val">'+metric(d.total_events)+'</div><div class="sc-lbl">Events</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'events\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g4)"><i class="bi bi-check-circle"></i></div><div><div class="sc-val">'+metric(d.published_events)+'</div><div class="sc-lbl">Published</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'events\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:linear-gradient(135deg,#ec4899,#8b5cf6)"><i class="bi bi-calendar-check"></i></div><div><div class="sc-val">'+metric(d.upcoming_events)+'</div><div class="sc-lbl">Upcoming</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'bookings\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g5)"><i class="bi bi-currency-rupee"></i></div><div><div class="sc-val">'+fmt(metric(d.total_revenue))+'</div><div class="sc-lbl">Revenue</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'bookings\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:var(--g3)"><i class="bi bi-ticket-perforated"></i></div><div><div class="sc-val">'+metric(d.total_bookings)+'</div><div class="sc-lbl">Bookings</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'bookings\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:linear-gradient(135deg,#ec4899,#8b5cf6)"><i class="bi bi-ticket"></i></div><div><div class="sc-val">'+metric(d.tickets_sold)+'</div><div class="sc-lbl">Tickets Sold</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'bookings\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:linear-gradient(135deg,#06b6d4,#22c55e)"><i class="bi bi-percent"></i></div><div><div class="sc-val">'+fmt(metric(d.platform_commission))+'</div><div class="sc-lbl">Commission</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'<div class="sc clickable" onclick="dashNav(\'events\')" style="justify-content:space-between"><div style="display:flex;align-items:center;gap:1rem"><div class="sc-icon" style="background:linear-gradient(135deg,#f43f5e,#fb923c)"><i class="bi bi-hourglass"></i></div><div><div class="sc-val">'+metric(d.pending_events)+' / '+metric(d.pending_organizers)+'</div><div class="sc-lbl">Pending</div></div></div><i class="bi bi-chevron-right t3"></i></div>'
      +'</div>';
    if(metric(d.open_contacts))c.innerHTML+='<div class="card" style="padding:1rem;display:flex;align-items:center;gap:1rem;cursor:pointer;margin-bottom:1rem" onclick="dashNav(\'contacts\')"><div class="sc-icon" style="background:var(--g2);width:40px;height:40px;font-size:1rem"><i class="bi bi-envelope-fill"></i></div><div><div style="font-weight:600">'+metric(d.open_contacts)+' open messages</div><div class="t3" style="font-size:.82rem">Click to review</div></div></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function aEvents(c){
  c.innerHTML=sp();
  try{
    const evs=await api('/admin/events');
    c.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Event</th><th>Organizer</th><th>Date</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+evs.map(e=>'<tr><td><strong>'+esc(e.title)+'</strong><br><span class="t3" style="font-size:.75rem">'+esc(e.city||'')+'</span></td><td>'+esc(e.org_name||'')+'</td><td>'+fmtD(e.event_date)+'</td><td>'+fmt(e.price)+'</td><td><span class="badge b-'+badgeClass(e.status)+'">'+esc(e.status)+'</span></td><td><div style="display:flex;gap:.3rem;flex-wrap:wrap">'+(e.status==='Pending'?'<button class="btn btn-p btn-sm" onclick="admEvtSt(\''+e._id+'\',\'Approved\')">Approve</button><button class="btn btn-danger btn-sm" onclick="admEvtSt(\''+e._id+'\',\'Rejected\')">Reject</button>':'<button class="btn btn-g btn-sm" onclick="admEvtSt(\''+e._id+'\',\'Pending\')">Reset</button>')+'<button class="btn btn-danger btn-sm" onclick="admDelEvt(\''+e._id+'\')"><i class="bi bi-trash"></i></button></div></td></tr>').join('')+'</tbody></table></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function admEvtSt(id,st){try{await api('/admin/events/'+id+'/status',{method:'POST',body:{status:st}});toast('Updated');aEvents($('#dBdy'))}catch(e){toast(e.message,'err')}}
async function admDelEvt(id){if(!confirm('Delete?'))return;try{await api('/admin/events/'+id,{method:'DELETE'});toast('Deleted');aEvents($('#dBdy'))}catch(e){toast(e.message,'err')}}
async function aCategories(c){
  c.innerHTML=sp();
  try{
    const cats=await api('/admin/categories');
    c.innerHTML='<div class="card" style="padding:1.3rem;margin-bottom:1.2rem"><div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem"><div><h5 style="font-family:Space Grotesk;font-weight:600;margin:0">Categories</h5><p class="t2" style="font-size:.82rem;margin:.2rem 0 0">Add or remove event categories.</p></div><span class="badge b-purple">'+cats.length+' total</span></div><form onsubmit="return addCategory(event)" style="display:flex;gap:.6rem;align-items:flex-end;flex-wrap:wrap"><div class="fg" style="flex:1;min-width:220px;margin:0"><label>New category</label><input id="newCatName" type="text" maxlength="60" placeholder="e.g. Dance"></div><button class="btn btn-p" type="submit"><i class="bi bi-plus-lg"></i> Add Category</button></form></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Category</th><th>Slug</th><th>Added</th><th>Action</th></tr></thead><tbody>'+(cats.length?cats.map(cat=>'<tr><td><strong>'+esc(cat.name||'')+'</strong></td><td><code>'+esc(cat.slug||'')+'</code></td><td>'+fmtD(cat.created_at)+'</td><td><button class="btn btn-danger btn-sm" onclick="admDelCat(\''+cat._id+'\')"><i class="bi bi-trash"></i> Delete</button></td></tr>').join(''):'<tr><td colspan="4" class="t3" style="text-align:center;padding:1.5rem">No categories found</td></tr>')+'</tbody></table></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function addCategory(ev){
  ev.preventDefault();
  const name=($('#newCatName')||{}).value.trim();
  if(!name){toast('Enter a category name','err');return false}
  try{
    await api('/admin/categories',{method:'POST',body:{name}});
    S.categories=[];S.categoriesPromise=null;delete S.getCache['/categories'];
    toast('Category added');aCategories($('#dBdy'));
  }catch(e){toast(e.message,'err')}
  return false;
}
async function admDelCat(id){
  if(!confirm('Delete this category?'))return;
  try{
    await api('/admin/categories/'+id,{method:'DELETE'});
    S.categories=[];S.categoriesPromise=null;delete S.getCache['/categories'];
    toast('Category deleted');aCategories($('#dBdy'));
  }catch(e){toast(e.message,'err')}
}
async function aUsers(c){
  c.innerHTML=sp();
  try{
    const users=await api('/admin/users');
    c.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>User</th><th>Email</th><th>Phone</th><th>Bookings</th><th>Spent</th><th>Status</th><th>Action</th></tr></thead><tbody>'+users.map(u=>'<tr><td>'+esc(u.full_name||'')+'</td><td>'+esc(u.email||'')+'</td><td>'+esc(u.phone||'')+'</td><td>'+metric(u.bookings_count)+'</td><td>'+fmt(metric(u.spent))+'</td><td><span class="badge b-'+badgeClass(u.status||'Active')+'">'+esc(u.status||'Active')+'</span></td><td><button class="btn btn-g btn-sm" onclick="admUserSt(\''+u._id+'\',\''+(u.status==='Blocked'?'Active':'Blocked')+'\')">'+(u.status==='Blocked'?'Unblock':'Block')+'</button></td></tr>').join('')+'</tbody></table></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function admUserSt(id,st){try{await api('/admin/users/'+id,{method:'PATCH',body:{status:st}});toast('Updated');aUsers($('#dBdy'))}catch(e){toast(e.message,'err')}}
async function aOrgs(c){
  c.innerHTML=sp();
  try{
    const orgs=await api('/admin/organizers');
    c.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Organizer</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+orgs.map(o=>'<tr><td><strong>'+esc(o.org_name||'')+'</strong></td><td>'+esc(o.email||'')+'</td><td><span class="badge b-'+badgeClass(o.status||'Approved')+'">'+esc(o.status||'Approved')+'</span></td><td><div style="display:flex;gap:.3rem">'+(o.status!=='Approved'?'<button class="btn btn-p btn-sm" onclick="admOrgSt(\''+o._id+'\',\'Approved\')">Approve</button>':'<button class="btn btn-g btn-sm" onclick="admOrgSt(\''+o._id+'\',\'Suspended\')">Suspend</button>')+'<button class="btn btn-danger btn-sm" onclick="admDelOrg(\''+o._id+'\')"><i class="bi bi-trash"></i></button></div></td></tr>').join('')+'</tbody></table></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function admOrgSt(id,st){try{await api('/admin/organizers/'+id+'/status',{method:'POST',body:{status:st}});toast('Updated');aOrgs($('#dBdy'))}catch(e){toast(e.message,'err')}}
async function admDelOrg(id){if(!confirm('Delete?'))return;try{await api('/admin/organizers/'+id,{method:'DELETE'});toast('Deleted');aOrgs($('#dBdy'))}catch(e){toast(e.message,'err')}}
async function aBookings(c){
  c.innerHTML=sp();
  try{
    const d=await api('/admin/bookings');const bk=d.bookings||d;
    c.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>User</th><th>Event</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead><tbody>'+(Array.isArray(bk)?bk:[]).map(b=>'<tr><td><code>'+esc(b.booking_id||'')+'</code></td><td>'+esc(b.user_name||'')+'</td><td>'+esc(b.event_title||'')+'</td><td>'+fmt(bookingRevenue(b))+'</td><td><span class="badge b-'+badgeClass(b.payment_status)+'">'+esc(b.payment_status)+'</span></td><td><span class="badge b-'+badgeClass(b.booking_status)+'">'+esc(b.booking_status)+'</span></td><td>'+fmtD(b.booked_at)+'</td></tr>').join('')+'</tbody></table></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function aReviews(c){
  c.innerHTML=sp();
  try{
    const rv=await api('/admin/reviews');
    c.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>User</th><th>Event</th><th>Rating</th><th>Review</th><th>Status</th></tr></thead><tbody>'+(rv||[]).map(r=>'<tr><td>'+esc(r.user_name||'')+'</td><td>'+esc(r.event_title||'')+'</td><td>'+stars(r.rating)+'</td><td style="max-width:200px">'+esc(r.text||'').slice(0,60)+'</td><td><span class="badge b-'+badgeClass(r.status)+'">'+esc(r.status)+'</span></td></tr>').join('')+'</tbody></table></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function aContacts(c){
  c.innerHTML=sp();
  try{
    const ms=await api('/admin/contacts');
    c.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead><tbody>'+(ms||[]).map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.email)+'</td><td>'+esc(m.subject)+'</td><td><span class="badge b-'+badgeClass(m.status||'New')+'">'+esc(m.status||'New')+'</span></td><td>'+fmtD(m.created_at)+'</td></tr>').join('')+'</tbody></table></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function aAudit(c){
  c.innerHTML=sp();
  try{
    const logs=await api('/admin/audit');
    c.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th></tr></thead><tbody>'+(logs||[]).map(l=>'<tr><td style="white-space:nowrap">'+new Date(l.timestamp).toLocaleString()+'</td><td>'+esc(l.admin_email||'')+'</td><td><span class="badge b-blue">'+esc(l.action)+'</span></td><td>'+esc(l.target_type||'')+'</td></tr>').join('')+'</tbody></table></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function aSettings(c){
  c.innerHTML=sp();
  try{
    const s=await api('/admin/settings');const v=s.settings||s;
    c.innerHTML='<div style="max-width:560px"><div class="card" style="padding:2rem"><h5 style="font-family:Space Grotesk;font-weight:600;margin-bottom:1.2rem"><i class="bi bi-gear-fill" style="color:var(--purple-l)"></i> Platform Settings</h5><div class="fg"><label>Platform Name</label><input type="text" id="sName" value="'+esc(v.platformName||'FestivoHub')+'"></div><div class="fg"><label>Currency Symbol</label><input type="text" id="sCurr" value="'+esc(v.currencySymbol||'\u20B9')+'"></div><div class="fg"><label>Commission (basis points)</label><input type="number" id="sComm" value="'+(v.commissionPercent||500)+'"></div><div class="fg"><label>Booking Fee (\u20B9)</label><input type="number" id="sFee" value="'+(v.bookingFee||10)+'"></div><div class="fg"><label>Maintenance Mode</label><select id="sMaint"><option value="false"'+(!v.maintenanceMode?' selected':'')+'>Off</option><option value="true"'+(v.maintenanceMode?' selected':'')+'>On</option></select></div><button class="btn btn-p" onclick="saveSet()"><i class="bi bi-check-lg"></i> Save</button></div></div>';
  }catch(e){c.innerHTML=empty('exclamation-triangle','Error',e.message)}
}
async function saveSet(){
  try{await api('/admin/settings',{method:'PUT',body:{platformName:($('#sName')||{}).value,currencySymbol:($('#sCurr')||{}).value,commissionPercent:parseInt(($('#sComm')||{}).value||'500',10),bookingFee:parseFloat(($('#sFee')||{}).value||'10'),maintenanceMode:($('#sMaint')||{}).value==='true'}});toast('Saved!')}catch(e){toast(e.message,'err')}
}
