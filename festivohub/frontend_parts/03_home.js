// ============ EVENT CARD (reusable) ============
const EVENT_IMAGE_FALLBACK='https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop';
function evCard(ev,priority){
  const d=new Date(ev.event_date||'');
  const month=d.toLocaleDateString('en-IN',{month:'short'}).toUpperCase();
  const day=d.getDate();
  const rem=ev.remaining!==undefined?ev.remaining:(ev.available_seats||0);
  const src=ev.image||(ev.images&&ev.images[0])||EVENT_IMAGE_FALLBACK;
  const loading=priority?'eager':'lazy';
  const priorityAttr=priority?'high':'low';
  return '<div class="ev-card" onclick="navigate(\'/events/'+ev._id+'\')"><div class="ec-img"><img src="'+img(src,640)+'" srcset="'+srcSet(src,640)+'" sizes="(max-width:600px) 100vw, 336px" width="640" height="427" alt="'+esc(ev.title||'')+'" loading="'+loading+'" decoding="async" fetchpriority="'+priorityAttr+'" onerror="imageFallback(this,\''+img(EVENT_IMAGE_FALLBACK,640)+'\')"><div class="ec-overlay"></div><div class="ec-badge"><span class="badge b-purple">'+esc(ev.category_name||'Event')+'</span></div><div class="ec-fav" onclick="event.stopPropagation();toggleFav(\''+ev._id+'\')"><i class="bi bi-heart"></i></div><div class="ec-date"><div class="d">'+day+'</div><div class="m">'+month+'</div></div></div><div class="ec-body"><h5>'+esc(ev.title||'')+'</h5><div class="ec-meta"><span><i class="bi bi-geo-alt-fill"></i> '+esc(ev.venue||'')+(ev.city?', '+esc(ev.city):'')+'</span><span><i class="bi bi-clock-fill"></i> '+fmtD(ev.event_date)+(ev.event_time?' &bull; '+ev.event_time:'')+'</span></div><div class="ec-foot"><div class="ec-price">'+(ev.price>0?fmt(ev.price)+' <span style="font-size:.72rem;color:var(--text-3);-webkit-text-fill-color:var(--text-3)">onwards</span>':'Free')+'</div>'+(rem>0?'<div class="ec-seats"><i class="bi bi-ticket"></i> '+rem+' left</div>':'<div class="ec-seats" style="color:var(--red-l)">Sold Out</div>')+'</div>'+(rem>0?'<button class="ec-book-btn" onclick="event.stopPropagation();startBooking(\''+ev._id+'\')"><i class="bi bi-ticket-perforated"></i> Book Now</button>':'')+'</div></div>';
}

