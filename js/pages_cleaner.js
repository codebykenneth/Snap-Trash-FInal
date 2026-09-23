// ============================================================
// SNAP TRASH — Cleaner pages
// ============================================================
import { el, qs, qsa, toast, formatDate, escapeHtml, placeholderPhoto, fileToResizedDataUrl, confirmDialog } from './utils.js';
import { navigate } from './router.js';
import {
  getCurrentUser, getReports, getReportById, labelForCategory,
  acceptReport, setOnTheWay, startCleaning, completeCleanup,
  distanceKm, updateUser, STATUS_LABEL,
} from './data.js';
import { reportCardHtml, emptyState, categoryEmoji } from './components.js';
import { createMap, addStatusMarker, addRadiusCircle, getCurrentPosition } from './maps.js';
import { PH_REGIONS, citiesForProvince } from './ph-locations.js';

function myNearbyReports(user) {
  // Reports not yet claimed, inside this cleaner's service radius / area
  return getReports().filter(r => {
    if (r.cleanerId) return false;
    if (!['waiting', 'notified'].includes(r.status)) return false;
    const dist = distanceKm(user.lat, user.lng, r.lat, r.lng);
    const sameArea = user.serviceAreaLabel && r.locationName?.toLowerCase().includes(user.serviceAreaLabel.toLowerCase().replace('barangay ', ''));
    return sameArea || (dist !== null && dist <= (user.serviceRadiusKm || 5));
  });
}

// ============================================================
// DASHBOARD
// ============================================================
export function mountCleanerDashboard(container) {
  const user = getCurrentUser();
  const nearby = myNearbyReports(user);
  const active = getReports().filter(r => r.cleanerId === user.id && !['completed', 'rejected'].includes(r.status));
  const completed = getReports().filter(r => r.cleanerId === user.id && r.status === 'completed');

  container.appendChild(el(`
    <div>
      <h2>Hello, ${escapeHtml(user.name.split(' ')[0])}!</h2>
      ${user.verificationStatus !== 'verified' ? `
        <div class="pill-note" style="margin-bottom:16px; border-color:var(--waiting); background:rgba(240,178,50,.14); color:var(--waiting);">
          Your account is <strong>${user.verificationStatus === 'suspended' ? 'suspended' : 'pending verification'}</strong>.
          You won't receive live assignments until an admin verifies your account.
        </div>` : ''}
      <div class="stat-grid">
        <button class="stat-card stat-card-clickable" id="stat-nearby" type="button"><div class="num">${nearby.length}</div><div class="lbl">New Nearby Reports</div></button>
        <button class="stat-card stat-card-clickable" id="stat-active" type="button"><div class="num">${active.length}</div><div class="lbl">Active Assignments</div></button>
        <button class="stat-card stat-card-clickable" id="stat-completed" type="button"><div class="num">${completed.length}</div><div class="lbl">Completed</div></button>
      </div>

      <div class="section-head">
        <h3 style="margin:0;">New Nearby Reports</h3>
        <a href="#/cleaner/nearby">See all</a>
      </div>
      <div id="nearby-preview"></div>
    </div>
  `));

  const preview = qs('#nearby-preview');
  preview.innerHTML = nearby.length
    ? nearby.slice(0, 3).map(r => reportCardHtml(r, {
        fromLat: user.lat, fromLng: user.lng,
        actionsHtml: `<button class="btn btn-sm btn-primary" data-view="${r.id}">View Report</button>`,
      })).join('')
    : emptyState('✅', 'No new reports right now', 'New reports in your service area will appear here.');
  qsa('[data-view]', preview).forEach(btn => btn.onclick = () => navigate(`#/cleaner/assignment/${btn.dataset.view}`));

  qs('#stat-nearby').onclick = () => navigate('#/cleaner/nearby');
  qs('#stat-active').onclick = () => { pendingAssignmentsTab = 'active'; navigate('#/cleaner/assignments'); };
  qs('#stat-completed').onclick = () => { pendingAssignmentsTab = 'completed'; navigate('#/cleaner/assignments'); };
}

// Remembers which tab to open when navigating to My Assignments from a dashboard stat card.
let pendingAssignmentsTab = null;

