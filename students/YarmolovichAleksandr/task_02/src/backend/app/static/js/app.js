const API_ROOT = '/api' // same origin

// Toast helper
function showToast(message, type='info', delay=4000){
  const container = document.getElementById('toast-container')
  if (!container){ alert(message); return }
  const toast = document.createElement('div')
  const theme = (type === 'error') ? 'danger' : (type === 'success' ? 'success' : 'primary')
  toast.className = `toast align-items-center text-bg-${theme} border-0`
  toast.setAttribute('role','alert')
  toast.setAttribute('aria-live','assertive')
  toast.setAttribute('aria-atomic','true')
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`
  container.appendChild(toast)
  const bsToast = new bootstrap.Toast(toast, {delay})
  bsToast.show()
  toast.addEventListener('hidden.bs.toast', ()=> toast.remove())
}

// Validation helpers
function validateEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }
function setFieldError(el, message){ if (!el) return; el.classList.add('is-invalid'); let fb = el.parentNode.querySelector('.invalid-feedback'); if (!fb){ fb = document.createElement('div'); fb.className='invalid-feedback'; el.parentNode.appendChild(fb) } fb.innerText = message }
function clearFieldError(el){ if (!el) return; el.classList.remove('is-invalid'); const fb = el.parentNode.querySelector('.invalid-feedback'); if (fb) fb.remove() }

// Auth helpers: return false and optionally redirect if not authenticated
function requireAuth(redirect=true){ const token = localStorage.getItem('accessToken'); if (!token){ if (redirect){ showToast('Please login','error'); location.href='/login' } return false } return true }

function hasRole(roles){ const role = localStorage.getItem('role'); return role && roles.includes(role) }

function apiFetch(path, opts={}){
  const token = localStorage.getItem('accessToken')
  const headers = { ...(opts.headers || {}), ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
  return fetch(API_ROOT + path, { ...opts, headers })
    .then(async r => {
      const text = await r.text()
      try {
        return JSON.parse(text)
      } catch (e) {
        // non-json response
        return {status: 'error', error: {message: `Server error (${r.status})`}, statusCode: r.status}
      }
    })
    .catch(e => ({status: 'error', error: {message: e.message}}))
}

// Auth handlers
document.addEventListener('DOMContentLoaded', ()=>{
  const loginForm = document.getElementById('login-form')
  if (loginForm){
    loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault()
      const email = document.getElementById('email').value
      const password = document.getElementById('password').value
      const r = await apiFetch('/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password})})
      if (r.status === 'ok'){
        localStorage.setItem('accessToken', r.data.accessToken)
        // store user info for UI
        if (r.data.user){
          localStorage.setItem('username', r.data.user.username)
          localStorage.setItem('role', r.data.user.role)
          localStorage.setItem('userId', r.data.user.id)
        }
        location.href = '/'
      } else showToast(r.error?.message || 'Login failed','error')
    })
  }

  const registerForm = document.getElementById('register-form')
  if (registerForm){
    registerForm.addEventListener('submit', async (e)=>{
      e.preventDefault()
      const username = document.getElementById('username').value
      const email = document.getElementById('email').value
      const password = document.getElementById('password').value
      const r = await apiFetch('/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,email,password})})
      if (r.status === 'ok') location.href = '/login'
      else showToast(r.error?.message || 'Register failed','error')
    })
  }

  // store user id at login
  if (loginForm){
    // existing handler above, so keep that code (no-op here)
  }

  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn){ logoutBtn.addEventListener('click', ()=>{ localStorage.removeItem('accessToken'); location.href = '/' }) }

  updateNav()
  loadCategories()
  if (document.getElementById('ads-list')) loadAds()
  if (document.getElementById('create-ad-form')) setupCreateAd()
  if (document.getElementById('edit-ad-form')) setupEditAd()
  if (document.getElementById('conv-list')) loadConversations()
  if (document.getElementById('report-list')) loadReports()
  if (document.getElementById('ad-title')) loadAdDetail()
  if (document.getElementById('admin-content')) setupAdminPage()
  if (document.getElementById('my-ads-list')) loadMyAds()
  if (document.getElementById('profile-form')) setupProfile()
  if (document.getElementById('moderator-report-list')) setupModeratorPage()
})

async function updateNav(){
  const token = localStorage.getItem('accessToken')
  const navLogin = document.getElementById('nav-login')
  const navRegister = document.getElementById('nav-register')
  const navUser = document.getElementById('nav-user')
  const navLogout = document.getElementById('nav-logout')
  const navAdmin = document.getElementById('nav-admin')
  const navModerator = document.getElementById('nav-moderator')
  const navMyAds = document.getElementById('nav-myads')
  const navProfile = document.getElementById('nav-profile')
  const navUsername = document.getElementById('nav-username')
  if (token){
    navLogin?.classList.add('d-none')
    navRegister?.classList.add('d-none')
    navUser?.classList.remove('d-none')
    navLogout?.classList.remove('d-none')
    const username = localStorage.getItem('username')
    const role = localStorage.getItem('role')
    if (username) navUsername.innerText = username
    // show my ads/profile links
    navMyAds?.classList.remove('d-none')
    navProfile?.classList.remove('d-none')
    if (role && (role === 'admin' || role === 'moderator')) navAdmin?.classList.remove('d-none')
    else navAdmin?.classList.add('d-none')
    if (role && role === 'moderator') navModerator?.classList.remove('d-none')
    else navModerator?.classList.add('d-none')
  } else {
    navLogin?.classList.remove('d-none')
    navRegister?.classList.remove('d-none')
    navUser?.classList.add('d-none')
    navLogout?.classList.add('d-none')
    navAdmin?.classList.add('d-none')
    navMyAds?.classList.add('d-none')
    navProfile?.classList.add('d-none')
    navModerator?.classList.add('d-none')
  }
}

async function loadAds(){
  const list = document.getElementById('ads-list')
  const emptyState = document.getElementById('empty-ads')
  list.innerHTML = ''
  const q = document.getElementById('search-input')?.value || ''
  const category = document.getElementById('category-filter')?.value || ''
  const params = new URLSearchParams()
  if (q) params.set('query', q)
  if (category) params.set('categoryId', category)
  const data = await apiFetch('/ads' + (params.toString()? ('?' + params.toString()) : ''))
  if (data.status === 'ok'){
    if (data.data.length === 0) {
      emptyState.classList.remove('d-none')
      return
    }
    emptyState.classList.add('d-none')
    data.data.forEach(a=>{
      const col = document.createElement('div'); col.className='col-sm-6 col-lg-4'
      const imgHtml = a.images && a.images[0] ? `<div class="card-img-container"><img src="${a.images[0]}" alt="${a.title}"></div>` : '<div style="height: 200px; background: #f3f4f6;"></div>'
      col.innerHTML = `<a href="/ads/${a.id}" class="ad-card"><div class="card"><div style="overflow:hidden;border-radius:8px 8px 0 0;">${imgHtml}</div><div class="card-body"><h5 class="card-title">${a.title}</h5><div class="card-price">$${parseFloat(a.price).toFixed(2)}</div><div class="card-meta"><span class="text-muted">${a.author_username || 'Unknown'}</span><span class="text-muted">Active</span></div></div></div></a>`
      list.appendChild(col)
    })
  } else console.error(data)
}

function setupCreateAd(){
  const form = document.getElementById('create-ad-form')
  form.addEventListener('submit', async (e)=>{
    e.preventDefault()
    const title = document.getElementById('title').value
    const description = document.getElementById('description').value
    const price = parseFloat(document.getElementById('price').value || 0)
    const category_id = document.getElementById('category_id').value
    if (!category_id){ showToast('Select category','error'); return }
    const r = await apiFetch('/ads', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title,description,price,category_id})})
    if (r.status==='ok'){
      const adId = r.data.id
      const files = document.getElementById('images').files
      if (files.length>0){
        for (const f of files){
          const fd = new FormData(); fd.append('file', f)
          await apiFetch(`/ads/${adId}/media`, {method:'POST', body: fd})
        }
      }
      showToast('Ad created','success')
      location.href = `/ads/${adId}`
    } else showToast('Create failed','error')
  })
}

function setupEditAd(){
  const form = document.getElementById('edit-ad-form')
  const adId = window.location.pathname.split('/')[2]
  document.getElementById('edit-ad-id').value = adId
  // load ad details
  apiFetch(`/ads/${adId}`).then(r=>{
    if (r.status==='ok'){
      document.getElementById('title').value = r.data.title
      document.getElementById('description').value = r.data.description
      document.getElementById('price').value = r.data.price
      document.getElementById('category_id').value = r.data.category_id || ''
      // load existing media
      apiFetch(`/ads/${adId}/media`).then(m=>{
        if (m.status==='ok'){
          const container = document.getElementById('existing-media'); container.innerHTML = ''
          m.data.forEach(mm=>{
            const el = document.createElement('div'); el.className='position-relative'
            el.innerHTML = `<img src="${mm.url}" class="media-thumb"><button class="btn btn-sm btn-danger position-absolute top-0 end-0 delete-media" data-id="${mm.id}">x</button>`
            container.appendChild(el)
          })
          // attach delete handlers
          container.querySelectorAll('.delete-media').forEach(btn=> btn.addEventListener('click', async (e)=>{
            const id = e.target.dataset.id
            const res = await apiFetch(`/media/${id}`, {method:'DELETE'})
            if (res.status==='ok') { e.target.parentElement.remove(); showToast('Media deleted','success') }
            else showToast('Delete failed','error')
          }))
        }
      })
    }
  })

  form.addEventListener('submit', async (e)=>{
    e.preventDefault()
    const title = document.getElementById('title').value
    const description = document.getElementById('description').value
    const price = parseFloat(document.getElementById('price').value || 0)
    const category_id = document.getElementById('category_id').value
    const r = await apiFetch(`/ads/${adId}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title,description,price,category_id})})
    if (r.status==='ok'){
      const files = document.getElementById('images').files
      if (files.length>0){
        for (const f of files){
          const fd = new FormData(); fd.append('file', f)
          await apiFetch(`/ads/${adId}/media`, {method:'POST', body: fd})
        }
      }
      showToast('Ad updated','success')
      location.href = `/ads/${adId}`
    } else showToast('Update failed','error')
  })
}

