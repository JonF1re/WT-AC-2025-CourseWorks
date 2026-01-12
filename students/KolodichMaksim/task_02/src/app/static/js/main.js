// Very small client helper used by templates
(async function(){
  const nav = document.getElementById('nav-actions');
  if(!nav) return;
  const token = localStorage.getItem('token');
  if(!token){
    nav.innerHTML = '<a class="btn btn-outline-primary me-2" href="/login.html">Вход</a><a class="btn btn-primary" href="/register.html">Регистрация</a>'
    return;
  }

  // attempt to fetch current user to show email and a nicer nav
  try{
    const res = await fetch('/api/v1/auth/me', {headers: {'Authorization': 'Bearer ' + token}});
    if(!res.ok) throw new Error('unauth');
    const user = await res.json();
    nav.innerHTML = `<a class="btn btn-outline-secondary me-2" href="/dashboard.html">Дашборд</a><div class="d-flex align-items-center"><span class="small-muted me-2">${user.email}</span><button id="logout" class="btn btn-danger">Выйти</button></div>`;
    document.getElementById('logout').addEventListener('click', ()=>{ localStorage.removeItem('token'); window.location = '/'; });
  }catch(e){
    // token invalid or expired
    localStorage.removeItem('token');
    nav.innerHTML = '<a class="btn btn-outline-primary me-2" href="/login.html">Вход</a><a class="btn btn-primary" href="/register.html">Регистрация</a>'
  }
})();