// ============================================================
// SNAP TRASH — Landing, Login, Recycling Guide
// ============================================================
import { el, qs, qsa, toast, openModal, closeModal, generateAvatar } from './utils.js';
import { navigate } from './router.js';
import { loginUser, signupUser, getCurrentUser, resetPassword } from './data.js';

// Tutorial content shown when a "How it works" step number is tapped.
const STEP_TUTORIALS = [
  {
    num: '01', title: 'Snap', icon: '📸',
    short: 'Take a picture of the garbage.',
    tutorial: `Open <strong>Report Garbage</strong> and tap <strong>Take Photo</strong> — this opens your phone's camera directly so you can capture the mess right there and then. Prefer an existing picture instead? Use <strong>Upload Photo</strong> to pick one (or several) from your gallery.`,
  },
  {
    num: '02', title: 'Report', icon: '📝',
    short: 'Upload the photo and provide the location.',
    tutorial: `Pick a category, then set the location — use your current GPS position, search a place, or drop a pin on the map. Add a short description so a cleaner knows what to expect, then submit.`,
  },
  {
    num: '03', title: 'Notify', icon: '🔔',
    short: 'Nearby registered garbage cleaners are notified.',
    tutorial: `Snap Trash automatically matches your report to <strong>verified cleaners</strong> covering that barangay, city, or province and sends them a notification instantly — no need to call or message anyone yourself.`,
  },
  {
    num: '04', title: 'Clean', icon: '🧹',
    short: "A cleaner accepts the request and updates the report once it's removed.",
    tutorial: `A cleaner accepts the job, marks themselves <strong>On the Way</strong>, then <strong>Cleaning</strong>, and finally uploads an "after" photo once the area is spotless. You'll get notified at every step.`,
  },
];

export function mountLanding(container) {
  container.appendChild(el(`
    <div>
      <section class="hero fade-up">
        <h1>Snap It. Report It. Clean It.</h1>
        <p class="slogan-sub">See garbage in your community? Take a photo and report it. Nearby registered cleaners can be notified and respond.</p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-pulse" id="cta-report">📸 Report Garbage</button>
          <button class="btn btn-secondary" id="cta-map">🗺️ View Garbage Map</button>
        </div>
      </section>

      <section class="fade-up d1">
        <div class="section-head"><h2 style="margin:0;">How it works</h2></div>
        <p class="small-muted" style="margin-top:-8px;">Tap a number for the full walkthrough of that step.</p>
        <div class="steps-grid">
          ${STEP_TUTORIALS.map((s, i) => `
            <button class="step-card step-card-clickable fade-up d${i + 1}" data-step="${i}" type="button">
              <div class="step-num">${s.num}</div>
              <h3>${s.icon} ${s.title}</h3>
              <p>${s.short}</p>
              <span class="step-hint">Tap to learn how →</span>
            </button>`).join('')}
        </div>
      </section>

      <section class="card fade-up d2" id="purpose-card">
        <h3>🌱 What is the purpose of Snap Trash?</h3>
        <p>Snap Trash exists so anyone can report illegally dumped or overflowing garbage in their community in seconds — with a photo and a pin — and get it routed straight to a registered cleaner covering that area. No hotlines, no guesswork: just snap it, report it, and watch it get cleaned.</p>
        <div class="creator-line">
          <div class="avatar-circle" style="background:var(--forest-700);">KA</div>
          <div>
            <strong>Created by Kenneth Amarila</strong>
            <p class="small-muted" style="margin:0;">Designer &amp; developer of Snap Trash</p>
          </div>
        </div>
      </section>

      <section class="card fade-up d3" style="margin-top:16px;">
        <h3>Secondary slogan</h3>
        <p style="margin:0;">"Report garbage. Connect with local cleaners. Keep your community clean."</p>
      </section>
    </div>
  `));

  qs('#cta-report').onclick = () => navigate(getCurrentUser() ? '#/report' : '#/login');
  qs('#cta-map').onclick = () => navigate('#/map');
  qsa('[data-step]').forEach(btn => {
    btn.onclick = () => openStepTutorial(STEP_TUTORIALS[Number(btn.dataset.step)]);
  });
}

