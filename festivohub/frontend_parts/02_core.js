// ============ STATE ============
const S = { user:null, token:null, route:'', events:[], categories:[], stats:{events_hosted:0,cities_covered:0,happy_users:0,avg_rating:0}, statsReady:false, statsPromise:null, categoriesPromise:null, getCache:Object.create(null), getPromises:Object.create(null), bookings:null, bookingsPromise:null, tickets:null, ticketsPromise:null, qrCache:Object.create(null), imagePrefetches:new Map(), _evData:null };

// ============ API ============
async function api(path, opts={}){
  const {method='GET',body,json=true}=opts;
  const headers={};
  if(json) headers['Content-Type']='application/json';
  if(S.token) headers['Authorization']='Bearer '+S.token;
  const r=await fetch('/api'+path,{method,headers,body:json&&body?JSON.stringify(body):undefined,credentials:'include'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||'Request failed');
  return d;
}
function cachedGet(path,ttl=30000){
  const hit=S.getCache[path];
  if(hit&&Date.now()-hit.at<ttl)return Promise.resolve(hit.data);
  if(S.getPromises[path])return S.getPromises[path];
  const request=api(path).then(d=>{S.getCache[path]={at:Date.now(),data:d};delete S.getPromises[path];return d}).catch(e=>{delete S.getPromises[path];throw e});
  S.getPromises[path]=request;
  return request;
}
function getStats(){
  if(S.statsReady)return Promise.resolve(S.stats);
  if(!S.statsPromise)S.statsPromise=cachedGet('/stats').then(d=>{S.stats=d;S.statsReady=true;return d}).catch(e=>{S.statsPromise=null;throw e});
  return S.statsPromise;
}
function getCategories(){
  if(S.categories.length)return Promise.resolve(S.categories);
  if(!S.categoriesPromise)S.categoriesPromise=cachedGet('/categories',300000).then(d=>{S.categories=d;return d}).catch(e=>{S.categoriesPromise=null;throw e});
  return S.categoriesPromise;
}

// ============ TOAST ============
function toast(msg,type='ok'){
  const w=document.getElementById('toastWrap'),t=document.createElement('div');
  t.className='toast '+type;
  t.innerHTML='<i class="bi bi-'+(type==='ok'?'check-circle-fill':'exclamation-circle-fill')+'" style="color:var(--'+(type==='ok'?'green':'red')+')"></i><span>'+esc(msg)+'</span>';
  w.appendChild(t);
  setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),350)},3200);
}

