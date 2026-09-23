// ============================================================
// SNAP TRASH — Data layer (Firebase-backed persistence)
// Users/Auth -> Firebase Authentication
// Reports, user profiles, notifications -> Cloud Firestore
// Photos -> Firebase Storage (see utils.js)
//
// Design: on startup we load every collection ONCE into plain
// in-memory arrays (usersCache/reportsCache/notificationsCache).
// Every page in this app (pages_*.js) keeps calling the same
// synchronous getters/setters it always did (getUsers(), getReports(),
// updateUser(), createReport(), ...) — those still work exactly the
// same and return instantly from the in-memory cache. Underneath,
// each mutation also fires off a write to Firestore in the
// background so the data is durable and shared across every device
// and every visitor, instead of being stuck in one browser's
// LocalStorage.
// ============================================================
import { auth, db } from './firebase-config.js';
import {
  collection, doc, getDocs, setDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

export const CATEGORIES = [
  { id: 'general', label: 'General Waste', em: '🗑️' },
  { id: 'plastic', label: 'Plastic', em: '🧴' },
  { id: 'paper', label: 'Paper', em: '📦' },
  { id: 'glass', label: 'Glass', em: '🍾' },
  { id: 'metal', label: 'Metal', em: '🥫' },
  { id: 'organic', label: 'Food / Organic', em: '🍂' },
  { id: 'ewaste', label: 'E-Waste', em: '🔌' },
  { id: 'construction', label: 'Construction', em: '🧱' },
  { id: 'mixed', label: 'Mixed Garbage', em: '🚮' },
  { id: 'unknown', label: 'Unknown', em: '❓' },
  { id: 'other', label: 'Other', em: '✏️' },
];

// Ordered status pipeline
export const STATUS_FLOW = ['waiting', 'notified', 'accepted', 'ontheway', 'cleaning', 'completed'];
export const STATUS_LABEL = {
  waiting: 'Waiting for Cleaner',
  notified: 'Cleaner Notified',
  accepted: 'Cleanup Accepted',
  ontheway: 'On the Way',
  cleaning: 'Cleaning',
  completed: 'Completed',
  rejected: 'Rejected',
};

function nowISO() { return new Date().toISOString(); }
function uid(prefix = 'id') { return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`; }
function stripId(obj) { const { id, ...rest } = obj; return rest; }
// Firestore rejects any field whose value is `undefined` (it throws and
// the write never happens) — so every write goes through this first to
// drop those keys entirely rather than sending them as undefined.
function stripUndefined(obj) {
  const out = {};
  for (const k in obj) { if (obj[k] !== undefined) out[k] = obj[k]; }
  return out;
}

// Fire-and-forget write to Firestore. UI never waits on this — the
// in-memory cache is updated immediately so pages stay instant; this
// just persists the change in the background.
function fsSet(colName, id, data) {
  setDoc(doc(db, colName, id), stripUndefined(data), { merge: true })
    .catch(err => console.error(`Firestore write failed (${colName}/${id}):`, err));
}

// ---------------- Haversine distance (km) ----------------
export function distanceKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(v => v === undefined || v === null || Number.isNaN(v))) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------- In-memory cache, loaded once at startup ----------------
let usersCache = [];
let reportsCache = [];
let notificationsCache = [];
let currentUserId = null; // Firebase Auth uid of the signed-in user, or null

async function loadUsers() {
  const snap = await getDocs(collection(db, 'users'));
  usersCache = snap.docs.map(d => ({ ...d.data(), id: d.id }));
}
async function loadReports() {
  const snap = await getDocs(collection(db, 'reports'));
  reportsCache = snap.docs.map(d => ({ ...d.data(), id: d.id }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
async function loadNotifications() {
  const snap = await getDocs(collection(db, 'notifications'));
  notificationsCache = snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

function waitForInitialAuthState() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      currentUserId = fbUser ? fbUser.uid : null;
      unsub();
      resolve();
    });
  });
}

// Block the rest of the app from starting until we know whether someone
// is already signed in AND every collection is loaded into memory.
await waitForInitialAuthState();
await Promise.all([loadUsers(), loadReports(), loadNotifications()]);

// ---------------- Session / Auth ----------------
export function getSession() { return currentUserId; }
export function setSession(userId) { currentUserId = userId; }
export function getCurrentUser() {
  if (!currentUserId) return null;
  return usersCache.find(u => u.id === currentUserId) || null;
}
export async function clearSession() {
  await signOut(auth);
  currentUserId = null;
}

// Log in with Firebase Authentication, then look up the matching
// Firestore profile document (same uid).
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  currentUserId = cred.user.uid;
  return getUserById(currentUserId);
}

// Sends a real password-reset email via Firebase to the given address.
// The person clicks the link in that email to set a new password —
// nobody (including us) can ever see or recover the old one.
export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

// Create a Firebase Auth account, then create the matching Firestore
// profile document (id === auth uid) with everything else (name, role,
// gender, organization, ...).
export async function signupUser(data) {
  const { password, ...profileData } = data;
  const cred = await createUserWithEmailAndPassword(auth, data.email, password);
  const newId = cred.user.uid;
  const profile = { status: 'active', createdAt: nowISO(), ...profileData };
  if (profile.role === 'cleaner') {
    profile.verificationStatus = profile.verificationStatus || 'pending';
    profile.isActive = profile.isActive ?? true;
    profile.serviceRadiusKm = profile.serviceRadiusKm ?? 5;
  }
  await setDoc(doc(db, 'users', newId), stripUndefined(profile));
  const user = { ...profile, id: newId };
  usersCache.push(user);
  currentUserId = newId;
  return user;
}

// ---------------- Users ----------------
export function getUsers() { return usersCache; }
export function saveUsers(list) {
  usersCache = list;
  list.forEach(u => fsSet('users', u.id, stripId(u)));
}
export function getUserById(id) { return usersCache.find(u => u.id === id) || null; }
export function findUserByEmail(email) {
  return usersCache.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}
export function updateUser(id, patch) {
  usersCache = usersCache.map(u => (u.id === id ? { ...u, ...patch } : u));
  fsSet('users', id, patch);
  return getUserById(id);
}
export function getCleaners() { return usersCache.filter(u => u.role === 'cleaner'); }
export function getVerifiedActiveCleaners() {
  return getCleaners().filter(c => c.verificationStatus === 'verified' && c.isActive);
}

// ---------------- Reports ----------------
export function getReports() { return reportsCache; }
export function saveReports(list) {
  reportsCache = list;
  list.forEach(r => fsSet('reports', r.id, stripId(r)));
}
export function getReportById(id) { return reportsCache.find(r => r.id === id) || null; }
export function getReportsByReporter(reporterId) { return reportsCache.filter(r => r.reporterId === reporterId); }
export function getReportsByCleaner(cleanerId) { return reportsCache.filter(r => r.cleanerId === cleanerId); }

function nextReportId() {
  const nums = reportsCache.map(r => parseInt(String(r.id).replace('ST-', ''), 10)).filter(n => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 123;
  return `ST-${String(max + 1).padStart(6, '0')}`;
}

export function createReport(data) {
  const id = nextReportId();
  const report = {
    id,
    reporterId: data.reporterId,
    category: data.category,
    description: data.description || '',
    details: data.details || {},
    imageUrl: data.imageUrl || (data.images && data.images[0]) || '',
    images: data.images && data.images.length ? data.images : (data.imageUrl ? [data.imageUrl] : []),
    lat: data.lat,
    lng: data.lng,
    locationName: data.locationName || 'Unknown location',
    status: 'waiting',
    cleanerId: null,
    completionImageUrl: '',
    createdAt: nowISO(),
    updatedAt: nowISO(),
    timeline: [{ status: 'waiting', at: nowISO() }],
    flags: [],
  };
  reportsCache.unshift(report);
  fsSet('reports', id, stripId(report));

  notifyUser(data.reporterId, {
    reportId: id,
    title: 'Report submitted',
    message: 'Your garbage report has been received.',
    icon: '📸',
  });

  // Determine nearby verified/active cleaners and notify them
  const nearby = findNearbyCleaners(report);
  if (nearby.length) {
    updateReportStatus(id, 'notified');
    nearby.forEach(({ cleaner, distance }) => {
      notifyUser(cleaner.id, {
        reportId: id,
        title: 'New garbage report nearby',
        message: `A ${labelForCategory(report.category)} report was submitted ${distance !== null ? `about ${distance.toFixed(1)} km` : 'near'} your service area.`,
        icon: '🚮',
      });
    });
  }
  return getReportById(id);
}

export function labelForCategory(catId) {
  const c = CATEGORIES.find(c => c.id === catId);
  return c ? c.label : 'Garbage';
}

// Service-area based matching: verified + active cleaners whose service
// area label matches the report's location, OR whose radius covers the point.
export function findNearbyCleaners(report) {
  const cleaners = getVerifiedActiveCleaners();
  const matches = [];
  cleaners.forEach(cleaner => {
    let distance = distanceKm(report.lat, report.lng, cleaner.lat, cleaner.lng);
    const sameArea = cleaner.serviceAreaLabel &&
      report.locationName &&
      report.locationName.toLowerCase().includes(cleaner.serviceAreaLabel.toLowerCase().replace('barangay ', ''));
    const withinRadius = distance !== null && distance <= (cleaner.serviceRadiusKm || 5);
    if (sameArea || withinRadius) {
      matches.push({ cleaner, distance });
    }
  });
  return matches;
}

export function updateReportStatus(reportId, status, extra = {}) {
  reportsCache = reportsCache.map(r => {
    if (r.id !== reportId) return r;
    return {
      ...r,
      ...extra,
      status,
      updatedAt: nowISO(),
      timeline: [...r.timeline, { status, at: nowISO() }],
    };
  });
  const updated = getReportById(reportId);
  fsSet('reports', reportId, stripId(updated));
  return updated;
}

export function acceptReport(reportId, cleanerId) {
  const report = getReportById(reportId);
  if (!report) return null;
  const updated = updateReportStatus(reportId, 'accepted', { cleanerId });
  notifyUser(report.reporterId, {
    reportId,
    title: 'Cleaner accepted your report',
    message: 'A registered cleaner has accepted your garbage report.',
    icon: '✅',
  });
  // Notify other nearby cleaners that the report is taken
  const nearby = findNearbyCleaners(report).filter(m => m.cleaner.id !== cleanerId);
  nearby.forEach(({ cleaner }) => {
    notifyUser(cleaner.id, {
      reportId,
      title: 'Report already accepted',
      message: 'Another cleaner has accepted this report.',
      icon: 'ℹ️',
    });
  });
  return updated;
}

export function setOnTheWay(reportId) {
  const report = updateReportStatus(reportId, 'ontheway');
  notifyUser(report.reporterId, {
    reportId, title: 'Cleaner is on the way', message: 'The cleaner is on the way to your reported location.', icon: '🚚',
  });
  return report;
}

export function startCleaning(reportId) {
  const report = updateReportStatus(reportId, 'cleaning');
  notifyUser(report.reporterId, {
    reportId, title: 'Cleanup in progress', message: 'The cleaner is currently handling the garbage.', icon: '🧹',
  });
  return report;
}

export function completeCleanup(reportId, completionImageUrl) {
  const report = updateReportStatus(reportId, 'completed', { completionImageUrl });
  notifyUser(report.reporterId, {
    reportId, title: 'Garbage cleaned', message: 'Your reported garbage has been marked as cleaned. Thank you!', icon: '🟢',
  });
  return report;
}

export function flagReport(reportId, reason, byUserId) {
  reportsCache = reportsCache.map(r => {
    if (r.id !== reportId) return r;
    return { ...r, flags: [...(r.flags || []), { reason, byUserId, at: nowISO() }] };
  });
  const updated = getReportById(reportId);
  fsSet('reports', reportId, stripId(updated));
}

// ---------------- Notifications ----------------
export function getNotifications() { return notificationsCache; }
export function getNotificationsForUser(userId) {
  return notificationsCache.filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function notifyUser(userId, { reportId, title, message, icon }) {
  const notif = {
    id: uid('notif'), userId, reportId: reportId || null, title, message, icon: icon || '🔔',
    isRead: false, createdAt: nowISO(),
  };
  notificationsCache.unshift(notif);
  fsSet('notifications', notif.id, stripId(notif));
}
export function markNotificationRead(id) {
  notificationsCache = notificationsCache.map(n => (n.id === id ? { ...n, isRead: true } : n));
  fsSet('notifications', id, { isRead: true });
}
export function markAllRead(userId) {
  notificationsCache = notificationsCache.map(n => (n.userId === userId ? { ...n, isRead: true } : n));
  notificationsCache.filter(n => n.userId === userId).forEach(n => fsSet('notifications', n.id, { isRead: true }));
}
export function unreadCount(userId) {
  return notificationsCache.filter(n => n.userId === userId && !n.isRead).length;
}

export { uid, nowISO };