async function loadAdDetail(){
  const adId = window.location.pathname.split('/').pop()
  const r = await apiFetch(`/ads/${adId}`)
  if (r.status==='ok'){
    document.getElementById('ad-title').innerText = r.data.title
    document.getElementById('ad-price').innerText = '$' + parseFloat(r.data.price).toFixed(2)
    document.getElementById('ad-category').innerText = r.data.category_name || r.data.category_id || 'N/A'
    document.getElementById('ad-description').innerText = r.data.description || 'No description provided'
    document.getElementById('seller-name').innerText = r.data.author_username || 'Unknown seller'
    
    const date = new Date(r.data.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    document.getElementById('ad-date').innerText = date
    
    const m = await apiFetch(`/ads/${adId}/media`)
    if (m.status==='ok' && window.setupGallery){
      window.setupGallery(m.data)
    }
    
    const editBtn = document.getElementById('edit-ad-btn')
    const closeBtn = document.getElementById('close-ad-btn')
    const token = localStorage.getItem('accessToken')
    const myId = localStorage.getItem('userId')
    const role = localStorage.getItem('role')
    const isOwner = myId === r.data.author_id
    const isModerator = role === 'admin' || role === 'moderator'
    if (editBtn && token && (isOwner || isModerator)){
      editBtn.classList.remove('d-none')
      editBtn.href = `/ads/${adId}/edit`
    }
    if (closeBtn && token && (isOwner || isModerator) && r.data.status === 'active'){
      closeBtn.classList.remove('d-none')
      closeBtn.onclick = async ()=>{
        if (!confirm('Close this ad? You can reopen it later.')) return
        const res = await apiFetch(`/ads/${adId}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:'closed'})})
        if (res.status==='ok'){ showToast('Ad closed','success'); location.reload() } else showToast('Failed to close ad','error')
      }
    }
    
    const writeBtns = document.querySelectorAll('#write-btn, #write-btn-seller')
    writeBtns.forEach(writeBtn => {
      writeBtn.onclick = async ()=>{
        const token = localStorage.getItem('accessToken')
        if (!token) { showToast('Please login to message','error'); location.href = '/login'; return }
        const partnerId = r.data.author_id
        const conv = await apiFetch('/conversations', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({adId: adId, partnerId: partnerId})})
        if (conv.status==='ok'){
          openAdConversation(conv.data.id)
        } else showToast('Could not open conversation','error')
      }
    })

    const reportBtn = document.getElementById('report-btn')
    const reportModalEl = document.getElementById('report-modal')
    if (reportBtn && reportModalEl){
      const reportModal = new bootstrap.Modal(reportModalEl)
      reportBtn.onclick = ()=>{ reportModal.show() }
      const submitReportBtn = document.getElementById('submit-report')
      if (submitReportBtn){
        submitReportBtn.onclick = async ()=>{
          const token = localStorage.getItem('accessToken')
          if (!token){ showToast('Please login to submit a report','error'); location.href = '/login'; return }
          const reason = document.getElementById('report-reason').value
          if (!reason) { showToast('Please enter a reason','error'); return }
          const res = await apiFetch('/reports', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({adId: adId, reason})})
          if (res.status==='ok'){ showToast('Report submitted','success'); reportModal.hide(); document.getElementById('report-reason').value = '' }
          else showToast(res.error?.message || 'Submit failed','error')
        }
      }
    }
  } else console.error(r)
}

async function openAdConversation(convId){
  const pane = document.getElementById('ad-conversation')
  pane.classList.remove('d-none')
  const list = document.getElementById('ad-messages')
  list.innerHTML = ''
  const msgs = await apiFetch(`/conversations/${convId}/messages`)
  if (msgs.status !== 'ok') return
  msgs.data.forEach(m=>{
    const msgDiv = document.createElement('div')
    msgDiv.className = 'message'
    msgDiv.innerHTML = `<div class="message-author">${m.author_username || m.author_id}</div><div class="message-text">${m.text}</div>`
    list.appendChild(msgDiv)
  })
  list.scrollTop = list.scrollHeight
  const form = document.getElementById('ad-msg-form')
  form.onsubmit = async (e)=>{
    e.preventDefault()
    const textInput = document.getElementById('ad-msg-text')
    const text = textInput.value.trim()
    if (!text) return
    await apiFetch(`/conversations/${convId}/messages`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text})})
    textInput.value = ''
    openAdConversation(convId)
  }
}

// Conversations (simple list)
async function loadConversations(){
  const list = document.getElementById('conv-list')
  const token = localStorage.getItem('accessToken')
  if (!token){ if (list) list.innerHTML = '<div class="text-muted">Please login to view conversations</div>'; return }
  const r = await apiFetch('/conversations')
  if (r.status==='ok'){
    list.innerHTML = ''
    r.data.forEach(c=>{
      const el = document.createElement('div'); el.className='p-2 border mb-2'
      el.innerHTML = `Ad: ${c.ad_title || c.ad_id} — with ${c.partner_username || c.partner_id} — <a href="#" data-id="${c.id}" class="open-conv">Open</a>`
      list.appendChild(el)
    })
    document.querySelectorAll('.open-conv').forEach(a=>a.addEventListener('click', async (e)=>{
      e.preventDefault(); const id = e.target.dataset.id; openConversation(id)
    }))
  } else if (r.error && /missing\s+authorization/i.test(r.error.message || '')){
    if (list) list.innerHTML = '<div class="text-muted">Please login to view conversations</div>'
  }
}

// --- User pages ---
async function loadMyAds(){
  const myId = localStorage.getItem('userId')
  if (!myId) { document.getElementById('my-ads-list').innerHTML = '<div class="text-muted">Please login</div>'; return }
  const r = await apiFetch(`/ads?authorId=${myId}&limit=1000`)
  const list = document.getElementById('my-ads-list')
  list.innerHTML = ''
  if (r.status!=='ok') { list.innerHTML = '<div class="text-danger">Failed to load</div>'; return }
  if (r.data.length === 0) { list.innerHTML = '<div class="text-muted">No ads yet</div>'; return }
  r.data.forEach(a=>{
    const col = document.createElement('div'); col.className='col-md-4'
    const statusBadge = a.status === 'closed' ? '<span class="badge bg-warning ms-2">Closed</span>' : ''
    const actionBtn = a.status === 'active' ? `<a href="/ads/${a.id}/edit" class="btn btn-sm btn-secondary">Edit</a>` : '<button class="btn btn-sm btn-success reopen-ad" data-id="' + a.id + '">Reopen</button>'
    col.innerHTML = `<div class="card"><div class="card-body"><h5 class="card-title">${a.title}${statusBadge}</h5><p class="card-text">Price: $${parseFloat(a.price).toFixed(2)}</p><a href="/ads/${a.id}" class="btn btn-sm btn-primary me-2">View</a>${actionBtn}</div></div>`
    list.appendChild(col)
  })
  list.querySelectorAll('.reopen-ad').forEach(btn => btn.addEventListener('click', async (e) => {
    const adId = e.target.dataset.id
    const res = await apiFetch(`/ads/${adId}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:'active'})})
    if (res.status==='ok') { showToast('Ad reopened','success'); loadMyAds() } else showToast('Failed to reopen','error')
  }))
}

