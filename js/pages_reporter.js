// ============================================================
// SNAP TRASH — Reporter pages
// ============================================================
import { el, qs, qsa, toast, fileToResizedDataUrl, fileToAvatarDataUrl, generateAvatar, statusBadge, formatDate, escapeHtml, placeholderPhoto, openModal, closeModal } from './utils.js';
import { navigate } from './router.js';
import {
  CATEGORIES, STATUS_FLOW, STATUS_LABEL, labelForCategory,
  createReport, getCurrentUser, getReportsByReporter, getReportById,
  getNotificationsForUser, markNotificationRead, markAllRead, unreadCount,
  getUserById, updateUser, findNearbyCleaners, getReports, flagReport, clearSession,
} from './data.js';
import { reportCardHtml, notifItemHtml, emptyState, categoryEmoji } from './components.js';
import { createMap, addStatusMarker, getCurrentPosition, statusColor } from './maps.js';

// A tiny local gazetteer used to simulate "search location" without a live geocoding API.
const KNOWN_PLACES = [
  { name: 'Barangay San Jose', lat: 14.6535, lng: 121.0512 },
  { name: 'Barangay Mabini', lat: 14.6700, lng: 121.0700 },
  { name: 'Barangay Poblacion', lat: 14.6400, lng: 121.0400 },
  { name: 'Barangay Riverside', lat: 14.6600, lng: 121.0300 },
  { name: 'Community Basketball Court', lat: 14.6528, lng: 121.0505 },
];

