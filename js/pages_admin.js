// ============================================================
// SNAP TRASH — Admin pages
// ============================================================
import { el, qs, qsa, toast, formatDate, escapeHtml, confirmDialog, statusBadge, openModal, closeModal } from './utils.js';
import { navigate } from './router.js';
import {
  getReports, saveReports, getUsers, saveUsers, getUserById, updateUser,
  getCleaners, labelForCategory, STATUS_LABEL, clearSession,
} from './data.js';
import { emptyState, categoryEmoji } from './components.js';
import { createMap, addStatusMarker } from './maps.js';

// ============================================================
// DASHBOARD
// ============================================================
export function mountAdminDashboard(container) {
  const reports = getReports();
  const cleaners = getCleaners();
  const stat = (n, l, target) => `<button class="stat-card stat-card-clickable" type="button" data-goto="${target}"><div class="num">${n}</div><div class="lbl">${l}</div></button>`;

  container.appendChild(el(`
    <div>
      <h2>Admin Dashboard</h2>
      <div class="stat-grid">
        ${stat(reports.length, 'Total Reports', '#/admin/reports')}
        ${stat(reports.filter(r => ['waiting', 'notified'].includes(r.status)).length, 'Waiting Reports', '#/admin/reports')}
        ${stat(reports.filter(r => ['accepted', 'ontheway', 'cleaning'].includes(r.status)).length, 'Active Cleanups', '#/admin/reports')}
        ${stat(reports.filter(r => r.status === 'completed').length, 'Completed Reports', '#/admin/reports')}
        ${stat(cleaners.length, 'Registered Cleaners', '#/admin/cleaners')}
        ${stat(cleaners.filter(c => c.verificationStatus === 'verified').length, 'Verified Cleaners', '#/admin/cleaners')}
      </div>

      <div class="section-head"><h3 style="margin:0;">Flagged reports needing review</h3></div>
      <div id="flagged-list"></div>

      <div class="section-head" style="margin-top:20px;"><h3 style="margin:0;">Pending cleaner verifications</h3></div>
      <div id="pending-list"></div>
    </div>
  `));

  qsa('[data-goto]').forEach(b => b.onclick = () => navigate(b.dataset.goto));

  const flagged = reports.filter(r => r.flags && r.flags.length);
  qs('#flagged-list').innerHTML = flagged.length ? flagged.map(r => `
    <div class="report-card">
      <div class="report-card-body">
        <h4>${r.id} — ${escapeHtml(labelForCategory(r.category))}</h4>
        <div class="meta-line">${r.flags.length} flag(s): ${r.flags.map(f => escapeHtml(f.reason)).join(', ')}</div>
      </div>
    </div>`).join('') : emptyState('🛡️', 'Nothing flagged', 'Flagged reports will appear here for review.');

  const pending = cleaners.filter(c => c.verificationStatus === 'pending');
  qs('#pending-list').innerHTML = pending.length ? pending.map(c => `
    <div class="report-card">
      <div class="report-card-body">
        <h4>${escapeHtml(c.name)}</h4>
        <div class="meta-line">${escapeHtml(c.organization || 'Independent')} · ${escapeHtml(c.serviceAreaLabel || 'No area set')}</div>
      </div>
    </div>`).join('') : emptyState('✅', 'No pending verifications', '');
}

