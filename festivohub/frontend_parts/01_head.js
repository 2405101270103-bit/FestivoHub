<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>FestivoHub — Discover Festivals & Events Across India</title>
<meta name="description" content="Discover, book, and experience the best festivals and events across India. Garba nights, music concerts, food festivals, tech conferences and more.">
<meta property="og:title" content="FestivoHub — Indian Festival & Event Booking Platform">
<meta property="og:description" content="Discover, book, and experience the best festivals and events across India.">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
--bg:#06060f;--bg-2:#0c0c1d;--bg-3:#111128;--bg-4:#181838;
--surface:#13132b;--surface-2:#1a1a3e;--surface-3:#222255;
--border:rgba(255,255,255,.07);--border-2:rgba(255,255,255,.12);
--text:#f4f4fb;--text-2:#a8a8c8;--text-3:#6e6e96;
--purple:#7c3aed;--purple-l:#a78bfa;--purple-d:#5b21b6;
--pink:#ec4899;--pink-l:#f472b6;
--orange:#f97316;--orange-l:#fb923c;
--green:#22c55e;--green-l:#4ade80;
--red:#ef4444;--red-l:#f87171;
--blue:#3b82f6;--cyan:#06b6d4;
--amber:#f59e0b;
--g1:linear-gradient(135deg,#7c3aed,#ec4899);
--g2:linear-gradient(135deg,#ec4899,#f97316);
--g3:linear-gradient(135deg,#06b6d4,#7c3aed);
--g4:linear-gradient(135deg,#22c55e,#06b6d4);
--g5:linear-gradient(135deg,#f59e0b,#ef4444);
--radius:12px;--radius-lg:18px;--radius-xl:24px;--radius-sm:8px;
--shadow:0 8px 32px rgba(0,0,0,.4);
--shadow-lg:0 16px 64px rgba(0,0,0,.5);
--nav-h:64px;
--container:1240px;
}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--text);overflow-x:hidden;min-height:100vh;-webkit-font-smoothing:antialiased}
html,body{overflow-x:hidden}
#app{width:100%;overflow-x:hidden}
::selection{background:var(--purple);color:#fff}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--purple-d);border-radius:4px}
img{display:block;max-width:100%}
a{color:var(--purple-l);text-decoration:none;transition:color .2s}a:hover{color:#fff}
button,input,select,textarea{font-family:inherit}
.container{max-width:var(--container);margin:0 auto;padding:0 1.5rem}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}

/* ===== BUTTONS ===== */
.btn{display:inline-flex;align-items:center;gap:.45rem;padding:.6rem 1.25rem;border-radius:var(--radius-sm);font-weight:600;font-size:.875rem;border:none;cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1);white-space:nowrap;position:relative;overflow:hidden}
.btn::after{content:'';position:absolute;inset:0;background:rgba(255,255,255,0);transition:background .25s}
.btn:hover::after{background:rgba(255,255,255,.08)}
.btn:active{transform:scale(.97)}
.btn-p{background:var(--g1);color:#fff;box-shadow:0 4px 20px rgba(124,58,237,.35)}
.btn-p:hover{box-shadow:0 6px 28px rgba(124,58,237,.5);transform:translateY(-1px)}
.btn-g{background:transparent;border:1px solid var(--border-2);color:var(--text)}
.btn-g:hover{border-color:var(--purple);background:rgba(124,58,237,.08)}
.btn-sm{padding:.4rem .9rem;font-size:.8rem}
.btn-lg{padding:.75rem 1.8rem;font-size:.95rem;border-radius:var(--radius)}
.btn-ok{background:var(--g4);color:#fff}.btn-danger{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff}
.btn-amber{background:var(--g5);color:#fff}
.btn:disabled{opacity:.45;cursor:not-allowed;transform:none!important;box-shadow:none!important}
.btn-icon{width:38px;height:38px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);background:var(--surface);border:1px solid var(--border);color:var(--text-2);cursor:pointer;transition:all .2s;font-size:1rem}
.btn-icon:hover{color:#fff;border-color:var(--purple);background:var(--surface-2)}

/* ===== FORMS ===== */
.fg{margin-bottom:.9rem}
.fg label{display:block;font-size:.8rem;font-weight:500;margin-bottom:.3rem;color:var(--text-2);letter-spacing:.02em}
.fg input,.fg textarea,.fg select{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.65rem .9rem;color:var(--text);font-size:.9rem;outline:none;transition:border-color .2s,box-shadow .2s}
.fg input:focus,.fg textarea:focus,.fg select:focus{border-color:var(--purple);box-shadow:0 0 0 3px rgba(124,58,237,.15)}
.fg textarea{resize:vertical;min-height:80px}
.fg select option{background:var(--bg-3)}
.fg-row{display:grid;grid-template-columns:1fr 1fr;gap:.9rem}
@media(max-width:600px){.fg-row{grid-template-columns:1fr}}

/* ===== BADGE ===== */
.badge{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .6rem;border-radius:50px;font-size:.7rem;font-weight:600;letter-spacing:.02em}
.b-purple{background:rgba(124,58,237,.15);color:var(--purple-l)}
.b-pink{background:rgba(236,72,153,.15);color:var(--pink-l)}
.b-green{background:rgba(34,197,94,.15);color:var(--green-l)}
.b-orange{background:rgba(249,115,22,.15);color:var(--orange-l)}
.b-red{background:rgba(239,68,68,.15);color:var(--red-l)}
.b-blue{background:rgba(59,130,246,.15);color:var(--blue)}
.b-amber{background:rgba(245,158,11,.15);color:var(--amber)}

/* ===== CARDS ===== */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;transition:all .3s cubic-bezier(.4,0,.2,1)}
.card:hover{border-color:var(--border-2);transform:translateY(-4px);box-shadow:var(--shadow)}
.card-glass{background:rgba(19,18,43,.6);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--border)}

/* ===== STAT CARD ===== */
.sc{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem;display:flex;align-items:center;gap:1rem;transition:all .25s}
.sc:hover{border-color:var(--border-2);transform:translateY(-2px)}
.sc.clickable{cursor:pointer}.sc.clickable:hover{border-color:var(--purple);box-shadow:0 4px 20px rgba(124,58,237,.15)}
.sc-icon{width:44px;height:44px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:1.15rem;color:#fff;flex-shrink:0}
.sc-val{font-family:'Space Grotesk';font-weight:700;font-size:1.5rem;line-height:1.2}
.sc-lbl{font-size:.78rem;color:var(--text-2);margin-top:.1rem}

/* ===== TABLE ===== */
.tbl-wrap{overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface)}
.tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:.85rem}
.tbl th{background:var(--bg-3);padding:.65rem .75rem;text-align:left;font-weight:600;color:var(--text-2);border-bottom:1px solid var(--border);font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}
.tbl td{padding:.6rem .75rem;border-bottom:1px solid var(--border);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:rgba(255,255,255,.02)}

/* ===== MODAL ===== */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .2s}
.modal{background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius-xl);max-width:480px;width:100%;max-height:85vh;overflow-y:auto;padding:2rem;animation:slideUp .3s}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* ===== TOAST ===== */
#toastWrap{position:fixed;top:80px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:.5rem;pointer-events:none}
.toast{pointer-events:auto;background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius);padding:.7rem 1.1rem;display:flex;align-items:center;gap:.6rem;font-size:.87rem;box-shadow:var(--shadow-lg);animation:toastIn .4s cubic-bezier(.16,1,.3,1);min-width:260px;backdrop-filter:blur(20px)}
.toast.ok{border-left:3px solid var(--green)}.toast.err{border-left:3px solid var(--red)}
@keyframes toastIn{from{opacity:0;transform:translateX(50px) scale(.95)}to{opacity:1;transform:translateX(0) scale(1)}}
.toast.out{animation:toastOut .3s forwards}
@keyframes toastOut{to{opacity:0;transform:translateX(50px) scale(.95)}}