function setupProfile(){
  const myId = localStorage.getItem('userId')
  if (!myId) return
  // load user
  apiFetch(`/users/${myId}`).then(r=>{ if (r.status==='ok'){ document.getElementById('profile-username').value = r.data.username; document.getElementById('profile-email').value = r.data.email } })
  document.getElementById('profile-form').addEventListener('submit', async (e)=>{
    e.preventDefault(); const username = document.getElementById('profile-username'); const email = document.getElementById('profile-email'); clearFieldError(username); clearFieldError(email)
    if (!username.value){ setFieldError(username,'Required'); showToast('Validation failed','error'); return }
    if (!validateEmail(email.value)){ setFieldError(email,'Invalid'); showToast('Validation failed','error'); return }
    const res = await apiFetch(`/users/${myId}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:username.value,email:email.value})})
    if (res.status==='ok') { showToast('Saved','success'); localStorage.setItem('username', res.data.username); updateNav() } else showToast('Save failed','error')
  })
}

function setupModeratorPage(){
  const tgt = document.getElementById('moderator-report-list')
  if (!requireAuth(false)){ if (tgt) tgt.innerHTML = '<div class="text-muted">Please login</div>'; return }
  if (!hasRole(['moderator'])){ if (tgt) tgt.innerHTML = '<div class="text-danger">Insufficient permissions</div>'; return }
  // reuse admin report loader
  loadAdminReports()
  // copy reports into moderator container
  const src = document.getElementById('admin-report-list')
  if (!src || !tgt) return
  tgt.innerHTML = ''
  // load and render
  apiFetch('/reports').then(r=>{ if (r.status==='ok'){ r.data.forEach(rep=>{
    const el = document.createElement('div'); el.className='p-2 border mb-2'
    el.innerHTML = `<div><strong>Report ${rep.id}:</strong> <strong>${rep.ad_title || rep.ad_id}</strong> — reason: ${rep.reason || ''} — reported by ${rep.reporter_username || rep.reporter_id}</div><div class="mt-2">status: <select class="form-select form-select-sm report-status" data-id="${rep.id}"><option value="new" ${rep.status==='new'?'selected':''}}>new</option><option value="reviewing" ${rep.status==='reviewing'?'selected':''}}>reviewing</option><option value="resolved" ${rep.status==='resolved'?'selected':''}}>resolved</option></select> <label class="ms-2"><input type="checkbox" class="block-ad"> block ad on resolve</label> <button class="btn btn-sm btn-primary ms-2 save-report">Save</button></div>`
    tgt.appendChild(el)
  })
    // wire handlers
    tgt.querySelectorAll('.save-report').forEach(btn=> btn.addEventListener('click', async (e)=>{
      const container = e.target.closest('div'); const id = container.querySelector('.report-status').dataset.id; const status = container.querySelector('.report-status').value; const block = container.querySelector('.block-ad').checked
      if (block && !confirm('You are about to block the ad if resolved. Continue?')) return
      const res = await apiFetch(`/reports/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status, block_ad: block})})
      if (res.status==='ok'){ showToast('Saved','success'); if (status==='resolved') container.closest('.p-2').remove(); else setupModeratorPage() } else showToast(res.error?.message || 'Save failed','error')
    }))
  } else tgt.innerHTML = '<div class="text-danger">Failed to load</div>' })
}