// ============================================================
// NEARBY REPORTS (full list)
// ============================================================
export function mountNearbyReports(container) {
  const user = getCurrentUser();
  container.appendChild(el(`<div><h2>Nearby Reports</h2><p>Only reports inside your service area are shown here.</p><div id="nearby-list"></div></div>`));
  const nearby = myNearbyReports(user).sort((a, b) => {
    const da = distanceKm(user.lat, user.lng, a.lat, a.lng) ?? 999;
    const db = distanceKm(user.lat, user.lng, b.lat, b.lng) ?? 999;
    return da - db;
  });
  const list = qs('#nearby-list');
  list.innerHTML = nearby.length ? nearby.map(r => reportCardHtml(r, {
    fromLat: user.lat, fromLng: user.lng,
    actionsHtml: `<button class="btn btn-sm btn-primary" data-view="${r.id}">View Report</button>`,
  })).join('') : emptyState('✅', 'No nearby reports', 'You are all caught up.');
  qsa('[data-view]', list).forEach(btn => btn.onclick = () => navigate(`#/cleaner/assignment/${btn.dataset.view}`));
}

// ============================================================
// MY ASSIGNMENTS (accepted / in progress / completed by this cleaner)
// ============================================================
export function mountMyAssignments(container) {
  const user = getCurrentUser();
  let filter = pendingAssignmentsTab || 'active';
  pendingAssignmentsTab = null;
  container.appendChild(el(`
    <div>
      <h2>My Assignments</h2>
      <div class="tabs" id="assign-tabs">
        <button class="${filter === 'active' ? 'active' : ''}" data-f="active">Active</button>
        <button class="${filter === 'completed' ? 'active' : ''}" data-f="completed">Completed</button>
      </div>
      <div id="assign-list"></div>
    </div>
  `));
  function render() {
    const all = getReports().filter(r => r.cleanerId === user.id);
    const filtered = filter === 'active' ? all.filter(r => r.status !== 'completed') : all.filter(r => r.status === 'completed');
    const list = qs('#assign-list');
    list.innerHTML = filtered.length ? filtered.map(r => reportCardHtml(r, {
      fromLat: user.lat, fromLng: user.lng,
      actionsHtml: `<button class="btn btn-sm btn-outline" data-view="${r.id}">Open</button>`,
    })).join('') : emptyState('📋', 'Nothing here', filter === 'active' ? 'Accepted reports will show up here.' : 'Completed cleanups will show up here.');
    qsa('[data-view]', list).forEach(btn => btn.onclick = () => navigate(`#/cleaner/assignment/${btn.dataset.view}`));
  }
  qsa('#assign-tabs button').forEach(btn => btn.onclick = () => {
    filter = btn.dataset.f;
    qsa('#assign-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
  render();
}

// ============================================================
// ASSIGNMENT / REPORT DETAILS FOR CLEANER — accept, update, complete
// ============================================================
export function mountAssignmentDetails(container, { id }) {
  const user = getCurrentUser();
  const report = getReportById(id);
  if (!report) { container.appendChild(el(emptyState('🔍', 'Report not found', ''))); return; }

  function render() {
    container.innerHTML = '';
    const isMine = report.cleanerId === user.id;
    const isOpen = !report.cleanerId && ['waiting', 'notified'].includes(report.status);
    const dist = distanceKm(user.lat, user.lng, report.lat, report.lng);

    container.appendChild(el(`
      <div class="grid-2">
        <div class="card">
          <div class="photo-gallery" style="margin-bottom:14px;">
            ${(report.images && report.images.length ? report.images : [report.imageUrl || placeholderPhoto(labelForCategory(report.category))])
              .map(url => `<div class="photo-thumb-wrap"><img src="${url}"/></div>`).join('')}
          </div>
          <h3>${categoryEmoji(report.category)} ${escapeHtml(labelForCategory(report.category))}</h3>
          <p class="small-muted">Report ID: ${report.id} · ${formatDate(report.createdAt)}${dist !== null ? ` · ${dist.toFixed(1)} km away` : ''}</p>
          <p>${escapeHtml(report.description || 'No description provided.')}</p>
          ${report.details?.amount ? `<p class="meta-line">Amount: ${escapeHtml(report.details.amount)}</p>` : ''}
          ${report.details?.blockingPath ? `<p class="meta-line">⚠️ Blocking a road/path</p>` : ''}
          <p class="meta-line">📍 ${escapeHtml(report.locationName)}</p>
          <div class="map-box" id="assign-map"></div>
        </div>
        <div class="card">
          <h3>Status</h3>
          <div style="margin-bottom:16px;">${statusPill(report.status)}</div>
          <div id="action-zone"></div>
        </div>
      </div>
    `));

    const map = createMap(qs('#assign-map'), { center: [report.lat, report.lng], zoom: 16 });
    addStatusMarker(map, { lat: report.lat, lng: report.lng, status: report.status });

    const zone = qs('#action-zone');
    if (isOpen) {
      zone.innerHTML = `
        <button class="btn btn-primary btn-block" id="accept-btn">Accept Cleanup</button>
        <button class="btn btn-secondary btn-block" id="decline-btn" style="margin-top:8px;">Decline</button>
      `;
      qs('#accept-btn').onclick = () => {
        if (user.verificationStatus !== 'verified') { toast('Your account must be verified before accepting cleanups.'); return; }
        acceptReport(report.id, user.id);
        toast('Cleanup accepted!');
        Object.assign(report, getReportById(report.id));
        render();
      };
      qs('#decline-btn').onclick = () => navigate('#/cleaner/nearby');
    } else if (isMine && report.status === 'accepted') {
      zone.innerHTML = `<button class="btn btn-primary btn-block" id="ontheway-btn">Mark: On the Way</button>`;
      qs('#ontheway-btn').onclick = () => { setOnTheWay(report.id); toast('Status updated: On the Way'); Object.assign(report, getReportById(report.id)); render(); };
    } else if (isMine && report.status === 'ontheway') {
      zone.innerHTML = `<button class="btn btn-primary btn-block" id="start-btn">Start Cleaning</button>`;
      qs('#start-btn').onclick = () => { startCleaning(report.id); toast('Status updated: Cleaning'); Object.assign(report, getReportById(report.id)); render(); };
    } else if (isMine && report.status === 'cleaning') {
      zone.innerHTML = `
        <p>Upload a completion photo, then mark this cleanup as done.</p>
        <label class="btn btn-secondary btn-block">📷 Upload Completion Photo<input type="file" accept="image/*" capture="environment" id="completion-photo" style="display:none;"></label>
        <div id="completion-preview" style="margin-top:12px;"></div>
        <button class="btn btn-primary btn-block" id="complete-btn" style="margin-top:12px;" disabled>Mark Cleanup as Completed</button>
      `;
      let completionUrl = '';
      qs('#completion-photo').addEventListener('change', async (e) => {
        const f = e.target.files[0]; if (!f) return;
        completionUrl = await fileToResizedDataUrl(f, 900, 0.72, 'completions');
        const beforeImg = (report.images && report.images[0]) || report.imageUrl;
        qs('#completion-preview').innerHTML = `<div class="before-after"><figure><img src="${beforeImg}"/><figcaption>Before</figcaption></figure><figure><img src="${completionUrl}"/><figcaption>After</figcaption></figure></div>`;
        qs('#complete-btn').disabled = false;
      });
      qs('#complete-btn').onclick = () => {
        completeCleanup(report.id, completionUrl);
        toast('Cleanup marked as completed. Thank you!');
        Object.assign(report, getReportById(report.id));
        render();
      };
    } else if (report.status === 'completed') {
      zone.innerHTML = `
        <div class="pill-note">🟢 Cleanup Completed — thank you for helping keep the community clean.</div>
        ${report.completionImageUrl ? `<div class="before-after" style="margin-top:14px;"><figure><img src="${(report.images && report.images[0]) || report.imageUrl}"/><figcaption>Before</figcaption></figure><figure><img src="${report.completionImageUrl}"/><figcaption>After</figcaption></figure></div>` : ''}
      `;
    } else {
      zone.innerHTML = `<div class="pill-note">This report has already been accepted by another cleaner.</div>`;
    }
  }

  render();
}
function statusPill(status) {
  return `<span class="badge ${status === 'notified' ? 'waiting' : status}">${STATUS_LABEL[status] || status}</span>`;
}

// ============================================================
// SERVICE AREA
// ============================================================
export function mountServiceArea(container) {
  const user = getCurrentUser();
  // Coverage isn't limited to a handful of hardcoded places — every region and
  // province in the Philippines is selectable, and city/municipality + barangay
  // are free text so ANY barangay nationwide can be entered.
  container.appendChild(el(`
    <div class="grid-2">
      <div class="card">
        <h3>My Service Area</h3>
        <p class="field-hint" style="margin-top:-6px;">Covers the whole Philippines — pick your region and province, then type your city/municipality and barangay.</p>
        <form id="area-form">
          <label for="area-region">Region</label>
          <select id="area-region">
            ${PH_REGIONS.map(r => `<option value="${escapeHtml(r.region)}" ${user.regionName === r.region ? 'selected' : ''}>${escapeHtml(r.region)}</option>`).join('')}
          </select>
          <label for="area-province">Province</label>
          <select id="area-province"></select>
          <label for="area-city">City / Municipality</label>
          <input type="text" id="area-city" list="city-options" value="${escapeHtml(user.cityName || '')}" placeholder="e.g. Tacloban City" />
          <datalist id="city-options"></datalist>
          <label for="area-barangay">Barangay</label>
          <input type="text" id="area-barangay" value="${escapeHtml(user.barangayName || '')}" placeholder="e.g. Barangay San Jose" />
          <label for="area-radius">Maximum response distance (km)</label>
          <input type="text" id="area-radius" value="${user.serviceRadiusKm || 5}" inputmode="numeric" />
          <p class="field-hint">Only reports inside this area or radius will appear in your Nearby Reports.</p>
          <button class="btn btn-secondary btn-block" id="set-center" type="button">📍 Set center to my current location</button>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:10px;">Save Service Area</button>
        </form>
      </div>
      <div class="card">
        <h3>Coverage preview</h3>
        <div class="map-box" id="area-map"></div>
      </div>
    </div>
  `));

  function fillProvinces(regionName, selected) {
    const region = PH_REGIONS.find(r => r.region === regionName) || PH_REGIONS[0];
    const provSelect = qs('#area-province');
    provSelect.innerHTML = region.provinces.map(p => `<option value="${escapeHtml(p)}" ${selected === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');
    fillCityOptions(regionName, provSelect.value);
  }
  function fillCityOptions(regionName, provinceName) {
    const cities = citiesForProvince(regionName, provinceName);
    qs('#city-options').innerHTML = cities ? cities.map(c => `<option value="${escapeHtml(c)}"></option>`).join('') : '';
  }
  fillProvinces(user.regionName || PH_REGIONS[0].region, user.provinceName);
  qs('#area-region').addEventListener('change', (e) => fillProvinces(e.target.value));
  qs('#area-province').addEventListener('change', (e) => fillCityOptions(qs('#area-region').value, e.target.value));

  let center = [user.lat || 14.65, user.lng || 121.05];
  const map = createMap(qs('#area-map'), { center, zoom: 13 });
  let marker = window.L.marker(center).addTo(map);
  let circle = addRadiusCircle(map, { lat: center[0], lng: center[1], radiusKm: user.serviceRadiusKm || 5 });

  function redraw() {
    marker.setLatLng(center);
    circle.setLatLng(center);
    circle.setRadius((parseFloat(qs('#area-radius').value) || 5) * 1000);
    map.setView(center, 13);
  }
  map.on('click', (e) => { center = [e.latlng.lat, e.latlng.lng]; redraw(); });
  qs('#area-radius').addEventListener('input', redraw);
  qs('#set-center').onclick = async () => {
    toast('Locating you…');
    const pos = await getCurrentPosition();
    if (!pos) { toast('Could not get your location.'); return; }
    center = [pos.lat, pos.lng];
    redraw();
  };

  qs('#area-form').onsubmit = (e) => {
    e.preventDefault();
    const region = qs('#area-region').value;
    const province = qs('#area-province').value;
    const city = qs('#area-city').value.trim();
    const barangay = qs('#area-barangay').value.trim();
    const label = [barangay, city, province].filter(Boolean).join(', ');
    updateUser(user.id, {
      regionName: region,
      provinceName: province,
      cityName: city,
      barangayName: barangay,
      serviceAreaLabel: label || province,
      serviceRadiusKm: parseFloat(qs('#area-radius').value) || 5,
      lat: center[0], lng: center[1],
    });
    toast('Service area saved.');
  };
}