function openStepTutorial(step) {
  openModal(`
    <div class="tutorial-modal">
      <div class="tutorial-badge">${step.num}</div>
      <h3 style="margin-top:10px;">${step.icon} ${step.title}</h3>
      <p>${step.tutorial}</p>
      <button class="btn btn-primary btn-block" id="tut-close">Got it</button>
    </div>
  `, (root) => { qs('#tut-close', root).onclick = closeModal; });
}

export function mountLogin(container) {
  container.appendChild(el(`
    <div class="auth-wrap fade-up">
      <div class="card">
        <h2>Log in to Snap Trash</h2>
        <p>Enter your email and password below.</p>

        <form id="login-form">
          <label for="li-email">Email</label>
          <input type="email" id="li-email" required placeholder="you@example.com" />
          <label for="li-pass">Password</label>
          <input type="password" id="li-pass" required placeholder="••••••••" />
          <button type="submit" class="btn btn-primary btn-block">Log in</button>
        </form>
        <p class="small-muted" style="margin-top:8px; text-align:right;">
          <a href="#" id="forgot-password-link">Forgot password?</a>
        </p>

        <div class="divider"></div>
        <p class="small-muted" style="margin-bottom:8px;">New here? Create an account:</p>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline btn-block" id="go-signup-reporter">👤 I'm a Reporter</button>
          <button class="btn btn-outline btn-block" id="go-signup-cleaner">🧹 I'm a Cleaner</button>
        </div>
      </div>
    </div>
  `));

  qs('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = qs('#li-email').value.trim();
    const pass = qs('#li-pass').value;
    const btn = qs('#login-form button[type="submit"]');
    btn.disabled = true;
    try {
      const user = await loginUser(email, pass);
      if (!user) {
        toast("Signed in, but no profile was found for this account.");
        return;
      }
      if (user.status === 'suspended') {
        toast('This account has been suspended. Contact an administrator.');
        return;
      }
      toast(`Welcome back, ${user.name.split(' ')[0]}!`);
      window.dispatchEvent(new Event('st:auth-changed'));
      if (user.role === 'admin') navigate('#/admin/dashboard');
      else if (user.role === 'cleaner') navigate('#/cleaner/dashboard');
      else navigate('#/');
    } catch (err) {
      toast('Incorrect email or password.');
    } finally {
      btn.disabled = false;
    }
  };

  qs('#go-signup-reporter').onclick = () => openSignup(container, 'reporter');
  qs('#go-signup-cleaner').onclick = () => openSignup(container, 'cleaner');

  qs('#forgot-password-link').onclick = async (e) => {
    e.preventDefault();
    const email = qs('#li-email').value.trim();
    if (!email) {
      toast('Type your email above first, then click "Forgot password?" again.');
      return;
    }
    try {
      await resetPassword(email);
      toast(`Password reset email sent to ${email}. Check your inbox.`);
    } catch (err) {
      if (err.code === 'auth/invalid-email') toast('That doesn\'t look like a valid email address.');
      else toast('Could not send reset email. Please check the address and try again.');
    }
  };
}

