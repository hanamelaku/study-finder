const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? '').replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])
  );

function showView(id) {
  document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
  const el = document.getElementById('view-' + id);
  if (el) el.classList.remove('hidden');
}

function router() {
  const hash = location.hash.replace(/^#/, '') || 'home';
  const [page, arg] = hash.split('/');

  if (page === 'profile' && arg) {
    showView('profile');
    renderProfile(arg);
  } else if (page === 'edit' && arg) {
    showView('edit');
    renderEdit(arg);
  } else if (page === 'admin') {
    showView('admin');
  } else {
    showView('home');
    loadList();
  }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  wireHome();
  wireAdmin();
  router();
});

/* =========================================================
   HOME
   ========================================================= */
let homeWired = false;
function wireHome() {
  if (homeWired) return;
  homeWired = true;

  const form = $('#postForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const out = await res.json();
      if (out.error) return alert(out.error);

      $('#postResult').innerHTML = `
        <p>✅ Your profile is live!</p>
        <p>Public link:
          <a href="${out.profile_url}" target="_blank">${location.origin}${out.profile_url}</a>
        </p>
        <p>⚠️ Save this <b>edit link</b> — only you should have it:<br>
          <code>${location.origin}${out.edit_url}</code>
        </p>`;
      e.target.reset();
      loadList();
    });
  }

  const searchBtn = $('#searchBtn');
  if (searchBtn) searchBtn.addEventListener('click', loadList);
}

async function loadList() {
  const listEl = $('#list');
  if (!listEl) return;

  const p = new URLSearchParams();
  if ($('#fSubject').value) p.set('subject', $('#fSubject').value);
  if ($('#fCity').value) p.set('city', $('#fCity').value);
  if ($('#fRate').value) p.set('maxRate', $('#fRate').value);

  const list = await (await fetch('/api/profiles?' + p)).json();
  listEl.innerHTML = list.length
    ? list.map((x) => `
      <div class="card">
        <strong>${esc(x.full_name)}</strong>${x.age ? `, ${x.age}` : ''}
        <div>${esc(x.subjects)}</div>
        <div>${esc(x.grade_levels)}</div>
        <div>${esc(x.rate)}/hr · ${esc(x.city)}</div>
        <div class="muted">${esc(x.availability)}</div>
        <a href="#profile/${x.id}">View profile →</a>
      </div>`).join('')
    : '<p>No profiles yet.</p>';
}

/* =========================================================
   PROFILE VIEW
   ========================================================= */
async function renderProfile(id) {
  const box = $('#profileBox');
  box.innerHTML = 'Loading…';

  // 1. Check URL for access token
  let access = new URLSearchParams(location.search).get('access');
  
  // 2. If no token in URL, check the browser's saved unlocks
  if (!access) {
    const savedAccess = JSON.parse(localStorage.getItem('myUnlocks') || '{}');
    access = savedAccess[id];
  }

  // 3. Fetch profile (with token if we have one)
  const url = `/api/profiles/${id}` + (access ? `?access=${access}` : '');
  const p = await (await fetch(url)).json();

  if (p.error) {
    box.innerHTML = '<p>Profile not found.</p>';
    return;
  }

  const contact = p.unlocked
    ? `<div class="unlocked">
         <p>✅ Contact unlocked</p>
         <p>📞 <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a></p>
         ${p.email ? `<p>✉️ <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></p>` : ''}
       </div>`
    : `<div class="locked">
         <p>📞 Contact hidden — agent fee applies</p>
         <button id="payBtn">Unlock contact — pay 100 ETB</button>
       </div>`;

  box.innerHTML = `
    <h2>${esc(p.full_name)}${p.age ? `, ${p.age}` : ''}</h2>
    <p><b>Subjects:</b> ${esc(p.subjects)}</p>
    <p><b>Grades:</b> ${esc(p.grade_levels)}</p>
    <p><b>Rate:</b> ${esc(p.rate)}/hr</p>
    <p><b>City:</b> ${esc(p.city)}</p>
    <p><b>Availability:</b> ${esc(p.availability)}</p>
    <p><b>Experience:</b> ${esc(p.experience)} yrs</p>
    <p><b>About:</b> ${esc(p.bio)}</p>
    <hr/>
    ${contact}`;

  const payBtn = $('#payBtn');
  if (payBtn) {
    payBtn.addEventListener('click', () => showPaymentPopup(id));
  }
}