// ============================================================
// REPORTS MANAGEMENT
// ============================================================
export function mountAdminReports(container) {
  container.appendChild(el(`
    <div>
      <h2>Reports</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Category</th><th>Location</th><th>Reporter</th><th>Cleaner</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody id="reports-tbody"></tbody>
        </table>
      </div>
    </div>
  `));
  function render() {
    const reports = getReports();
    qs('#reports-tbody').innerHTML = reports.map(r => {
      const reporter = getUserById(r.reporterId);
      const cleaner = r.cleanerId ? getUserById(r.cleanerId) : null;
      return `<tr>
        <td data-label="ID">${r.id}</td>
        <td data-label="Category">${categoryEmoji(r.category)} ${escapeHtml(labelForCategory(r.category))}</td>
        <td data-label="Location">${escapeHtml(r.locationName)}</td>
        <td data-label="Reporter">${escapeHtml(reporter?.name || '—')}</td>
        <td data-label="Cleaner">${escapeHtml(cleaner?.name || '—')}</td>
        <td data-label="Status">${statusBadge(r.status)}</td>
        <td data-label="Date">${formatDate(r.createdAt)}</td>
        <td class="row-actions" data-label="Actions">
          <button class="btn btn-sm btn-outline" data-view="${r.id}">View</button>
          <button class="btn btn-sm btn-secondary" data-reassign="${r.id}">Reassign</button>
          <button class="btn btn-sm btn-danger" data-reject="${r.id}">Reject</button>
          <button class="btn btn-sm btn-danger" data-delete="${r.id}">Delete</button>
        </td>
      </tr>`;
    }).join('');

    qsa('[data-view]').forEach(b => b.onclick = () => showReportModal(b.dataset.view));
    qsa('[data-reassign]').forEach(b => b.onclick = () => reassignModal(b.dataset.reassign, render));
    qsa('[data-reject]').forEach(b => b.onclick = async () => {
      if (!await confirmDialog('Reject this report?', { danger: true, okLabel: 'Reject' })) return;
      const list = getReports().map(r => r.id === b.dataset.reject ? { ...r, status: 'rejected', timeline: [...r.timeline, { status: 'rejected', at: new Date().toISOString() }] } : r);
      saveReports(list);
      toast('Report rejected.');
      render();
    });
    qsa('[data-delete]').forEach(b => b.onclick = async () => {
      if (!await confirmDialog('Permanently delete this report? This cannot be undone.', { danger: true, okLabel: 'Delete' })) return;
      saveReports(getReports().filter(r => r.id !== b.dataset.delete));
      toast('Report deleted.');
      render();
    });
  }
  render();
}

function showReportModal(id) {
  const r = getReports().find(x => x.id === id);
  if (!r) return;
  const beforeImages = (r.images && r.images.length) ? r.images : (r.imageUrl ? [r.imageUrl] : []);
  openModal(`
    <h3>${r.id}</h3>
    <p class="small-muted" style="margin-top:-6px;">Before</p>
    <div class="photo-gallery" style="margin-bottom:12px;">
      ${beforeImages.length ? beforeImages.map(url => `<div class="photo-thumb-wrap"><img src="${url}"/></div>`).join('') : '<p class="small-muted">No photo submitted.</p>'}
    </div>
    ${r.completionImageUrl ? `
      <p class="small-muted">After (job completed)</p>
      <div class="photo-gallery" style="margin-bottom:12px;">
        <div class="photo-thumb-wrap"><img src="${r.completionImageUrl}"/></div>
      </div>
    ` : `<p class="small-muted" style="margin-bottom:12px;">No completion ("after") photo uploaded yet — this appears once the cleaner marks the job as done.</p>`}
    <p><strong>${escapeHtml(labelForCategory(r.category))}</strong> · ${statusBadge(r.status)}</p>
    <p>${escapeHtml(r.description || 'No description.')}</p>
    <p class="small-muted">📍 ${escapeHtml(r.locationName)} · ${formatDate(r.createdAt)}</p>
    <button class="btn btn-secondary btn-block" id="close-modal">Close</button>
  `, (root) => { qs('#close-modal', root).onclick = closeModal; });
}

