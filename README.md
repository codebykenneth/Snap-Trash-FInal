# 🗑️ Snap Trash
### *Snap It. Report It. Clean It.*

> **A Community Garbage-Reporting & Cleanup-Coordination Platform — Prototype Overview**

---

## 📄 Abstract

Uncollected garbage is one of the most visible, everyday environmental problems a community faces — yet reporting it is often frustrating and directionless. A resident who spots an illegal dump site or an overflowing collection point rarely knows **who to tell**, and even when they do report it, there is usually **no way to track what happens next**.

**Snap Trash** proposes a simple, focused answer: let anyone **photograph and pin** a garbage problem, automatically **match it to verified local cleaners** who actually cover that area, and let the reporter **watch the job move from reported to resolved** — with no gamification, no leaderboard, and no distraction from the actual goal: **a cleaner neighborhood.**

---

## 🌍 1. Background & Context

Community cleanliness initiatives commonly fail for one of three reasons:

| Failure Point | What Usually Happens |
|---|---|
| 📵 **No clear reporting channel** | Complaints go to social media, informal group chats, or nowhere at all |
| 🕳️ **No accountability loop** | A report is made, but the reporter never learns if — or when — it was handled |
| 🎮 **Over-gamified apps** | Some platforms turn cleanup into a points/badge competition, which can shift focus away from the actual problem |

Snap Trash is deliberately designed **against** the third pattern. There is no points system, no XP, no leaderboard anywhere in the platform — the entire experience is built around one clean loop: **Snap → Report → Notify → Accept → Clean → Complete.**

---

## ❗ 2. Statement of the Problem

1. 📸 **"I see garbage — now what?"**
   *(Residents have no simple, structured way to report a specific location and photo of a problem.)*

2. 🧭 **"Who actually handles this, and do they even serve my area?"**
   *(Cleanup groups and individuals aren't matched to reports by actual location coverage.)*

3. 👀 **"Did anyone even see my report?"**
   *(Without status tracking, a report disappears into silence — and trust in the system erodes.)*

Snap Trash's core workflow exists specifically to close these three gaps.

---

## 🎯 3. Objectives of the System

**General Objective**
> To provide a lightweight, trackable platform that connects everyday citizens reporting garbage problems with verified local cleaners equipped to respond.

**Specific Objectives**
- ✅ Let any reporter **submit a garbage report** with a required photo, category, and precise location
- ✅ Automatically **match reports to verified, active cleaners** serving that specific area (via service area / radius matching)
- ✅ Give cleaners a clear **Accept → On the Way → Cleaning → Completed** workflow
- ✅ Let reporters **track their report's status in real time**, end to end
- ✅ Give admins tools to **verify cleaner legitimacy** and moderate flagged/fake reports
- ✅ Deliberately **exclude gamification** — no points, badges, or rankings — to keep the focus on outcomes, not competition

---

## 👥 4. Stakeholder Overview

| Role | Core Need | What the System Gives Them |
|---|---|---|
| 📷 **Reporter** | *"See it, report it, know it's handled"* | Photo/location reporting, live status tracking, notifications |
| 🧹 **Cleaner** | *"Show me jobs I can actually reach"* | Nearby-report matching by service area, accept/status workflow |
| 🛡️ **Admin** | *"Keep the system trustworthy"* | Cleaner verification, report moderation, analytics |

Cleaners don't just self-list — new cleaner accounts start as **Pending Verification** and can't receive assignments until an admin approves them, which keeps the matching pool credible.

---

## 🌱 5. Significance of the Project

- **To Residents:** Turns a vague sense of "someone should clean this up" into a trackable action with a visible outcome.
- **To Local Cleanup Groups / Individuals:** Filters incoming reports to only the ones within their actual service area, instead of an undifferentiated flood of citywide complaints.
- **To Local Governance / Admins:** Provides a lightweight verification and moderation layer, so the platform isn't just crowdsourced noise.
- **To the Broader Conversation on Civic Tech:** Demonstrates that community-impact tools don't need points and leaderboards to drive participation — a transparent, trackable loop can be motivation enough.

---

## 🧭 6. Scope and Design Choices

**In Scope**
- ✔️ Photo + location-based garbage reporting (GPS, map tap, or search)
- ✔️ Automatic nearby-cleaner matching via service area / radius (haversine distance)
- ✔️ Full status lifecycle: *Waiting → Notified → Accepted → On the Way → Cleaning → Completed*
- ✔️ Before/after photo comparison once a job is completed
- ✔️ Admin verification of cleaners and moderation of flagged reports

**Deliberately Excluded**
- ❌ Points, XP, badges, achievements, leaderboards, or rankings of any kind
- ❌ A live production backend *(this version runs on LocalStorage as a stand-in database)*

> 🔍 **A note on the "no gamification" rule:** This isn't an oversight — it's a design position. The goal of Snap Trash is a cleaner community, not a competition to earn points for reporting trash. Every part of the workflow is built to reinforce *accountability*, not *scorekeeping*.

---

## 🧱 7. Current Form: A No-Build Demo

This first version intentionally has **zero backend dependency** — plain HTML/CSS/JavaScript with Leaflet for maps and LocalStorage standing in for a real database. This was a deliberate choice to prove out the **workflow and matching logic** before investing in infrastructure, with the codebase already structured (`js/data.js` as the single data layer) so a real API can be swapped in without touching any page-level code.

---

## 🚀 8. Future Direction

| Planned Enhancement | Purpose |
|---|---|
| 🗄️ Real backend (Node/Express + PostgreSQL) | Move from LocalStorage to a persistent, multi-user database |
| ☁️ Cloud image storage | Replace local data-URL images with real hosted photo storage |
| 🔔 Real-time push notifications | Update cleaner dashboards instantly via WebSockets / Firebase Cloud Messaging |
| 🔐 Real authentication | Hashed passwords + sessions/JWT in place of the demo login |
| 🗺️ Real geocoding | Replace the demo location gazetteer with a live geocoding API |

---

## 🏁 9. Conclusion

Snap Trash is built around a simple, uncynical idea:

> 🧹 *A community stays clean when reporting a problem is easy, response is fast, and everyone can see the loop close.*

No points to chase. No leaderboard to climb. Just **Snap → Report → Notify → Accept → Clean → Complete.**