/* =========================================================
   MANUAL PAYMENT POPUP (CBE)
   ========================================================= */
async function showPaymentPopup(profileId) {
  // Get CBE details from server (public config endpoint)
  let cfg = { cbe_name: 'Agent', cbe_number: 'N/A', agent_fee: 100 };
  try {
    const r = await fetch('/api/config');
    if (r.ok) cfg = await r.json();
  } catch { /* fallback to defaults */ }

  // Step 1: Show where to pay
  const ok = confirm(
    `Pay ${cfg.agent_fee} ETB to unlock this contact.\n\n` +
    `Bank: Commercial Bank of Ethiopia (CBE)\n` +
    `Account Name: ${cfg.cbe_name}\n` +
    `Account Number: ${cfg.cbe_number}\n\n` +
    `After paying, click OK and enter your CBE transaction reference.`
  );
  if (!ok) return;

  // Step 2: Ask for transaction ref
  const txRef = prompt('Enter your CBE transaction reference (e.g. FT...):');
  if (!txRef || !txRef.trim()) return alert('Transaction reference is required.');

  // Step 3: Optional payer name
  const payerName = prompt('Your name on the CBE account (optional):') || '';

  // Step 4: Submit
  const res = await fetch(`/api/unlock/${profileId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transaction_ref: txRef.trim(),
      payer_name: payerName
    })
  });
  const out = await res.json();

  if (out.success) {
    alert('✅ Payment submitted! The agent will verify and unlock your contact shortly.');
    
    // SAVE THE RECEIPT TOKEN TO THE BROWSER
    // We map the profile ID to the payment reference
    let savedAccess = JSON.parse(localStorage.getItem('myUnlocks') || '{}');
    savedAccess[profileId] = out.payment_ref;
    localStorage.setItem('myUnlocks', JSON.stringify(savedAccess));
    
    // Optional: Reload the page to check the status immediately
    renderProfile(profileId); 
  } else {
    alert('Error: ' + (out.error || 'Unknown error'));
  }
}

/* =========================================================
   EDIT PROFILE
   ========================================================= */
async function renderEdit(token) {
  const box = $('#editBox');
  box.innerHTML = 'Loading…';

  const res = await fetch(`/api/profiles/by-token/${token}`);
  const p = await res.json();
  if (p.error) {
    box.innerHTML = '<p>Invalid or missing profile.</p>';
    return;
  }

  box.innerHTML = `
    <form id="editForm">
      <input name="full_name" value="${esc(p.full_name)}" placeholder="Full name *" required />
      <input name="age" type="number" value="${esc(p.age ?? '')}" placeholder="Age" />
      <input name="city" value="${esc(p.city ?? '')}" placeholder="City" />
      <input name="subjects" value="${esc(p.subjects ?? '')}" placeholder="Subjects" />
      <input name="grade_levels" value="${esc(p.grade_levels ?? '')}" placeholder="Grade levels" />
      <input name="experience" type="number" value="${esc(p.experience ?? '')}" placeholder="Years experience" />
      <input name="rate" type="number" value="${esc(p.rate ?? '')}" placeholder="Rate" />
      <input name="availability" value="${esc(p.availability ?? '')}" placeholder="Availability" />
      <input name="phone" value="${esc(p.phone ?? '')}" placeholder="Phone *" required />
      <input name="email" value="${esc(p.email ?? '')}" placeholder="Email" />
      <textarea name="bio" placeholder="About me" rows="3">${esc(p.bio ?? '')}</textarea>
      <button type="submit">Save changes</button>
    </form>
    <p><a href="#profile/${p.id}">View public profile →</a></p>
    <p><button id="deactivateBtn" style="background:#b91c1c">Deactivate profile</button></p>
    <div id="saveMsg"></div>`;

  $('#editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const r = await fetch(`/api/profiles/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const out = await r.json();
    $('#saveMsg').innerHTML = out.ok
      ? '<p>✅ Saved.</p>'
      : `<p style="color:red">Error: ${esc(out.error)}</p>`;
  });

  $('#deactivateBtn').addEventListener('click', async () => {
    if (!confirm('Deactivate this profile? It will disappear from browsing.')) return;
    await fetch(`/api/profiles/${token}`, { method: 'DELETE' });
    alert('Profile deactivated.');
    location.hash = '#home';
  });
}

/* =========================================================
   ADMIN DASHBOARD (with JWT Auth)
   ========================================================= */