/* ===== SPINNER ===== */
.spinner-wrap{display:flex;justify-content:center;padding:3rem}
.spinner{width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--purple);border-radius:50%;animation:spin .65s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ===== PAGINATION ===== */
.pager{display:flex;justify-content:center;gap:.35rem;margin-top:1.5rem}
.pager button{width:36px;height:36px;border-radius:var(--radius-sm);background:var(--surface);border:1px solid var(--border);color:var(--text-2);cursor:pointer;font-weight:600;font-size:.82rem;display:flex;align-items:center;justify-content:center;transition:all .2s}
.pager button:hover{border-color:var(--purple);color:#fff}
.pager button.active{background:var(--g1);color:#fff;border-color:transparent}

/* ===== EMPTY STATE ===== */
.empty{text-align:center;padding:3.5rem 1.5rem}
.empty i{font-size:3rem;display:block;margin-bottom:1rem;opacity:.4}
.empty h5{font-family:'Space Grotesk';font-weight:700;margin-bottom:.4rem}
.empty p{color:var(--text-2);font-size:.9rem;margin-bottom:1.2rem;max-width:360px;margin-left:auto;margin-right:auto}

/* ===== SECTION ===== */
.section{padding:4.5rem 0}
.sec-tag{display:inline-flex;align-items:center;gap:.4rem;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:var(--purple-l);margin-bottom:.6rem}
.sec-hdr{text-align:center;margin-bottom:2.5rem}
.sec-hdr h2{font-family:'Space Grotesk';font-weight:700;font-size:clamp(1.5rem,3vw,2.2rem);margin-bottom:.5rem}
.sec-hdr p{color:var(--text-2);max-width:460px;margin:0 auto;font-size:.95rem;line-height:1.7}

/* ===== NAVBAR ===== */
.topnav{position:fixed;top:0;left:0;right:0;z-index:1000;height:var(--nav-h);background:rgba(6,6,15,.82);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--border);transition:all .3s}
.topnav.scrolled{background:rgba(6,6,15,.95);box-shadow:0 4px 24px rgba(0,0,0,.3)}
.topnav .container{display:flex;align-items:center;justify-content:space-between;height:100%;gap:1rem}
.brand{display:flex;align-items:center;gap:.5rem;cursor:pointer;font-family:'Space Grotesk';font-weight:700;font-size:1.15rem;color:#fff;flex-shrink:0}
.brand-icon{width:32px;height:32px;background:var(--g1);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:.9rem;color:#fff}
.nav-center{display:flex;align-items:center;gap:.25rem}
.nav-center .nl{padding:.4rem .85rem;border-radius:var(--radius-sm);font-size:.87rem;font-weight:500;color:var(--text-2);cursor:pointer;transition:all .2s;white-space:nowrap}
.nav-center .nl:hover,.nav-center .nl.active{color:#fff;background:rgba(255,255,255,.06)}
.nav-right{display:flex;align-items:center;gap:.5rem}
.hamburger{display:none;background:none;border:none;cursor:pointer;padding:.4rem;color:var(--text)}
.hamburger i{font-size:1.4rem}
.mobile-menu{display:none;position:fixed;top:var(--nav-h);left:0;right:0;bottom:0;background:var(--bg);z-index:999;padding:1.5rem;overflow-y:auto}
.mobile-menu.open{display:flex;flex-direction:column;gap:.4rem}
.mobile-menu .nl{padding:.85rem 1rem;border-radius:var(--radius-sm);font-size:1rem;font-weight:500;color:var(--text-2);cursor:pointer;transition:all .2s}
.mobile-menu .nl:hover,.mobile-menu .nl.active{color:#fff;background:var(--surface)}
@media(max-width:820px){.nav-center{display:none!important}.nav-right{display:none!important}.hamburger{display:flex}}
.bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:1000;background:rgba(6,6,15,.95);backdrop-filter:blur(24px);border-top:1px solid var(--border);padding:.4rem 0 env(safe-area-inset-bottom,.4rem)}
.bottom-nav .container{display:flex;justify-content:space-around}
.bn-item{display:flex;flex-direction:column;align-items:center;gap:.15rem;padding:.3rem .6rem;border-radius:var(--radius-sm);font-size:.65rem;color:var(--text-3);cursor:pointer;transition:all .2s;-webkit-tap-highlight-color:transparent}
.bn-item i{font-size:1.15rem}.bn-item.active{color:var(--purple-l)}
@media(max-width:820px){.bottom-nav{display:block}}
body{padding-bottom:0}
@media(max-width:820px){body{padding-bottom:70px}}

/* ===== HERO ===== */
.hero{min-height:92vh;display:flex;align-items:center;position:relative;overflow:hidden;padding-top:var(--nav-h)}
.hero-bg{position:absolute;inset:0;z-index:0}
.hero-bg img{width:100%;height:100%;object-fit:cover;filter:brightness(.35) saturate(1.2)}
.hero-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,6,15,.4) 0%,rgba(6,6,15,.7) 50%,var(--bg) 100%)}
.hero-content{position:relative;z-index:2;max-width:680px}
.hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.25);padding:.4rem 1rem;border-radius:50px;font-size:.8rem;font-weight:500;color:var(--purple-l);margin-bottom:1.5rem;backdrop-filter:blur(10px)}
.hero-badge .dot{width:7px;height:7px;background:var(--green);border-radius:50%;animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.hero h1{font-family:'Space Grotesk';font-weight:700;font-size:clamp(2.2rem,5vw,3.8rem);line-height:1.08;margin-bottom:1.2rem;letter-spacing:-.02em}
.hero h1 .hl{background:var(--g2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero p{font-size:1.05rem;color:var(--text-2);line-height:1.75;margin-bottom:2rem;max-width:520px}
.hero-btns{display:flex;gap:.8rem;flex-wrap:wrap;margin-bottom:3rem}
.hero-search{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:.4rem;display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;backdrop-filter:blur(16px)}
.hero-search input{flex:1;min-width:120px;background:transparent;border:none;color:var(--text);padding:.55rem .9rem;font-size:.9rem;outline:none}
.hero-search input::placeholder{color:var(--text-3)}
.hero-search .hs-div{width:1px;height:24px;background:var(--border)}
.hero-search select{background:transparent;border:none;color:var(--text-2);padding:.55rem .6rem;font-size:.82rem;outline:none;cursor:pointer}
.hero-search select option{background:var(--bg-3)}
.hs-btn{background:var(--g1);border:none;color:#fff;padding:.6rem 1.4rem;border-radius:var(--radius-sm);font-weight:600;font-size:.87rem;cursor:pointer;transition:all .25s;display:flex;align-items:center;gap:.4rem;white-space:nowrap}
.hs-btn:hover{box-shadow:0 4px 20px rgba(124,58,237,.45);transform:translateY(-1px)}
.hero-stats{display:flex;gap:2.5rem;margin-top:2rem}
.hs-item .hs-num{font-family:'Space Grotesk';font-weight:700;font-size:1.6rem;background:var(--g2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hs-item .hs-lbl{font-size:.78rem;color:var(--text-3)}
@media(max-width:600px){.hero{min-height:100vh}.hero h1{font-size:2rem}.hero-search{flex-direction:column}.hero-search .hs-div{display:none}.hero-search select,.hero-search input{width:100%}.hero-stats{gap:1.5rem}.hero-stats .hs-num{font-size:1.2rem}}

/* ===== EVENT CARD ===== */
.ev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(275px,1fr));gap:1.2rem}
@media(max-width:600px){.ev-grid{grid-template-columns:1fr}}
.ev-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;transition:all .35s cubic-bezier(.4,0,.2,1);cursor:pointer}
.ev-card:hover{transform:translateY(-6px);border-color:rgba(124,58,237,.3);box-shadow:0 16px 48px rgba(0,0,0,.4)}
.ev-card .ec-img{position:relative;height:185px;overflow:hidden;background:var(--surface-2)}
.ev-card .ec-img img{width:100%;height:100%;object-fit:cover;opacity:1;transition:transform .5s cubic-bezier(.4,0,.2,1)}
.ev-card:hover .ec-img img{transform:scale(1.06)}
.ev-card .ec-img .ec-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(6,6,15,.85) 0%,transparent 55%)}
.ev-card .ec-badge{position:absolute;top:10px;left:10px;z-index:2}
.ev-card .ec-fav{position:absolute;top:10px;right:10px;z-index:2;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);border:none;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;font-size:.85rem}
.ev-card .ec-fav:hover,.ev-card .ec-fav.liked{background:var(--pink);transform:scale(1.1)}
.ev-card .ec-date{position:absolute;top:10px;right:50px;z-index:2;background:rgba(0,0,0,.5);backdrop-filter:blur(8px);border-radius:var(--radius-sm);padding:.25rem .5rem;text-align:center;line-height:1.15}
.ev-card .ec-date .d{font-family:'Space Grotesk';font-size:1.1rem;font-weight:700;color:#fff}
.ev-card .ec-date .m{font-size:.55rem;text-transform:uppercase;color:var(--pink-l);font-weight:600}
.ev-card .ec-body{padding:1rem 1.1rem}
.ev-card .ec-body h5{font-family:'Space Grotesk';font-weight:600;font-size:.98rem;line-height:1.3;margin-bottom:.4rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ec-meta{display:flex;flex-direction:column;gap:.25rem;margin-bottom:.7rem}
.ec-meta span{font-size:.78rem;color:var(--text-3);display:flex;align-items:center;gap:.3rem;line-height:1.3}
.ec-meta i{color:var(--purple-l);font-size:.82rem;flex-shrink:0}
.ec-foot{display:flex;justify-content:space-between;align-items:center;padding-top:.7rem;border-top:1px solid var(--border)}
.ec-price{font-family:'Space Grotesk';font-weight:700;font-size:1rem;background:var(--g2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ec-seats{font-size:.72rem;color:var(--text-3);background:var(--bg-3);padding:.2rem .55rem;border-radius:6px}
.ec-book-btn{width:100%;margin-top:.7rem;padding:.55rem;border-radius:var(--radius-sm);border:none;background:var(--bg-3);color:var(--text);font-weight:600;font-size:.85rem;cursor:pointer;transition:all .25s;display:flex;align-items:center;justify-content:center;gap:.35rem}
.ec-book-btn:hover{background:var(--g1);color:#fff}

/* ===== EXPLORE EVENTS LAYOUT ===== */
.ev-section{min-height:calc(100vh - var(--nav-h))}
.ev-container{width:100%;max-width:var(--container);margin:0 auto;padding:0 1.5rem}
.ev-count-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.1rem}
.ev-grid{width:100%}
#evGrid img{max-width:100%}
@media(max-width:600px){
.ev-container{padding:0 16px}
.ev-grid{grid-template-columns:1fr;gap:1.1rem}
.ev-grid .ev-card{width:100%;max-width:100%}
.ev-card .ec-img{height:auto}
.ev-card .ec-img img{height:auto;object-fit:cover}
}

/* ===== CATEGORY GRID ===== */
.cat-hdr{text-align:left!important;display:flex;align-items:flex-end;justify-content:space-between;gap:1rem}
.cat-hdr .btn{white-space:nowrap;margin-bottom:.15rem}
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:.85rem}
@media(max-width:600px){.cat-hdr{align-items:flex-start;flex-direction:column}.cat-hdr .btn{width:100%;justify-content:center;margin:0}.cat-grid{grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:.6rem}}
.cat-card{position:relative;width:100%;min-height:112px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.1rem .7rem;text-align:center;color:inherit;font:inherit;cursor:pointer;transition:all .3s}
.cat-card:hover{border-color:var(--purple);transform:translateY(-3px);box-shadow:0 8px 24px rgba(124,58,237,.15)}
.cat-card .cat-icon{font-size:1.8rem;margin-bottom:.5rem;display:block;transition:transform .3s}
.cat-card:hover .cat-icon{transform:scale(1.15)}
.cat-card .cat-name{display:block;width:100%;font-size:.85rem;line-height:1.35;font-weight:600;color:var(--text);word-break:break-word}
.cat-card:hover .cat-name{color:#fff}
.cat-card .cat-arrow{position:absolute;top:9px;right:9px;font-size:.75rem;color:var(--text-3);opacity:0;transform:translate(-3px,3px);transition:all .25s}
.cat-card:hover .cat-arrow,.cat-card:focus-visible .cat-arrow{opacity:1;transform:translate(0,0);color:var(--purple-l)}

/* ===== FEATURES GRID ===== */
.feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1.1rem}
.feat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.8rem 1.4rem;transition:all .3s;position:relative;overflow:hidden}
.feat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--g1);transform:scaleX(0);transform-origin:left;transition:transform .35s}
.feat-card:hover::before{transform:scaleX(1)}
.feat-card:hover{border-color:var(--border-2);transform:translateY(-3px)}
.feat-icon{width:48px;height:48px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin-bottom:1rem;transition:transform .3s}
.feat-card:hover .feat-icon{transform:scale(1.1)}
.feat-card h5{font-family:'Space Grotesk';font-weight:600;margin-bottom:.3rem;font-size:1rem}
.feat-card p{color:var(--text-2);font-size:.85rem;line-height:1.65;margin:0}