// ============ HOME PAGE ============
async function renderHome(){
  const pc=$('#page');
  const hero='https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3';
  preloadImage(hero,[640,960,1400,1600],'100vw');
  pc.innerHTML='<!-- HERO --><section class="hero"><div class="hero-bg"><img src="'+img(hero,960)+'" srcset="'+srcSetWidths(hero,[640,960,1400,1600])+'" sizes="100vw" width="1600" height="900" alt="Festival" loading="eager" fetchpriority="high" decoding="async" onerror="imageFallback(this,\''+img(EVENT_IMAGE_FALLBACK,1600)+'\')"></div><div class="container"><div class="hero-content"><div class="hero-badge"><span class="dot"></span> India\'s Premier Event Platform</div><h1>Find Your Next<br><span class="hl">Unforgettable Experience</span></h1><p>Discover concerts, festivals, workshops, cultural events and experiences happening around you.</p><div class="hero-btns"><button class="btn btn-p btn-lg" onclick="navigate(\'/events\')"><i class="bi bi-compass"></i> Explore Events</button><button class="btn btn-g btn-lg" onclick="navigate(\'/register\')"><i class="bi bi-rocket-takeoff"></i> Host an Event</button></div><div class="hero-search"><i class="bi bi-search" style="color:var(--text-3);margin-left:.6rem"></i><input id="hKw" placeholder="Search events, artists, venues..." onkeydown="if(event.key===\'Enter\')homeSearch()"><div class="hs-div"></div><select id="hCity"><option value="">All Cities</option></select><div class="hs-div"></div><input type="date" id="hDate" style="color:var(--text-2);max-width:160px"><button class="hs-btn" onclick="homeSearch()"><i class="bi bi-search"></i> Search</button></div><div class="hero-stats"><div class="hs-item"><div class="hs-num" id="hEv">'+S.stats.events_hosted+'</div><div class="hs-lbl">Events</div></div><div class="hs-item"><div class="hs-num" id="hCi">'+S.stats.cities_covered+'</div><div class="hs-lbl">Cities</div></div><div class="hs-item"><div class="hs-num" id="hUs">'+S.stats.happy_users+'</div><div class="hs-lbl">Happy Users</div></div><div class="hs-item"><div class="hs-num" id="hRt">'+S.stats.avg_rating+'</div><div class="hs-lbl">Avg Rating</div></div></div></div></div></section>';

  getStats().then(d=>{const e=id=>$(id);if(e('#hEv'))e('#hEv').textContent=d.events_hosted;if(e('#hCi'))e('#hCi').textContent=d.cities_covered;if(e('#hUs'))e('#hUs').textContent=d.happy_users;if(e('#hRt'))e('#hRt').textContent=d.avg_rating;}).catch(()=>{});

  cachedGet('/events?per_page=48').then(evts=>{const events=evts.events||[];const cities=[...new Set(events.map(e=>e.city).filter(Boolean))].sort();const sel=$('#hCity');if(sel)cities.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o)});const g=$('#trendGrid');if(g&&!g.children.length&&events.length){const first=events.slice(0,4);prefetchEventImages(first,4);g.innerHTML=first.map((ev,i)=>evCard(ev,i<4)).join('')}}).catch(()=>{});

  // TRENDING EVENTS
  pc.innerHTML+='<section class="section"><div class="container"><div class="sec-hdr" style="text-align:left"><div class="sec-tag"><i class="bi bi-fire"></i> Trending Now</div><h2>Trending Events</h2><p>Most popular events happening right now</p></div><div class="ev-grid" id="trendGrid"></div><div class="tc" style="margin-top:1.5rem"><button class="btn btn-g" onclick="navigate(\'/events\')">View All Events <i class="bi bi-arrow-right"></i></button></div></div></section>';

  loadTrending();

  // CATEGORIES
  pc.innerHTML+='<section class="section reveal"><div class="container"><div class="sec-hdr cat-hdr"><div><div class="sec-tag"><i class="bi bi-grid-3x3-gap-fill"></i> Browse</div><h2>Explore by Category</h2><p>Tap any category to browse its events <span id="catCount"></span></p></div><button class="btn btn-g" onclick="navigate(\'/events\')">View All Events <i class="bi bi-arrow-right"></i></button></div><div class="cat-grid" id="catGrid"></div></div></section>';
  loadCats();

  // WHY FESTIVOHUB
  pc.innerHTML+='<section class="section reveal"><div class="container"><div class="sec-hdr"><div class="sec-tag"><i class="bi bi-lightning-charge-fill"></i> Why FestivoHub</div><h2>Everything You Need</h2><p>The complete platform for discovering and managing events</p></div><div class="feat-grid"><div class="feat-card"><div class="feat-icon" style="background:rgba(124,58,237,.12);color:var(--purple-l)"><i class="bi bi-lightning-charge-fill"></i></div><h5>Easy Booking</h5><p>Book your favorite events in seconds with a seamless checkout experience.</p></div><div class="feat-card"><div class="feat-icon" style="background:rgba(34,197,94,.12);color:var(--green-l)"><i class="bi bi-shield-check"></i></div><h5>Secure Payments</h5><p>Safe and secure payment processing with instant confirmation.</p></div><div class="feat-card"><div class="feat-icon" style="background:rgba(236,72,153,.12);color:var(--pink-l)"><i class="bi bi-qr-code"></i></div><h5>Digital Tickets</h5><p>Get your ticket instantly on your phone with QR code entry.</p></div><div class="feat-card"><div class="feat-icon" style="background:rgba(249,115,22,.12);color:var(--orange-l)"><i class="bi bi-heart-fill"></i></div><h5>Discover Experiences</h5><p>Find experiences you\'ll remember for a lifetime.</p></div></div></div></section>';

  // REVIEWS
  pc.innerHTML+='<section class="section reveal"><div class="container"><div class="sec-hdr"><div class="sec-tag"><i class="bi bi-chat-quote-fill"></i> Reviews</div><h2>What People Say</h2><p>Hear from our happy event-goers</p></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem"><div class="rev-card"><div class="rev-stars">\u2605\u2605\u2605\u2605\u2605</div><p class="rev-text">"Booking was super easy and the digital ticket made entry effortless. Best event platform in India!"</p><div class="rev-head" style="margin-top:.8rem;margin-bottom:0"><div class="rev-av" style="background:var(--g1)">PA</div><div><div style="font-weight:600;font-size:.88rem">Priya A.</div><div style="font-size:.75rem;color:var(--text-3)">Garba Night 2026</div></div></div></div><div class="rev-card"><div class="rev-stars">\u2605\u2605\u2605\u2605\u2605</div><p class="rev-text">"As an organizer, FestivoHub made managing 500+ attendees a breeze. The QR check-in feature is genius."</p><div class="rev-head" style="margin-top:.8rem;margin-bottom:0"><div class="rev-av" style="background:var(--g2)">RK</div><div><div style="font-weight:600;font-size:.88rem">Rahul K.</div><div style="font-size:.75rem;color:var(--text-3)">Organizer</div></div></div></div><div class="rev-card"><div class="rev-stars">\u2605\u2605\u2605\u2605\u2605</div><p class="rev-text">"Found amazing food festivals near me that I never knew existed. FestivoHub is my go-to for weekend plans!"</p><div class="rev-head" style="margin-top:.8rem;margin-bottom:0"><div class="rev-av" style="background:var(--g3)">NS</div><div><div style="font-weight:600;font-size:.88rem">Neha S.</div><div style="font-size:.75rem;color:var(--text-3)">Food Festival Enthusiast</div></div></div></div></div></div></section>';

  // HOST CTA
  pc.innerHTML+='<section class="section reveal"><div class="container"><div class="cta-box"><h2>Host Your Next Big Event</h2><p>Reach thousands of event lovers with FestivoHub. Powerful tools for organizers.</p><button class="btn" onclick="navigate(\'/register\')">Become an Organizer <i class="bi bi-arrow-right"></i></button></div></div></section>';

  // NEWSLETTER
  pc.innerHTML+='<section class="section" style="padding-top:0"><div class="container"><div class="nl-section reveal"><div class="nl-text"><div class="sec-tag"><i class="bi bi-envelope-fill"></i> Newsletter</div><h3 style="font-family:Space Grotesk;font-weight:700;margin-bottom:.3rem">Never Miss an Event</h3><p class="t2" style="font-size:.9rem">Get personalized event recommendations delivered to your inbox.</p></div><div class="nl-form"><input type="email" id="nlEmail" placeholder="Enter your email"><button class="btn btn-p" onclick="handleNewsletter()">Subscribe</button></div></div></div></section>';

  animateReveal();
}