let adminWired = false;
function wireAdmin() {
  if (adminWired) return;
  adminWired = true;

  const loginBtn = $('#adminBtn');
  if (!loginBtn) return;

  // 1. Handle Login
  loginBtn.addEventListener('click', async () => {
    const username = $('#adminUser').value;
    const password = $('#adminPass').value;
    
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const out = await res.json();
    if (out.error) return alert(out.error);

    // Save token to browser's local storage
    localStorage.setItem('adminToken', out.token);
    
    // Show dashboard
    loadAdminData();
  });

  // 2. Handle Logout
  $('#adminLogoutBtn').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    $('#adminLoginBox').classList.remove('hidden');
    $('#adminOut').classList.add('hidden');
    $('#adminUser').value = '';
    $('#adminPass').value = '';
  });

  // 3. Auto-login if token exists
  if (localStorage.getItem('adminToken')) {
    loadAdminData();
  }
}

// Fetch admin data using the token
// Fetch admin data using the token
async function loadAdminData() {
  const token = localStorage.getItem('adminToken');
  if (!token) return;

  const res = await fetch('/api/admin', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (res.status === 401) {
    localStorage.removeItem('adminToken');
    return alert('Session expired. Please login again.');
  }

  const out = await res.json();
  
  // Hide login, show dashboard
  $('#adminLoginBox').classList.add('hidden');
  $('#adminOut').classList.remove('hidden');

  // 1. Build Pending Payments Table
  let pendingHtml = '<h3>Pending Payments (Verify then Approve)</h3>';
  if (out.pending_unlocks && out.pending_unlocks.length > 0) {
    pendingHtml += `<table class="admin-table">
      <tr><th>Ref</th><th>Seeker</th><th>CBE Tx Ref</th><th>Payer Name</th><th>Action</th></tr>
      ${out.pending_unlocks.map(u => `
        <tr>
          <td>${esc(u.payment_ref)}</td>
          <td>${esc(u.seeker_name)}</td>
          <td><code>${esc(u.transaction_ref || 'N/A')}</code></td>
          <td>${esc(u.payer_name || 'N/A')}</td>
          <td>
            <button onclick="approvePayment('${esc(u.payment_ref)}')" class="btn-success">Approve</button>
            <button onclick="rejectPayment('${esc(u.payment_ref)}')" class="btn-danger">Reject</button>
          </td>
        </tr>
      `).join('')}
    </table>`;
  } else {
    pendingHtml += '<p class="muted">No pending payments right now.</p>';
  }

  // 2. Build History Table
  const historyHtml = `<h3>All Unlocks History</h3>
    <table class="admin-table">
      <tr><th>Ref</th><th>Profile ID</th><th>Amount</th><th>Status</th><th>Date</th></tr>
      ${out.unlocks.map((u) => `
        <tr>
          <td>${esc(u.payment_ref)}</td>
          <td>${esc(u.profile_id)}</td>
          <td>${esc(u.amount)} ETB</td>
          <td><span class="badge badge-${u.status}">${esc(u.status)}</span></td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
        </tr>`).join('') || '<tr><td colspan="5">No unlocks yet.</td></tr>'}
    </table>`;

  // 3. Put it all together
  $('#adminData').innerHTML = `
    <div class="stats-row">
      <div class="stat-card">
        <h4>Total Earned</h4>
        <p>${esc(out.total_earned)} ETB</p>
      </div>
      <div class="stat-card">
        <h4>Active Profiles</h4>
        <p>${esc(out.active_profiles)}</p>
      </div>
    </div>
    ${pendingHtml}
    <hr style="margin: 2rem 0; border: 0; border-top: 1px solid #ddd;"/>
    ${historyHtml}
  `;
}

/* Global handlers for Approve/Reject */
window.approvePayment = async (ref) => {
  const token = localStorage.getItem('adminToken');
  const res = await fetch('/api/unlock/admin/approve', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Send the token!
    },
    body: JSON.stringify({ payment_ref: ref })
  });
  const out = await res.json();
  alert(out.message || 'Done');
  loadAdminData(); // Refresh tables
};

window.rejectPayment = async (ref) => {
  const token = localStorage.getItem('adminToken');
  const res = await fetch('/api/unlock/admin/reject', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Send the token!
    },
    body: JSON.stringify({ payment_ref: ref })
  });
  const out = await res.json();
  alert(out.message || 'Done');
  loadAdminData(); // Refresh tables
};