// ============================================================
// REPORT GARBAGE — 5 step wizard
// ============================================================
export function mountReportWizard(container) {
  const state = {
    step: 1,
    images: [],
    category: '',
    suggestedCategory: null,
    lat: null, lng: null, locationName: '',
    description: '',
    amount: '', blockingPath: false, accessible: true, extra: '',
  };

  function render() {
    container.innerHTML = '';
    container.appendChild(el(`
      <div>
        <h2 style="margin-bottom:4px;">Report Garbage</h2>
        <p class="small-muted" style="margin-bottom:16px;">Step ${state.step} of 5</p>
        <div class="wizard-progress">
          ${[1, 2, 3, 4, 5].map(n => `<span class="${n <= state.step ? 'done' : ''}"></span>`).join('')}
        </div>
        <div class="card" id="wizard-body"></div>
      </div>
    `));
    const body = qs('#wizard-body');
    if (state.step === 1) renderStepPhoto(body);
    if (state.step === 2) renderStepCategory(body);
    if (state.step === 3) renderStepLocation(body);
    if (state.step === 4) renderStepDescription(body);
    if (state.step === 5) renderStepReview(body);
  }

  function renderStepPhoto(body) {
    body.appendChild(el(`
      <div>
        <div class="wizard-step-label">STEP 1 — PHOTO</div>
        <h3>Take or upload photos</h3>
        <p>At least one photo is required. You can attach several photos of the same garbage.</p>
        <div id="photo-zone"></div>
        <div style="display:flex; justify-content:flex-end; margin-top:18px;">
          <button class="btn btn-primary" id="next1" ${state.images.length ? '' : 'disabled'}>Next</button>
        </div>
      </div>
    `));
    renderPhotoZone();

    function renderPhotoZone() {
      const zone = qs('#photo-zone');
      if (!state.images.length) {
        zone.innerHTML = `
          <div class="photo-drop">
            <div style="font-size:34px; margin-bottom:8px;">📷</div>
            <p style="margin-bottom:14px;">No photo yet</p>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
              <label class="btn btn-primary">📷 Take Photo<input type="file" accept="image/*" capture="environment" id="take-photo" style="display:none;"></label>
              <label class="btn btn-secondary">📁 Upload Photo(s)<input type="file" accept="image/*" multiple id="upload-photo" style="display:none;"></label>
            </div>
          </div>`;
        qs('#take-photo').addEventListener('change', handleFiles);
        qs('#upload-photo').addEventListener('change', handleFiles);
      } else {
        zone.innerHTML = `
          <div class="photo-gallery">
            ${state.images.map((url, i) => `
              <div class="photo-thumb-wrap" data-idx="${i}">
                <img src="${url}" alt="Garbage photo ${i + 1}" />
                <button type="button" class="photo-thumb-remove" data-remove="${i}">✕</button>
              </div>`).join('')}
            <label class="photo-thumb-add">
              +<br/>Add
              <input type="file" accept="image/*" multiple id="add-more-photo" style="display:none;">
            </label>
          </div>
          <div class="photo-actions">
            <label class="btn btn-secondary btn-sm">📷 Take another<input type="file" accept="image/*" capture="environment" id="retake-photo" style="display:none;"></label>
            <button class="btn btn-outline btn-sm" id="ai-identify">✨ Identify Garbage</button>
          </div>
          ${state.suggestedCategory ? `
            <div class="pill-note" style="margin-top:12px;">
              Suggested category: <strong>${escapeHtml(labelForCategory(state.suggestedCategory))}</strong>.
              This is only an automated suggestion — please verify the category before submitting.
            </div>` : ''}
        `;
        qs('#add-more-photo').addEventListener('change', handleFiles);
        qs('#retake-photo').addEventListener('change', handleFiles);
        qsa('[data-remove]', zone).forEach(btn => {
          btn.onclick = () => {
            state.images.splice(Number(btn.dataset.remove), 1);
            renderPhotoZone();
            qs('#next1').disabled = !state.images.length;
          };
        });
        qs('#ai-identify').onclick = () => {
          // Simulated on-device "AI" suggestion — not connected to a real model in this demo.
          const pool = ['plastic', 'mixed', 'organic', 'paper', 'general'];
          state.suggestedCategory = pool[Math.floor(Math.random() * pool.length)];
          renderPhotoZone();
        };
      }
    }

    async function handleFiles(e) {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      try {
        for (const file of files) {
          const dataUrl = await fileToResizedDataUrl(file, 900, 0.72, 'reports');
          state.images.push(dataUrl);
        }
        renderPhotoZone();
        qs('#next1').disabled = false;
      } catch (err) {
        toast('Could not read that photo. Please try another.');
      }
    }

    qs('#next1').onclick = () => { if (!state.images.length) { toast('Please add a photo first.'); return; } state.step = 2; render(); };
  }

  function renderStepCategory(body) {
    body.appendChild(el(`
      <div>
        <div class="wizard-step-label">STEP 2 — CATEGORY</div>
        <h3>What kind of garbage is this?</h3>
        <div class="category-grid" id="cat-grid">
          ${CATEGORIES.map(c => `
            <div class="category-chip ${state.category === c.id ? 'selected' : ''}" data-cat="${c.id}">
              <span class="em">${c.em}</span>${c.label}
            </div>`).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:18px;">
          <button class="btn btn-secondary" id="back2">Back</button>
          <button class="btn btn-primary" id="next2" ${state.category ? '' : 'disabled'}>Next</button>
        </div>
      </div>
    `));
    qsa('.category-chip', body).forEach(chip => {
      chip.onclick = () => {
        state.category = chip.dataset.cat;
        qsa('.category-chip', body).forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        qs('#next2').disabled = false;
      };
    });
    qs('#back2').onclick = () => { state.step = 1; render(); };
    qs('#next2').onclick = () => { state.step = 3; render(); };
  }

  function renderStepLocation(body) {
    body.appendChild(el(`
      <div>
        <div class="wizard-step-label">STEP 3 — LOCATION</div>
        <h3>Where is the garbage?</h3>
        <p>We use your location only to route this report to registered cleaners serving the area — it won't be shown publicly with your name attached.</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
          <button class="btn btn-secondary btn-sm" id="use-current">📍 Use My Current Location</button>
        </div>
        <label for="loc-search">Search location</label>
        <input type="search" id="loc-search" placeholder="e.g. Barangay San Jose" />
        <div id="loc-suggestions" style="margin:-10px 0 14px;"></div>
        <label for="loc-manual">Or enter location manually</label>
        <input type="text" id="loc-manual" placeholder="Street / landmark / barangay" value="${escapeHtml(state.locationName)}" />
        <div class="map-box" id="loc-map"></div>
        <div style="display:flex; justify-content:space-between; margin-top:18px;">
          <button class="btn btn-secondary" id="back3">Back</button>
          <button class="btn btn-primary" id="next3" ${state.lat ? '' : 'disabled'}>Next</button>
        </div>
      </div>
    `));

    let map, marker;
    function ensureMap(center) {
      if (!map) {
        map = createMap(qs('#loc-map'), { center: center || [14.6500, 121.0500], zoom: 15 });
        map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng, state.locationName || 'Pinned location'));
      } else if (center) {
        map.setView(center, 15);
      }
    }
    function setPoint(lat, lng, name) {
      state.lat = lat; state.lng = lng; state.locationName = name;
      ensureMap([lat, lng]);
      if (marker) marker.remove();
      marker = window.L.marker([lat, lng]).addTo(map);
      qs('#loc-manual').value = name;
      qs('#next3').disabled = false;
    }
    ensureMap();
    if (state.lat) setPoint(state.lat, state.lng, state.locationName);

    qs('#use-current').onclick = async () => {
      toast('Locating you…');
      const pos = await getCurrentPosition();
      if (!pos) { toast('Could not get your location. Try searching instead.'); return; }
      setPoint(pos.lat, pos.lng, 'My current location');
    };

    qs('#loc-search').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const box = qs('#loc-suggestions');
      if (!q) { box.innerHTML = ''; return; }
      const matches = KNOWN_PLACES.filter(p => p.name.toLowerCase().includes(q));
      box.innerHTML = matches.map(p => `<div class="category-chip" style="display:inline-block; margin:4px 6px 4px 0;" data-name="${escapeHtml(p.name)}" data-lat="${p.lat}" data-lng="${p.lng}">📍 ${p.name}</div>`).join('') || '<p class="small-muted">No matches — try manual entry.</p>';
      qsa('[data-name]', box).forEach(chip => {
        chip.onclick = () => setPoint(parseFloat(chip.dataset.lat), parseFloat(chip.dataset.lng), chip.dataset.name);
      });
    });

    qs('#loc-manual').addEventListener('change', (e) => {
      const name = e.target.value.trim();
      if (!name) return;
      // Manual entry without map pin: keep existing coordinates if any, else default to town center.
      state.locationName = name;
      if (!state.lat) setPoint(14.6500, 121.0500, name);
      else { state.locationName = name; qs('#next3').disabled = false; }
    });

    qs('#back3').onclick = () => { state.step = 2; render(); };
    qs('#next3').onclick = () => { if (!state.lat) { toast('Please set a location.'); return; } state.step = 4; render(); };
  }

  function renderStepDescription(body) {
    body.appendChild(el(`
      <div>
        <div class="wizard-step-label">STEP 4 — DESCRIPTION</div>
        <h3>Describe the garbage</h3>
        <textarea id="desc" placeholder="e.g. Several garbage bags are beside the road near the community basketball court.">${escapeHtml(state.description)}</textarea>
        <label for="amount">Approximate amount (optional)</label>
        <select id="amount">
          <option value="">Not specified</option>
          <option value="Small (a few items)" ${state.amount === 'Small (a few items)' ? 'selected' : ''}>Small (a few items)</option>
          <option value="Several bags" ${state.amount === 'Several bags' ? 'selected' : ''}>Several bags</option>
          <option value="Large pile / dump" ${state.amount === 'Large pile / dump' ? 'selected' : ''}>Large pile / dump</option>
        </select>
        <label style="display:flex; align-items:center; gap:8px; font-weight:500;">
          <input type="checkbox" id="blocking" style="width:auto; margin:0;" ${state.blockingPath ? 'checked' : ''} /> This is blocking a road or path
        </label>
        <label style="display:flex; align-items:center; gap:8px; font-weight:500; margin-top:10px;">
          <input type="checkbox" id="accessible" style="width:auto; margin:0;" ${state.accessible ? 'checked' : ''} /> The area is easily accessible
        </label>
        <label for="extra" style="margin-top:14px;">Additional information (optional)</label>
        <textarea id="extra" placeholder="Anything else a cleaner should know?">${escapeHtml(state.extra)}</textarea>
        <div style="display:flex; justify-content:space-between; margin-top:8px;">
          <button class="btn btn-secondary" id="back4">Back</button>
          <button class="btn btn-primary" id="next4">Next</button>
        </div>
      </div>
    `));
    qs('#back4').onclick = () => { save(); state.step = 3; render(); };
    qs('#next4').onclick = () => { save(); state.step = 5; render(); };
    function save() {
      state.description = qs('#desc').value.trim();
      state.amount = qs('#amount').value;
      state.blockingPath = qs('#blocking').checked;
      state.accessible = qs('#accessible').checked;
      state.extra = qs('#extra').value.trim();
    }
  }

  function renderStepReview(body) {
    const nearbyCount = findNearbyCleaners({ lat: state.lat, lng: state.lng, locationName: state.locationName, category: state.category }).length;
    body.appendChild(el(`
      <div>
        <div class="wizard-step-label">STEP 5 — REVIEW & SUBMIT</div>
        <h3>Review your report</h3>
        <div class="photo-gallery" style="margin-bottom:14px;">
          ${state.images.map(url => `<div class="photo-thumb-wrap"><img src="${url}"/></div>`).join('')}
        </div>
        <p><strong>${categoryEmoji(state.category)} ${escapeHtml(labelForCategory(state.category))}</strong></p>
        <p>📍 ${escapeHtml(state.locationName)}</p>
        <p>${escapeHtml(state.description || 'No description provided.')}</p>
        <div class="pill-note">
          ${nearbyCount > 0
            ? `This report will notify <strong>${nearbyCount}</strong> registered cleaner${nearbyCount > 1 ? 's' : ''} serving this area.`
            : `No verified cleaner currently covers this area — your report will still be saved and matched as cleaners register.`}
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:18px;">
          <button class="btn btn-secondary" id="back5">Back</button>
          <button class="btn btn-primary" id="submit-report">🚮 Submit Garbage Report</button>
        </div>
      </div>
    `));
    qs('#back5').onclick = () => { state.step = 4; render(); };
    qs('#submit-report').onclick = () => {
      const user = getCurrentUser();
      const report = createReport({
        reporterId: user.id,
        category: state.category,
        description: state.description,
        details: { amount: state.amount, blockingPath: state.blockingPath, accessible: state.accessible, extra: state.extra },
        images: state.images,
        lat: state.lat, lng: state.lng,
        locationName: state.locationName,
      });
      renderSuccess(report);
    };
  }

  function renderSuccess(report) {
    container.innerHTML = '';
    container.appendChild(el(`
      <div class="card" style="text-align:center; padding:36px 20px;">
        <div style="font-size:44px; margin-bottom:10px;">✅</div>
        <h2>Report Submitted Successfully</h2>
        <p>Your garbage report has been sent to registered cleaners serving this area.</p>
        <div class="divider"></div>
        <p class="small-muted">Report ID</p>
        <h3 style="margin-bottom:14px;">${report.id}</h3>
        ${statusBadge(report.status)}
        <div style="display:flex; gap:10px; justify-content:center; margin-top:24px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="track-report">Track this report</button>
          <button class="btn btn-secondary" id="report-another">Report another</button>
        </div>
      </div>
    `));
    qs('#track-report').onclick = () => navigate(`#/report-details/${report.id}`);
    qs('#report-another').onclick = () => mountReportWizard(container);
  }

  render();
}