// ============ UTILS ============
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function $(s){return document.querySelector(s)}
function $$(s){return document.querySelectorAll(s)}
function fmt(n){return '\u20B9'+Number(n||0).toLocaleString('en-IN')}
function metric(n){const v=Number(n);return Number.isFinite(v)?v:0}
function bookingQuantity(b){if(!b)return 0;for(const k of ['quantity','qty','seats_booked','ticketCount','ticket_count','tickets']){const v=b[k];if(v===undefined||v===null||v==='')continue;const n=Array.isArray(v)?v.length:(v&&typeof v==='object'?Number(v.quantity??v.count??v.total):Number(v));if(Number.isFinite(n)&&n>0)return Math.max(1,Math.floor(n))}return 1}
function confirmedBooking(b){const v=b&&b.booking_status!==undefined&&b.booking_status!==null&&b.booking_status!==''?b.booking_status:(b&&b.status);return String(v||'').trim().toLowerCase()==='confirmed'||String(v||'').trim().toLowerCase()==='checked in'}
function bookingRevenue(b){const v=b&&b.total_amount!==undefined&&b.total_amount!==null&&b.total_amount!==''?b.total_amount:(b&&b.amount!==undefined&&b.amount!==null&&b.amount!==''?b.amount:(b&&b.totalAmount!==undefined&&b.totalAmount!==null&&b.totalAmount!==''?b.totalAmount:b&&b.grand_total));const n=Number(v);return Number.isFinite(n)&&n>=0?n:0}
function fmtD(d){if(!d)return'';return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
function fmtTime(t){return t||''}
function stars(n,sm){const c=sm?'':'font-size:.95rem';return'<span class="stars" style="'+c+'">'+[1,2,3,4,5].map(i=>'<i class="bi bi-star'+(i<=Math.round(n)?'-fill':'')+'"></i>').join('')+'</span>'}
function badgeClass(s){const m={Confirmed:'green',Paid:'green',Active:'green',Approved:'green',Published:'green','Checked In':'blue',Pending:'amber',Draft:'blue',New:'blue',Refunded:'red',Cancelled:'red',Rejected:'red',Resolved:'green','In Review':'amber',Processed:'green',Blocked:'red',Inactive:'red',Suspended:'red',Upcoming:'purple','Sold Out':'red'};return m[s]||'purple'}
function initials(n){return(n||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
function sp(){return'<div class="spinner-wrap"><div class="spinner"></div></div>'}
function empty(ic,title,txt,btn){return'<div class="empty"><i class="bi bi-'+ic+'"></i><h5>'+title+'</h5><p>'+txt+'</p>'+(btn||'')+'</div>'}
const IMAGE_WIDTHS=[200,320,640,960,1400,1600];
function img(u,w){
  if(!u)return'';
  u=String(u).trim();
  if(/^(data:|blob:|\/\/|\/)/.test(u))return u;
  if(/^https?:\/\//i.test(u))return'/img?u='+encodeURIComponent(u)+(w?'&w='+w:'');
  return u;
}
function srcSetWidths(u,widths){
  if(!u||!/^https?:\/\//i.test(String(u).trim()))return'';
  const ws=[...new Set(widths.map(Number).filter(w=>Number.isFinite(w)&&w>0))].sort((a,b)=>a-b);
  return ws.map(w=>img(u,w)+' '+w+'w').join(', ');
}
function srcSet(u,w){
  const target=Number(w)||640;
  const lo=target*.5,hi=target*1.5;
  return srcSetWidths(u,IMAGE_WIDTHS.filter(x=>x>=lo&&x<=hi));
}
function imageFallback(el,u,w){
  el.onerror=null;
  el.removeAttribute('srcset');
  el.src=img(u,w);
}
function preloadImage(u,widths,sizes){
  if(!u||!/^https?:\/\//i.test(String(u).trim()))return;
  const ws=[...new Set(widths.map(Number).filter(w=>Number.isFinite(w)&&w>0))].sort((a,b)=>a-b);
  if(!ws.length)return;
  const marker=img(u,ws[0]);
  if(Array.from(document.head.querySelectorAll('link[data-image-preload]')).some(l=>l.getAttribute('data-image-preload')===marker))return;
  const l=document.createElement('link');
  l.rel='preload';
  l.as='image';
  l.href=marker;
  l.setAttribute('data-image-preload',marker);
  l.setAttribute('imagesrcset',srcSetWidths(u,ws));
  l.setAttribute('imagesizes',sizes||'100vw');
  l.setAttribute('fetchpriority','high');
  document.head.appendChild(l);
}
function prefetchImage(u,w,sizes){
  if(!u)return;
  const source=String(u).trim();
  if(!source||S.imagePrefetches.has(source))return;
  const url=img(source,w);
  if(!url||/^(data:|blob:)/i.test(url))return;
  const image=new Image();
  image.decoding='async';
  image.loading='eager';
  image.setAttribute('fetchpriority','low');
  image.sizes=sizes||'336px';
  const set=srcSet(source,w);
  if(set)image.srcset=set;
  image.src=url;
  S.imagePrefetches.set(source,image);
  if(image.decode)image.decode().catch(()=>{});
}
function prefetchEventImages(events,count=4,w=640,sizes='(max-width:600px) 100vw, 336px'){
  (events||[]).slice(0,count).forEach(ev=>prefetchImage(ev.image||(ev.images&&ev.images[0]),w,sizes));
}

// ============ AUTH ============
function resetUserCaches(){S.bookings=null;S.bookingsPromise=null;S.tickets=null;S.ticketsPromise=null;S.qrCache=Object.create(null)}
function setAuth(d){resetUserCaches();S.token=d.token;S.user={id:d.id,role:d.role,name:d.name,email:d.email};try{localStorage.setItem('fhb_u',JSON.stringify(S.user));localStorage.setItem('fhb_t',d.token)}catch(e){}}
function clearAuth(){resetUserCaches();S.token=null;S.user=null;try{localStorage.removeItem('fhb_u');localStorage.removeItem('fhb_t')}catch(e){}}
function loadAuth(){try{const u=localStorage.getItem('fhb_u'),t=localStorage.getItem('fhb_t');if(u&&t){S.user=JSON.parse(u);S.token=t}}catch(e){}}
async function logout(){await api('/auth/logout',{method:'POST'}).catch(()=>{});clearAuth();toast('Logged out');navigate('/')}
async function doLogin(email,password,role){const d=await api('/auth/login',{method:'POST',body:{email,password,role}});setAuth(d);return d}

// ============ ROUTER ============
function navigate(h){if(location.hash!==h)location.hash=h;else handleRoute()}
function handleRoute(){
  const h=location.hash.slice(1)||'/';
  S.route=h;
  renderShell();
  renderPage(h);
  window.scrollTo(0,0);
  updateNav();
  animateReveal();
}
function updateNav(){
  $$('.nav-center .nl').forEach(a=>{const r=a.getAttribute('data-r');a.classList.toggle('active',S.route===r||(r!=='/'&&S.route.startsWith(r+'/')))});
  $$('.bottom-nav .bn-item').forEach(a=>{const r=a.getAttribute('data-r');a.classList.toggle('active',S.route===r||(r!=='/'&&S.route.startsWith(r+'/')))});
}
function animateReveal(){
  const els=$$('.reveal');
  if(!els.length)return;
  const obs=new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}})},{threshold:.1});
  els.forEach(el=>obs.observe(el));
}

// ============ SHELL ============
function renderShell(){
  const app=$('#app');
  const isDash=S.route.startsWith('/dashboard');
  app.innerHTML=(isDash?'':renderTopnav())+'<div id="page"></div>'+(isDash?'':renderFooter())+(isDash?'':renderBottomNav());
  // Scroll listener for nav
  const nav=$('.topnav');
  if(nav){window.onscroll=()=>{nav.classList.toggle('scrolled',window.scrollY>30)}}
}

function renderTopnav(){
  const logged=!!S.user;
  const r=S.user?S.user.role:'';
  const dLink=r==='admin'?'/dashboard':r==='organizer'?'/dashboard':'/dashboard';
  return '<nav class="topnav"><div class="container"><div class="brand" onclick="navigate(\'/\')"><div class="brand-icon"><i class="bi bi-calendar2-event"></i></div><span>FestivoHub</span></div><div class="nav-center"><div class="nl" data-r="/" onclick="navigate(\'/\')">Home</div><div class="nl" data-r="/events" onclick="navigate(\'/events\')">Explore Events</div><div class="nl" data-r="/about" onclick="navigate(\'/about\')">About</div><div class="nl" data-r="/contact" onclick="navigate(\'/contact\')">Contact</div></div><div class="nav-right">'+(logged?'<div class="nl" data-r="/dashboard" onclick="navigate(\''+dLink+'\')" style="cursor:pointer;padding:.4rem .85rem;border-radius:var(--radius-sm);font-size:.87rem;font-weight:500;color:var(--text-2)"><i class="bi bi-speedometer2"></i> Dashboard</div><button class="btn btn-g btn-sm" onclick="logout()"><i class="bi bi-box-arrow-right"></i> Logout</button>':'<button class="btn btn-g btn-sm" onclick="navigate(\'/login\')">Log In</button><button class="btn btn-p btn-sm" onclick="navigate(\'/register\')">Sign Up</button>')+'</div><div class="hamburger" onclick="toggleMobile()"><i class="bi bi-list"></i></div></div></nav><div class="mobile-menu" id="mobMenu"><div class="nl" onclick="navigate(\'/\');toggleMobile()">Home</div><div class="nl" onclick="navigate(\'/events\');toggleMobile()">Explore Events</div><div class="nl" onclick="navigate(\'/about\');toggleMobile()">About</div><div class="nl" onclick="navigate(\'/contact\');toggleMobile()">Contact</div><div style="height:1px;background:var(--border);margin:.5rem 0"></div>'+(logged?'<div class="nl" onclick="navigate(\'/dashboard\');toggleMobile()">Dashboard</div><div class="nl" onclick="logout();toggleMobile()" style="color:var(--red-l)">Logout</div>':'<div class="nl" onclick="navigate(\'/login\');toggleMobile()">Log In</div><div class="nl" onclick="navigate(\'/register\');toggleMobile()">Sign Up</div>')+'</div>';
}
function toggleMobile(){const m=$('#mobMenu');if(m)m.classList.toggle('open')}

function renderBottomNav(){
  const logged=!!S.user;
  return '<nav class="bottom-nav"><div class="container"><div class="bn-item" data-r="/" onclick="navigate(\'/\')"><i class="bi bi-house-fill"></i>Home</div><div class="bn-item" data-r="/events" onclick="navigate(\'/events\')"><i class="bi bi-compass"></i>Explore</div>'+(logged?'<div class="bn-item" data-r="/dashboard/tickets" onclick="navigate(\'/dashboard/tickets\')"><i class="bi bi-ticket-perforated"></i>Tickets</div><div class="bn-item" data-r="/dashboard" onclick="navigate(\'/dashboard\')"><i class="bi bi-person-fill"></i>Profile</div>':'<div class="bn-item" data-r="/login" onclick="navigate(\'/login\')"><i class="bi bi-person"></i>Login</div>')+'</div></nav>';
}

function renderFooter(){
  return '<footer class="site-footer"><div class="container"><div class="ft-grid"><div class="ft-brand"><div class="brand" onclick="navigate(\'/\')" style="margin-bottom:.5rem"><div class="brand-icon"><i class="bi bi-calendar2-event"></i></div>FestivoHub</div><p>Discover, book, and experience the best festivals and events across India.</p></div><div class="ft-col"><h6>Explore</h6><a href="#/events">All Events</a><a href="#/events?category=Music">Music</a><a href="#/events?category=Cultural">Cultural</a><a href="#/events?category=Food">Food</a><a href="#/events?category=Sports">Sports</a></div><div class="ft-col"><h6>Company</h6><a href="#/about">About</a><a href="#/contact">Contact</a><a href="#/register">Become Organizer</a></div><div class="ft-col"><h6>Support</h6><a href="#/contact">Help Center</a><a href="#/contact">Booking Help</a><a href="#/contact">Refund Policy</a></div><div class="ft-col"><h6>Legal</h6><a href="#">Terms of Service</a><a href="#">Privacy Policy</a><a href="#">Cancellation Policy</a></div></div><div class="ft-bottom"><p>&copy; 2026 FestivoHub. Made with <i class="bi bi-heart-fill" style="color:var(--pink)"></i> in India</p><div class="ft-socials"><a href="#"><i class="bi bi-instagram"></i></a><a href="#"><i class="bi bi-facebook"></i></a><a href="#"><i class="bi bi-twitter-x"></i></a><a href="#"><i class="bi bi-youtube"></i></a></div></div></div></footer>';
}