async function openConversation(id){
  const pane = document.getElementById('conv-pane'); pane.classList.remove('d-none')
  const header = document.getElementById('conv-header'); header.innerText = 'Conversation ' + id
  const msgs = await apiFetch(`/conversations/${id}/messages`)
  const box = document.getElementById('messages'); box.innerHTML = ''
  msgs.data.forEach(m=>{ const p = document.createElement('div'); p.innerText = `${m.author_username || m.author_id}: ${m.text}`; box.appendChild(p) })
  const form = document.getElementById('msg-form')
  form.onsubmit = async (e)=>{ e.preventDefault(); const text = document.getElementById('msg-text').value; await apiFetch(`/conversations/${id}/messages`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text})}); openConversation(id) }
}

async function loadReports(){
  const list = document.getElementById('report-list')
  const token = localStorage.getItem('accessToken')
  if (!token){ if (list) list.innerHTML = '<div class="text-muted">Please login to view reports</div>'; return }
  const role = localStorage.getItem('role')
  if (!role || (role !== 'admin' && role !== 'moderator')){ if (list) list.innerHTML = '<div class="text-danger">Insufficient permissions</div>'; return }
  const r = await apiFetch('/reports')
  if (r.status==='ok'){
    list.innerHTML = ''
    r.data.forEach(rep=>{ const el = document.createElement('div'); el.className='p-2 border mb-2'; el.innerHTML = `Ad ${rep.ad_id} reported by ${rep.reporter_id} — status: ${rep.status}`; list.appendChild(el) })
  } else if (r.error && /missing\s+authorization/i.test(r.error.message || '')){
    if (list) list.innerHTML = '<div class="text-muted">Please login to view reports</div>'
  }
}

