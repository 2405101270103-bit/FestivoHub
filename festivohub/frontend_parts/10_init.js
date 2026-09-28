// ============ PAGE DISPATCHER ============
function renderPage(route){
  const pc=$('#page');if(!pc)return;
  if(route.startsWith('/dashboard')){
    if(!S.user){navigate('/login');return}
    const parts=route.split('/').filter(Boolean);
    const sub=parts[1]||'overview';
    if(S.user.role==='admin')return renderAdminDash(sub);
    if(S.user.role==='organizer')return renderOrgDash(sub);
    return renderUserDash(sub);
  }
  if(route==='/'||route==='')return renderHome();
  if(route.startsWith('/events/'))return renderEventDetail(route.split('/')[2]);
  if(route.startsWith('/events'))return renderEvents();
  if(route==='/login')return renderLogin();
  if(route==='/register')return renderRegister();
  if(route==='/contact')return renderContact();
  if(route==='/about')return renderAbout();
  pc.innerHTML='<section class="section" style="min-height:60vh;display:flex;align-items:center;justify-content:center"><div class="empty"><i class="bi bi-question-circle"></i><h5>Page Not Found</h5><p>The page you\'re looking for doesn\'t exist.</p><button class="btn btn-p" onclick="navigate(\'/\')">Go Home</button></div></section>';
}

// ============ WINDOW EXPORTS ============
window.navigate=navigate;window.logout=logout;window.toast=toast;window.toggleMobile=toggleMobile;
window.homeSearch=homeSearch;window.toggleFav=toggleFav;window.handleNewsletter=handleNewsletter;
window.evGo=evGo;
window.selTT=selTT;window.qtyCh=qtyCh;window.startBooking=startBooking;window.submitReview=submitReview;
window.handleLogin=handleLogin;window.handleRegister=handleRegister;window.handleForgot=handleForgot;
window.togReg=togReg;window.handleContact=handleContact;
window.dashNav=dashNav;window.saveProfile=saveProfile;window.changePass=changePass;window.cancelBk=cancelBk;
window.orgEvtSt=orgEvtSt;window.orgDelEvt=orgDelEvt;window.submitEvt=submitEvt;
window.doCheckin=doCheckin;
window.admEvtSt=admEvtSt;window.admDelEvt=admDelEvt;window.admUserSt=admUserSt;
window.admOrgSt=admOrgSt;window.admDelOrg=admDelOrg;window.saveSet=saveSet;
window.addCategory=addCategory;window.admDelCat=admDelCat;

// ============ INIT ============
loadAuth();
getStats().catch(()=>{});
getCategories().catch(()=>{});
window.addEventListener('hashchange',handleRoute);
if(!location.hash||location.hash==='#'||location.hash==='#/')location.hash='/';
else handleRoute();
})();
</script>
</body>
</html>