function openSignup(container, role) {
  container.innerHTML = '';
  container.appendChild(el(`
    <div class="auth-wrap fade-up">
      <div class="card">
        <h2>${role === 'cleaner' ? 'Register as a cleaner' : 'Create a reporter account'}</h2>
        <p>${role === 'cleaner' ? 'Your account will be marked "Pending Verification" until an admin approves it.' : 'Quick signup — stored locally on this device.'}</p>
        <form id="signup-form">
          <label for="su-name">Full name</label>
          <input type="text" id="su-name" required />
          <label for="su-email">Email</label>
          <input type="email" id="su-email" required />
          <label for="su-pass">Password</label>
          <input type="password" id="su-pass" required minlength="6" />
          <label>Gender</label>
          <div class="gender-grid" id="gender-grid">
            <label class="gender-chip"><input type="radio" name="gender" value="male" checked /><span>👨 Male</span></label>
            <label class="gender-chip"><input type="radio" name="gender" value="female" /><span>👩 Female</span></label>
          </div>
          <p class="field-hint">We'll generate a simple avatar based on this — you can change your profile picture anytime.</p>
          ${role === 'cleaner' ? `
          <label for="su-org">Organization (optional)</label>
          <input type="text" id="su-org" placeholder="e.g. Barangay Sanitation Unit" />
          ` : ''}
          <button type="submit" class="btn btn-primary btn-block">Create account</button>
        </form>
        <button class="btn btn-secondary btn-block" id="back-login" style="margin-top:10px;">Back to log in</button>
      </div>
    </div>
  `));
  qs('#back-login').onclick = () => { container.innerHTML = ''; mountLogin(container); };
  qs('#signup-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = qs('#su-name').value.trim();
    const email = qs('#su-email').value.trim();
    const pass = qs('#su-pass').value;
    const gender = container.querySelector('input[name="gender"]:checked')?.value || 'other';
    const btn = qs('#signup-form button[type="submit"]');
    btn.disabled = true;
    try {
      await signupUser({
        name, email, password: pass, role, gender,
        avatarUrl: generateAvatar(gender, name),
        organization: role === 'cleaner' ? (qs('#su-org')?.value || '') : undefined,
        serviceAreaLabel: role === 'cleaner' ? 'Not set yet' : undefined,
        lat: role === 'cleaner' ? 14.6500 : undefined,
        lng: role === 'cleaner' ? 121.0500 : undefined,
      });
      toast(role === 'cleaner' ? 'Account created — pending verification by an admin.' : 'Account created!');
      window.dispatchEvent(new Event('st:auth-changed'));
      navigate(role === 'cleaner' ? '#/cleaner/service-area' : '#/');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') toast('An account with that email already exists.');
      else if (err.code === 'auth/weak-password') toast('Password should be at least 6 characters.');
      else if (err.code === 'auth/invalid-email') toast('Please enter a valid email address.');
      else toast('Could not create account. Please try again.');
    } finally {
      btn.disabled = false;
    }
  };
}

// ---------------- Recycling / Disposal Guide (secondary feature) ----------------
const GUIDE_ITEMS = [
  { id: 'plastic', label: 'Plastic bottles', tip: 'Rinse and remove caps. Recycle where facilities exist, or place in general recyclables collection.' },
  { id: 'cardboard', label: 'Cardboard', tip: 'Flatten boxes and keep dry. Most municipal recycling programs accept clean cardboard.' },
  { id: 'glass', label: 'Glass', tip: 'Rinse containers. Glass can usually be recycled indefinitely — check for local glass drop-off points.' },
  { id: 'metal', label: 'Metal cans', tip: 'Rinse food residue and recycle with other metals; separate steel and aluminum if your program requires it.' },
  { id: 'batteries', label: 'Batteries', tip: 'Do not put batteries in general trash. Use a designated battery collection point or e-waste program in your area.' },
  { id: 'electronics', label: 'Electronics', tip: 'Use an authorized e-waste collection or take-back program. Follow local regulations for hazardous components.' },
  { id: 'food', label: 'Food waste', tip: 'Compost where possible, or dispose of with organic waste collection if your area offers it.' },
  { id: 'general', label: 'General waste', tip: 'Bag securely and place with regular household collection.' },
];

export function mountGuide(container) {
  container.appendChild(el(`
    <div>
      <div class="section-head">
        <h2 style="margin:0;">Recycling & Disposal Guide</h2>
      </div>
      <p>Quick reference only — this is a secondary feature to help you sort garbage before reporting it. For batteries, electronics, and other special waste, always follow your local collection or take-back program requirements.</p>
      <input type="search" id="guide-search" placeholder="Search a material, e.g. glass, batteries…" />
      <div id="guide-list"></div>
    </div>
  `));
  const list = qs('#guide-list');
  function renderList(filter = '') {
    const items = GUIDE_ITEMS.filter(i => i.label.toLowerCase().includes(filter.toLowerCase()));
    list.innerHTML = items.length ? items.map(i => `
      <div class="card card-flat">
        <h4 style="margin:0 0 6px;">${i.label}</h4>
        <p style="margin:0;">${i.tip}</p>
      </div>
    `).join('') : `<p class="small-muted">No matching items.</p>`;
  }
  renderList();
  qs('#guide-search').addEventListener('input', (e) => renderList(e.target.value));
}
