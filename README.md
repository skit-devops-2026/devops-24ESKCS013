# Student Hub — Academic Management Platform

> A full-stack academic management platform designed for university students to track coursework, manage tasks, record lecture notes, and master attendance exam eligibility with integrated Attendance Intelligence.

---

## Author & Project Metadata

| Roll No. | Name | GitHub Username | Role |
|---|---|---|---|
| 24ESKCS013 | Abhimanyu Single Rathore | Abhimanyu2211 | Full-Stack Architect & Lead Developer |

---

## Architecture & Technology Stack

```
┌──────────────────────────────────────────────────────────┐
│                   React + TypeScript Client              │
│       Vite • Design Tokens (Light/Dark) • Recharts       │
│      @dnd-kit Kanban • Split-Pane Markdown • DOMPurify   │
└────────────────────────────┬─────────────────────────────┘
                             │  HTTP / JSON / Cookies
                             ▼
┌──────────────────────────────────────────────────────────┐
│                    Express REST API                      │
│        Helmet Security Headers • Express Rate Limit      │
│      JWT Cookie Authentication • Role-Based Access (RBAC)│
└────────────────────────────┬─────────────────────────────┘
                             │  Mongoose ODM
                             ▼
┌──────────────────────────────────────────────────────────┐
│                   MongoDB Database                       │
│     Compound Indexes • Full-Text Index • Data Isolation  │
└──────────────────────────────────────────────────────────┘
```

* **Frontend**: React 18, TypeScript, Vite, Recharts, `@dnd-kit/core`, `@dnd-kit/sortable`, DOMPurify, Lucide React (Zero emojis).
* **Backend API**: Node.js, Express, TypeScript, Helmet, Cookie-Parser, Express Rate Limit, Zod schema validation.
* **Database & Persistence**: MongoDB via Mongoose with multi-tenancy isolation and compound indexes.
* **Testing Engines**: Node.js Native Test Runner (`node:test`, `node:assert/strict`) with `tsx` and experimental type stripping.

---

## Flagship Features

### 1. Attendance Intelligence
* **Multi-Format ERP Ingestion**: Copy-paste TSV, pipe-delimited tables, space-separated records, or CSV files from university ERP portals.
* **Transparent Counting Policies**:
  * `Standard (Present + OD)`: $\text{Attended} = P + OD$; $\text{Conducted} = P + OD + M + A$
  * `Compensatory Makeup`: $\text{Conducted} = \text{Attended} + \max(0, A - M)$
  * `Strict (Present Only)`: $\text{Attended} = P$; $\text{Conducted} = P + A$
  * `Official ERP Direct`: Uses institutionally reported percentage directly for industrial training/seminars.
* **Pure Integer Recovery Math Engine**:
  * Minimum consecutive classes to restore $\ge 75\%$ eligibility:
    $$\text{needed} = \left\lceil \frac{\text{threshold} \times C - 100 \times A}{100 - \text{threshold}} \right\rceil$$
  * Maximum skippable classes without falling below $75\%$ ("Can I Bunk?" calculator):
    $$\text{skippable} = \left\lfloor \frac{100 \times A - \text{threshold} \times C}{\text{threshold}} \right\rfloor$$
* **Interactive What-If Scenario Simulator**: Instant 60fps sliders to forecast attendance percentage and safe bunker margins across custom threshold targets ($60\%$ to $85\%$).
* **Cross-Boundary Parity Test**: Automated test verifying 1,000+ permutations ensuring client-side projections and server-side evaluations remain mathematically identical.

### 2. Assignments & Kanban Board
* **Drag-and-Drop Columns**: Smooth movement across **To Do** (`pending`), **In Progress** (`in_progress`), and **Completed** (`completed`) via `@dnd-kit`.
* **Accessible Keyboard Controls**: Accessible action buttons on every card allow non-mouse navigation and instant state transitions.
* **Overdue Highlighting**: Automatic detection of past-due tasks with crimson status badges and due-date highlighting.
* **Optimistic Updates & Instant Rollback**: UI updates immediately upon drag; any network failure triggers a rollback to the prior state with a toast alert.

