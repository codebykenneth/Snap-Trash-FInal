// ============================================================
// SNAP TRASH — App entry point
// ============================================================
import { route, startRouter, navigate, setOnRouteChange, currentPath } from './router.js';
import { getCurrentUser, unreadCount } from './data.js';
import { el, qs, qsa, generateAvatar, getThemePref, setThemePref } from './utils.js';
import { mountLanding, mountLogin, mountGuide } from './pages_public.js';
import {
  mountReportWizard, mountMyReports, mountReportDetails,
  mountNotifications, mountProfile, mountGarbageMap,
} from './pages_reporter.js';
import {
  mountCleanerDashboard, mountNearbyReports, mountMyAssignments,
  mountAssignmentDetails, mountServiceArea,
} from './pages_cleaner.js';
import {
  mountAdminDashboard, mountAdminReports, mountAdminCleaners,
  mountAdminUsers, mountAdminServiceAreas, mountAdminAnalytics, mountAdminSettings,
} from './pages_admin.js';

const appEl = document.getElementById('app');

// ---------------- Routes ----------------
route('/', mountLanding);
route('/login', mountLogin);
route('/guide', mountGuide);
route('/map', mountGarbageMap);

route('/report', mountReportWizard, ['reporter']);
route('/my-reports', mountMyReports, ['reporter']);
route('/report-details/:id', mountReportDetails, ['reporter', 'admin', 'cleaner']);
route('/notifications', mountNotifications, ['reporter', 'cleaner', 'admin']);
route('/profile', mountProfile, ['reporter', 'cleaner', 'admin']);

route('/cleaner/dashboard', mountCleanerDashboard, ['cleaner']);
route('/cleaner/nearby', mountNearbyReports, ['cleaner']);
route('/cleaner/assignments', mountMyAssignments, ['cleaner']);
route('/cleaner/assignment/:id', mountAssignmentDetails, ['cleaner']);
route('/cleaner/service-area', mountServiceArea, ['cleaner']);

route('/admin/dashboard', mountAdminDashboard, ['admin']);
route('/admin/reports', mountAdminReports, ['admin']);
route('/admin/cleaners', mountAdminCleaners, ['admin']);
route('/admin/users', mountAdminUsers, ['admin']);
route('/admin/service-areas', mountAdminServiceAreas, ['admin']);
route('/admin/analytics', mountAdminAnalytics, ['admin']);
route('/admin/settings', mountAdminSettings, ['admin']);

// ---------------- Nav configs ----------------
const NAV = {
  guest: [
    { path: '#/', label: 'Home', icon: '🏠' },
    { path: '#/map', label: 'Garbage Map', icon: '🗺️' },
    { path: '#/guide', label: 'Guide', icon: '♻️' },
    { path: '#/login', label: 'Log in', icon: '👤' },
  ],
  reporter: [
    { path: '#/', label: 'Home', icon: '🏠' },
    { path: '#/report', label: 'Report Garbage', icon: '📸' },
    { path: '#/my-reports', label: 'My Reports', icon: '📋' },
    { path: '#/map', label: 'Garbage Map', icon: '🗺️' },
    { path: '#/notifications', label: 'Notifications', icon: '🔔' },
    { path: '#/profile', label: 'Profile', icon: '👤' },
  ],
  cleaner: [
    { path: '#/cleaner/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '#/cleaner/nearby', label: 'Nearby Reports', icon: '📍' },
    { path: '#/cleaner/assignments', label: 'My Assignments', icon: '📋' },
    { path: '#/notifications', label: 'Notifications', icon: '🔔' },
    { path: '#/cleaner/service-area', label: 'Service Area', icon: '🗺️' },
    { path: '#/profile', label: 'Profile', icon: '👤' },
  ],
  admin: [
    { path: '#/admin/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '#/admin/reports', label: 'Reports', icon: '📋' },
    { path: '#/admin/cleaners', label: 'Cleaners', icon: '🧹' },
    { path: '#/admin/users', label: 'Users', icon: '👥' },
    { path: '#/admin/service-areas', label: 'Service Areas', icon: '🗺️' },
    { path: '#/admin/analytics', label: 'Analytics', icon: '📊' },
    { path: '#/admin/settings', label: 'Settings', icon: '⚙️' },
  ],
};

function navFor(user) {
  if (!user) return NAV.guest;
  return NAV[user.role] || NAV.guest;
}

function renderChrome() {
  const user = getCurrentUser();
  const items = navFor(user);
  const path = '#' + currentPath();

  const topbar = document.getElementById('topbar');
  topbar.innerHTML = `
    <div class="topbar-inner">
      <div class="brand" id="brand-home" style="cursor:pointer;">
        <img src="Image/logo.jpg" alt="" />
        Snap Trash
      </div>
      <nav class="topbar-links">
        ${items.map(i => `<a href="${i.path}" class="${path === i.path ? 'active' : ''}">${i.label}${i.path === '#/notifications' ? unreadBadge(user) : ''}</a>`).join('')}
      </nav>
      <div class="topbar-actions">
        <div class="theme-toggle" id="theme-toggle" role="group" aria-label="Theme">
          <button type="button" data-theme-choice="light" aria-label="Light mode" title="Light">☀️</button>
          <button type="button" data-theme-choice="dark" aria-label="Dark mode" title="Dark">🌙</button>
          <button type="button" data-theme-choice="system" aria-label="Match device" title="Auto (match device)">🌓</button>
        </div>
        ${user ? `<div class="avatar-chip" id="avatar-chip"><img class="avatar-circle avatar-circle-img" src="${user.avatarUrl || generateAvatar(user.gender, user.name)}" alt="" /><span style="font-size:13px; font-weight:600;">${user.name.split(' ')[0]}</span></div>` : ''}
      </div>
    </div>
  `;
  qs('#brand-home').onclick = () => navigate('#/');
  if (user) qs('#avatar-chip').onclick = () => navigate('#/profile');

  const currentThemePref = getThemePref();
  qsa('[data-theme-choice]', qs('#theme-toggle')).forEach(b => {
    b.classList.toggle('active', b.dataset.themeChoice === currentThemePref);
    b.onclick = () => {
      setThemePref(b.dataset.themeChoice);
      qsa('[data-theme-choice]', qs('#theme-toggle')).forEach(x => x.classList.toggle('active', x === b));
    };
  });

  const bottomnav = document.getElementById('bottomnav');
  bottomnav.innerHTML = items.map(i => `
    <button class="${path === i.path ? 'active' : ''}" data-path="${i.path}">
      <span class="icon">${i.icon}</span>${i.label.split(' ')[0]}
    </button>
  `).join('');
  qsa('button[data-path]', bottomnav).forEach(b => b.onclick = () => navigate(b.dataset.path));
}

function unreadBadge(user) {
  if (!user) return '';
  const n = unreadCount(user.id);
  return n ? ` (${n})` : '';
}

setOnRouteChange(renderChrome);
window.addEventListener('st:auth-changed', renderChrome);

startRouter(appEl);
renderChrome();