/* ===== CTA BOX ===== */
.cta-box{background:var(--g1);border-radius:var(--radius-xl);padding:3.5rem 2.5rem;text-align:center;position:relative;overflow:hidden}
.cta-box::before{content:'';position:absolute;top:-50%;right:-20%;width:500px;height:500px;background:radial-gradient(circle,rgba(255,255,255,.1),transparent 65%);pointer-events:none}
.cta-box h2{font-family:'Space Grotesk';font-weight:700;font-size:clamp(1.4rem,2.5vw,2rem);margin-bottom:.6rem;position:relative}
.cta-box p{color:rgba(255,255,255,.8);max-width:420px;margin:0 auto 1.5rem;position:relative;font-size:.95rem}
.cta-box .btn{position:relative;background:#fff;color:var(--purple-d);font-weight:700;padding:.75rem 2rem;border-radius:var(--radius);box-shadow:0 4px 20px rgba(0,0,0,.2)}
.cta-box .btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,.3)}

/* ===== REVIEWS ===== */
.rev-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.3rem;margin-bottom:.8rem}
.rev-head{display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem}
.rev-av{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.82rem;flex-shrink:0;color:#fff}
.rev-stars{color:var(--amber);font-size:.8rem}
.rev-text{color:var(--text-2);font-size:.88rem;line-height:1.65;margin:0}

/* ===== HERO DETAIL ===== */
.detail-hero{position:relative;height:380px;border-radius:var(--radius-xl);overflow:hidden;margin-bottom:2rem}
.detail-hero img{width:100%;height:100%;object-fit:cover}
.detail-hero .dh-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(6,6,15,.92) 0%,rgba(6,6,15,.2) 100%)}
.detail-hero .dh-content{position:absolute;bottom:0;left:0;right:0;padding:2rem 2.5rem}
@media(max-width:600px){.detail-hero{height:260px}.detail-hero .dh-content{padding:1.5rem}}