// ============================================================
// MY REPORTS
// ============================================================
export function mountMyReports(container) {
  const user = getCurrentUser();
  let filter = 'all';
  container.appendChild(el(`
    <div>
      <h2>My Reports</h2>
      <div class="filter-row" id="filters">
        ${['all', ...STATUS_FLOW].map(s => `<button class="filter-chip ${s === 'all' ? 'active' : ''}" data-f="${s}">${s === 'all' ? 'All' : STATUS_LABEL[s]}</button>`).join('')}
      </div>
      <div id="reports-list"></div>
    </div>
  `));

  function renderList() {
    const reports = getReportsByReporter(user.id).filter(r => filter === 'all' || r.status === filter);
    const list = qs('#reports-list');
    if (!reports.length) { list.innerHTML = emptyState('🗑️', 'No reports here yet', 'Reports you submit will show up in this list.'); return; }
    list.innerHTML = reports.map(r => reportCardHtml(r, {
      actionsHtml: `<button class="btn btn-sm btn-outline" data-view="${r.id}">View Details</button>`,
    })).join('');
    qsa('[data-view]', list).forEach(btn => btn.onclick = () => navigate(`#/report-details/${btn.dataset.view}`));
  }

  qsa('#filters .filter-chip').forEach(chip => {
    chip.onclick = () => {
      filter = chip.dataset.f;
      qsa('#filters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderList();
    };
  });
  renderList();
}

// ============================================================
// REPORT DETAILS (works for reporter view; cleaner has its own richer version)
// ============================================================
export function mountReportDetails(container, { id }) {
  const report = getReportById(id);
  if (!report) { container.appendChild(el(emptyState('🔍', 'Report not found', ''))); return; }
  const reporter = getUserById(report.reporterId);
  const cleaner = report.cleanerId ? getUserById(report.cleanerId) : null;
  const currentUser = getCurrentUser();
  const canFlag = currentUser && currentUser.id !== report.reporterId;

  container.appendChild(el(`
    <div class="grid-2">
      <div>
        <div class="card">
          <div class="photo-gallery" style="margin-bottom:14px;">
            ${(report.images && report.images.length ? report.images : [report.imageUrl || placeholderPhoto(labelForCategory(report.category))])
              .map(url => `<div class="photo-thumb-wrap"><img src="${url}"/></div>`).join('')}
          </div>
          <div class="section-head">
            <h3 style="margin:0;">${categoryEmoji(report.category)} ${escapeHtml(labelForCategory(report.category))}</h3>
            ${statusBadge(report.status)}
          </div>
          <p class="small-muted">Report ID: ${report.id} · Submitted ${formatDate(report.createdAt)}</p>
          <p>${escapeHtml(report.description || 'No description provided.')}</p>
          <p class="meta-line">📍 ${escapeHtml(report.locationName)}</p>
          <div class="map-box" id="detail-map"></div>

          ${report.completionImageUrl ? `
            <div class="divider"></div>
            <h4>Before / After</h4>
            <div class="before-after">
              <figure><img src="${(report.images && report.images[0]) || report.imageUrl}"/><figcaption>Before</figcaption></figure>
              <figure><img src="${report.completionImageUrl}"/><figcaption>After</figcaption></figure>
            </div>
          ` : ''}

          ${cleaner ? `
            <div class="divider"></div>
            <h4>Assigned cleaner</h4>
            <p class="small-muted">${escapeHtml(cleaner.name)}${cleaner.organization ? ' · ' + escapeHtml(cleaner.organization) : ''}</p>
          ` : ''}

          ${canFlag ? `<button class="btn btn-outline btn-sm" id="flag-btn" style="margin-top:8px;">Report an issue with this report</button>` : ''}
        </div>
      </div>
      <div>
        <div class="card">
          <h3>Progress</h3>
          <ul class="timeline">
            ${STATUS_FLOW.map(s => {
              const entry = report.timeline.find(t => t.status === s);
              return `<li class="${entry ? 'done' : ''}">
                <div class="tl-dot">${entry ? '✓' : ''}</div>
                <div class="tl-text"><strong>${STATUS_LABEL[s]}</strong>${entry ? `<span>${formatDate(entry.at)}</span>` : ''}</div>
              </li>`;
            }).join('')}
          </ul>
        </div>
      </div>
    </div>
  `));

  const map = createMap(qs('#detail-map'), { center: [report.lat, report.lng], zoom: 16 });
  addStatusMarker(map, { lat: report.lat, lng: report.lng, status: report.status });

  const flagBtn = qs('#flag-btn');
  if (flagBtn) flagBtn.onclick = () => openFlagModal(report.id);
}

function openFlagModal(reportId) {
  openModal(`
    <h3>Flag this report</h3>
    <p>Let an admin know if something looks off.</p>
    <select id="flag-reason">
      <option value="fake">Fake report</option>
      <option value="duplicate">Duplicate report</option>
      <option value="location">Incorrect location</option>
      <option value="inappropriate">Inappropriate content</option>
    </select>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="btn btn-secondary" id="flag-cancel">Cancel</button>
      <button class="btn btn-primary" id="flag-submit">Submit</button>
    </div>
  `, (root) => {
    qs('#flag-cancel', root).onclick = () => closeModal();
    qs('#flag-submit', root).onclick = () => {
      const reason = qs('#flag-reason', root).value;
      flagReport(reportId, reason, getCurrentUser()?.id);
      toast('Thanks — an admin will review this report.');
      closeModal();
    };
  });
}

// ============================================================
// NOTIFICATIONS (role-aware; shared shell used by app.js for all roles)
// ============================================================
export function mountNotifications(container) {
  const user = getCurrentUser();
  container.appendChild(el(`
    <div>
      <div class="section-head">
        <h2 style="margin:0;">Notifications</h2>
        <button class="btn btn-sm btn-secondary" id="mark-all">Mark all as read</button>
      </div>
      <div id="notif-list"></div>
    </div>
  `));
  function render() {
    const notifs = getNotificationsForUser(user.id);
    const list = qs('#notif-list');
    list.innerHTML = notifs.length ? notifs.map(notifItemHtml).join('') : emptyState('🔔', 'No notifications yet', 'You will see updates about your reports here.');
    qsa('.notif-item', list).forEach(item => {
      item.onclick = () => {
        markNotificationRead(item.dataset.notifId);
        const rid = item.dataset.reportId;
        if (rid) {
          const report = getReportById(rid);
          if (report) {
            if (user.role === 'cleaner' && report.cleanerId === user.id) navigate(`#/cleaner/assignment/${rid}`);
            else navigate(`#/report-details/${rid}`);
            return;
          }
        }
        render();
      };
    });
  }
  qs('#mark-all').onclick = () => { markAllRead(user.id); render(); };
  render();
}

// ============================================================
// PROFILE (role-aware)
// ============================================================
export function mountProfile(container) {
  const user = getCurrentUser();
  const isCleaner = user.role === 'cleaner';
  const isAdmin = user.role === 'admin';
  container.appendChild(el(`
    <div class="grid-2">
      <div class="card" style="text-align:center;">
        <div id="avatar-zone"></div>
        <div class="photo-actions" style="justify-content:center; margin-top:10px;">
          <label class="btn btn-secondary btn-sm">📷 Take Photo<input type="file" accept="image/*" capture="user" id="avatar-take" style="display:none;"></label>
          <label class="btn btn-secondary btn-sm">📁 Upload Photo<input type="file" accept="image/*" id="avatar-upload" style="display:none;"></label>
        </div>
        <h3 style="margin:14px 0 2px;">${escapeHtml(user.name)}</h3>
        <p class="small-muted">${escapeHtml(user.email)}</p>
        ${isCleaner ? `
          <div style="margin:10px 0;">
            ${verifBadge(user.verificationStatus)}
          </div>
          <p class="small-muted">${escapeHtml(user.organization || 'Independent cleaner')}</p>
          <p class="small-muted">Service area: ${escapeHtml(user.serviceAreaLabel || 'Not set')}</p>
        ` : isAdmin ? `<p class="small-muted">Administrator</p>` : `<p class="small-muted">Community Reporter</p>`}
      </div>
      <div class="card">
        <h3>Account details</h3>
        <form id="profile-form">
          <label for="p-name">Full name</label>
          <input type="text" id="p-name" value="${escapeHtml(user.name)}" />
          ${isCleaner ? `
          <label for="p-org">Organization</label>
          <input type="text" id="p-org" value="${escapeHtml(user.organization || '')}" />
          ` : ''}
          <button type="submit" class="btn btn-primary">Save changes</button>
        </form>
        <div class="divider"></div>
        <button class="btn btn-danger" id="logout-btn">Log out</button>
      </div>
    </div>
  `));

  function renderAvatar() {
    const zone = qs('#avatar-zone');
    const src = user.avatarUrl || generateAvatar(user.gender, user.name);
    zone.innerHTML = `<img src="${src}" class="profile-avatar-img" alt="Profile picture" />`;
  }
  renderAvatar();

  async function handleAvatarFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      updateUser(user.id, { avatarUrl: dataUrl });
      user.avatarUrl = dataUrl;
      renderAvatar();
      toast('Profile picture updated.');
      window.dispatchEvent(new Event('st:auth-changed'));
    } catch (err) {
      toast('Could not read that photo. Please try another.');
    }
  }
  qs('#avatar-take').addEventListener('change', handleAvatarFile);
  qs('#avatar-upload').addEventListener('change', handleAvatarFile);

  qs('#profile-form').onsubmit = (e) => {
    e.preventDefault();
    const patch = { name: qs('#p-name').value.trim() };
    if (isCleaner) patch.organization = qs('#p-org').value.trim();
    updateUser(user.id, patch);
    toast('Profile updated.');
    window.dispatchEvent(new Event('st:auth-changed'));
  };
  qs('#logout-btn').onclick = async () => {
    await clearSession();
    navigate('#/');
    toast('Logged out.');
    window.dispatchEvent(new Event('st:auth-changed'));
  };
}
function verifBadge(status) {
  const map = { verified: ['✅ Verified', 'completed'], pending: ['⏳ Pending Verification', 'waiting'], suspended: ['⛔ Suspended', 'rejected'] };
  const [label, cls] = map[status] || map.pending;
  return `<span class="badge ${cls}">${label}</span>`;
}

// ============================================================
// GARBAGE MAP
// ============================================================
export function mountGarbageMap(container) {
  container.appendChild(el(`
    <div>
      <h2>Garbage Map</h2>
      <p>Tap a marker to open that report.</p>
      <div class="map-box fade-up" style="height:560px;" id="garbage-map"></div>
    </div>
  `));
  const reports = getReports();
  const center = reports.length ? [reports[0].lat, reports[0].lng] : [14.6500, 121.0500];
  const map = createMap(qs('#garbage-map'), { center, zoom: 14 });
  reports.forEach(r => {
    addStatusMarker(map, {
      lat: r.lat, lng: r.lng, status: r.status === 'notified' ? 'waiting' : r.status,
      onClick: () => navigate(`#/report-details/${r.id}`),
    });
  });
}