async function loadCategories(){
  const r = await apiFetch('/categories')
  if (r.status==='ok'){
    const catSelect = document.getElementById('category_id')
    const filter = document.getElementById('category-filter')
    if (catSelect) {
      // clear existing
      catSelect.innerHTML = '<option value="">Select category</option>'
    }
    if (filter) {
      filter.innerHTML = '<option value="">All categories</option>'
    }
    r.data.forEach(c=>{
      if (catSelect) {
        const o = document.createElement('option'); o.value = c.id; o.innerText = c.name; catSelect.appendChild(o)
      }
      if (filter) {
        const o = document.createElement('option'); o.value = c.id; o.innerText = c.name; filter.appendChild(o)
      }
    })
    // reload ads when filter changes
    document.getElementById('category-filter')?.addEventListener('change', ()=> loadAds())
    document.getElementById('search-input')?.addEventListener('input', ()=> loadAds())
  }
}

// --- Admin helpers ---
function setupAdminPage(){
  const content = document.getElementById('admin-content')
  if (!requireAuth(false)){ if (content) content.innerHTML = '<div class="text-muted">Please login</div>'; return }
  if (!hasRole(['admin'])){ if (content) content.innerHTML = '<div class="text-danger">Insufficient permissions</div>'; return }
  document.querySelectorAll('#admin-tabs a').forEach(a=>{
    a.addEventListener('click', (e)=>{
      e.preventDefault(); const tab = a.dataset.tab
      document.querySelectorAll('#admin-content > div').forEach(d=> d.classList.add('d-none'))
      document.getElementById(tab).classList.remove('d-none')
      document.querySelectorAll('#admin-tabs a').forEach(x=> x.classList.remove('active'))
      a.classList.add('active')
    })
  })
  loadAdminUsers()
  loadAdminCategories()
  loadAdminReports()
  document.getElementById('create-category-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault(); const nameEl = document.getElementById('new-category-name'); const name = nameEl.value
    clearFieldError(nameEl)
    if (!name){ setFieldError(nameEl,'Name required'); showToast('Validation failed','error'); return }
    const r = await apiFetch('/categories', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name})})
    if (r.status === 'ok'){ showToast('Category created','success'); loadAdminCategories(); loadCategories(); document.getElementById('new-category-name').value = '' }
    else showToast('Create failed','error')
  })
}

