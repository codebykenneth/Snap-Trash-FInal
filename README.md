# Snap Trash

**Snap It. Report It. Clean It.**
Report garbage. Connect with local cleaners. Keep your community clean.

Snap Trash is a community garbage-reporting and cleanup-coordination platform. A reporter snaps a photo and location, the system finds **registered, verified cleaners serving that area**, notifies them, and the reporter tracks the job from *Waiting* to *Completed*. There is no points/badge/leaderboard system anywhere in the app — the workflow is purely **SNAP → REPORT → NOTIFY NEARBY CLEANERS → ACCEPT → CLEAN → COMPLETE**.

This first version is a **no-build, dependency-free demo**: plain HTML/CSS/JavaScript (ES modules) with Leaflet for maps, and LocalStorage standing in for a real backend/database.

---

## 1. Installation

No build step or package manager is required — it's static HTML/JS/CSS. You only need any static file server (browsers block ES module `import` from `file://` URLs, so don't just double-click `index.html`).

```bash
# Option A — Python (built into most systems)
cd snap-trash
python3 -m http.server 8080

# Option B — Node
cd snap-trash
npx serve .

# Option C — VS Code
# install the "Live Server" extension, right-click index.html → "Open with Live Server"
```

## 2. Run

Open your browser to:

```
https://snap-trash-829dd.web.app/#/
```

The app is responsive and works the same on desktop Chrome/Firefox/Safari and on Android/iOS mobile browsers. "Take Photo" opens the device camera on phones (via `capture="environment"`) and falls back to a normal file picker on desktop.

## 3. Demo login credentials

| Role     | Email                    | Password    |
|----------|--------------------------|-------------|
| Reporter | demo@snaptrash.com       | demo123     |
| Cleaner  | cleaner@snaptrash.com    | cleaner123  |
| Admin    | admin@snaptrash.com      | admin123    |

These are clearly demo-only credentials, stored in plaintext in LocalStorage for the purpose of this offline demo (see `js/data.js`, `createUser`/`findUserByEmail`). They are structured so the password check can be swapped for a real hashed-password API call without touching any UI code — see §5.

You can also sign up new **Reporter** or **Cleaner** accounts from the login screen. New cleaner accounts start as `Pending Verification` and won't receive live assignments until an admin (use the Admin demo account) approves them under **Admin → Cleaners**.

## 4. The report → notify → cleanup workflow

1. **Snap & Report** — A reporter opens *Report Garbage*, takes/uploads a photo (required), picks a category, sets a location (current GPS, a quick search of known local areas, manual entry, or tapping the map), adds an optional description, and submits.
2. **Notify nearby cleaners** — `createReport()` in `js/data.js` calls `findNearbyCleaners()`, which looks at every **verified + active** cleaner and checks whether the report falls inside their named service area or within their configured response radius (haversine distance). Only those cleaners are notified — nobody else in the system sees it. The report's status becomes `Cleaner Notified`.
3. **Accept** — A matching cleaner sees the report on their **Nearby Reports** dashboard, opens it, and taps *Accept Cleanup*. The report is now assigned to that cleaner (`Cleanup Accepted`); other nearby cleaners who were notified get an "already accepted" notice instead.
4. **Clean** — The cleaner walks the job through **On the Way → Cleaning**, then uploads a completion photo and taps **Mark Cleanup as Completed**.
5. **Track** — At every step the reporter gets a notification and can watch the same timeline update live on **My Reports → report details** (Waiting → Notified → Accepted → On the Way → Cleaning → Completed), including a before/after photo comparison once finished.
6. **Admin oversight** — Admins verify/suspend cleaners, reassign or reject reports, review anything flagged as fake/duplicate/wrong-location/inappropriate, and see aggregate stats under **Admin → Analytics**.

All of this happens client-side against LocalStorage in the demo — no server round trip — but the function boundaries (`createReport`, `acceptReport`, `setOnTheWay`, `startCleaning`, `completeCleanup`, `notifyUser`) are written so each one maps directly onto a future REST/WebSocket call.

