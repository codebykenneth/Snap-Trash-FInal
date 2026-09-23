// ============================================================
// SNAP TRASH — tiny hash router
// ============================================================
import { getCurrentUser } from './data.js';
import { toast } from './utils.js';

const routes = []; // { pattern: RegExp, keys: [], roles: [] | null, mount: fn }

export function route(path, mount, roles = null) {
  const keys = [];
  const pattern = new RegExp('^' + path.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)'; }) + '$');
  routes.push({ pattern, keys, mount, roles });
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function currentPath() {
  return (window.location.hash || '#/').slice(1) || '/';
}

let onRouteChange = null;
export function setOnRouteChange(fn) { onRouteChange = fn; }

export function startRouter(appEl) {
  window.addEventListener('hashchange', () => render(appEl));
  render(appEl);
}

function render(appEl) {
  const path = currentPath();
  const match = routes.find(r => r.pattern.test(path));
  appEl.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

  if (!match) {
    appEl.innerHTML = `<div class="empty-state"><span class="em">🧭</span><h3>Page not found</h3><p>That page doesn't exist.</p></div>`;
    if (onRouteChange) onRouteChange(path);
    return;
  }

  const user = getCurrentUser();
  if (match.roles && (!user || !match.roles.includes(user.role))) {
    if (!user) {
      toast('Please log in to continue.');
      navigate('#/login');
      return;
    }
    toast("You don't have access to that page.");
    navigate('#/');
    return;
  }

  const m = path.match(match.pattern);
  const params = {};
  match.keys.forEach((k, i) => { params[k] = m[i + 1]; });

  appEl.innerHTML = '';
  match.mount(appEl, params);
  appEl.classList.remove('page-fade');
  // eslint-disable-next-line no-unused-expressions
  appEl.offsetWidth; // force reflow so the animation replays on every navigation
  appEl.classList.add('page-fade');
  if (onRouteChange) onRouteChange(path);
}