### 3. Personal Notebook & Markdown Engine
* **Split-Pane Editor on Desktop**: Live side-by-side editing with markdown input on the left and rendered preview on the right.
* **Mobile Edit/Preview Tabs**: Responsive tabbed interface for comfortable editing on smaller viewports.
* **DOMPurify Sanitization**: Strict XSS prevention ensuring embedded scripts, event handlers, and dangerous protocols are completely stripped before rendering.
* **Tag System & Pinning**: Categorize notes by course or concept with interactive hashtag pills; pin critical formulas and summaries to the top of your notebook.

### 4. Authoritative Study Timer & Analytics
* **Server-Authoritative Focus**: Pomodoro focus timer that survives page reloads, browser crashes, or device switches; paused duration is strictly deducted from net study time.
* **Recharts Weekly Analytics**: Interactive bar chart displaying daily focus minutes over the past 7 days, styled with dynamic CSS tokens for light and dark themes.
* **Study Ledger**: Detailed historical table tracking subject codes, net study minutes, and completion timestamps.

### 5. Academic Goals & Auto-Linking
* **Live System Auto-Linking**:
  * Link a goal to **Attendance** to auto-sync with course attendance percentage.
  * Link to **Task Completion** to auto-track completed assignments.
  * Link to **Study Focus** to auto-accumulate focus study hours.
* **Side-Effect Free In-Memory Evaluation**: `GET /api/goals` and `GET /api/goals/summary` compute live progress dynamically in memory without mutating database records on read.
* **Drop-Below Reversion Rule**: If linked metrics fall (e.g. attendance drops after missing classes), goal status dynamically reverts from `completed` to `active`.
* **Explicit Persistent Synchronization**: `POST /api/goals/recompute` allows manual or scheduled persistent updates.

### 6. Administration & Oversight
* **Role-Based Access Control (RBAC)**: Secure separation between `student` and `admin` roles.
* **Student Registry**: Paginated student directory with profile inspection, course rosters, and account status controls.
* **Institutional Notice Board**: Campus-wide bulletins and examination notifications with draft/publish workflows and student unread badges.
* **Resource Library**: Curated repository for syllabi, lab manuals, and previous year question papers with URL safety validation.

---

## Visual Previews & Screenshots

Student Hub includes pre-configured preview comps across both Light and Dark themes. When running locally or evaluating on cloud deployments, sign in with the **Demo Student account** (`demostudent99@university.edu` / `DemoStudent@123`) to view and capture screens with full academic data.

### Core Interface Preview Directory

| Interface View | Capabilities Highlighted | Light Theme Preview | Dark Theme Preview |
|---|---|---|---|
| **Course Dashboard** | Recharts visual analytics, attendance status, quick tasks, onboarding checklist | [Light Preview](docs/screenshots/dashboard-light.png) | [Dark Preview](docs/screenshots/dashboard-dark.png) |
| **Attendance Intelligence** | Multi-format ERP parser, recovery math calculations, live what-if simulation sliders | [Light Preview](docs/screenshots/attendance-light.png) | [Dark Preview](docs/screenshots/attendance-dark.png) |
| **Kanban Assignments** | Drag-and-drop workflow across Pending, In Progress, and Completed columns | [Light Preview](docs/screenshots/tasks-kanban-light.png) | [Dark Preview](docs/screenshots/tasks-kanban-dark.png) |
| **Markdown Notebook** | Split-pane markdown editor with live preview, hashtag filtering, and DOMPurify sanitization | [Light Preview](docs/screenshots/notes-light.png) | [Dark Preview](docs/screenshots/notes-dark.png) |
| **Study Focus Timer** | Authoritative Pomodoro tracker with 25/5 and 50/10 presets and weekly focus chart | [Light Preview](docs/screenshots/study-timer-light.png) | [Dark Preview](docs/screenshots/study-timer-dark.png) |

### Recommended Screenshot Capture Checklist (Demo Student Account)

