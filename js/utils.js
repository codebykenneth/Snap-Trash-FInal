// ============================================================
// SNAP TRASH — shared UI utilities
// ============================================================

const THEME_KEY = 'st-theme-pref'; // 'light' | 'dark' | 'system'

export function getThemePref() {
  return localStorage.getItem(THEME_KEY) || 'system';
}

export function setThemePref(pref) {
  localStorage.setItem(THEME_KEY, pref);
  applyThemePref(pref);
}

export function applyThemePref(pref = getThemePref()) {
  if (pref === 'light' || pref === 'dark') {
    document.documentElement.setAttribute('data-theme', pref);
  } else {
    document.documentElement.removeAttribute('data-theme'); // 'system' → follow the phone/OS
  }
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

export function toast(message, timeout = 3200) {
  const root = document.getElementById('toast-root');
  const node = el(`<div class="toast">${escapeHtml(message)}</div>`);
  root.appendChild(node);
  setTimeout(() => node.remove(), timeout);
}

export function openModal(innerHtml, onMount) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" id="modal-overlay"><div class="modal-box">${innerHtml}</div></div>`;
  const overlay = document.getElementById('modal-overlay');
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  if (onMount) onMount(root);
  return root;
}
export function closeModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
}

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Resize/compress an uploaded image file down to a compact data URL that
// gets stored directly as part of the report/user document in Firestore
// (no Cloud Storage needed, so this stays on Firebase's free Spark plan —
// no billing account required). Kept fairly small so a report/profile
// document stays well under Firestore's 1MB-per-document limit.
// pathPrefix is unused here but kept in the signature so call sites don't
// need to change if Cloud Storage is added back later.
export function fileToResizedDataUrl(file, maxDim = 900, quality = 0.72, pathPrefix = 'uploads') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        else if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function placeholderPhoto(seedText = 'garbage') {
  // Lightweight inline SVG placeholder used when no photo is present (e.g. legacy demo data)
  const colors = ['#DCEFE3', '#EAF7EF'];
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
      <rect width="400" height="300" fill="${colors[0]}"/>
      <text x="50%" y="50%" font-family="sans-serif" font-size="18" fill="#4B5F55" text-anchor="middle" dy=".3em">📷 ${escapeHtml(seedText)}</text>
    </svg>`);
}

export function statusBadge(status) {
  const labels = {
    waiting: 'Waiting', notified: 'Notified', accepted: 'Accepted',
    ontheway: 'On the Way', cleaning: 'Cleaning', completed: 'Completed', rejected: 'Rejected',
  };
  return `<span class="badge ${status}"><span class="badge-dot dot ${status}"></span>${labels[status] || status}</span>`;
}

export function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

// ---------------------------------------------------------------
// Auto-generated avatar based on chosen gender (simple flat SVG).
// Used right after sign-up; the person can still replace it later
// by uploading/taking their own profile picture.
// ---------------------------------------------------------------
export function generateAvatar(gender = 'other', name = '') {
  const theme = {
    male: { bg: '#2E6FE0', bg2: '#5B8FF0' },
    female: { bg: '#E0578A', bg2: '#F08AB0' },
    other: { bg: '#1E8E5A', bg2: '#3FAE79' },
  }[gender] || { bg: '#1E8E5A', bg2: '#3FAE79' };
  const initialsTxt = initials(name) || '🙂';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${theme.bg2}"/>
          <stop offset="100%" stop-color="${theme.bg}"/>
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#g)"/>
      <circle cx="100" cy="82" r="34" fill="#fff" fill-opacity=".92"/>
      <path d="M30 190 C30 140 165 140 170 190 Z" fill="#fff" fill-opacity=".92"/>
      <text x="50%" y="196" font-family="Space Grotesk, sans-serif" font-size="1" opacity="0"> </text>
    </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Resize an uploaded image specifically for small circular avatars.
export function fileToAvatarDataUrl(file) {
  return fileToResizedDataUrl(file, 300, 0.8, 'avatars');
}

// Simple confirm dialog (nicer than window.confirm, but same semantics)
export function confirmDialog(message, { okLabel = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    openModal(`
      <h3>Please confirm</h3>
      <p>${escapeHtml(message)}</p>
      <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:18px;">
        <button class="btn btn-secondary" id="cd-cancel">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cd-ok">${escapeHtml(okLabel)}</button>
      </div>
    `, (root) => {
      qs('#cd-cancel', root).onclick = () => { closeModal(); resolve(false); };
      qs('#cd-ok', root).onclick = () => { closeModal(); resolve(true); };
    });
  });
}
