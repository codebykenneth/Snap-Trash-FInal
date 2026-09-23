// ============================================================
// SNAP TRASH — reusable render fragments
// ============================================================
import { CATEGORIES, labelForCategory, distanceKm } from './data.js';
import { statusBadge, timeAgo, placeholderPhoto, escapeHtml } from './utils.js';

export function categoryEmoji(catId) {
  return (CATEGORIES.find(c => c.id === catId) || {}).em || '🗑️';
}

export function reportCardHtml(report, { fromLat, fromLng, actionsHtml = '' } = {}) {
  const dist = (fromLat != null && fromLng != null) ? distanceKm(fromLat, fromLng, report.lat, report.lng) : null;
  const img = report.imageUrl || placeholderPhoto(labelForCategory(report.category));
  return `
    <div class="report-card" data-report-id="${report.id}">
      <img class="report-thumb" src="${img}" alt="${escapeHtml(labelForCategory(report.category))} report photo" />
      <div class="report-card-body">
        <h4>${categoryEmoji(report.category)} ${escapeHtml(labelForCategory(report.category))}</h4>
        <div class="meta-line">📍 ${escapeHtml(report.locationName)}</div>
        <div class="meta-line">
          ${dist !== null ? `📏 ${dist.toFixed(1)} km away · ` : ''}🕒 ${timeAgo(report.createdAt)}
        </div>
        <div class="report-card-foot">
          ${statusBadge(report.status)}
          <div style="display:flex; gap:8px;">${actionsHtml}</div>
        </div>
      </div>
    </div>
  `;
}

export function notifIconFor(icon) { return icon || '🔔'; }

export function notifItemHtml(n) {
  return `
    <div class="notif-item ${n.isRead ? '' : 'unread'}" data-notif-id="${n.id}" data-report-id="${n.reportId || ''}">
      <div class="notif-icon">${notifIconFor(n.icon)}</div>
      <div class="notif-text" style="flex:1;">
        <strong>${escapeHtml(n.title)}</strong>
        <p>${escapeHtml(n.message)}</p>
      </div>
      <div class="notif-time">${timeAgo(n.createdAt)}</div>
    </div>
  `;
}

export function emptyState(emoji, title, sub) {
  return `<div class="empty-state"><span class="em">${emoji}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(sub || '')}</p></div>`;
}
