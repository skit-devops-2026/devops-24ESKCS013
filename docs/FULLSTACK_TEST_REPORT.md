# Student Hub — Full-Stack Integration Testing, Bug Fixing & Security Report

**Document Version:** 1.0.0  
**Phase:** Phase 7 (Full-Stack Hardening & Verification)  
**Date:** October 26, 2026  
**Candidate:** Abhimanyu Single Rathore (Roll No: `24ESKCS013`)  
**College Repository:** `skit-devops-2026/devops-24ESKCS013`  
**Personal Repository:** `Abhimanyu2211/student-hub`  
**Environment:** macOS (Darwin ARM64 / Apple Silicon M4), Node.js v26.0.0, npm 11.12.1

---

## 1. Executive Summary

This report documents the end-to-end integration testing, security audit, bug remediation, and data isolation verification performed on **Student Hub**.

The project is structured as a full-stack monorepo featuring a **React 18 + Vite** frontend, **Express + TypeScript** backend, and **MongoDB + Mongoose** persistence layer, with all 30 legacy HTML/CSS/JS assets fully preserved.

Testing verified **76 automated backend tests across 20 test suites** with zero failures, 100% clean TypeScript builds, and zero console warnings.

---

## 2. Test Environment & Databases Used

1. **Test Database Engine:** `mongodb-memory-server` v11.3.0.
   - Provides completely isolated, ephemeral in-memory MongoDB instances for every test suite execution.
   - Ensures zero data pollution or destructive operations against development or production databases.
2. **Local Live Database Engine:** Local `mongod` listening on `127.0.0.1:27017` (`student-hub`).
   - Verified via `GET /api/health/db`.
3. **HTTP Simulation Engine:** `supertest` v7.0.0 with full cookie session persistence (`student_hub_token`).

---

## 3. Test Suites & Commands Executed

### 3.1 Commands Executed
| Command | Purpose | Result |
|---|---|---|
| `npm test --prefix server` | Runs Node.js native test runner against all TypeScript test suites in `server/` | **PASS** (76/76 tests passed) |
| `npm run lint --prefix client` | TypeScript type-checker (`tsc --noEmit`) | **PASS** (0 errors) |
| `npm run build --prefix client` | Vite production bundle compilation (`tsc -b && vite build`) | **PASS** (Built in 373ms) |
| `bash scripts/test.sh` | Shell smoke tests verifying legacy HTML structure, auth pages, and JS modules | **PASS** (All checks passed) |
| `npm test` | Root-level orchestrator executing backend, client, and smoke test suites sequentially | **PASS** (All passed) |

### 3.2 Automated Test Breakdown (76 Tests Across 20 Suites)
1. **API Foundation (`app.test.ts` - 3 tests):**
   - `GET /api/health` returns HTTP 200 with service metadata and uptime.
   - `GET /api/health/db` reports database connectivity without exposing connection secrets.
   - Unhandled routes return structured HTTP 404 JSON.
2. **Authentication & Identity (`auth.test.ts` - 10 tests):**
   - Registration with password hashing (bcrypt, salt factor 12).
   - Duplicate email rejection.
   - Duplicate roll number rejection.
   - Input validation (email regex, min-length password).
   - Login with credential verification and `HttpOnly` JWT cookie issuance.
   - Login failure on invalid password (401).
   - Current user session resolution via `GET /api/auth/me`.
   - Rejection of unauthenticated requests (401).
   - Cookie invalidation upon `POST /api/auth/logout`.
3. **Student Academic Features (`student-features.test.ts` - 21 tests):**
   - Course curriculum creation with compound unique index `{ userId, code }`.
   - Course isolation between students.
   - Task CRUD, status transitions, and `GET /api/tasks/summary` metrics.
   - Goal creation, progress updates, and auto-completion.
   - Notes creation, tag indexing, and search.
   - Server-authoritative Pomodoro study timer with reload resilience, pause/resume calculations, and history logs.
4. **Admin Management & RBAC (`admin-features.test.ts` - 24 tests):**
   - Rejection of student tokens on admin endpoints (403 Forbidden).
   - Paginated student directory with search filters and safe field serialization (no password hashes).
   - Student inspection with enrolled courses and task progress.
   - Student account suspension and activation.
   - Immediate rejection of suspended accounts on login and protected routes.
   - Self-lockout prevention for requesting administrators.
   - Announcement drafting, publication rules, audience filtering, and deletion.
   - Resource library management with safe HTTP/HTTPS URL validation.
   - System KPIs and attendance defaulter calculations (separating unique students from course shortage records).