async function loadAdminUsers(){
  const r = await apiFetch('/users')
  const list = document.getElementById('users-list')
  if (r.status !== 'ok'){ list.innerHTML = '<div class="text-danger">Failed to load users</div>'; return }
  list.innerHTML = '<table class="table"><thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>' + r.data.map(u=> `<tr data-id="${u.id}"><td><input class="form-control form-control-sm username" value="${u.username}"></td><td><input class="form-control form-control-sm email" value="${u.email}"></td><td><select class="form-select form-select-sm role"><option value="user">user</option><option value="moderator">moderator</option><option value="admin">admin</option></select></td><td><button class="btn btn-sm btn-primary save-user">Save</button> <button class="btn btn-sm btn-danger delete-user">Delete</button></td></tr>`).join('') + '</tbody></table>'
  r.data.forEach(u => { const row = list.querySelector(`tr[data-id="${u.id}"]`); if (row) row.querySelector('.role').value = u.role || 'user' })
  list.querySelectorAll('.save-user').forEach(btn=> btn.addEventListener('click', async (e)=>{
    const row = e.target.closest('tr'); const id = row.dataset.id; const usernameEl=row.querySelector('.username'); const emailEl=row.querySelector('.email'); const username=usernameEl.value; const email=emailEl.value; const role = row.querySelector('.role').value
    // validation
    clearFieldError(usernameEl); clearFieldError(emailEl)
    if (!username) { setFieldError(usernameEl, 'Username required'); showToast('Validation failed','error'); return }
    if (!validateEmail(email)) { setFieldError(emailEl, 'Invalid email'); showToast('Validation failed','error'); return }
    btn.disabled = true
    const res = await apiFetch(`/users/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,email,role})})
    btn.disabled = false
    if (res.status==='ok') showToast('Saved','success')
    else showToast(res.error?.message || 'Save failed','error')
  }))
  list.querySelectorAll('.delete-user').forEach(btn=> btn.addEventListener('click', async (e)=>{
    if (!confirm('Delete user?')) return; const id = e.target.closest('tr').dataset.id
    const res = await apiFetch(`/users/${id}`, {method:'DELETE'})
    if (res.status==='ok'){ e.target.closest('tr').remove(); showToast('Deleted','success') } else showToast(res.error?.message || 'Delete failed','error')
  }))
}

async function loadAdminCategories(){
  const r = await apiFetch('/categories')
  const list = document.getElementById('categories-list')
  if (r.status !== 'ok'){ list.innerHTML = '<div class="text-danger">Failed to load categories</div>'; return }
  list.innerHTML = '<table class="table"><thead><tr><th>Name</th><th>Parent</th><th>Actions</th></tr></thead><tbody>' + r.data.map(c=> `<tr data-id="${c.id}"><td><input class="form-control form-control-sm cname" value="${c.name}"></td><td><input class="form-control form-control-sm cparent" value="${c.parent_id || ''}"></td><td><button class="btn btn-sm btn-primary save-cat">Save</button> <button class="btn btn-sm btn-danger delete-cat">Delete</button></td></tr>`).join('') + '</tbody></table>'
  list.querySelectorAll('.save-cat').forEach(btn=> btn.addEventListener('click', async (e)=>{
    const row = e.target.closest('tr'); const id = row.dataset.id; const nameEl = row.querySelector('.cname'); const name = nameEl.value; const parent_id = row.querySelector('.cparent').value || null
    clearFieldError(nameEl);
    if (!name){ setFieldError(nameEl,'Name required'); showToast('Validation failed','error'); return }
    const res = await apiFetch(`/categories/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,parent_id})})
    if (res.status==='ok'){ showToast('Saved','success'); loadCategories() } else showToast(res.error?.message || 'Save failed','error')
  }))
  list.querySelectorAll('.delete-cat').forEach(btn=> btn.addEventListener('click', async (e)=>{
    if (!confirm('Delete category?')) return; const id = e.target.closest('tr').dataset.id
    const res = await apiFetch(`/categories/${id}`, {method:'DELETE'})
    if (res.status==='ok'){ e.target.closest('tr').remove(); loadCategories(); showToast('Deleted','success') } else showToast(res.error?.message || 'Delete failed','error')
  }))
}