## 5. Connecting a real backend later

The demo was deliberately structured so only `js/data.js` needs to be rewritten — every page module (`pages_*.js`) calls the functions exported from `data.js` (e.g. `createReport`, `acceptReport`, `getReportsByReporter`) rather than touching `localStorage` directly. To go live:

1. **Stand up the schema.** The tables below are already the shape the app expects:
   - `users(id, name, email, password_hash, role, status, created_at)`
   - `garbage_reports(id, reporter_id, category, description, image_url, latitude, longitude, location_name, status, created_at, updated_at)`
   - `cleaners(id, user_id, organization, verification_status, service_area, latitude, longitude, service_radius, is_active)`
   - `cleanup_assignments(id, report_id, cleaner_id, accepted_at, started_at, completed_at, completion_image_url)`
   - `notifications(id, user_id, report_id, title, message, is_read, created_at)`
   - `cleanup_events(id, title, description, location, date, organizer)` *(reserved for future community cleanup-event scheduling)*
2. **Swap the storage functions.** Replace the LocalStorage `read`/`write` calls in `js/data.js` with `fetch()` calls to a Node.js + Express (or any) API backed by PostgreSQL/MySQL. Keep the same function names/signatures (`createUser`, `createReport`, `acceptReport`, …) so no page file needs to change.
3. **Real image storage.** Replace `fileToResizedDataUrl()` in `js/utils.js` with an upload to cloud storage (S3, GCS, etc.) that returns a URL to store in `image_url` / `completion_image_url`.
4. **Real-time notifications.** Replace the synchronous `notifyUser()` writes with a WebSocket/Socket.IO push (or Firebase Cloud Messaging for mobile) so cleaner dashboards update without a page refresh; keep writing to the `notifications` table for the notification-center history.
5. **Authentication.** Replace the plaintext password check in `pages_public.js`'s login handler with a real auth endpoint (hashed passwords, sessions/JWT). `getSession()`/`setSession()` in `data.js` can then store a token instead of a raw user id.
6. **Geocoding.** Replace the `KNOWN_PLACES` mini-gazetteer in `pages_reporter.js` with a real geocoding API (e.g. Nominatim/OpenStreetMap, Google Geocoding) for the "search location" step.

Recommended production stack (not required for this demo): **React + Vite** frontend, **Node.js + Express** API, **PostgreSQL/MySQL**, **Socket.IO** for real-time, **Firebase Cloud Messaging** for push, **OpenStreetMap + Leaflet** for maps (already used here), cloud object storage for images.

---

## Project structure

```
snap-trash/
├── index.html                # shell: topbar, #app router outlet, bottom nav, toast/modal roots
├── css/
│   └── style.css             # design tokens, components, responsive rules
├── assets/
│   └── logo.svg              # original camera+leaf mark
├── js/
│   ├── data.js                # LocalStorage "database" + all business logic (the layer to replace with a real API)
│   ├── utils.js                # DOM helpers, toasts, modals, image resize, formatting
│   ├── maps.js                 # Leaflet helpers (markers, radius circles, geolocation)
│   ├── components.js           # shared HTML fragments (report card, notification item)
│   ├── router.js                # tiny hash router with role guards
│   ├── pages_public.js          # Landing, Login/Signup, Recycling Guide
│   ├── pages_reporter.js        # Report wizard, My Reports, Report Details, Notifications, Profile, Garbage Map
│   ├── pages_cleaner.js         # Cleaner Dashboard, Nearby Reports, My Assignments, Assignment details, Service Area
│   ├── pages_admin.js           # Admin Dashboard, Reports, Cleaners (verification), Users, Service Areas, Analytics, Settings
│   └── app.js                   # route table, role-based navigation, bootstraps everything
└── README.md
```

## What's intentionally NOT here

No points, XP, badges, achievements, leaderboards, rankings, or rewards anywhere in the app — the whole experience is built around reporting, matching, and cleanup tracking only.