5. **Security Hardening & Data Isolation (`security-hardening.test.ts` - 18 tests):**
   - Cross-user data isolation: Student B cannot read, update, or delete Student A's notes, goals, tasks, or subjects by ID (404/403).
   - Mass assignment prevention: Role injection in registration (`role: 'admin'`) is strictly ignored and forced to `'student'`.
   - ReDoS / Regex injection resistance: Malicious search strings (`(`, `[`, `*`, `.*`, `\`) return 200 OK without crashing.
   - System diagnostics and accurate service naming.

---

## 4. Bugs Discovered & Fixes Applied

During Phase 7 hardening, the following bugs and security concerns were identified and resolved:

| # | Severity | Defect Discovered | Root Cause | Remediated Solution |
|---|---|---|---|---|
| 1 | **High** | Search crash (ReDoS / Unhandled Regex Error) | Raw user search strings in `/api/notes`, `/api/admin/students`, and `/api/resources` were passed unescaped to `new RegExp(...)`. Entering `(` or `[` caused an uncaught `SyntaxError`. | Implemented `escapeRegExp(str)` in `server/src/utils/security.ts` to sanitize all special regex characters prior to querying. |
| 2 | **Medium** | Missing Student Notice & Resource Views | While administrators could publish announcements and resources, students lacked dedicated React views to browse them. | Built `StudentAnnouncementsPage.tsx` and `StudentResourcesPage.tsx`, integrated them into `App.tsx` and `Navbar.tsx`, and added service methods in `student.service.ts`. |
| 3 | **Low** | Unused Import in `App.tsx` | `AdminDashboardPreview` was orphaned after replacing it with `AdminDashboardPage.tsx`. | Cleaned unused imports and aligned TypeScript compilation. |
| 4 | **Low** | Mongoose Deprecation Warning | Mongoose 9 issued a deprecation warning on `{ new: true }` in `findOneAndUpdate()`. | Updated options across all route handlers to `{ returnDocument: 'after', runValidators: true }`. |

---

## 5. Security & Data Isolation Summary

- **Authentication Storage:** Session tokens (`student_hub_token`) are strictly stored in `HttpOnly`, `SameSite=Lax` cookies, preventing XSS-based token theft.
- **Credential Protection:** Passwords hashed with bcrypt (salt rounds = 12). User schema explicitly sets `passwordHash: { select: false }` to prevent accidental leakage in user queries.
- **Account Status Enforcement:** Suspended students are blocked during login and on every protected route via `requireAuth` middleware.
- **Server-Side Authorization:** Every student database operation enforces `{ _id: id, userId: req.user._id }`. Changing the ID in request headers or URLs returns 404.
- **Role-Based Access Control:** All admin endpoints enforce `requireRole('admin')`. Students attempting to access admin APIs receive `HTTP 403 Forbidden`.
- **URL Sanitization:** Resource URLs must strictly match `^https?://`. Dangerous schemes (`javascript:`, `file:`, `data:`) are rejected.

---

## 6. Manual Verification Guide for College Viva

For live demonstration before the external examiner:

### Step 1: Start Applications
```bash
# Terminal 1: Backend Server (runs on port 5001)
cd server
npm run dev

# Terminal 2: React Frontend (runs on port 5173 with proxy to 5001)
cd client
npm run dev
```

### Step 2: Live Viva Flow
1. **System Diagnostics:** Open `http://localhost:5173/health`. Point out the real-time connectivity between React, Express, and MongoDB.
2. **Student Registration & Session:** Register a new student (`http://localhost:5173/register`). Open Developer Tools -> Application -> Cookies; verify `student_hub_token` is `HttpOnly`.
3. **Academic Productivity:**
   - Create a task under Tasks, change status to In Progress, then Completed.
   - Create an academic goal and increment progress.
   - Start the Pomodoro focus timer under Study Timer; refresh the page to prove that time continues ticking on the server without clock drift.
   - Add a lecture note and test search with special characters (e.g. `(algorithms)`).
4. **Data Isolation Demonstration:**
   - Log out, register a second student account.
   - Verify that the second student sees 0 tasks, 0 notes, and 0 goals from the first student.
5. **Administrator Capabilities:**
   - Provision an admin via `npm run create-admin --prefix server`.
   - Log in as admin (`http://localhost:5173/login`).
   - Inspect the live KPI cards on `/admin/dashboard` (Notice how attendance defaulters are calculated based on the 75% threshold).
   - In `/admin/students`, click "Suspend" on a test student.
   - Attempt to log in with that student in an incognito window; show the examiner the `HTTP 403 Account Suspended` error.
   - Reactivate the student from the admin console; verify login works again immediately.

---

## 7. Remaining Known Issues & Limitations

- Local development runs backend on port `5001` because macOS AirPlay Receiver reserves port `5000`. Vite proxy is pre-configured to `5001`.
- Legacy static files (`index.html`, `auth/*.html`, `student/*.html`, `admin/*.html`) remain fully functional for historical grading criteria.