async function loadAdminReports(){
  const list = document.getElementById('admin-report-list')
  const token = localStorage.getItem('accessToken')
  if (!token){ if (list) list.innerHTML = '<div class="text-muted">Please login to view reports</div>'; return }
  const role = localStorage.getItem('role')
  if (!role || (role !== 'admin' && role !== 'moderator')){ if (list) list.innerHTML = '<div class="text-danger">Insufficient permissions</div>'; return }
  const r = await apiFetch('/reports')
  if (r.status !== 'ok'){ list.innerHTML = '<div class="text-danger">Failed to load reports</div>'; return }
  list.innerHTML = ''
  r.data.forEach(rep=>{
    const el = document.createElement('div'); el.className='p-2 border mb-2'
    el.innerHTML = `<div><strong>Report ${rep.id}:</strong> <strong>${rep.ad_title || rep.ad_id}</strong> — reason: ${rep.reason || ''} — reported by ${rep.reporter_username || rep.reporter_id}</div><div class="mt-2">status: <select class="form-select form-select-sm report-status" data-id="${rep.id}"><option value="new" ${rep.status==='new'?'selected':''}}>new</option><option value="reviewing" ${rep.status==='reviewing'?'selected':''}}>reviewing</option><option value="resolved" ${rep.status==='resolved'?'selected':''}}>resolved</option></select> <label class="ms-2"><input type="checkbox" class="block-ad"> block ad on resolve</label> <button class="btn btn-sm btn-primary ms-2 save-report">Save</button></div>`
    list.appendChild(el)
  })
  list.querySelectorAll('.save-report').forEach(btn=> btn.addEventListener('click', async (e)=>{
    const container = e.target.closest('div'); const id = container.querySelector('.report-status').dataset.id; const status = container.querySelector('.report-status').value; const block = container.querySelector('.block-ad').checked
    if (block && !confirm('You are about to block the ad if resolved. Continue?')) return
    const res = await apiFetch(`/reports/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status, block_ad: block})})
    if (res.status==='ok'){ showToast('Saved','success'); if (status==='resolved') container.closest('.p-2').remove(); else loadAdminReports() } else showToast(res.error?.message || 'Save failed','error')
  }))
}