function homeSearch(){
  const kw=($('#hKw')||{}).value||'';
  const city=($('#hCity')||{}).value||'';
  const date=($('#hDate')||{}).value||'';
  let q='/events?';
  if(kw)q+='keyword='+encodeURIComponent(kw)+'&';
  if(city)q+='city='+encodeURIComponent(city)+'&';
  if(date)q+='event_date='+date+'&';
  navigate('/events'+q.replace(/[&?]$/,''));
}

async function loadTrending(){
  const g=$('#trendGrid');if(!g)return;
  try{const d=await cachedGet('/events?per_page=4&sort=popular');if(!d.events||!d.events.length){if(!g.children.length)g.innerHTML=empty('calendar-x','No Events Yet','Check back soon for exciting events!');return}prefetchEventImages(d.events,4);g.innerHTML=d.events.map((ev,i)=>evCard(ev,i<4)).join('')}catch(e){if(!g.children.length)g.innerHTML=empty('exclamation-triangle','Error',e.message)}
}

const catIcons={Music:'music-note-beamed',Garba:'music-note-beating',Cultural:'palette',Art:'brush',Food:'cup-hot',Sports:'trophy',Cricket:'trophy',Business:'briefcase',Comedy:'emoji-laughing',Wellness:'heart-pulse',Family:'people-fill',Education:'mortarboard',Tech:'cpu',Technology:'cpu',Dance:'music-note-beating',Workshop:'tools',Workshops:'tools',Religious:'flower1',Nightlife:'moon-stars',Festival:'stars',Other:'tag'};
const DEFAULT_CATEGORIES=['Music','Garba','Cultural','Religious','Food','Sports','Technology','Business','Comedy','Workshops','Dance','Cricket','Education','Art','Other'];

function catCardHtml(name,icon){
  const ic=String(catIcons[name]||icon||'tag').replace(/^bi-/,'');
  return '<button type="button" class="cat-card" title="Browse '+esc(name)+' events" aria-label="Browse '+esc(name)+' events" onclick="navigate(\'/events?category='+encodeURIComponent(name)+'\')"><span class="cat-icon"><i class="bi bi-'+esc(ic)+'"></i></span><span class="cat-name">'+esc(name)+'</span><i class="bi bi-arrow-up-right cat-arrow"></i></button>';
}

function renderCatCards(list){
  const g=$('#catGrid');if(!g)return;
  const names=[...new Set((list||[]).map(c=>typeof c==='string'?c:c&&c.name).filter(Boolean))];
  if(!names.length)return;
  g.innerHTML=names.map(n=>catCardHtml(n,(list||[]).find(c=>(c&&c.name)===n&&c.icon))).join('');
}

async function loadCats(){
  const g=$('#catGrid');if(!g)return;
  renderCatCards(S.categories.length?S.categories:DEFAULT_CATEGORIES);
  try{
    S.categories=await getCategories();
    renderCatCards(S.categories);
    const n=$('#catCount');
    if(n)n.textContent=S.categories.length?'- '+S.categories.length+' categories':'';
  }catch(e){}
}

function handleNewsletter(){
  const el=$('#nlEmail');if(!el||!el.value){toast('Enter your email','err');return}
  toast('Subscribed! Check your inbox.');el.value='';
}

async function toggleFav(evId){
  if(!S.user||S.user.role!=='user'){toast('Login to save favorites','err');navigate('/login');return}
  try{await api('/favorites',{method:'POST',body:{event_id:evId}});toast('Updated favorites')}catch(e){toast(e.message,'err')}
}