/* ===== DETAIL GRID ===== */
.detail-grid{display:grid;grid-template-columns:1.6fr 1fr;gap:1.5rem}
@media(max-width:820px){.detail-grid{grid-template-columns:1fr}}

/* ===== TICKET SELECTOR ===== */
.tt-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;margin-bottom:.6rem;cursor:pointer;transition:all .25s}
.tt-card:hover,.tt-card.sel{border-color:var(--purple);background:rgba(124,58,237,.06)}
.tt-card.sel{box-shadow:0 0 0 2px var(--purple)}
.tt-name{font-weight:600;font-size:.95rem}
.tt-price{font-family:'Space Grotesk';font-weight:700;font-size:1.15rem;background:var(--g2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.tt-avail{font-size:.75rem;color:var(--text-3)}
.qty-row{display:flex;align-items:center;gap:1rem;justify-content:center;margin:1rem 0}
.qty-row button{width:38px;height:38px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);color:#fff;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.qty-row button:hover{background:var(--purple);border-color:var(--purple)}
.qty-row .qty{font-family:'Space Grotesk';font-size:1.6rem;font-weight:700;min-width:38px;text-align:center}
.order-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.1rem;margin-top:.8rem}
.ob-row{display:flex;justify-content:space-between;padding:.35rem 0;font-size:.87rem}
.ob-total{border-top:1px solid var(--border);margin-top:.5rem;padding-top:.6rem;font-weight:700;font-size:1.05rem}

/* ===== CHECKOUT ===== */
.checkout-steps{display:flex;gap:.3rem;margin-bottom:2rem}
.cs-step{flex:1;text-align:center;padding:.6rem;border-radius:var(--radius-sm);background:var(--surface);font-size:.78rem;font-weight:600;color:var(--text-3);transition:all .2s}
.cs-step.active{background:var(--g1);color:#fff}
.cs-step.done{background:rgba(34,197,94,.15);color:var(--green)}

/* ===== TICKET DISPLAY (QR) ===== */
.ticket-disp{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;max-width:380px;margin:0 auto}
.ticket-disp .td-hdr{background:var(--g1);padding:1.5rem;text-align:center;color:#fff;position:relative}
.ticket-disp .td-hdr::before,.ticket-disp .td-hdr::after{content:'';position:absolute;bottom:-12px;width:24px;height:24px;background:var(--bg);border-radius:50%}
.ticket-disp .td-hdr::before{left:-12px}.ticket-disp .td-hdr::after{right:-12px}
.ticket-disp .td-body{padding:1.5rem;text-align:center}
.ticket-disp .td-qr{margin:.8rem auto;width:180px;height:180px;background:#fff;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center}
.ticket-disp .td-qr img{width:100%;height:100%;object-fit:contain;border-radius:var(--radius-sm)}
.ticket-disp .td-tear{border-top:2px dashed var(--border);margin:0 1.5rem}
.ticket-disp .td-info{text-align:left;padding:0 1.5rem 1.5rem}
.ticket-disp .td-row{display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--border);font-size:.85rem}
.ticket-disp .td-row:last-child{border:none}

/* ===== DASHBOARD ===== */
.dash{min-height:100vh;display:flex;padding-top:var(--nav-h)}
.dash-side{width:240px;background:var(--surface);border-right:1px solid var(--border);position:fixed;top:var(--nav-h);left:0;bottom:0;overflow-y:auto;padding:1.2rem;display:flex;flex-direction:column;z-index:100}
.dash-side .sb-link{display:flex;align-items:center;gap:.65rem;padding:.6rem .85rem;border-radius:var(--radius-sm);color:var(--text-2);font-weight:500;font-size:.87rem;cursor:pointer;transition:all .2s}
.dash-side .sb-link:hover{background:rgba(255,255,255,.04);color:#fff}
.dash-side .sb-link.active{background:var(--g1);color:#fff}
.dash-side .sb-link i{font-size:1rem;width:18px;text-align:center}
.dash-side .sb-div{height:1px;background:var(--border);margin:.5rem 0}
.dash-main{flex:1;margin-left:240px;padding:1.8rem;max-width:1200px}
.dash-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:.8rem}
.dash-hdr h1{font-family:'Space Grotesk';font-weight:700;font-size:1.4rem}
.dash-body{min-height:55vh}
@media(max-width:820px){.dash-side{display:none!important}.dash-main{margin-left:0;padding:1rem}}
@media(max-width:820px){.topnav .brand span{display:none}}

/* ===== SCROLL REVEAL ===== */
.reveal{opacity:0;transform:translateY(24px);transition:all .6s cubic-bezier(.4,0,.2,1)}
.reveal.visible{opacity:1;transform:translateY(0)}

/* ===== STAR RATING ===== */
.stars{color:var(--amber);font-size:.85rem}
.stars i{margin-right:1px}

/* ===== NEWSLETTER ===== */
.nl-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xl);padding:2.5rem;display:flex;align-items:center;gap:2rem;flex-wrap:wrap}
.nl-section .nl-text{flex:1;min-width:240px}
.nl-section .nl-form{display:flex;gap:.5rem;flex:1;min-width:280px}
.nl-section .nl-form input{flex:1;background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.65rem 1rem;color:var(--text);font-size:.9rem;outline:none}
.nl-section .nl-form input:focus{border-color:var(--purple)}
@media(max-width:600px){.nl-section{flex-direction:column;text-align:center}.nl-form{width:100%}}

/* ===== FOOTER ===== */
.site-footer{background:var(--surface);border-top:1px solid var(--border);padding:3rem 0 1.5rem;margin-top:2rem}
.ft-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:2rem;margin-bottom:2rem}
@media(max-width:820px){.ft-grid{grid-template-columns:1fr 1fr}}
@media(max-width:480px){.ft-grid{grid-template-columns:1fr}}
.ft-brand p{color:var(--text-3);font-size:.85rem;line-height:1.65;max-width:260px;margin-top:.6rem}
.ft-col h6{font-family:'Space Grotesk';font-weight:600;margin-bottom:.7rem;color:var(--text);font-size:.85rem}
.ft-col a{display:block;color:var(--text-3);font-size:.83rem;padding:.2rem 0;transition:color .2s}
.ft-col a:hover{color:var(--purple-l)}
.ft-bottom{padding-top:1rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.8rem}
.ft-bottom p{color:var(--text-3);font-size:.78rem;margin:0}
.ft-socials{display:flex;gap:.4rem}
.ft-socials a{width:32px;height:32px;border-radius:var(--radius-sm);background:var(--bg-3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-3);transition:all .2s;font-size:.85rem}
.ft-socials a:hover{background:var(--g1);color:#fff;border-color:transparent;transform:translateY(-2px)}

/* ===== UTILITY ===== */
.mb-1{margin-bottom:.8rem}.mb-2{margin-bottom:1.5rem}.mb-3{margin-bottom:2.5rem}
.mt-1{margin-top:.8rem}.mt-2{margin-top:1.5rem}
.tc{text-align:center}.t2{color:var(--text-2)}.t3{color:var(--text-3)}
.hidden{display:none!important}
.gap-sm{gap:.6rem}.flex{display:flex}.flex-wrap{flex-wrap:wrap}.items-c{align-items:center}.justify-sb{justify-content:space-between}
</style>
</head>
<body>
<div id="toastWrap"></div>
<div id="app"></div>
<script>
(function(){
'use strict';