function reassignModal(reportId, onDone) {
  const cleaners = getCleaners().filter(c => c.verificationStatus === 'verified');
  openModal(`
    <h3>Reassign report</h3>
    <label for="reassign-select">Choose a verified cleaner</label>
    <select id="reassign-select">
      ${cleaners.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.serviceAreaLabel || 'no area')})</option>`).join('') || '<option disabled>No verified cleaners available</option>'}
    </select>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="btn btn-secondary" id="ra-cancel">Cancel</button>
      <button class="btn btn-primary" id="ra-confirm">Assign</button>
    </div>
  `, (root) => {
    qs('#ra-cancel', root).onclick = closeModal;
    qs('#ra-confirm', root).onclick = () => {
      const cleanerId = qs('#reassign-select', root).value;
      if (!cleanerId) { toast('No cleaner selected.'); return; }
      const list = getReports().map(r => r.id === reportId ? { ...r, cleanerId, status: 'accepted', timeline: [...r.timeline, { status: 'accepted', at: new Date().toISOString() }] } : r);
      saveReports(list);
      toast('Report reassigned.');
      closeModal();
      onDone();
    };
  });
}

// ============================================================
// CLEANERS / VERIFICATION
// ============================================================
export function mountAdminCleaners(container) {
  container.appendChild(el(`<div><h2>Cleaners</h2><div class="table-wrap"><table>
    <thead><tr><th>Name</th><th>Organization</th><th>Service Area</th><th>Status</th><th>Active</th><th>Actions</th></tr></thead>
    <tbody id="cleaners-tbody"></tbody>
  </table></div></div>`));

  function render() {
    const cleaners = getCleaners();
    qs('#cleaners-tbody').innerHTML = cleaners.map(c => `
      <tr>
        <td data-label="Name">${escapeHtml(c.name)}</td>
        <td data-label="Organization">${escapeHtml(c.organization || '—')}</td>
        <td data-label="Service Area">${escapeHtml(c.serviceAreaLabel || '—')}</td>
        <td data-label="Status">${verifBadge(c.verificationStatus)}</td>
        <td data-label="Active">${c.isActive ? 'Yes' : 'No'}</td>
        <td class="row-actions" data-label="Actions">
          <button class="btn btn-sm btn-primary" data-approve="${c.id}" ${c.verificationStatus === 'verified' ? 'disabled' : ''}>Approve</button>
          <button class="btn btn-sm btn-secondary" data-reject="${c.id}">Reject</button>
          <button class="btn btn-sm btn-danger" data-suspend="${c.id}">Suspend</button>
        </td>
      </tr>`).join('');
    qsa('[data-approve]').forEach(b => b.onclick = () => { updateUser(b.dataset.approve, { verificationStatus: 'verified' }); toast('Cleaner approved.'); render(); });
    qsa('[data-reject]').forEach(b => b.onclick = () => { updateUser(b.dataset.reject, { verificationStatus: 'pending', isActive: false }); toast('Cleaner rejected.'); render(); });
    qsa('[data-suspend]').forEach(b => b.onclick = () => { updateUser(b.dataset.suspend, { verificationStatus: 'suspended', isActive: false, status: 'suspended' }); toast('Cleaner suspended.'); render(); });
  }
  render();
}
function verifBadge(status) {
  const map = { verified: ['✅ Verified', 'completed'], pending: ['⏳ Pending', 'waiting'], suspended: ['⛔ Suspended', 'rejected'] };
  const [label, cls] = map[status] || map.pending;
  return `<span class="badge ${cls}">${label}</span>`;
}

// ============================================================
// USERS
// ============================================================
export function mountAdminUsers(container) {
  container.appendChild(el(`<div><h2>Users</h2><div class="table-wrap"><table>
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
    <tbody id="users-tbody"></tbody>
  </table></div></div>`));
  function render() {
    const users = getUsers();
    qs('#users-tbody').innerHTML = users.map(u => `
      <tr>
        <td data-label="Name">${escapeHtml(u.name)}</td>
        <td data-label="Email">${escapeHtml(u.email)}</td>
        <td data-label="Role" style="text-transform:capitalize;">${u.role}</td>
        <td data-label="Status">${u.status === 'suspended' ? '<span class="badge rejected">Suspended</span>' : '<span class="badge completed">Active</span>'}</td>
        <td data-label="Joined">${formatDate(u.createdAt)}</td>
        <td class="row-actions" data-label="Actions">
          ${u.role !== 'admin' ? (u.status === 'suspended'
            ? `<button class="btn btn-sm btn-secondary" data-reactivate="${u.id}">Reactivate</button>`
            : `<button class="btn btn-sm btn-danger" data-suspend="${u.id}">Suspend</button>`) : ''}
        </td>
      </tr>`).join('');
    qsa('[data-suspend]').forEach(b => b.onclick = () => { updateUser(b.dataset.suspend, { status: 'suspended' }); toast('User suspended.'); render(); });
    qsa('[data-reactivate]').forEach(b => b.onclick = () => { updateUser(b.dataset.reactivate, { status: 'active' }); toast('User reactivated.'); render(); });
  }
  render();
}

// ============================================================
// SERVICE AREAS (overview map of all cleaner coverage)
// ============================================================
export function mountAdminServiceAreas(container) {
  container.appendChild(el(`<div><h2>Service Areas</h2><p>Coverage of all registered cleaners.</p><div class="map-box" style="height:420px;" id="areas-map"></div></div>`));
  const cleaners = getCleaners();
  const center = cleaners.length ? [cleaners[0].lat, cleaners[0].lng] : [14.65, 121.05];
  const map = createMap(qs('#areas-map'), { center, zoom: 12 });
  cleaners.forEach(c => {
    window.L.circle([c.lat, c.lng], { radius: (c.serviceRadiusKm || 5) * 1000, color: c.verificationStatus === 'verified' ? '#23a55a' : '#f0b232', fillOpacity: 0.1 })
      .addTo(map)
      .bindPopup(`<strong>${escapeHtml(c.name)}</strong><br/>${escapeHtml(c.serviceAreaLabel || '')}<br/>${c.verificationStatus}`);
  });
}

// ============================================================
// ANALYTICS
// ============================================================
export function mountAdminAnalytics(container) {
  const reports = getReports();
  const byCategory = {};
  reports.forEach(r => { byCategory[r.category] = (byCategory[r.category] || 0) + 1; });
  const byStatus = {};
  reports.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
  const completedCount = reports.filter(r => r.status === 'completed').length;
  const completionRate = reports.length ? Math.round((completedCount / reports.length) * 100) : 0;

  container.appendChild(el(`
    <div>
      <h2>Analytics</h2>
      <div class="stat-grid">
        <div class="stat-card"><div class="num">${reports.length}</div><div class="lbl">Total Reports</div></div>
        <div class="stat-card"><div class="num">${completionRate}%</div><div class="lbl">Completion Rate</div></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <h3>Reports by category</h3>
          ${barList(byCategory, labelForCategory)}
        </div>
        <div class="card">
          <h3>Reports by status</h3>
          ${barList(byStatus, s => STATUS_LABEL[s] || s)}
        </div>
      </div>
    </div>
  `));
}
function barList(counts, labelFn) {
  const max = Math.max(1, ...Object.values(counts));
  return Object.entries(counts).map(([k, v]) => `
    <div style="margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;"><span>${escapeHtml(labelFn(k))}</span><strong>${v}</strong></div>
      <div style="background:var(--mint-100); border-radius:6px; height:8px;"><div style="width:${(v / max) * 100}%; background:var(--forest-600); height:8px; border-radius:6px;"></div></div>
    </div>`).join('') || '<p class="small-muted">No data yet.</p>';
}

// ============================================================
// SETTINGS
// ============================================================
export function mountAdminSettings(container) {
  container.appendChild(el(`
    <div>
      <h2>Settings</h2>
      <div class="card">
        <h3>Platform</h3>
        <p>Snap Trash is running in <strong>demo mode</strong> — all data is stored locally in this browser via LocalStorage. Connect a real backend to enable persistent, multi-device data (see project README).</p>
        <div class="divider"></div>
        <h3>Danger zone</h3>
        <p>Reset all demo data back to its original seeded state.</p>
        <button class="btn btn-danger" id="reset-demo">Reset demo data</button>
        <div class="divider"></div>
        <h3>Account</h3>
        <button class="btn btn-danger" id="logout-btn">Log out</button>
      </div>
    </div>
  `));
  qs('#reset-demo').onclick = async () => {
    if (!await confirmDialog('This will erase all local demo data and reload the app. Continue?', { danger: true, okLabel: 'Reset' })) return;
    localStorage.clear();
    location.reload();
  };
  qs('#logout-btn').onclick = async () => {
    await clearSession();
    navigate('#/');
    toast('Logged out.');
    window.dispatchEvent(new Event('st:auth-changed'));
  };
}