When preparing documentation or portfolio presentations, capture the following screens:
1. `docs/screenshots/landing-page-light.png` / `dark.png` — Public landing page hero with theme toggle and platform summary.
2. `docs/screenshots/dashboard-light.png` / `dark.png` — Student dashboard showing 11 enrolled courses, Recharts weekly study graph, and attendance health.
3. `docs/screenshots/attendance-light.png` / `dark.png` — Attendance Intelligence page with CSUL501 shortage recovery math and what-if simulation sliders.
4. `docs/screenshots/tasks-kanban-light.png` / `dark.png` — Kanban assignment board with drag-and-drop columns and priority badges.
5. `docs/screenshots/notes-light.png` / `dark.png` — Lecture notes split-pane editor with live markdown preview and tag chips.
6. `docs/screenshots/study-timer-light.png` / `dark.png` — Focus timer displaying active Pomodoro countdown and weekly focus ledger.
7. `docs/screenshots/admin-students-light.png` — Institutional admin directory with student search and profile inspection.

*Automated capture script*: Run `node scripts/capture-screenshots.js` while local dev servers are active to refresh all PNG screenshots automatically.

---

## Security & Reliability Architecture

* **Helmet HTTP Headers**: Configured Content Security Policy, HTTP Strict Transport Security (HSTS), X-Frame-Options (`DENY`), and MIME-sniffing protection.
* **Rate Limiting**: Tiered IP rate limiting via `express-rate-limit` protecting authentication endpoints and general API routes against brute-force attacks.
* **Data Isolation**: Multi-tenancy query enforcement ensuring students can only view and mutate their own subjects, tasks, goals, notes, and timers.
* **Search Sanitization**: `escapeRegExp` utility preventing regular expression denial of service (ReDoS) and query injection in keyword searches.
* **Zero `any` Types**: Strict TypeScript definitions across the entire codebase.

---

## Getting Started

### Prerequisites
* Node.js v20+ or v22+
* MongoDB v6.0+ running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/Abhimanyu2211/student-hub.git
cd student-hub

# Install server and client dependencies
npm install --prefix server
npm install --prefix client
```

### 2. Environment Configuration
Copy the example environment templates:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**`server/.env` parameters**:
```env
PORT=5001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/student-hub
JWT_SECRET=student_hub_dev_secret_key_minimum_32_bytes_safe_default
JWT_EXPIRES_IN=7d
```

**`client/.env` parameters**:
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### 3. Seed Demo Data (Optional)
To populate realistic sample courses, tasks, notes, goals, and focus sessions for the Demo Student account:
```bash
npm run seed:demo --prefix server
```
*Note: This script strictly modifies only `demostudent99@university.edu` and never alters any other student account.*

### 4. Run Development Servers
```bash
# Launch both API server (port 5001) and Vite client (port 5173) concurrently:
npm run dev

# Or launch independently:
npm run dev:server
npm run dev:client
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Database Backup & Safe Backfill Execution

Before executing subject backfills on existing production accounts, take a verified dump:

```bash
# Export the database cleanly:
mongodump --db student-hub --out ./backup-before-backfill

# 1. Run backfill dry-run for a specific user to preview actions safely (creates 0 records):
npm run --prefix server backfill-subjects -- --user b241105@gmail.com --dry-run

# 2. Run real backfill only after reviewing dry-run counts:
npm run --prefix server backfill-subjects -- --user b241105@gmail.com

# 3. Confirm idempotency (re-running dry-run creates 0 records):
npm run --prefix server backfill-subjects -- --user b241105@gmail.com --dry-run
```

---

## Code Quality & Test Suites

Student Hub maintains exhaustive test coverage spanning unit, integration, and mathematical parity invariants:

```bash
# Run server test suite (131 integration & unit tests)
npm test --prefix server

# Run client test suite (11 unit & invariant tests)
npm test --prefix client

# Run ESLint code quality checks across full stack
npm run lint

# Format code with Prettier
npm run format

# Run full project test script
npm test
```

### Verified Test Summary
* **Server**: 131 tests passing across 32 suites (`Admin Subsystem`, `Attendance Invariants`, `Multi-Tenancy Isolation`, `Task Workflows`, `Goal Auto-Linking In-Memory Parity`, `Study Timer Sync`, `Notes Partial Word Search`, `Cross-Boundary Client/Server Parity`).
* **Client**: 11 tests passing across 2 suites (`Attendance Math Engine Proofs`, `Markdown Parsing & XSS Prevention`).
* **Parity Test**: 1,000+ cross-boundary mathematical permutations verified identical between client slider calculations and server attendance formulas.

---

## License

This project is licensed under the ISC License.
