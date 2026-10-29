# Student Hub — Comprehensive Viva Voce Master Preparation Pack
**Role**: Full-Stack Academic Management Platform  
**Target Audience**: Viva Voce Examiners, Technical Evaluators & System Architects  
**Author / Presenter**: Student Presenter  
**File Location**: `docs/VIVA_PREP.md`  

---

## SECTION A: Project Pitches

### 1. The 60-Second Elevator Pitch (Spoken Style)
> "Good morning, respected examiners. Today I am presenting **Student Hub**, an enterprise-grade academic management platform designed to solve the chronic problem of academic fragmentation and attendance debarment that college students face every semester. 
> 
> Most students track their academic life across scattered WhatsApp chats, paper diaries, and clunky university ERP portals that only report raw percentages without actionable guidance. Student Hub unifies everything into a single responsive system: Courses, Kanban Task Boards, Auto-linked Academic Goals, Markdown Notes with XSS sanitization, a server-authoritative Focus Study Timer, and our flagship feature: **Attendance Intelligence**.
> 
> Attendance Intelligence doesn't just display numbers. It parses raw ERP tables, accounts for On-Duty and non-classroom event hours, mathematically detects 75% threshold shortages, and tells the student with integer precision exactly how many consecutive classes they must attend to recover, or how many they can safely miss.
> 
> It is built on a clean TypeScript monorepo using React 18, Vite, Express, and MongoDB, backed by 147 automated unit, integration, and mathematical parity tests. Thank you."

---

### 2. The 3-Minute Comprehensive Technical Pitch (Spoken Style)
> "Respected examiners, during my university semesters, I noticed a recurring crisis: students getting debarred from final semester examinations because university ERPs only report static attendance percentages, often lagging behind, and without explaining the mathematical path to recovery. Furthermore, coursework is fragmented: lecture notes sit in Google Drive, assignments in messaging apps, and revision timers on phones.
> 
> To solve this, I architected and built **Student Hub**, a full-stack academic operations platform engineered from first principles using TypeScript across the entire stack.
> 
> On the frontend, we use React 18 and Vite with a custom design system based on CSS variables supporting zero-runtime light and dark modes. We chose not to bloat the client with heavyweight state libraries like Redux or React Query; instead, we implemented clean Context providers for Authentication, Theming, and Toast notifications, maintaining predictable local component state, keyboard-accessible Kanban workflows via `@dnd-kit` with optimistic updates and automatic rollback, and interactive visualizations using Recharts.
> 
> On the backend, we run an Express API on Node.js using MongoDB with Mongoose. Every endpoint is protected by strict Zod schema validation, Helmet security headers, rate limiting, and an authentication system using signed JWTs stored in `httpOnly`, `SameSite=Lax`, secure cookies. Passwords are never stored in plain text—they are hashed using bcrypt with 12 salt rounds. We enforce strict multi-tenant data isolation and Role-Based Access Control, separating Student workflows from administrative student directory inspection and institutional broadcasts.
> 
> What truly sets Student Hub apart is our **Attendance Intelligence Engine**. A student can copy and paste raw attendance tabular text directly from their college portal. Our tokenizer handles tab-separated, pipe-delimited, and CSV streams, maps subject aliases, auto-upserts courses into the subject registry to avoid data desynchronization, and calculates attendance under standard, compensatory, or strict policies. It addresses the notorious discrepancy where non-classroom institutional event hours—such as 24 hours of Techpravah—pull the student's aggregate attendance down from an 81.46% course average to an 80.1% ERP aggregate.
> 
> Our mathematical recovery engine computes the exact ceiling formula to tell a student in shortage—like CSUL501 at 71.05%—that they need exactly 6 consecutive classes to cross 75%. To guarantee reliability, we engineered an automated cross-boundary mathematical parity test that runs 1,000+ permutations between the server calculation engine and the client simulator, guaranteeing zero mathematical divergence.
> 
> The platform is verified by 136 backend tests and 11 frontend tests, full ESLint and Prettier compliance, and a production deployment topology using MongoDB Atlas, Render, and Vercel. I am excited to walk you through the architecture and code."

---

## SECTION B: Question Bank Grouped by Topic

---

### TOPIC 1: Project Overview & Motivation

#### Q1.1: What specific real-world problem does Student Hub solve?
- **Answer**: It solves two problems: academic tool fragmentation and attendance debarment surprises. University students typically juggle attendance portals, to-do lists, notebook apps, and revision timers across different platforms. Most critically, institutional ERPs only display raw attendance figures without explaining how many classes a student must attend to become eligible for exams. Student Hub consolidates these into a single dashboard and provides automated mathematical recovery guidance.
- **File / Function**: `README.md`, `client/src/pages/StudentDashboardPreview.tsx`, `client/src/pages/student/AttendanceIntelligencePage.tsx`.
- **Difficulty**: Basic.
- **Follow-up**: *Why not just use Notion or Google Sheets?*  
  *Answer*: Generic productivity apps lack domain-specific logic. They cannot parse university ERP paste data, cannot compute integer-exact attendance recovery formulas, do not enforce server-authoritative study timing, and do not auto-link academic milestones to actual attendance databases.

#### Q1.2: Who are the primary target personas for this platform?
- **Answer**: There are two primary personas: undergraduate students enrolled in credit-based semester programs requiring 75% attendance compliance, and university academic administrators who need to monitor student rosters, track attendance defaulters, and publish campus-wide bulletins.
- **File / Function**: `server/src/models/User.ts` (`UserRole = 'student' | 'admin'`).
- **Difficulty**: Basic.
- **Follow-up**: *Can a student promote themselves to an admin?*  
  *Answer*: No. The `role` field is protected. Registration defaults strictly to `'student'`. Admin accounts can only be provisioned through our secured CLI script (`server/src/scripts/create-admin.ts`) or direct administrative database seeding.

#### Q1.3: What is the core value proposition of the Attendance Intelligence module?
- **Answer**: Traditional ERP portals simply show a percentage, leaving students to guess how many classes they can afford to miss or need to attend. Our engine calculates the exact integer number of consecutive classes required to reach a threshold (such as 75%), or the number of classes they can safely skip, while accounting for on-duty sanctions and institutional event hours.
- **File / Function**: `server/src/services/attendance-calc.service.ts` (`calculateClassesNeeded`, `calculateSkippableClasses`).
- **Difficulty**: Intermediate.
- **Follow-up**: *What happens if a student has 0 classes conducted?*  
  *Answer*: The engine returns 0 classes needed and 0 classes skippable, safely avoiding division-by-zero errors.

#### Q1.4: How did you ensure data privacy for students?
- **Answer**: Every query in the database filters by the authenticated user's ID (`req.user._id`), preventing students from viewing or mutating records belonging to peers. Session tokens are kept in `httpOnly` cookies so client JavaScript cannot read them. Furthermore, we removed all hardcoded student roll numbers from shared public components like footers.
- **File / Function**: `server/src/middleware/auth.middleware.ts` (`requireAuth`), `client/src/components/Footer.tsx`.
- **Difficulty**: Intermediate.
- **Follow-up**: *How do you test that user isolation actually works?*  
  *Answer*: In `server/src/student-features.test.ts`, we create two distinct users (Alice and Bob) and assert that Bob receives a 403 or 404 when attempting to query Alice's tasks, notes, or subjects.

#### Q1.5: Why did you build a custom study timer instead of embedding an external widget?
- **Answer**: External timer widgets run purely on the client browser. If the student refreshes the tab, changes devices, or closes their browser, the session is lost. Our study timer is server-authoritative: start, pause, resume, and finish actions update UTC timestamps in MongoDB, surviving browser reloads and network drops.
- **File / Function**: `server/src/models/StudySession.ts`, `server/src/routes/study.routes.ts` (`calculateElapsedSeconds`).
- **Difficulty**: Intermediate.
- **Follow-up**: *Can a user manipulate their elapsed study time using browser developer tools?*  
  *Answer*: No. The client only displays what the server calculates from database timestamps (`Date.now() - startTime - pausedSeconds`).

#### Q1.6: What design philosophy guided the user interface?
- **Answer**: We followed an "anti-slop" academic design philosophy using custom CSS variables, clean editorial typography (`Plus Jakarta Sans` for UI and `Fraunces` for serif accents), high-contrast data cards, accessible Lucide React icons, and zero emojis to ensure a professional desktop and mobile experience.
- **File / Function**: `client/src/styles/index.css`.
- **Difficulty**: Basic.
- **Follow-up**: *Why ban emojis from an academic application?*  
  *Answer*: Emojis render inconsistently across operating systems (iOS vs Android vs Windows), fail enterprise accessibility audits without explicit ARIA labels, and look informal for an institutional portal.

#### Q1.7: What is the purpose of the Demo Student account?
- **Answer**: The demo student (`demostudent99@university.edu`) allows evaluators and prospective users to experience the application pre-populated with realistic university data—including 11 enrolled courses, real attendance shortages, active tasks, study sessions, and goals—without requiring manual data entry.
- **File / Function**: `server/src/scripts/seed-demo-student.ts`.
- **Difficulty**: Basic.
- **Follow-up**: *Is there any risk that seeding the demo account wipes real user data?*  
  *Answer*: None. The seed script has an explicit assertion that aborts immediately if the target user email does not match `demostudent99@university.edu`.

#### Q1.8: What was the biggest architectural mistake made early on, and how did you resolve it?
- **Answer**: Early in the project, Attendance Records and Subject catalogs were stored in two separate registries. When a student imported ERP data, it created attendance records without creating Subjects, leading to a bug where the dashboard reported "0 Enrolled Courses". We resolved this by implementing an atomic auto-upsert in the attendance import route and running an idempotent backfill script across existing records.
- **File / Function**: `server/src/routes/attendance.routes.ts` (lines 213–245), `server/src/scripts/backfill-subjects.ts`.
- **Difficulty**: Hard.
- **Follow-up**: *How did you prove the backfill was safe before executing it?*  
  *Answer*: We ran a `--dry-run` flag that verified 11 records would be created, took a database dump with `mongodump`, executed the migration, and re-ran the dry-run to prove that 0 subsequent records were created.

---

### TOPIC 2: Architecture & Request Lifecycle

#### Q2.1: Explain the high-level architecture of Student Hub.
- **Answer**: Student Hub is structured as a client-server decoupled monorepo. The client is a single-page application built with React 18, Vite, and TypeScript. The backend is an Express API running on Node.js with TypeScript, connected to MongoDB via Mongoose. The frontend communicates with the backend exclusively through asynchronous RESTful JSON calls over HTTPS.
- **File / Function**: `package.json`, `client/src/App.tsx`, `server/src/server.ts`.
- **Difficulty**: Basic.
- **Follow-up**: *Why keep client and server in one repository instead of two separate repos?*  
  *Answer*: A monorepo simplifies development, allows single-command builds and testing (`npm run test`), enables unified linting and formatting rules, and makes end-to-end continuous integration straightforward.

#### Q2.2: Walk me through the lifecycle of a request to `GET /api/tasks`.
- **Answer**: First, the request hits the Express application and passes through security middleware: `helmet` sets security headers, `cors` validates the origin, and `cookieParser` parses incoming cookies. Next, `requireAuth` extracts the JWT from the `student_hub_token` cookie, verifies its signature, loads the user record from MongoDB, and attaches it to `req.user`. Then, `taskRouter` executes the route handler, queries MongoDB for `{ userId: req.user._id }`, and returns a `200 OK` JSON response. If an error occurs, it bubbles down to `errorHandler`.
- **File / Function**: `server/src/app.ts`, `server/src/middleware/auth.middleware.ts`, `server/src/routes/task.routes.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *What happens if the JWT has expired?*  
  *Answer*: `jwt.verify` throws a `TokenExpiredError`. The catch block in `requireAuth` captures this and immediately returns `401 Unauthorized` with a JSON payload telling the user to log in again.

#### Q2.3: Why did you choose Express and Node.js rather than Python FastAPI or Django?
- **Answer**: Choosing Node.js and Express allowed us to maintain end-to-end TypeScript type consistency across both the browser and server. Shared types, models, and calculation algorithms can be ported and tested between environments with zero context-switching. Node's non-blocking event-driven I/O is also well-suited for concurrent I/O-bound database operations.
- **File / Function**: `server/package.json`, `client/package.json`.
- **Difficulty**: Intermediate.
- **Follow-up**: *What is the primary drawback of Express in 2026?*  
  *Answer*: Express 4 does not automatically handle rejected Promises in route handlers unless wrapped in try-catch or an async error wrapper, which we handle systematically across all controllers.

#### Q2.4: How are project directories organized on the backend?
- **Answer**: The backend follows a clear layered architecture: `config/` manages database connection and validated environment variables; `models/` defines Mongoose schemas and TypeScript interfaces; `routes/` defines HTTP route controllers; `services/` encapsulates pure business and calculation logic; `middleware/` houses security, rate limiting, and authentication guards; and `scripts/` contains administrative and migration tooling.
- **File / Function**: `server/src/` directory tree.
- **Difficulty**: Basic.
- **Follow-up**: *Why keep calculation logic in `services/` rather than directly in `routes/`?*  
  *Answer*: Separation of concerns. It allows pure mathematical functions—like attendance recovery and ERP parsing—to be unit tested in isolation without needing to mock Express request and response objects.

#### Q2.5: How is client routing structured?
- **Answer**: The client uses React Router v6. Routes are divided into Public Routes (`/login`, `/register`, `/`), Protected Student Routes (`/dashboard`, `/attendance`, `/subjects`, `/tasks`, `/goals`, `/notes`, `/study`, `/announcements`, `/resources`), and Protected Admin Routes (`/admin/dashboard`, `/admin/students`, `/admin/announcements`, `/admin/resources`, `/admin/health`). All authenticated views are nested inside a shared `RootLayout`.
- **File / Function**: `client/src/App.tsx`, `client/src/layouts/RootLayout.tsx`.
- **Difficulty**: Basic.
- **Follow-up**: *What renders if a user types an invalid URL like `/some/random/path`?*  
  *Answer*: The wildcard `path="*"` catch-all route renders `NotFoundPage`, which provides a friendly 404 message and a link back to the dashboard.

#### Q2.6: What is the purpose of `RootLayout.tsx`?
- **Answer**: `RootLayout` establishes the authenticated user shell. It renders the responsive collapsible `Sidebar`, the `TopBar` with breadcrumbs and the quick Command Palette trigger, the notification `ToastContainer`, and an `<Outlet />` element for nested child views. It prevents layout duplication across individual pages.
- **File / Function**: `client/src/layouts/RootLayout.tsx`.
- **Difficulty**: Basic.
- **Follow-up**: *Does the Sidebar re-mount when a user navigates between pages?*  
  *Answer*: No. Because `RootLayout` remains mounted during route transitions, the Sidebar maintains its state and does not flicker or re-render unnecessarily.

#### Q2.7: How does your production build differ from development?
- **Answer**: In development, Vite runs with Hot Module Replacement (HMR) and the backend runs via `tsx watch` for live TypeScript compilation. In production, the backend TypeScript is compiled to standard JavaScript in `dist/` via `tsc`, and the frontend is bundled into optimized, minified static HTML/CSS/JS assets via `vite build`, served behind Vercel's edge network.
- **File / Function**: `server/package.json`, `client/package.json`.
- **Difficulty**: Intermediate.
- **Follow-up**: *How long does the production monorepo build take?*  
  *Answer*: Approximately 1.3 seconds for the backend and ~2 seconds for the frontend Vite build.

#### Q2.8: How do you handle configuration across different environments?
- **Answer**: We use a centralized environment validation file powered by Zod (`server/src/config/env.ts`). When the server boots, Zod parses and validates `process.env`. If any required environment variable—such as `MONGODB_URI` or `JWT_SECRET`—is missing or improperly formatted, the server crashes immediately with an informative error rather than failing silently at runtime.
- **File / Function**: `server/src/config/env.ts`.
- **Difficulty**: Hard.
- **Follow-up**: *What default values are configured for local development?*  
  *Answer*: If omitted in development, `PORT` defaults to `5001`, `CLIENT_ORIGIN` to `http://localhost:5173`, and `COOKIE_SAME_SITE` to `'lax'`.

---

### TOPIC 3: React & TypeScript Client Engineering

#### Q3.1: Why did you choose React 18 with Vite instead of Next.js or Create React App?
- **Answer**: Create React App is officially deprecated and slow. Next.js introduces unnecessary server-side rendering complexity and proprietary hosting lock-in for an application whose primary purpose is an interactive, authenticated dashboard. Vite provides instant sub-second Hot Module Replacement, standard ESM-based bundling, and produces a lean static single-page application that can be hosted cost-effectively on edge CDNs like Vercel.
- **File / Function**: `client/vite.config.ts`, `client/package.json`.
- **Difficulty**: Intermediate.
- **Follow-up**: *What is the bundle output of your client build?*  
  *Answer*: A single HTML entry point, minified vendor and application JavaScript chunks, and a single compiled CSS file with zero runtime CSS-in-JS overhead.

#### Q3.2: Why did you decide NOT to use Redux or React Query?
- **Answer**: Redux introduces substantial boilerplate (actions, reducers, dispatchers, selectors) that is overkill for an application of this scope. React Query is excellent for caching, but adding it would introduce a heavy third-party dependency. Instead, we used React's native Context API for global session state (`AuthContext`, `ThemeContext`, `ToastContext`) and co-located server fetching within feature pages. This keeps bundle sizes small, code readable, and architectural control transparent.
- **File / Function**: `client/src/context/AuthContext.tsx`, `client/src/context/ThemeContext.tsx`, `client/src/context/ToastContext.tsx`.
- **Difficulty**: Intermediate.
- **Follow-up**: *What is the trade-off of this decision?*  
  *Answer*: We do not get automatic background window re-fetching or normalized client query caching out-of-the-box, meaning pages re-fetch fresh data from the API on mount via `useEffect`. For academic workflows, this guarantees students always see the latest database state.

#### Q3.3: How does `AuthContext` manage user session state?
- **Answer**: `AuthContext` provides `user`, `loading`, `isAuthenticated`, `login`, `register`, and `logout` to the component tree. On initial application load, its `useEffect` calls `GET /api/auth/me`. If a valid `httpOnly` cookie exists, the backend returns the authenticated user object, setting `user` and `loading = false`. If the call fails, `user` is set to `null` without throwing disruptive UI crashes.
- **File / Function**: `client/src/context/AuthContext.tsx` (`checkAuth`).
- **Difficulty**: Intermediate.
- **Follow-up**: *How does logout work inside `AuthContext`?*  
  *Answer*: It calls `POST /api/auth/logout` to instruct the server to clear the authentication cookie with an expired `maxAge: 0`, resets the local `user` state to `null`, and navigates the user to `/login`.

#### Q3.4: How are protected routes implemented in React?
- **Answer**: We built a reusable `<ProtectedRoute>` wrapper component. It consumes `AuthContext`. If `loading` is true, it renders a full-page skeleton loader to prevent flickering. If `isAuthenticated` is false, it renders `<Navigate to="/login" replace />`. If `allowedRoles` are specified and the user's role is not included, it redirects students away from admin views back to `/dashboard`.
- **File / Function**: `client/src/components/ProtectedRoute.tsx`.
- **Difficulty**: Basic.
- **Follow-up**: *What would happen if someone bypassed the client-side ProtectedRoute by hacking their browser memory?*  
  *Answer*: The page UI might display, but every single API call to fetch or mutate data would be rejected by the Express server with `401 Unauthorized` or `403 Forbidden`.

#### Q3.5: How is the Command Palette implemented?
- **Answer**: The `CommandPalette` component listens for global keyboard shortcuts (`⌘K` on macOS, `Ctrl+K` on Windows/Linux) as well as the `Escape` key. It presents a searchable modal dialog with keyboard arrow navigation (`ArrowDown`, `ArrowUp`, `Enter`) that filters across all student and admin routes, recent views, and fast actions.
- **File / Function**: `client/src/components/CommandPalette.tsx`.
- **Difficulty**: Intermediate.
- **Follow-up**: *How do you ensure the input is immediately ready for typing when opened?*  
  *Answer*: When `isOpen` becomes true, a `useEffect` hook triggers `inputRef.current?.focus()` after a 50ms tick to ensure the DOM modal is fully painted.

#### Q3.6: What are Controlled Components, and where are they used in this app?
- **Answer**: A controlled component is an input element whose value is driven by React component state rather than the internal DOM state. We use controlled components across all forms—such as adding a task, writing a note, adjusting the attendance what-if sliders, and logging in.
- **File / Function**: `client/src/pages/student/TasksPage.tsx` (`newTitle`, `newDescription`, `newPriority`), `client/src/pages/LoginPage.tsx`.
- **Difficulty**: Basic.
- **Follow-up**: *What is the advantage of controlled inputs in our attendance simulator?*  
  *Answer*: When the student drags the "Attended" or "Bunked" sliders, the state updates instantly, recalculating projected percentages and recovery metrics in real time at 60 frames per second without waiting for form submissions.

#### Q3.7: Explain the custom toast notification system.
- **Answer**: Rather than importing a large library like `react-toastify`, we implemented a lightweight `ToastContext`. It exposes `toast.success()`, `toast.error()`, `toast.info()`, and a promise-based `confirmModal()` for destructive actions. Toasts automatically dismiss after 4 seconds and render in a fixed viewport portal with accessible color badges.
- **File / Function**: `client/src/context/ToastContext.tsx`.
- **Difficulty**: Intermediate.
- **Follow-up**: *Why use custom confirm modals instead of the native browser `window.confirm()`?*  
  *Answer*: Native `window.confirm()` blocks the browser's main JavaScript thread, freezes animations, looks inconsistent across platforms, and cannot be styled to fit light/dark themes.

#### Q3.8: How is TypeScript utilized to prevent runtime bugs on the frontend?
- **Answer**: We define strict TypeScript interfaces for every API contract: `TaskItem`, `SubjectItem`, `AttendanceRecord`, `GoalItem`, and `StudySession`. All API service functions in `client/src/services/` have typed return promises. This gives us compile-time autocomplete, prevents typos in property names, and catches mismatches whenever the backend payload schema evolves.
- **File / Function**: `client/src/services/student.service.ts`, `client/src/services/attendance.service.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *Do you use `any` in client code?*  
  *Answer*: We strictly disallow `any`. In catch blocks where error shapes are unknown, we type them as `unknown` and use type narrowing (`err instanceof Error ? err.message : ...`) before reading properties.

---

### TOPIC 4: Express & API Design

#### Q4.1: What RESTful conventions does your API follow?
- **Answer**: We use standard HTTP verbs mapped to resource nouns: `GET` for retrieval, `POST` for creation, `PATCH` for partial updates, and `DELETE` for removal. Plural resource nouns are utilized across all routes: `/api/subjects`, `/api/tasks`, `/api/goals`, `/api/notes`. Successes return `200 OK` or `201 Created`, client validation failures return `400 Bad Request`, unauthenticated calls return `401 Unauthorized`, forbidden calls return `403 Forbidden`, and missing records return `404 Not Found`.
- **File / Function**: `server/src/routes/task.routes.ts`, `server/src/routes/subject.routes.ts`.
- **Difficulty**: Basic.
- **Follow-up**: *Why use `PATCH` instead of `PUT` for updating tasks and goals?*  
  *Answer*: `PUT` semantically replaces the entire resource, requiring all fields to be sent. `PATCH` allows partial updates, enabling the client to update just the status of a task (`{ status: 'completed' }`) without re-submitting its title, priority, and due date.

#### Q4.2: Explain the order of Express middleware in `app.ts` and why sequence matters.
- **Answer**: Middleware order is strictly sequential:
  1. `helmet()`: Applies HTTP security headers first.
  2. `cors()`: Evaluates origin permissions before reading data.
  3. `csrfProtection`: Blocks unauthorized cross-origin mutations.
  4. `cookieParser()`: Populates `req.cookies` required for authentication.
  5. `express.json()` and `express.urlencoded()`: Parses incoming request bodies.
  6. Rate Limiters (`generalRateLimiter`, `authRateLimiter`): Mitigates DoS and brute-force attacks before routes execute.
  7. Feature Routers: Mounts API controllers.
  8. `notFoundHandler`: Catches unmatched routes and returns 404.
  9. `errorHandler`: The 4-argument global error catcher.
- **File / Function**: `server/src/app.ts` (lines 24–75).
- **Difficulty**: Hard.
- **Follow-up**: *What would happen if `cookieParser` was placed after the routers?*  
  *Answer*: `req.cookies` would be undefined when `requireAuth` executed, causing every authenticated route to fail with `401 Unauthorized`.

#### Q4.3: How are API responses shaped across the platform?
- **Answer**: We enforce a consistent JSON response envelope. Successful responses return `{ status: 'ok', data: ... }` or specific entity keys like `{ status: 'ok', session: ... }`. Error responses consistently return `{ status: 'error', statusCode: <number>, message: <string>, errors?: [...] }`. This predictability allows the client API layer to handle responses cleanly.
- **File / Function**: `server/src/middleware/error-handler.ts`, `client/src/services/api.ts`.
- **Difficulty**: Basic.
- **Follow-up**: *How does the frontend client handle this response format?*  
  *Answer*: In `client/src/services/api.ts`, our `apiRequest` wrapper checks `response.ok`. If false, it extracts `data.message` from the error envelope and throws a typed `Error`.

#### Q4.4: How is global error handling implemented in Express?
- **Answer**: We define a dedicated error-handling middleware with four parameters: `(err, req, res, next)`. Express recognizes this four-argument signature as an error handler. It logs the stack trace in development, maps known Mongoose CastErrors or validation errors to friendly HTTP status codes, and prevents internal server details from leaking to clients in production.
- **File / Function**: `server/src/middleware/error-handler.ts` (`errorHandler`).
- **Difficulty**: Intermediate.
- **Follow-up**: *What happens if a route handler throws an unhandled synchronous exception?*  
  *Answer*: Express catches synchronous errors and routes them directly to our `errorHandler`, which returns a `500 Internal Server Error` instead of crashing the Node process.

#### Q4.5: How does your API support pagination and filtering?
- **Answer**: On endpoints returning unbounded collections—such as the Administrator Student Directory (`GET /api/admin/students`)—we support query parameters: `page`, `limit`, `search`, and `status`. The route uses Mongoose `.skip((page - 1) * limit).limit(limit)` and executes `countDocuments()` in parallel via `Promise.all` to return total counts and page metadata.
- **File / Function**: `server/src/routes/admin.routes.ts` (lines 35–75).
- **Difficulty**: Intermediate.
- **Follow-up**: *Why not use cursor-based pagination?*  
  *Answer*: Cursor pagination is superior for infinite-scroll feeds with high write frequency. For administrative student rosters with discrete page jumps (Page 1, Page 2), offset-limit pagination is more intuitive and fully sufficient for institutional roster sizes.

#### Q4.6: How is input validation executed on incoming requests?
- **Answer**: We use Zod schemas on every write route (`POST`, `PATCH`, `PUT`). When a request arrives, `schema.safeParse(req.body)` is executed. If validation fails, the controller immediately halts execution and returns a `400 Bad Request` containing an array of specific field errors, before any database interaction takes place.
- **File / Function**: `server/src/routes/task.routes.ts`, `server/src/routes/auth.routes.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *What is the difference between Zod's `.parse()` and `.safeParse()`?*  
  *Answer*: `.parse()` throws a runtime exception when validation fails, requiring a try-catch block. `.safeParse()` returns a discriminated union (`{ success: true, data }` or `{ success: false, error }`), allowing cleaner and faster conditional branching.

#### Q4.7: What is the health check endpoint, and why is it split into two routes?
- **Answer**: We expose `GET /api/health` for shallow uptime checks (used by Render and uptime monitors to prevent cold starts), which returns `200 OK` and uptime uptime metadata in sub-milliseconds without touching the database. We also expose `GET /api/health/db` for deep diagnostic readiness checks, which queries Mongoose `connection.readyState` and database ping times without exposing connection strings or credentials.
- **File / Function**: `server/src/routes/health.routes.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *Why should automated cloud load balancers not ping `/api/health/db` every 5 seconds?*  
  *Answer*: Flooding the database with synthetic health queries consumes database connection pools and CPU cycles unnecessarily. Cloud providers should ping shallow endpoints for process life and reserve database health checks for administrative diagnosis.

#### Q4.8: How do you prevent cross-user data tampering on `DELETE /api/tasks/:id`?
- **Answer**: We do not merely call `Task.findByIdAndDelete(req.params.id)`. Instead, we execute `Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id })`. If another user attempts to delete a task ID they do not own, the query finds nothing and returns a `404 Not Found` (or `403 Forbidden`), completely neutralizing Insecure Direct Object Reference (IDOR) attacks.
- **File / Function**: `server/src/routes/task.routes.ts` (lines 140–160).
- **Difficulty**: Hard.
- **Follow-up**: *Why return 404 instead of 403 on IDOR attempts?*  
  *Answer*: Returning 404 prevents resource enumeration. It denies an attacker the knowledge of whether that task ID even exists in the database.

---

### TOPIC 5: MongoDB & Mongoose Schema Architecture

#### Q5.1: Why did you choose MongoDB over a relational SQL database like PostgreSQL?
- **Answer**: Academic data structures have variable schemas across universities: ERP paste rows may include or omit OD, Makeup, or Event hours; notes contain rich unformatted markdown text and dynamic tags; and announcements contain polymorphic metadata. MongoDB's flexible document model allows rapid schema evolution and frictionless JSON mapping while maintaining strong ACID transactions at the single-document level.
- **File / Function**: `server/src/models/`.
- **Difficulty**: Intermediate.
- **Follow-up**: *Doesn't NoSQL sacrifice relational data integrity?*  
  *Answer*: Not when designed properly. We enforce referential integrity programmatically through Mongoose ObjectId references (`ref: 'Subject'`, `ref: 'User'`), compound uniqueness indexes, and pre-delete hooks that clean up associated child records.

#### Q5.2: How are relationships modeled in Student Hub?
- **Answer**: We utilize reference modeling via Mongoose `Schema.Types.ObjectId`. For example, `Task`, `Goal`, `Note`, `StudySession`, and `AttendanceRecord` documents store a `userId` referencing the `User` collection, and an optional `subjectId` referencing the `Subject` collection. In `AttendanceRecord`, we also store the denormalized `subjectCode` for instant indexing and human-readable join queries.
- **File / Function**: `server/src/models/Task.ts`, `server/src/models/AttendanceRecord.ts`.
- **Difficulty**: Basic.
- **Follow-up**: *When should you embed sub-documents instead of referencing?*  
  *Answer*: We embed when data is tightly bounded, has 1-to-1 cardinality, and is always fetched together with the parent—such as the `eventAttendanceSchema` embedded directly inside `AttendanceOverview`.

#### Q5.3: Explain the compound indexes in your database and why they exist.
- **Answer**: We engineered two critical compound indexes:
  1. `Subject`: `{ userId: 1, code: 1 }` with `{ unique: true }`. This guarantees that a student cannot have duplicate subject codes in their semester registry.
  2. `AttendanceRecord`: `{ userId: 1, subjectCode: 1 }` with `{ unique: true }`. This guarantees that importing ERP data multiple times will upsert the existing record rather than creating duplicate entries.
- **File / Function**: `server/src/models/Subject.ts` (line 78), `server/src/models/AttendanceRecord.ts` (line 132).
- **Difficulty**: Hard.
- **Follow-up**: *What performance benefit do these compound indexes provide for read queries?*  
  *Answer*: When querying `{ userId, code }`, MongoDB uses an index-covered scan ($O(\log N)$) rather than a full collection scan ($O(N)$), enabling sub-millisecond lookups even with hundreds of thousands of records.

#### Q5.4: Explain the text index on the Notes model and why `$regex` was kept for search.
- **Answer**: We created a compound text index on `Note`: `{ title: 'text', content: 'text', tags: 'text' }` with weights (5 for title, 3 for tags, 1 for content). However, MongoDB's `$text` index only matches complete stemmed words. If a student searches for `"algo"`, `$text` will fail to match `"algorithms"`. To provide intuitive partial-word substring searching, our `GET /api/notes?q=` route uses `$regex` queries with escaped characters, while keeping the full-text index available for weighted document indexing.
- **File / Function**: `server/src/models/Note.ts` (lines 60–63), `server/src/routes/note.routes.ts` (lines 30–40).
- **Difficulty**: Hard.
- **Follow-up**: *Doesn't using `$regex` open the database to ReDoS attacks?*  
  *Answer*: Yes, if unescaped. That is why we pass all query terms through `escapeRegExp(rawTerm)` before constructing the MongoDB regex, escaping all metacharacters (`.*+?^${}()|[]\`).

#### Q5.5: Explain the "Two-Registry Bug" and how Subject Auto-Upsert resolved it.
- **Answer**: Initially, the app had two disjointed collections: `Subject` (managed manually by students) and `AttendanceRecord` (populated by ERP import). When a student imported ERP data, 11 attendance records were stored, but the Subject collection remained empty. Consequently, the dashboard reported "Enrolled Courses: 0", and tasks/goals could not link to imported subjects. We resolved this by modifying the attendance import route to auto-upsert a corresponding `Subject` record matched on `(userId, subjectCode)` and store its `_id` into `AttendanceRecord.subjectId`.
- **File / Function**: `server/src/routes/attendance.routes.ts` (lines 213–246).
- **Difficulty**: Hard.
- **Follow-up**: *What default credit value is assigned to auto-upserted subjects?*  
  *Answer*: The auto-upsert inspects the subject type and title: if it contains the word "Lab", it assigns 2 credits; otherwise, it defaults to 3 credits.

#### Q5.6: How does the `backfill-subjects.ts` migration script work?
- **Answer**: To fix existing databases created prior to auto-upsert, we authored `server/src/scripts/backfill-subjects.ts`. It iterates through existing `AttendanceRecord` documents, checks if a matching `Subject` already exists for that `(userId, code)`, creates missing Subject records with appropriate credits and attendance percentages, and links `subjectId` back into the attendance record.
- **File / Function**: `server/src/scripts/backfill-subjects.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *What flags does the backfill script support?*  
  *Answer*: It supports `--dry-run` (simulates changes without writing to MongoDB) and `--user <email>` (restricts execution to a single user account for verified canary migrations).

#### Q5.7: How did you verify the idempotency of the backfill script?
- **Answer**: An operation is idempotent if running it multiple times produces the exact same state as running it once. We proved this by running the script twice against real data: on the first execution, it created 11 subjects; on the immediate second run, it detected existing `(userId, code)` pairs, created 0 subjects, and skipped all 11 records without error.
- **File / Function**: `server/src/scripts/backfill-subjects.ts` (lines 76–85).
- **Difficulty**: Hard.
- **Follow-up**: *How does Mongoose handle timestamps when an upsert occurs?*  
  *Answer*: Because we set `{ timestamps: true }`, Mongoose sets `createdAt` and `updatedAt` on initial insert, and updates only `updatedAt` during subsequent updates.

#### Q5.8: How do you handle cascade deletions when a Subject is removed?
- **Answer**: When a student deletes a subject via `DELETE /api/subjects/:id`, we execute safety cleanups in a controlled transaction: we delete the subject, set `subjectId: null` on associated tasks and notes to prevent orphaned references, and delete corresponding attendance records.
- **File / Function**: `server/src/routes/subject.routes.ts` (lines 170–195).
- **Difficulty**: Intermediate.
- **Follow-up**: *Why set `subjectId: null` on tasks instead of deleting the tasks?*  
  *Answer*: Deleting a subject should not destroy a student's pending homework or study notes. Setting `subjectId: null` unlinks the course categorization while preserving the student's task history.

---

### TOPIC 6: Authentication & Authorization

#### Q6.1: Explain your authentication flow from login to API access.
- **Answer**: The student submits email and password to `POST /api/auth/login`. The server validates input with Zod, queries the user, and verifies the password using `bcrypt.compare`. If valid, it signs a JSON Web Token containing the user's ID and role (`student_hub_token`). This token is attached to the response in a secure `httpOnly` cookie. On all subsequent requests, the browser automatically transmits the cookie, which `requireAuth` verifies before granting access.
- **File / Function**: `server/src/routes/auth.routes.ts`, `server/src/services/auth.service.ts`, `server/src/middleware/auth.middleware.ts`.
- **Difficulty**: Basic.
- **Follow-up**: *What information is stored inside the JWT payload?*  
  *Answer*: Only non-sensitive identity metadata: `{ id: user._id, role: user.role }`. We never store passwords, emails, or personal details in token payloads.

#### Q6.2: Why do you store the JWT in an `httpOnly` cookie instead of `localStorage`?
- **Answer**: Storing JWTs in `localStorage` makes them vulnerable to Cross-Site Scripting (XSS). If an attacker injects any malicious JavaScript into the page, they can execute `localStorage.getItem('token')` and permanently steal the session. An `httpOnly` cookie cannot be read or accessed by client-side JavaScript, completely neutralizing token theft via XSS.
- **File / Function**: `server/src/services/auth.service.ts` (`getCookieOptions`).
- **Difficulty**: Intermediate.
- **Follow-up**: *What other cookie security flags do you set?*  
  *Answer*: We set `secure: true` in production (ensuring cookies travel only over encrypted HTTPS connections) and `sameSite: 'lax'` (ensuring cookies are not sent on cross-site requests).

#### Q6.3: What password hashing algorithm do you use, and why is salt cost 12 significant?
- **Answer**: We use `bcryptjs` with a salt cost of 12 (`BCRYPT_SALT_ROUNDS = 12`). Bcrypt is an adaptive key derivation function that includes a cryptographic salt to prevent rainbow table attacks. A cost factor of 12 means the algorithm executes $2^{12} = 4,096$ hashing rounds, taking approximately 250 milliseconds per hash on modern CPUs—fast enough for an authenticating user, but computationally prohibitive for brute-force attackers.
- **File / Function**: `server/src/services/auth.service.ts` (line 11).
- **Difficulty**: Intermediate.
- **Follow-up**: *Why not use standard SHA-256 for passwords?*  
  *Answer*: SHA-256 is designed to be extremely fast for file integrity. Modern GPUs can calculate billions of SHA-256 hashes per second, making offline dictionary attacks trivial. Bcrypt is deliberately slow and memory-intensive.

#### Q6.4: Explain how Role-Based Access Control (RBAC) is implemented on the server.
- **Answer**: RBAC is enforced via our `requireRole(...allowedRoles)` middleware factory. It executes immediately after `requireAuth`. It checks `req.user.role`. If the user's role is not included in the allowed parameters, it halts execution and returns `403 Forbidden` with `{ message: 'Access forbidden. This action requires administrative privileges.' }`.
- **File / Function**: `server/src/middleware/auth.middleware.ts` (`requireRole`).
- **Difficulty**: Basic.
- **Follow-up**: *Where is this applied in the codebase?*  
  *Answer*: Across all administrative routes in `server/src/routes/admin.routes.ts`: student roster inspection, account suspensions, and institutional announcement publishing.

#### Q6.5: Why are client-side role checks and route guards alone insufficient?
- **Answer**: Client-side code runs in an untrusted environment controlled entirely by the user. Anyone can open Chrome DevTools, modify React component state, bypass React Router guards, or make raw `fetch` calls from the terminal. Client guards exist solely for user experience; true security and authorization MUST be validated on every single HTTP request by the server.
- **File / Function**: `client/src/components/ProtectedRoute.tsx` vs `server/src/middleware/auth.middleware.ts`.
- **Difficulty**: Basic.
- **Follow-up**: *Can a suspended student still use their existing JWT?*  
  *Answer*: No. Even if the JWT signature is valid, `requireAuth` queries MongoDB (`User.findById`) on every request and explicitly checks `if (user.status === 'suspended') return res.status(403)`.

#### Q6.6: How does the application restore user sessions on page reload?
- **Answer**: When the user refreshes their browser, React state resets. `AuthContext` executes an initial `useEffect` that calls `GET /api/auth/me`. Because the browser includes the `httpOnly` cookie with the request, the server validates the session and returns the user's profile, restoring `user` state seamlessly without requiring re-login.
- **File / Function**: `client/src/context/AuthContext.tsx` (`checkAuth`), `server/src/routes/auth.routes.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *What displays on the screen while `/api/auth/me` is resolving?*  
  *Answer*: The app renders a minimal animated loading skeleton so the user does not experience a jarring flash of the login page.

#### Q6.7: What happens during `POST /api/auth/logout`?
- **Answer**: The server calls `res.clearCookie(AUTH_COOKIE_NAME)` and sets an expired cookie with `maxAge: 0`. It returns `200 OK`. The client-side `AuthContext` sets `user` to `null` and redirects to `/login`. Even if the client attempts further requests, the browser no longer possesses a valid cookie.
- **File / Function**: `server/src/routes/auth.routes.ts` (lines 100–115).
- **Difficulty**: Basic.
- **Follow-up**: *Can a logged-out JWT be used if an attacker intercepted it prior to logout?*  
  *Answer*: Stateless JWTs remain cryptographically valid until expiration (`7d`). To immediately invalidate tokens before expiration, a token revocation blacklist or short-lived access tokens with refresh tokens would be needed.

#### Q6.8: How do you support non-browser API clients like curl or mobile apps?
- **Answer**: In `requireAuth`, we check both cookie storage and the standard HTTP `Authorization` header: `req.headers.authorization?.startsWith('Bearer ')`. If present, we extract and verify the bearer token, enabling automated scripts like `scripts/smoke-prod.sh` to authenticate easily.
- **File / Function**: `server/src/middleware/auth.middleware.ts` (lines 17–21).
- **Difficulty**: Intermediate.
- **Follow-up**: *Which takes precedence if both cookie and header are sent?*  
  *Answer*: The cookie is checked first; if missing, it falls back to the Bearer authorization header.

---

### TOPIC 7: Security Architecture & Vulnerability Mitigation

#### Q7.1: What security headers does Helmet provide, and what does each do?
- **Answer**: Helmet applies several HTTP headers:
  1. `Content-Security-Policy`: Restricts scripts, styles, and image origins to prevent XSS.
  2. `X-Frame-Options: SAMEORIGIN`: Prevents the site from being embedded inside foreign `<iframe>` tags (clickjacking).
  3. `Strict-Transport-Security` (HSTS): Forces browsers to use HTTPS exclusively.
  4. `X-Content-Type-Options: nosniff`: Prevents browsers from MIME-sniffing responses away from declared content types.
  5. `Referrer-Policy: no-referrer`: Prevents leaking URL paths in referrer headers.
- **File / Function**: `server/src/app.ts` (lines 26–42).
- **Difficulty**: Intermediate.
- **Follow-up**: *Why did you set `crossOriginEmbedderPolicy: false` in development?*  
  *Answer*: To prevent local development browser clashes when loading local fonts and Vite hot-module assets.

#### Q7.2: Explain your Rate Limiting strategy.
- **Answer**: We employ a two-tiered rate limiting strategy using `express-rate-limit`:
  1. `authRateLimiter`: Enforces a strict limit of 25 attempts per 15-minute window per IP on login and register routes, preventing credential stuffing and brute-force attacks.
  2. `generalRateLimiter`: Enforces a limit of 120 requests per minute per IP on all general API routes, protecting CPU-intensive endpoints like ERP text parsing from DoS abuse.
- **File / Function**: `server/src/middleware/rate-limiter.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *How do rate limits behave in the automated test suite?*  
  *Answer*: The limiters check `env.NODE_ENV === 'test'` and raise limits to 1,000+ so that our 147 integration tests run without triggering 429 throttling errors.

#### Q7.3: How does Student Hub prevent Cross-Site Scripting (XSS) in Notes?
- **Answer**: Notes support Markdown formatting, which compiles to HTML. If left unsanitized, an attacker could store `<script>alert('xss')</script>` or `<img src=x onerror=steal()>` in a note. We mitigate this using a two-stage defense: first, raw input is HTML-entity escaped before parsing; second, the generated HTML is sanitized through `DOMPurify.sanitize()`, strictly allowing only benign tags (`<b>`, `<i>`, `<code>`, `<h3>`) and stripping all script tags and JavaScript event handlers.
- **File / Function**: `client/src/utils/markdown.ts` (lines 150–180), `client/src/utils/markdown.test.ts`.
- **Difficulty**: Hard.
- **Follow-up**: *What prevents `javascript:` URLs in markdown links like `[Click](javascript:steal())`?*  
  *Answer*: Our regex link parser explicitly requires protocols to begin with `https://`, `http://`, or `mailto:`. Any other scheme is rejected and not converted into an active hyperlink.

#### Q7.4: How do you prevent Cross-Site Request Forgery (CSRF)?
- **Answer**: By default, we use `SameSite=Lax` cookies, meaning modern browsers refuse to send our session cookie on cross-site state-changing requests (such as a foreign form posting to `/api/tasks`). In addition, we authored `server/src/middleware/csrf.middleware.ts`, which validates the HTTP `Origin` and `Referer` headers on all mutating verbs (`POST`, `PUT`, `PATCH`, `DELETE`) against our authorized `CLIENT_ORIGIN`.
- **File / Function**: `server/src/middleware/csrf.middleware.ts`.
- **Difficulty**: Hard.
- **Follow-up**: *What happens if `COOKIE_SAME_SITE=none` is used across separate domains?*  
  *Answer*: The `csrfProtection` middleware strictly enforces origin header verification, rejecting requests from foreign origins with `403 Forbidden: Cross-site request rejected`.

#### Q7.5: How do you prevent NoSQL Injection in MongoDB?
- **Answer**: NoSQL injection occurs when an attacker passes an object containing MongoDB operators (like `{"$gt": ""}`) instead of a string into query parameters. We prevent this by validating and coercing every request body and query parameter through strict Zod schemas before querying the database. An object passed where a string is expected is rejected immediately with a `400 Bad Request`.
- **File / Function**: `server/src/routes/auth.routes.ts`, `server/src/routes/note.routes.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *Does Mongoose cast ObjectIds automatically?*  
  *Answer*: Yes, but if an invalid hex string is passed to `findById`, Mongoose throws a `CastError`. Our routes use `Types.ObjectId.isValid()` checks and global error middleware to safely handle invalid IDs.

#### Q7.6: Explain how CORS is configured and why it matters.
- **Answer**: Cross-Origin Resource Sharing (CORS) instructs browsers which frontend domains are permitted to read backend responses. In `server/src/app.ts`, we configure `cors()` with `origin: env.CLIENT_ORIGIN` and `credentials: true`. This prevents unauthorized external domains from reading data via `fetch` while explicitly allowing our designated React frontend to send and receive cookies.
- **File / Function**: `server/src/app.ts` (lines 44–50).
- **Difficulty**: Basic.
- **Follow-up**: *Can CORS protect an API against curl requests from the terminal?*  
  *Answer*: No. CORS is a browser security mechanism enforced exclusively by web browsers. Terminal tools and server-to-server calls do not enforce CORS policies.

#### Q7.7: How are server secrets managed and prevented from leaking?
- **Answer**: Secrets like `JWT_SECRET` and `MONGODB_URI` are never committed to version control. They are declared in local `.env` files that are strictly excluded via `.gitignore`. In cloud production, they are injected securely via Render and Vercel environment variable dashboards.
- **File / Function**: `.gitignore`, `server/src/config/env.ts`.
- **Difficulty**: Basic.
- **Follow-up**: *What prevents `git push` from accidentally uploading database backups?*  
  *Answer*: Our `.gitignore` explicitly includes `backup-before-backfill/` and all `.bson` files, ensuring exported database dumps remain strictly local.

#### Q7.8: How do you protect the Institutional Resource Library from dangerous links?
- **Answer**: When administrators post campus resources with URLs, the input schema verifies the link using Zod's `.url()` validator and explicitly checks that the protocol is `https://` or `http://`. Dangerous URL schemes like `javascript:`, `data:`, or `file://` are rejected with `400 Bad Request`.
- **File / Function**: `server/src/routes/resource.routes.ts`, `server/src/admin-features.test.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *Why reject `data:` URIs?*  
  *Answer*: `data:text/html;base64,...` URIs can be used to execute arbitrary JavaScript in the victim's browser context when opened.

---

### TOPIC 8: Attendance Intelligence Engine (FLAGSHIP TOPIC)

#### Q8.1: Derive the mathematical formula for "Classes Needed to Reach 75% Attendance".
- **Answer**:
  Let:
  - $A$ = Total classes attended so far.
  - $C$ = Total classes conducted so far.
  - $T$ = Target attendance percentage threshold (e.g., 75).
  - $x$ = Number of additional consecutive classes the student must attend.

  After attending $x$ consecutive classes, both attended and conducted classes increase by $x$:
  $$\frac{A + x}{C + x} \ge \frac{T}{100}$$

  Cross-multiplying:
  $$100(A + x) \ge T(C + x)$$
  $$100A + 100x \ge TC + Tx$$
  $$100x - Tx \ge TC - 100A$$
  $$x(100 - T) \ge TC - 100A$$
  $$x \ge \frac{TC - 100A}{100 - T}$$

  Since classes are discrete whole integers, we take the ceiling function:
  $$x = \left\lceil \frac{T \cdot C - 100 \cdot A}{100 - T} \right\rceil$$

  If $A/C \ge T/100$, then $x = 0$.
- **File / Function**: `server/src/services/attendance-calc.service.ts` (`calculateClassesNeeded`).
- **Difficulty**: Hard.
- **Follow-up**: *Why use integer integer multiplication $(T \cdot C - 100 \cdot A)$ instead of decimals $((0.75 \cdot C) - A)$?*  
  *Answer*: IEEE 754 floating-point arithmetic introduces rounding artifacts (e.g., $0.1 + 0.2 = 0.30000000000000004$). Using integer arithmetic guarantees exact mathematical precision without rounding bugs.

#### Q8.2: Derive the mathematical formula for "Classes a Student Can Safely Miss (Bunk)".
- **Answer**:
  Let:
  - $y$ = Number of consecutive classes the student can miss.
  When missing classes, attended classes remain $A$, while conducted classes increase by $y$:
  $$\frac{A}{C + y} \ge \frac{T}{100}$$

  Cross-multiplying:
  $$100A \ge T(C + y)$$
  $$100A \ge TC + Ty$$
  $$100A - TC \ge Ty$$
  $$y \le \frac{100A - TC}{T}$$

  Since classes are discrete whole numbers, we take the floor function:
  $$y = \left\lfloor \frac{100A - T \cdot C}{T} \right\rfloor$$

  If $A/C < T/100$, the student is already in shortage, so $y = 0$.
- **File / Function**: `server/src/services/attendance-calc.service.ts` (`calculateSkippableClasses`).
- **Difficulty**: Hard.
- **Follow-up**: *What if $T = 0$?*  
  *Answer*: If the threshold is 0%, the student can theoretically miss infinite classes, so the function returns `Infinity`.

#### Q8.3: Walk through the recovery calculation for CSUL501 (Algorithms) step by step.
- **Answer**:
  From our real university dataset for CSUL501:
  - Present ($P$) = 27, On-Duty ($OD$) = 0, Makeup ($M$) = 0, Absent ($A$) = 11.
  - Total Attended ($A$) = $27 + 0 = 27$.
  - Total Conducted ($C$) = $27 + 0 + 0 + 11 = 38$.
  - Current Percentage = $\frac{27}{38} \times 100 = 71.05\%$.
  - Target Threshold ($T$) = 75%.

  Applying our derived formula:
  $$x = \left\lceil \frac{75 \times 38 - 100 \times 27}{100 - 75} \right\rceil$$
  $$x = \left\lceil \frac{2850 - 2700}{25} \right\rceil = \left\lceil \frac{150}{25} \right\rceil = \left\lceil 6.0 \right\rceil = 6$$

  **Proof of Verification**:
  If the student attends 6 consecutive classes:
  - New Attended = $27 + 6 = 33$.
  - New Conducted = $38 + 6 = 44$.
  - New Percentage = $\frac{33}{44} = 75.00\%$. Exactly 75%!
- **File / Function**: `server/src/attendance.test.ts` (lines 40–55), `client/src/utils/attendance-math.test.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *What would happen if the student only attended 5 classes?*  
  *Answer*: Attended would be 32, Conducted 43, resulting in $\frac{32}{43} = 74.41\%$, which remains below the 75% cutoff. Thus, 6 is the true minimum.

#### Q8.4: Walk through the safe bunk calculation for CSUL502 (Machine Learning).
- **Answer**:
  For CSUL502:
  - Attended = 28, Conducted = 37.
  - Current Percentage = $\frac{28}{37} \times 100 = 75.68\%$.
  - Target Threshold = 75%.

  Applying the skippable formula:
  $$y = \left\lfloor \frac{100 \times 28 - 75 \times 37}{75} \right\rfloor = \left\lfloor \frac{2800 - 2775}{75} \right\rfloor = \left\lfloor \frac{25}{75} \right\rfloor = \lfloor 0.33 \rfloor = 0$$
  The student can safely miss **0** classes. Missing even 1 class drops attendance to $\frac{28}{38} = 73.68\%$, causing an immediate shortage.
- **File / Function**: `server/src/attendance.test.ts`, `client/src/utils/attendance-math.test.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *What about CSUL504 (Full Stack Development) with 19 attended out of 24?*  
  *Answer*: Current is $\frac{19}{24} = 79.17\%$. Formula gives $\lfloor \frac{1900 - 1800}{75} \rfloor = \lfloor \frac{100}{75} \rfloor = 1$. The student can safely miss exactly 1 class ($\frac{19}{25} = 76.00\%$).

#### Q8.5: Explain the difference between Course Average and ERP Aggregate Attendance.
- **Answer**:
  This is a critical institutional edge case we identified:
  - **Course Average (81.46%)**: The direct arithmetic mean of attendance across all 11 academic lecture and lab courses.
  - **ERP Aggregate (80.1%)**: The official university portal aggregate, which includes non-classroom institutional event hours.
  In our university fixture, the student participated in **Techpravah 2026** with 8 Present Hours and 16 Absent Hours out of 24 total hours ($\frac{8}{24} = 33.33\%$). Including these 24 event hours pulls the student's overall aggregate down to 80.1%. Our system clearly labels both numbers so students understand why their ERP aggregate is lower than their course average.
- **File / Function**: `server/src/models/AttendanceOverview.ts`, `server/src/services/attendance-calc.service.ts` (lines 430–475).
- **Difficulty**: Hard.
- **Follow-up**: *Where is this distinction presented in the user interface?*  
  *Answer*: On the Attendance Intelligence page and Overview Dashboard, both badges appear with explicit sub-labels: "Course Average (Lectures & Labs)" and "ERP Aggregate (Includes Techpravah Event Hours)".

#### Q8.6: What attendance policies does your engine support?
- **Answer**: We support four institutional policies via `AttendancePolicy`:
  1. `standard_od`: Attended = Present + On-Duty (OD); Conducted = Present + OD + Makeup + Absent.
  2. `makeup_compensatory`: Makeup classes offset absences: Net Absent = $\max(0, \text{Absent} - \text{Makeup})$.
  3. `strict_present`: Only physical presence counts: Attended = Present; Conducted = Present + Absent.
  4. `erp_direct`: Uses official reported ERP figures directly without re-derivation.
- **File / Function**: `server/src/services/attendance-calc.service.ts` (`POLICY_METADATA`).
- **Difficulty**: Intermediate.
- **Follow-up**: *Which policy is the default?*  
  *Answer*: `standard_od`, as standard university statutes count sanctioned On-Duty participation (sports, symposiums) as attended sessions.

#### Q8.7: How does the ERP text tokenizer work?
- **Answer**: The tokenizer (`splitAttendanceLine`) uses multi-delimiter pattern matching. It checks if the line contains tabs (`\t`), pipes (`|`), commas (`,`), semicolons (`;`), or multi-space sequences (`/\s{2,}/`). It strips wrapping quotes and extracts clean cell tokens.
- **File / Function**: `server/src/services/attendance-calc.service.ts` (`splitAttendanceLine`).
- **Difficulty**: Intermediate.
- **Follow-up**: *What happens if a user copies table data from a web page where columns are separated by multiple spaces?*  
  *Answer*: The regex `/\s{2,}/` catches consecutive whitespace and cleanly parses the text into columns.

#### Q8.8: How does the parser detect header columns dynamically?
- **Answer**: It scans the first 10 rows using normalized alias dictionaries (`HEADER_ALIASES`). For instance, the "Code" column matches `['subjectcode', 'code', 'coursecode', 'subcode']`; "Present" matches `['present', 'p', 'presentclasses', 'attended']`. If headers are completely missing, it activates a positional fallback layout matching standard ERP export schemas.
- **File / Function**: `server/src/services/attendance-calc.service.ts` (lines 300–370).
- **Difficulty**: Hard.
- **Follow-up**: *What happens if the pasted input is completely empty or garbage text?*  
  *Answer*: The parser returns `{ success: false, errors: ['Input attendance data is empty...'] }` with zero exceptions thrown.

#### Q8.9: How does the system detect and flag ERP calculation discrepancies?
- **Answer**: If the university ERP reports an attendance percentage that deviates from the mathematically calculated value by more than $0.1\%$, the engine flags `isDiscrepancy = true` and attaches a diagnostic explanation note. For example, for course CSUT530, the ERP reported 100% despite an absent record because the institution granted a completion waiver.
- **File / Function**: `server/src/services/attendance-calc.service.ts` (lines 115–135).
- **Difficulty**: Hard.
- **Follow-up**: *Does the system overwrite the student's official ERP percentage when a discrepancy is detected?*  
  *Answer*: No. It preserves both values: `erpPercentage` stores the official record, while `calculatedPercentage` holds the mathematical derivation.

#### Q8.10: Why does the client have its own copy of the calculation math?
- **Answer**: The Attendance What-If Simulator features dynamic sliders for "Additional Attended" and "Additional Bunked" classes. If the client had to make an HTTP network request to the backend on every slider move, the UI would stutter with network latency. Having a local copy in `client/src/utils/attendance-math.ts` allows the simulator to run synchronously at 60 FPS in the browser thread.
- **File / Function**: `client/src/utils/attendance-math.ts`, `client/src/pages/student/AttendanceIntelligencePage.tsx`.
- **Difficulty**: Intermediate.
- **Follow-up**: *Doesn't duplicating code on client and server violate the DRY (Don't Repeat Yourself) principle?*  
  *Answer*: It is an intentional engineering trade-off for latency optimization, strictly protected by our automated cross-boundary parity test.

#### Q8.11: How does the Cross-Boundary Parity Test work?
- **Answer**: In `server/src/recovery-math.test.ts`, the backend test suite dynamically imports the frontend math file (`client/src/utils/attendance-math.ts`) using Node's `pathToFileURL`. It then iterates through over 1,000 permutations of attended classes, conducted classes, additional bunks, and thresholds, asserting that `clientMath` and `serverCalc` return identical integer outputs. If either side changes, the test fails immediately in CI.
- **File / Function**: `server/src/recovery-math.test.ts` (lines 245–306).
- **Difficulty**: Hard.
- **Follow-up**: *Why not just share a common npm package between client and server?*  
  *Answer*: In a lightweight monorepo, a shared package requires separate build configurations, symlinks, and compilation pipelines. A dual-copy architecture with automated parity testing provides identical safety guarantees with zero build tooling overhead.

#### Q8.12: How does the What-If Simulator work?
- **Answer**: The simulator function `simulateScenario(attended, conducted, addAttended, addMissed, threshold)` computes projected attendance:
  $$\text{New Attended} = \text{attended} + \text{addAttended}$$
  $$\text{New Conducted} = \text{conducted} + \text{addAttended} + \text{addMissed}$$
  $$\text{Projected \%} = \frac{\text{New Attended}}{\text{New Conducted}} \times 100$$
  It dynamically returns whether the projected outcome is `'safe'` or `'shortage'`, and recomputes the revised classes needed or skippable under that hypothetical future.
- **File / Function**: `client/src/utils/attendance-math.ts` (`simulateScenario`).
- **Difficulty**: Intermediate.
- **Follow-up**: *Can a student simulate negative attendance?*  
  *Answer*: No. Inputs are clamped with `Math.max(0, ...)` to prevent negative class inputs.

#### Q8.13: What is the preview workflow during attendance import?
- **Answer**: When a student uploads a CSV or pastes text, the app calls `POST /api/attendance/parse-preview`. This parses the data in memory and returns a structured preview diff showing rows detected, new subjects, updated records, and discrepancies—**without writing anything to the database**. Only when the student reviews the table and clicks "Confirm Import" does the app send `POST /api/attendance/import` to persist records.
- **File / Function**: `server/src/routes/attendance.routes.ts` (lines 100–160).
- **Difficulty**: Intermediate.
- **Follow-up**: *Why is a two-step preview/confirm workflow necessary?*  
  *Answer*: It prevents database corruption if a student accidentally pastes the wrong semester's data or malformed text.

#### Q8.14: How does the system handle an attendance record where total conducted is zero?
- **Answer**: In new semester courses where no classes have been conducted yet ($C = 0$), calculating $\frac{A}{C}$ would result in `NaN` or `Infinity`. The engine explicitly handles this edge case: percentage is set to 0, classes needed returns 0, and skippable classes returns 0.
- **File / Function**: `server/src/services/attendance-calc.service.ts` (lines 107–109).
- **Difficulty**: Basic.
- **Follow-up**: *How does the UI represent this state?*  
  *Answer*: The UI displays a neutral gray badge labeled "Not Started" rather than an alarming red shortage alert.

#### Q8.15: What threshold boundary values are supported by the engine?
- **Answer**: The engine supports arbitrary thresholds from 1% to 99%, with UI presets for 60%, 65%, 70%, 75%, 80%, and 85%. 75% is the standard university debarment threshold.
- **File / Function**: `server/src/recovery-math.test.ts` (lines 250–255).
- **Difficulty**: Basic.
- **Follow-up**: *What happens if threshold is set to 100%?*  
  *Answer*: If $T = 100$, any single missed class makes 100% mathematically impossible to achieve in finite classes, so `calculateClassesNeeded` correctly returns `Infinity`.

---

### TOPIC 9: Study Timer & Session Architecture

#### Q9.1: Why is the Study Timer server-authoritative?
- **Answer**: A client-side timer relies on `setInterval` in the browser tab. If the tab goes into the background, the browser throttles timers to conserve CPU and battery. If the user closes the laptop, refreshes the page, or switches devices, a client timer resets. Our timer stores state (`startTime`, `pausedSeconds`, `lastPauseTime`, `status`) in MongoDB, making the server the sole source of truth.
- **File / Function**: `server/src/models/StudySession.ts`, `server/src/routes/study.routes.ts`.
- **Difficulty**: Intermediate.
- **Follow-up**: *How does the frontend stay in sync with the server timer?*  
  *Answer*: On mount, the frontend calls `GET /api/study/current`. If an active session exists, the server returns the authoritative `elapsedSeconds`, and the client initializes its local display ticker from that baseline.

#### Q9.2: How is paused time accumulated accurately without drift?
- **Answer**: When a student pauses the timer via `POST /api/study/pause`, the server records `lastPauseTime = new Date()` and sets `status = 'paused'`. When the student clicks resume (`POST /api/study/resume`), the server computes:
  $$\text{pauseDuration} = \text{Date.now()} - \text{lastPauseTime}$$
  and adds it to `pausedSeconds`: `session.pausedSeconds += pauseDuration`.
  Elapsed study time is always:
  $$\text{Elapsed} = \text{CurrentTime} - \text{StartTime} - \text{PausedSeconds}$$
- **File / Function**: `server/src/routes/study.routes.ts` (lines 17–33, 147–180).
- **Difficulty**: Hard.
- **Follow-up**: *What happens if the server is queried while the session is currently in a paused state?*  
  *Answer*: `calculateElapsedSeconds` detects `status === 'paused'` and computes elapsed time up to `lastPauseTime` rather than `Date.now()`, ensuring the counter remains perfectly frozen while paused.

#### Q9.3: What prevents a student from running two simultaneous study sessions?
- **Answer**: In `POST /api/study/start`, the server performs a query for existing sessions: `StudySession.findOne({ userId, status: { $in: ['active', 'paused'] } })`. If an active or paused session already exists, it rejects the request with `409 Conflict` and returns the existing session.
- **File / Function**: `server/src/routes/study.routes.ts` (lines 69–84).
- **Difficulty**: Intermediate.
- **Follow-up**: *Can this race condition be exploited if two tabs send `/start` simultaneously?*  
  *Answer*: With Mongoose, concurrent requests within milliseconds could potentially slip past `findOne`. To make it 100% atomic at the database engine level, a partial unique index on `{ userId: 1 }` where `{ status: { $in: ['active', 'paused'] } }` would guarantee hardware-level exclusion.

#### Q9.4: What happens if a student abandons a study session and forgets to finish it?
- **Answer**: The student can either click "Cancel Session" (`POST /api/study/cancel`), which deletes or marks the session abandoned without crediting study hours, or click "Finish", which calculates elapsed time up to the current moment.
- **File / Function**: `server/src/routes/study.routes.ts` (lines 184–220).
- **Difficulty**: Basic.
- **Follow-up**: *Does an abandoned session inflate goal study hours?*  
  *Answer*: No. The goals engine filters strictly by `status: 'completed'`. Cancelled or ongoing sessions do not count toward goal progress.

#### Q9.5: How are study analytics aggregated for the dashboard?
- **Answer**: `GET /api/study/history` queries all completed study sessions for the user. It aggregates total focus time, calculates daily and weekly averages, breaks down focus hours by subject code, and returns the last 10 completed sessions for display in historical charts.
- **File / Function**: `server/src/routes/study.routes.ts` (lines 222–255).
- **Difficulty**: Intermediate.
- **Follow-up**: *How does this feed into academic goals?*  
  *Answer*: Goals configured with `autoLinkMetric: 'study_hours'` sum the `durationSeconds` of completed sessions linked to that subject and convert seconds to hours (`totalSeconds / 3600`).

---

### TOPIC 10: Academic Goals & Side-Effect-Free Architecture

#### Q10.1: What metrics can be auto-linked to Academic Goals?
- **Answer**: We support three auto-linked metrics via `autoLinkMetric`:
  1. `'attendance'`: Synchronizes `currentValue` with the linked Subject's live `attendancePercentage`.
  2. `'task_completion'`: Counts completed tasks linked to that subject from the Task collection.
  3. `'study_hours'`: Sums completed focus hours from the StudySession collection.
- **File / Function**: `server/src/routes/goal.routes.ts` (lines 38–94).
- **Difficulty**: Intermediate.
- **Follow-up**: *Can a student still create a manual goal?*  
  *Answer*: Yes. If `autoLinkMetric` is set to `'none'`, the goal acts as a manual milestone where the student updates `currentValue` directly.

#### Q10.2: Why are auto-linked goals computed in-memory on GET requests without database writes?
- **Answer**: Executing database write operations during HTTP `GET` requests violates the fundamental HTTP specification (which requires `GET` to be safe and idempotent). If every page refresh or dashboard query triggered `Goal.updateOne()` calls across multiple records, database write locks would multiply, slowing down the application and polluting change streams. Our `GET /api/goals` route calculates live metrics in memory (`persist = false`), returning real-time progress with zero database writes.
- **File / Function**: `server/src/routes/goal.routes.ts` (lines 48–94, 96–115).
- **Difficulty**: Hard.
- **Follow-up**: *How does the system persist progress if no writes occur on GET?*  
  *Answer*: Writes occur during explicit mutations—such as updating a goal, or triggering the dedicated `POST /api/goals/recompute` endpoint.

#### Q10.3: Explain the "Drop-Below Rule" for academic goals.
- **Answer**: In academic tracking, progress is non-monotonic: if a student has 76% attendance, their 75% attendance goal marks as completed. However, if the student subsequently bunks two classes and attendance drops to 72%, the goal must not remain falsely completed. Our calculation engine enforces the drop-below rule: unless explicitly marked as `'abandoned'`, an auto-linked goal's status dynamically reverts back to `'active'` whenever `currentValue < targetValue`.
- **File / Function**: `server/src/routes/goal.routes.ts` (lines 83–86).
- **Difficulty**: Hard.
- **Follow-up**: *What prevents an abandoned goal from reviving?*  
  *Answer*: The conditional check explicitly checks `if (goal.status !== 'abandoned')`, preserving the student's deliberate decision to drop a goal.

#### Q10.4: How does `GET /api/goals/summary` compute average progress?
- **Answer**: It calculates the percentage progress of each goal as $\min(100, \text{round}((\text{currentValue} / \text{targetValue}) \times 100))$, sums these percentages across all user goals, and divides by the total goal count, returning an overall academic health index.
- **File / Function**: `server/src/routes/goal.routes.ts` (lines 109–116).
- **Difficulty**: Basic.
- **Follow-up**: *What does it return if the student has zero goals?*  
  *Answer*: It safely returns an average progress of 0, avoiding division by zero.

---

### TOPIC 11: Tasks & Kanban Board Engineering

#### Q11.1: What library powers the Kanban drag-and-drop, and why was it chosen?
- **Answer**: We chose `@dnd-kit` (`@dnd-kit/core`, `@dnd-kit/sortable`). Unlike legacy drag-and-drop libraries like `react-beautiful-dnd` (which is archived and has compatibility issues with React 18 strict mode) or HTML5 native drag (which is notoriously difficult to style and lacks mobile touch support), `@dnd-kit` is lightweight, modular, supports pointer and touch sensors, and provides built-in accessibility.
- **File / Function**: `client/src/pages/student/TasksPage.tsx` (lines 16–29).
- **Difficulty**: Intermediate.
- **Follow-up**: *How does pointer activation constraint prevent accidental drags?*  
  *Answer*: We configure the `PointerSensor` with an activation constraint of `distance: 5`. This ensures that a 5-pixel drag movement is required before a drag gesture initiates, allowing standard mouse clicks on cards and buttons without triggering an accidental drag.

#### Q11.2: Explain your Optimistic Update and Rollback mechanism during task drag.
- **Answer**: When a student drops a task card into a new column, waiting for a network roundtrip to update the UI would cause a visible lag. We implement an optimistic update:
  1. We immediately update the local React state: `setTasks(prev => prev.map(...))`.
  2. We send the asynchronous network request: `updateTask(taskId, { status: nextStatus })`.
  3. If the network call fails or the server rejects the update, our `catch` block intercepts the error, rolls back local state to the previous status, and displays an error toast informing the student.
- **File / Function**: `client/src/pages/student/TasksPage.tsx` (lines 156–178).
- **Difficulty**: Hard.
- **Follow-up**: *What happens if the user drags three tasks in rapid succession while on a slow 3G network?*  
  *Answer*: Each task closure retains its own `previousStatus` in scope, ensuring that whichever specific network request fails rolls back only its corresponding card.

#### Q11.3: How do you make the Kanban board accessible to keyboard and screen-reader users?
- **Answer**: Drag-and-drop is inherently challenging for motor-impaired users. We solved this with a two-fold accessibility architecture:
  1. We register `@dnd-kit`'s `KeyboardSensor`, enabling keyboard focus and movement via space and arrow keys.
  2. Every task card includes an explicit fallback action button / dropdown (`Move to: In Progress / Completed`), allowing users to reassign task statuses with a single keystroke or click without dragging.
  3. We provide a full **List View** toggle that flattens the Kanban board into an accessible tabular list.
- **File / Function**: `client/src/pages/student/TasksPage.tsx` (lines 107–114, 83).
- **Difficulty**: Hard.
- **Follow-up**: *What WCAG standard does this satisfy?*  
  *Answer*: WCAG 2.1 Success Criterion 2.5.7 (Dragging Movements), which mandates that any functionality that depends on dragging must also be operable via single-pointer interactions.

#### Q11.4: How does task priority affect card sorting?
- **Answer**: Tasks support three priorities: `high`, `medium`, and `low`. In the Kanban column views and dashboard widgets, tasks are sorted first by priority severity, and secondarily by upcoming `dueDate`.
- **File / Function**: `server/src/models/Task.ts`, `client/src/pages/student/TasksPage.tsx`.
- **Difficulty**: Basic.
- **Follow-up**: *What visual indicators differentiate high-priority tasks?*  
  *Answer*: High-priority tasks render a distinctive crimson border accent and an alert badge, making urgent deadlines immediately identifiable.

---

### TOPIC 12: UI/UX, Design Tokens & Accessibility

#### Q12.1: How is the Design System implemented without CSS-in-JS libraries?
- **Answer**: We implemented a complete token-based design system using pure CSS custom properties (variables) declared in `:root` and `[data-theme='dark']`. Tokens govern surfaces (`--bg-base`, `--bg-surface`), typography (`--text-primary`, `--text-muted`), borders (`--border-subtle`), and semantic feedback (`--green`, `--red`, `--amber`). Components consume these variables directly. This eliminates runtime JavaScript style calculation overhead and guarantees zero layout thrashing.
- **File / Function**: `client/src/styles/index.css` (lines 1–150).
- **Difficulty**: Intermediate.
- **Follow-up**: *How does dark mode toggle between light and dark tokens?*  
  *Answer*: When the theme changes, `ThemeContext` toggles the `data-theme="dark"` attribute on the root `<html>` element. All CSS variables cascade and update across the entire application instantly.

#### Q12.2: How does the application respect user motion preferences?
- **Answer**: In `client/src/styles/index.css`, we include a `@media (prefers-reduced-motion: reduce)` block. For users who have enabled reduced motion in their operating system settings, all animation and transition durations are clamped to `0.01ms !important`. This accommodates vestibular disorders and reduces motion sickness.
- **File / Function**: `client/src/styles/index.css` (lines 701–710).
- **Difficulty**: Intermediate.
- **Follow-up**: *What WCAG criterion does this address?*  
  *Answer*: WCAG 2.1 Success Criterion 2.3.3 (Animation from Interactions).

#### Q12.3: How does the layout adapt across mobile, tablet, and desktop viewports?
- **Answer**: We use CSS media queries and fluid CSS Grid layouts. On desktop screens ($>1024\text{px}$), the sidebar is pinned at 256px width. On tablet screens ($768\text{px} - 1024\text{px}$), the sidebar collapses to a 72px icon rail. On mobile phones ($<768\text{px}$), the sidebar converts into an off-canvas drawer that slides in when toggled and automatically closes when any link is tapped.
- **File / Function**: `client/src/components/Sidebar.tsx`, `client/src/styles/index.css`.
- **Difficulty**: Intermediate.
- **Follow-up**: *How do you test responsiveness down to the smallest standard smartphone?*  
  *Answer*: We verified layouts at 375px width (iPhone SE standard), ensuring attendance cards, data tables, and modal dialogues collapse to single-column layouts without horizontal scroll overflow.

#### Q12.4: Why do you use skeleton loaders instead of traditional spinner wheels?
- **Answer**: Spinner wheels only communicate that the page is loading; they provide no spatial orientation. Skeleton loaders mimic the exact layout geometry of the incoming cards and tables, reducing perceived loading time, preventing Cumulative Layout Shift (CLS), and creating a smoother visual transition when data populates.
- **File / Function**: `client/src/components/Skeleton.tsx`.
- **Difficulty**: Basic.
- **Follow-up**: *How are skeleton animations implemented?*  
  *Answer*: Using a lightweight CSS `@keyframes shimmer` animation that glides a translucent gradient across the placeholder box.

#### Q12.5: How did you ensure readable Recharts charts in dark mode?
- **Answer**: Third-party chart libraries often hardcode stroke and fill colors that become invisible against dark backgrounds. We solved this by creating a dynamic theme hook that extracts the active CSS token values (`var(--text-muted)`, `var(--border-subtle)`) and passes them dynamically to Recharts `XAxis`, `YAxis`, `CartesianGrid`, and `Tooltip` components, ensuring high contrast across both themes.
- **File / Function**: `client/src/pages/StudentDashboardPreview.tsx`, `client/src/styles/index.css`.
- **Difficulty**: Intermediate.
- **Follow-up**: *What happens to tooltips in dark mode?*  
  *Answer*: The tooltip container reads `background: var(--bg-surface)` and `border: 1px solid var(--border-subtle)`, rendering cleanly with high-contrast text.

---

### TOPIC 13: Testing & Code Quality Assurance

#### Q13.1: Provide an overview of your test suite.
- **Answer**: The application is covered by **147 automated tests**:
  - **136 Server Tests** across 33 test suites executed via Node's native test runner (`node --test --import tsx`). They cover RBAC authorization, ERP text parsing, attendance mathematical calculations, multi-tenant isolation, CRUD across all entities, CSRF rejection, and database migrations.
  - **11 Client Tests** across 2 suites covering mathematical recovery parity and Markdown XSS prevention.
- **File / Function**: `server/src/**/*.test.ts`, `client/src/**/*.test.ts`, `package.json` (`npm run test`).
- **Difficulty**: Intermediate.
- **Follow-up**: *How long does the entire test suite take to run?*  
  *Answer*: Approximately 4.0 seconds total, thanks to Node's native lightweight test runner and in-memory execution.

#### Q13.2: Why did you use Node's native test runner instead of Jest or Mocha?
- **Answer**: Node.js v20+ includes a built-in native test runner (`node:test` and `node:assert`). It requires zero external dependencies, avoids the notorious ESM/CommonJS transformation issues common with Jest in TypeScript monorepos, boots in milliseconds, and eliminates hundreds of megabytes of `node_modules` overhead.
- **File / Function**: `server/package.json`, `client/package.json`.
- **Difficulty**: Intermediate.
- **Follow-up**: *How do you run server tests in isolation from live databases?*  
  *Answer*: We utilize `mongodb-memory-server` in test suites, spinning up an ephemeral in-memory MongoDB instance that creates fresh collections for each test and terminates cleanly after execution.

#### Q13.3: What code linters and formatters are integrated into the monorepo?
- **Answer**: We enforce code hygiene through ESLint (with `@typescript-eslint`) and Prettier. In the root `package.json`, we provide `npm run lint` and `npm run format:check`. Our CI scripts reject any pull request containing unused variables, unresolved promises, or unformatted code blocks.
- **File / Function**: `eslint.config.js`, `.prettierrc`, `package.json`.
- **Difficulty**: Basic.
- **Follow-up**: *How do you verify formatting without altering files?*  
  *Answer*: By running `npx prettier --check .`, which returns an exit code of 0 if compliant, or lists unformatted files without modifying them.

#### Q13.4: What parts of the application are NOT covered by automated tests?
- **Answer**: While our mathematical engines, API controllers, and security middleware have near 100% test coverage, we do not currently run automated browser end-to-end (E2E) suites using Cypress or Playwright for full visual UI journeys. Instead, UI flows are verified through automated client unit tests and our production smoke script (`scripts/smoke-prod.sh`).
- **File / Function**: `scripts/smoke-prod.sh`.
- **Difficulty**: Hard.
- **Follow-up**: *How would you add E2E testing in the next phase?*  
  *Answer*: By introducing Playwright to automate headless browser clicks across the login, attendance import, and drag-and-drop Kanban journeys.

---

### TOPIC 14: DevOps, Deployment & Cloud Architecture

#### Q14.1: Explain your production deployment topology.
- **Answer**: Student Hub is deployed across three specialized cloud platforms:
  1. **MongoDB Atlas**: Fully managed replica set cloud database hosting our collections.
  2. **Render**: Hosts our containerized Node.js/Express API web service with continuous deployment from the GitHub `main` branch.
  3. **Vercel**: Edge network CDN serving the compiled static React frontend assets with automatic SSL.
- **File / Function**: `DEPLOYMENT.md`, `render.yaml`, `client/vercel.json`.
- **Difficulty**: Basic.
- **Follow-up**: *What is the advantage of hosting the frontend on Vercel and backend on Render instead of serving both from Express?*  
  *Answer*: Separation of concerns and cost efficiency. Vercel caches static assets at worldwide edge locations with instant CDN delivery, offloading static traffic completely from our backend server CPU.

#### Q14.2: Explain why Safari blocks third-party cookies and how your architecture solves it.
- **Answer**: Apple Safari's Intelligent Tracking Prevention (ITP) strictly blocks all third-party cookies by default. If our frontend is hosted on `student-hub.vercel.app` and sends requests directly to `student-hub-api.onrender.com`, the cookie is considered third-party and cross-site; Safari will silently drop the authentication cookie, breaking login.
  We solved this by establishing a **Same-Origin Reverse Proxy**: in `client/vercel.json`, we configured an edge rewrite rule:
  `{"source": "/api/:path*", "destination": "https://api-service.onrender.com/api/:path*"}`.
  The browser talks strictly to `/api/*` on its own Vercel domain, making the cookie first-party (`SameSite=Lax`), allowing Safari and Chrome to function seamlessly.
- **File / Function**: `client/vercel.json`, `client/src/services/api.ts`, `DEPLOYMENT.md`.
- **Difficulty**: Hard.
- **Follow-up**: *What environment variable must the client use in production?*  
  *Answer*: In production, `VITE_API_BASE_URL` is set to `/api` (a relative path), allowing requests to route through the Vercel proxy.

#### Q14.3: How does the production smoke script verify deployment health?
- **Answer**: `scripts/smoke-prod.sh` is an automated bash script using `curl` and `jq`. Given any deployed target URL, it executes an 8-step verification pipeline:
  1. Pings `/api/health`.
  2. Registers an ephemeral test user.
  3. Authenticates and stores cookies in a temporary cookie jar.
  4. Verifies session identity via `/api/auth/me`.
  5. Creates a task on the Kanban board.
  6. Deletes the task.
  7. Terminates the session via `/api/auth/logout`.
  8. Asserts that subsequent calls return `401 Unauthorized`.
- **File / Function**: `scripts/smoke-prod.sh`.
- **Difficulty**: Intermediate.
- **Follow-up**: *What exit code does the smoke script return on failure?*  
  *Answer*: It exits with non-zero code `1` immediately if any step fails, enabling automated CI/CD pipeline halting.

#### Q14.4: How do you handle cold starts on Render's free tier?
- **Answer**: Render's free instance spins down after 15 minutes of inactivity. When a new request arrives, it can take 30–50 seconds to boot. We mitigated this by configuring our shallow `/api/health` endpoint, which can be pinged periodically by automated monitoring services (like UptimeRobot or cron jobs) to keep the instance warm during active university hours.
- **File / Function**: `server/src/routes/health.routes.ts`, `DEPLOYMENT.md`.
- **Difficulty**: Intermediate.
- **Follow-up**: *How does the frontend handle a slow cold-start response?*  
  *Answer*: The client's `apiRequest` utility has an extended 15-second timeout window, and our UI renders reassuring loading skeletons rather than timing out abruptly.

---

### TOPIC 15: Git Workflow, Branching & Hygiene

#### Q15.1: Explain your Git branching strategy.
- **Answer**: We followed a disciplined feature-branching workflow. Heavy development, security hardening, and database backfills were executed on dedicated feature branches (such as `feature/integration-hardening`). Changes were verified with test suites, lint checks, and dry runs before being cleanly merged into the `main` production branch.
- **File / Function**: Git log, `scripts/hygiene.sh`.
- **Difficulty**: Basic.
- **Follow-up**: *Why did you create the `pre-redesign-main` tag before merging?*  
  *Answer*: Before executing the large integration merge into `main`, we created an annotated Git tag `pre-redesign-main` pointing to commit `75764e9`. This guaranteed an immediate, zero-risk rollback point if any production regression occurred.

#### Q15.2: Why was the legacy codebase archived rather than deleted?
- **Answer**: The initial prototype of Student Hub was built in vanilla JavaScript (`legacy-archive/`). Rather than abruptly deleting it, we moved it into `legacy-archive/`. This preserves the historical audit trail, provides a reference for early data structures, and allows evaluators to visually inspect the evolutionary leap in code quality from the prototype to the modern TypeScript architecture.
- **File / Function**: `legacy-archive/`, `package.json` (`test:legacy`).
- **Difficulty**: Basic.
- **Follow-up**: *Does code in `legacy-archive/` get compiled into the production build?*  
  *Answer*: No. Both `server/tsconfig.json` and `client/tsconfig.json` explicitly exclude `legacy-archive/`, ensuring zero impact on production bundles.

#### Q15.3: What automated hygiene checks exist in the repository?
- **Answer**: We authored `scripts/hygiene.sh`, which performs a pre-flight sanity audit: it checks that no dangling merge conflicts exist, verifies that `.env` files are not tracked in Git, runs Prettier formatting verification, and ensures no orphan temporary files clutter the repository.
- **File / Function**: `scripts/hygiene.sh`.
- **Difficulty**: Intermediate.
- **Follow-up**: *How does this protect continuous integration?*  
  *Answer*: Running hygiene checks locally before pushing prevents broken builds and wasted CI runner minutes on GitHub Actions.

---

### TOPIC 16: Limitations & Future Roadmap

#### Q16.1: What are the primary technical limitations of the current implementation?
- **Answer**: The primary technical limitations are:
  1. Reliance on a single active session token without a refresh token rotation system.
  2. The ERP parser is tuned specifically for standard tabular TSV/CSV formats; it does not parse scanned PDF grade cards using OCR.
  3. The absence of a distributed caching layer (like Redis) for frequently read announcements and resources.
  4. WebSockets are not yet implemented; updates rely on HTTP polling or route transitions.
- **File / Function**: `server/src/services/auth.service.ts`, `server/src/services/attendance-calc.service.ts`.
- **Difficulty**: Hard.
- **Follow-up**: *How would you add Redis caching?*  
  *Answer*: By placing a Redis middleware ahead of public routes like `GET /api/announcements`, caching JSON payloads with a 5-minute TTL and invalidating the cache when administrators publish new notices.

#### Q16.2: What features are planned for Student Hub 2.0?
- **Answer**: Our roadmap includes:
  1. Automated ERP synchronization via headless browser background workers (using Puppeteer).
  2. OCR scanning of physical attendance slips and semester grade sheets.
  3. Push notifications for impending attendance shortages via WebPush and Telegram bots.
  4. Multi-university tenancy, allowing different institutions to configure custom attendance formulas and semester credit structures.
- **Difficulty**: Basic.
- **Follow-up**: *How would multi-tenancy be modeled in the database?*  
  *Answer*: By adding an `institutionId` reference to all User, Subject, and Attendance schemas, backed by tenant-scoped database query middleware.

---

## SECTION C: 20 Hard & Trap Questions (Examiner Traps)

#### Q1: "Why not simply store the JWT in `localStorage`? It is much easier to implement on the client."
- **Strong Model Answer**: "While `localStorage` requires less configuration, it is inherently insecure for authentication credentials because it is accessible to any JavaScript code executing on the domain. Any third-party npm package vulnerability or XSS exploit can execute `localStorage.getItem('token')` and permanently exfiltrate the user's session. Storing the JWT in an `httpOnly` cookie guarantees that client scripts cannot access the token, mitigating token theft by design."
- **Weak Spot to Admit**: "The trade-off is that `httpOnly` cookies require careful CORS, cookie flag, and CSRF origin handling, especially when deploying client and server on separate cloud subdomains."

#### Q2: "What happens if a student opens two browser tabs and starts a study timer in both simultaneously?"
- **Strong Model Answer**: "Our study timer is server-authoritative. In `POST /api/study/start`, the controller checks for an existing session where `status: { $in: ['active', 'paused'] }`. The second tab's request is rejected with `409 Conflict`, and the server returns the existing session data. The second tab simply binds to the running session."
- **Weak Spot to Admit**: "If both tabs click start within the exact same millisecond, a theoretical race condition could slip past `findOne` before `save()` finishes. To make this completely foolproof at scale, we should enforce a partial compound unique index in MongoDB on `{ userId: 1 }` where status is active."

#### Q3: "What if the university changes its ERP table format next semester? Doesn't your parser break?"
- **Strong Model Answer**: "Our parser is designed for resilience: it doesn't hardcode fixed column indices. It uses dynamic fuzzy alias dictionaries (`HEADER_ALIASES`) that recognize dozens of column variations (e.g., 'Code', 'CourseCode', 'SubCode', 'Present', 'Attended'). It also auto-detects delimiter formats—tabs, pipes, commas, and multi-spaces."
- **Weak Spot to Admit**: "If the university completely migrates to an obfuscated PDF or a canvas-rendered grid without raw text, our text tokenizer would fail. In that scenario, we would need to build an OCR or headless browser scraping extension."

#### Q4: "Your client duplicates the server calculation math in `attendance-math.ts`. Doesn't that violate DRY?"
- **Strong Model Answer**: "In strict software theory, yes, it duplicates the calculation functions. But in client-server architecture, it was an intentional engineering choice: running the What-If sliders at 60 FPS requires synchronous zero-latency execution on the browser thread without making network calls. To eliminate the risk of code divergence, we engineered an automated Cross-Boundary Parity Test (`server/src/recovery-math.test.ts`) that verifies 1,000+ permutations between both files in CI."
- **Weak Spot to Admit**: "A cleaner architectural solution would be to compile the math functions into a shared internal npm package consumed by both frontend and backend."

#### Q5: "How would this architecture scale to 50,000 concurrent students during exam week?"
- **Strong Model Answer**: "Our current architecture has several scalability advantages: stateless JWT authentication means any application server can handle any request without shared server memory; MongoDB compound indexes ensure $O(\log N)$ query times; and Vercel edge caching serves all static frontend assets. To support 50,000 concurrent students, we would:
  1. Add a Redis cache in front of read-heavy endpoints like Announcements and Course Catalogs.
  2. Implement connection pooling using MongoDB Atlas connection limits.
  3. Horizontally scale the stateless Express API instances across Kubernetes or Render auto-scaling clusters."
- **Weak Spot to Admit**: "Right now, running in-memory calculations for goals on every GET request would cause CPU spikes if 50,000 students refreshed simultaneously. We would need to pre-compute and cache goal progress asynchronously."

#### Q6: "What stops a student from reading or deleting another student's tasks?"
- **Strong Model Answer**: "Every database operation explicitly scopes queries by `userId: req.user._id`. For example, deleting a task executes `Task.findOneAndDelete({ _id: taskId, userId: req.user._id })`. Even if an attacker guesses another student's valid ObjectId, the database finds zero matching records and returns a 404, preventing Insecure Direct Object References (IDOR)."
- **Weak Spot to Admit**: "Our integration tests verify this for Tasks, Notes, and Subjects, but we must maintain strict discipline never to write a bare `findByIdAndDelete(id)` anywhere in future routes."

#### Q7: "Which parts of this codebase did you write yourself, and which did AI tools assist with?"
- **Strong Model Answer**: "I designed the entire system architecture, formulated the mathematical recovery equations, defined the database schemas, and directed the project implementation. I utilized modern AI coding assistants as productivity accelerators—similar to a junior pair-programmer—to assist with drafting repetitive boilerplate, creating mock fixtures, and generating initial test permutations. I personally reviewed, refined, debugged, and verified every single line of code, authored the backfill migrations, ran all 147 tests, and I can explain the internal mechanics of any file in this repository."
- **Weak Spot to Admit**: "Leveraging AI for boilerplate allowed me to spend more time focusing on complex edge cases—like the 24 event hours discrepancy and integer-exact ceiling math."

#### Q8: "Why did you use bcrypt cost 12? Why not cost 14 or 16 for maximum security?"
- **Strong Model Answer**: "Bcrypt cost is exponential: each increment doubles the hashing time ($2^{\text{cost}}$). Cost 12 takes approximately 250 milliseconds per hash on modern cloud vCPUs, which provides an optimal balance between security and user experience. Cost 14 would take over 1 full second, and cost 16 would take 4 seconds per login, which would degrade throughput and make the server vulnerable to CPU-exhaustion DoS attacks if an attacker flooded the login endpoint."
- **Weak Spot to Admit**: "We currently lack an automatic re-hashing mechanism to dynamically upgrade password hashes if we increase salt rounds in the future."

#### Q9: "What happens if a user submits a note containing `<script>` tags?"
- **Strong Model Answer**: "Nothing harmful happens. First, our markdown compiler uses `escapeHtml()` to convert `<` and `>` into `&lt;` and `&gt;`. Second, before rendering in the DOM, the compiled markup is passed through `DOMPurify.sanitize()`, which strictly allows only safe typographic tags (`h1`, `p`, `b`, `code`) and completely deletes `<script>` tags and inline event handlers like `onload` or `onerror`."
- **Weak Spot to Admit**: "DOMPurify runs on the client. If a malicious client bypassed the frontend and saved raw HTML into the MongoDB database directly, the database would store it. However, whenever any client fetches and renders that note, DOMPurify sanitizes it before DOM injection."

#### Q10: "Why use `ceiling` in classes needed, but `floor` in classes skippable?"
- **Strong Model Answer**: "Because university attendance regulations enforce strict minimum cutoffs. In recovery, attending 5.1 classes means 5 classes leaves you at 74.8% (debarred), so you must attend the full 6th class to cross 75%—hence `Math.ceil`. Conversely, if you can afford to skip 2.8 classes, skipping 3 classes drops you to 74.5% (debarred), so you can safely miss only 2 whole classes—hence `Math.floor`."
- **Weak Spot to Admit**: "If an examiner asks about half-credit lab sessions, our current model treats each timetable session as a discrete unit (1 class)."

#### Q10A: "Why did your initial attendance calculation for CSUL511 (DevOps) show a discrepancy against the ERP percentage?"
- **Strong Model Answer**: "In CSUL511, the student had 33 Present, 0 OD, 1 Makeup, and 7 Absent out of 41 conducted. Standard calculation yields $\frac{33}{41} = 80.49\%$. However, the ERP reported $85.00\%$. Our engine investigated this and determined that this specific faculty credited the makeup class as extra attendance credit ($\frac{34}{40} = 85.00\%$). Our parser flagged this as an intentional discrepancy note rather than an error, accurately informing the student."
- **Weak Spot to Admit**: "The engine cannot guess internal faculty grading agreements unless they match known makeup compensatory formulas."

#### Q11: "Why did you choose React Context over Zustand or Redux Toolkit?"
- **Strong Model Answer**: "Our application has only three pieces of truly global state: user authentication, theme preference, and ephemeral toast messages. Everything else—like task lists, notes, and attendance tables—is local to its respective page. React's native Context API handles this with zero extra bundle weight. Adding Redux or Zustand would introduce unnecessary external dependencies without tangible performance gains."
- **Weak Spot to Admit**: "If multiple components consume a Context that updates frequently, all consumers re-render. Fortunately, our Auth and Theme contexts update rarely (only on login, logout, or theme toggle)."

#### Q12: "How do you protect against MongoDB NoSQL operator injection in search queries?"
- **Strong Model Answer**: "We apply two layers of defense: first, every incoming query parameter is validated with Zod to ensure it is a plain primitive string; second, for text and regex queries, we pass strings through `escapeRegExp()`. This prevents an attacker from passing query objects like `{ $gt: '' }` or malformed regex strings designed to crash the MongoDB query engine."
- **Weak Spot to Admit**: "We do not have MongoDB `sanitizeFilter` enabled globally in Mongoose options, relying instead on Zod at the route perimeter."

#### Q13: "What happens if MongoDB goes down while the Express server is running?"
- **Strong Model Answer**: "Our server does not crash. Mongoose buffers queries while attempting automatic reconnection. Furthermore, our `/api/health/db` endpoint detects `readyState !== 1` and returns `503 Service Unavailable`, allowing automated health checkers to flag the outage immediately."
- **Weak Spot to Admit**: "If MongoDB stays down for more than 30 seconds, buffered queries time out and Express returns 500 errors to users until the database reconnects."

#### Q14: "Why did you implement an auto-upsert in ERP import instead of rejecting duplicate imports?"
- **Answer**: "University students import ERP attendance multiple times throughout a semester as new classes are conducted. If we rejected duplicate imports, students would have to manually delete old records first. Auto-upserting on the unique compound key `{ userId, subjectCode }` updates existing records with the latest attendance numbers seamlessly and idempotently."
- **Weak Spot to Admit**: "If a professor changes a course code mid-semester (e.g., from CSUL501 to CSUL501A), auto-upsert would treat it as a new course rather than updating the old one."

#### Q15: "Why did you write custom CSS instead of using Tailwind CSS?"
- **Strong Model Answer**: "Tailwind generates thousands of utility classes and creates bloated, unreadable JSX markup (`className='p-4 bg-white dark:bg-gray-800 flex items-center...'`). By using semantic CSS custom properties, our markup stays clean and readable (`className='card'`), dark mode transitions operate seamlessly via token inheritance, and our application has zero PostCSS build overhead."
- **Weak Spot to Admit**: "Writing custom CSS requires disciplined organization and naming conventions to avoid stylesheet bloat over time."

#### Q16: "What is the difference between encryption and hashing in your authentication system?"
- **Strong Model Answer**: "Hashing is a one-way mathematical function: once a password is converted into a bcrypt hash, it can never be decrypted back into plaintext; authentication works by hashing the incoming password and comparing the resulting hashes. Encryption is a two-way function where ciphertext can be decrypted back into plaintext using a private key. We use one-way hashing for passwords, and cryptographically signed tokens (JWTs) for session verification."
- **Weak Spot to Admit**: "If an attacker captures the `JWT_SECRET`, they cannot decrypt passwords, but they can forge valid JWTs."

#### Q17: "What happens to a student's active study session if their laptop battery dies?"
- **Strong Model Answer**: "Because our study session is server-authoritative, nothing is lost. The session remains in the database with status `'active'` and its original `startTime`. When the student recharges their laptop and logs back in, `GET /api/study/current` retrieves the active session, calculates the elapsed time, and resumes the timer."
- **Weak Spot to Admit**: "If the student forgets about it for three days, the timer will have accumulated 72 hours. The student would need to cancel the session or manually reset it."

#### Q18: "Why did you implement a dry-run flag in your migration scripts?"
- **Strong Model Answer**: "In production database administration, running a migration script blind is a high-risk operation that can corrupt live data. A `--dry-run` flag executes all queries, data parsing, and transformation logic in read-only mode, logging exactly how many records would be created, updated, or skipped, without executing a single database write."
- **Weak Spot to Admit**: "A dry-run cannot catch database write errors (like foreign key constraint violations or disk quota errors) that only reveal themselves during actual write execution."

#### Q19: "Can a user manipulate their attendance recovery figures by editing the frontend sliders?"
- **Strong Model Answer**: "No. The sliders on the frontend exist solely for local 'What-If' simulation. They do not persist to the database. The student's official attendance records can only be updated by re-importing verified ERP data or through authenticated backend API endpoints."
- **Weak Spot to Admit**: "If a student takes a screenshot of their simulator page, they could show a fabricated projected attendance, but the underlying database remains uncorrupted."

#### Q20: "If an examiner gave you 5 minutes to break this app right now, what would you try?"
- **Strong Model Answer**: "I would test three boundary areas:
  1. I would attempt to register an account with a 10-megabyte JSON payload to see if the body parser rejects it (it does, clamped at 1MB).
  2. I would paste an ERP table where every subject has 0 conducted classes to see if calculation triggers a division-by-zero crash (it is guarded, returning 0).
  3. I would attempt to issue simultaneous concurrent `POST /api/study/start` requests from two terminal windows using curl to probe the session locking race condition."
- **Weak Spot to Admit**: "Admitting where an application has stress boundaries demonstrates senior-level architectural maturity and honesty."

---

## SECTION D: Honest Weaknesses & Real Code Gaps

Every honest software engineering defense acknowledges real limitations. Here are the genuine gaps in Student Hub:

1. **No Refresh Token Rotation System**:
   - *Honest Admission*: "We currently use a single long-lived JWT stored in an httpOnly cookie without short-lived access tokens or refresh token rotation."
   - *How I Would Fix It*: "I would introduce 15-minute access tokens paired with single-use refresh tokens stored in a secure Redis token whitelist with automatic reuse detection."

2. **No CSRF Double-Submit Token for Cross-Domain Deployments**:
   - *Honest Admission*: "When `SameSite=None` is configured across separate cloud domains, we rely on HTTP `Origin` header verification rather than a cryptographic CSRF token."
   - *How I Would Fix It*: "I would implement the standard Double-Submit Cookie pattern using the `csurf` library or a custom signed CSRF header token validated on all mutating endpoints."

3. **Absence of a Distributed Caching Layer**:
   - *Honest Admission*: "All read requests hit MongoDB directly, which creates unnecessary database load for public resources and institutional announcements."
   - *How I Would Fix It*: "I would introduce Redis to cache frequently accessed read-only endpoints with a 5-minute TTL and event-driven invalidation on admin updates."

4. **ERP Parser is Tailored to Tabular Text**:
   - *Honest Admission*: "Our parser requires students to copy tabular text from their portal; it cannot extract attendance from scanned PDF documents or image screenshots."
   - *How I Would Fix It*: "I would integrate an OCR pipeline (such as Tesseract.js or AWS Textract) to extract tabular structures from uploaded PDF or image files."

5. **Lack of Automated Browser End-to-End (E2E) Suites**:
   - *Honest Admission*: "We have 147 unit and integration tests, but we lack automated browser UI tests testing drag-and-drop animations visually."
   - *How I Would Fix It*: "I would integrate Playwright to execute headless visual regression tests and automated user journeys across Chromium, Firefox, and WebKit."

6. **Single-Point-of-Failure Email Uniqueness**:
   - *Honest Admission*: "User identification relies strictly on email without verified email confirmation or two-factor authentication (2FA)."
   - *How I Would Fix It*: "I would integrate an SMTP email verification service (such as Resend or SendGrid) requiring students to confirm their academic email before activation."

7. **In-Memory Goals Recomputation on Reads**:
   - *Honest Admission*: "While side-effect-free, calculating auto-linked goal metrics in memory on every GET request does not scale if a student has hundreds of goals."
   - *How I Would Fix It*: "I would transition goal recalculation to an asynchronous event-driven model using BullMQ and Redis queues triggered only when attendance or tasks update."

---

## SECTION E: 5-to-7 Minute Live Demo Script

### Preparation Before the Demo:
- Have the backend running on `http://localhost:5001`.
- Have the frontend running on `http://localhost:5173`.
- Log in with the **Demo Student** account:
  - **Email**: `demostudent99@university.edu`
  - **Password**: `DemoStudent@123`
- Open Chrome DevTools in Responsive Mode set to 100% zoom.

---

### Minute-by-Minute Walkthrough:

#### Minute 0:00 – 1:00: Executive Dashboard Overview
- **Action**: Start on `/dashboard`. Point to the top metric cards.
- **Say**: *"Respected examiners, here is the student dashboard. Notice that our Enrolled Courses correctly shows 11 subjects, pulling directly from our auto-upserted Subject registry. Notice the two attendance metrics: Course Average is 81.46%, while the official ERP Aggregate is 80.1%. Our system transparently explains that this delta is caused by 24 hours of university Techpravah event participation."*

#### Minute 1:00 – 2:30: Flagship Attendance Intelligence
- **Action**: Click "Attendance" in the sidebar. Scroll to **CSUL501 (Design & Analysis of Algorithms)**.
- **Say**: *"This is our flagship Attendance Intelligence module. Notice CSUL501 is highlighted in amber: current attendance is 27 out of 38 classes, or 71.05%. Instead of merely showing a shortage, our mathematical recovery engine calculates with integer precision that the student must attend exactly 6 consecutive classes to cross 75%."*
- **Action**: Open the **What-If Simulator** for CSUL501. Drag the "Additional Attended" slider to +6.
- **Say**: *"Watch our What-If Simulator: as I slide additional classes attended to +6, the projected attendance reaches exactly 75.00%, the status turns green to 'Safe', and the simulator updates synchronously at 60 frames per second without network lag."*

#### Minute 2:30 – 3:30: ERP Tabular Import & Preview
- **Action**: Click "Import ERP Attendance". Show the paste area.
- **Say**: *"Our parser accepts raw copied tables directly from college portals. When text is pasted, our multi-delimiter tokenizer handles tabs, pipes, and multi-spaces, maps column aliases, and generates an in-memory preview diff before persisting to MongoDB, guaranteeing zero database corruption."*

#### Minute 3:30 – 4:30: Interactive Kanban Board
- **Action**: Navigate to "Tasks". Drag a card from "To Do" to "In Progress".
- **Say**: *"Here is our Kanban Task Board built with `@dnd-kit`. When I drag this card, notice the immediate UI response: we execute an optimistic state update. If the network drops, the card automatically rolls back to its original column. Notice also our accessibility controls: users who cannot drag can click 'Move to' or switch to our full tabular List View."*

#### Minute 4:40 – 5:30: Server-Authoritative Focus Timer
- **Action**: Navigate to "Study Timer". Select a subject and click "Start Session".
- **Say**: *"Our study timer is completely server-authoritative. It is running on the Express backend with UTC timestamps. If I refresh the browser right now—watch—the session survives instantly with zero time lost. When paused, pause duration is accumulated on the server to prevent client-side time falsification."*

#### Minute 5:30 – 6:15: Markdown Notes with XSS Sanitization
- **Action**: Navigate to "Notes". Show the split-pane markdown editor.
- **Say**: *"Our Notes module features live markdown rendering. To protect against Cross-Site Scripting, input is sanitized using DOMPurify and character escaping, allowing rich academic code snippets while strictly stripping malicious script injections."*

#### Minute 6:15 – 7:00: Theme Engine & Admin Panel
- **Action**: Toggle Dark Mode in the top bar. Then open Command Palette (`⌘K`).
- **Say**: *"Our design system uses pure CSS variables: dark mode cascades across all surfaces with zero runtime CSS overhead. Finally, our Command Palette provides instant keyboard-driven navigation across both student workflows and administrative audit panels. Thank you, I am ready for your questions."*

---

### Plan B: What to Do if Things Go Wrong:
1. **If the backend server is asleep / cold-started**:
   - *Action*: Open terminal and run `npm run dev:server`.
   - *Say*: *"I am running our local server instance to ensure immediate sub-millisecond responses without cloud cold-start latency."*
2. **If database connection drops**:
   - *Action*: Open terminal and run `nc -zv 127.0.0.1 27017` to show MongoDB daemon is listening.
3. **If a demo record was accidentally deleted**:
   - *Action*: Run `npm run seed:demo --prefix server`.
   - *Say*: *"I have executed our safe demo seed script, which restores our realistic 11-course test dataset in 800 milliseconds without touching any other account."*

---

## SECTION F: "Show Me The Code" Cheat Sheet

Keep this quick-reference table handy. If an examiner says *"Show me where you wrote that"*, open these exact files and point to these functions:

| # | Feature / Concept | Exact File Path | Key Function / Target |
|---|---|---|---|
| 1 | **Classes Needed Formula** | `server/src/services/attendance-calc.service.ts` | `calculateClassesNeeded()` (line 151) |
| 2 | **Classes Skippable Formula** | `server/src/services/attendance-calc.service.ts` | `calculateSkippableClasses()` (line 176) |
| 3 | **What-If Simulator Math** | `client/src/utils/attendance-math.ts` | `simulateScenario()` (line 66) |
| 4 | **Client/Server Parity Test** | `server/src/recovery-math.test.ts` | `describe('Cross-Boundary...')` (line 245) |
| 5 | **ERP Text Tokenizer** | `server/src/services/attendance-calc.service.ts` | `splitAttendanceLine()` (line 327) |
| 6 | **Header Alias Matcher** | `server/src/services/attendance-calc.service.ts` | `HEADER_ALIASES` & `matchHeader()` (line 300) |
| 7 | **Subject Auto-Upsert** | `server/src/routes/attendance.routes.ts` | `Subject.findOneAndUpdate()` (lines 220–236) |
| 8 | **Subject Unique Compound Index** | `server/src/models/Subject.ts` | `subjectSchema.index({ userId, code })` (line 78) |
| 9 | **Attendance Compound Index** | `server/src/models/AttendanceRecord.ts` | `attendanceRecordSchema.index()` (line 132) |
| 10 | **Backfill Migration Script** | `server/src/scripts/backfill-subjects.ts` | `runBackfill()` (line 26) |
| 11 | **Safe Demo Seeder Assertion** | `server/src/scripts/seed-demo-student.ts` | `if (demoUser.email !== DEMO_EMAIL)` (line 39) |
| 12 | **Server-Authoritative Timer** | `server/src/routes/study.routes.ts` | `calculateElapsedSeconds()` (line 17) |
| 13 | **Drop-Below Goal Rule** | `server/src/routes/goal.routes.ts` | `computeAutoLinkedGoals()` (lines 48–94) |
| 14 | **Kanban Optimistic Update** | `client/src/pages/student/TasksPage.tsx` | `handleStatusChange()` (lines 156–178) |
| 15 | **Markdown DOMPurify XSS Filter**| `client/src/utils/markdown.ts` | `DOMPurify.sanitize()` (lines 153–179) |
| 16 | **Regex Injection Escaper** | `server/src/utils/security.ts` | `escapeRegExp()` (line 9) |
| 17 | **Note Substring Search Route** | `server/src/routes/note.routes.ts` | `noteRouter.get('/')` (lines 26–52) |
| 18 | **Note Full-Text Index** | `server/src/models/Note.ts` | `NoteFullTextIndex` (lines 60–63) |
| 19 | **JWT httpOnly Cookie Flags** | `server/src/services/auth.service.ts` | `getCookieOptions()` (line 42) |
| 20 | **Server RBAC Middleware** | `server/src/middleware/auth.middleware.ts` | `requireRole()` (line 64) |
| 21 | **CSRF Origin Validator** | `server/src/middleware/csrf.middleware.ts` | `csrfProtection()` (line 16) |
| 22 | **Rate Limiter Configuration** | `server/src/middleware/rate-limiter.ts` | `authRateLimiter`, `generalRateLimiter` |
| 23 | **Design System Tokens** | `client/src/styles/index.css` | `:root` & `[data-theme='dark']` (lines 6–120) |
| 24 | **Safari Proxy Configuration** | `client/vercel.json` | `rewrites: [{ source: "/api/:path*" }]` |
| 25 | **Production Smoke Suite** | `scripts/smoke-prod.sh` | 8-step verification pipeline (lines 40–120) |

---

## SECTION G: Core Concept Revision Sheet

Commit these precise technical definitions to memory:

- **REST (Representational State Transfer)**: An architectural style for network applications that uses stateless communication, standard HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`), and resource-oriented URIs returning structured representations (typically JSON).
- **Express Middleware**: Functions that have access to the request object (`req`), response object (`res`), and the `next` function in the application’s request-response cycle, used for logging, security, authentication, and parsing.
- **JWT (JSON Web Token)**: A compact, URL-safe means of representing claims between two parties, composed of three Base64URL parts: Header (algorithm), Payload (claims), and Signature (secret verification).
- **Hashing vs. Encryption**: Hashing is a one-way irreversible transformation of data into a fixed-length digest (used for passwords). Encryption is a two-way reversible transformation using a key (used for confidential data transmission).
- **CORS (Cross-Origin Resource Sharing)**: A browser security mechanism using HTTP headers to tell browsers whether a web application running at one origin has permission to access resources from a server at a different origin.
- **SameSite Cookie Attribute**: A cookie security flag controlling whether cookies are sent with cross-site requests. `'Strict'` never sends cross-site; `'Lax'` sends only on top-level safe GET navigations; `'None'` sends on all requests (requires the `Secure` flag).
- **XSS (Cross-Site Scripting)**: A vulnerability where an attacker injects malicious client-side scripts into web pages viewed by other users. Mitigated via HTML escaping, Content Security Policies, and libraries like DOMPurify.
- **CSRF (Cross-Site Request Forgery)**: An attack that tricks an authenticated victim into executing unwanted state-changing actions on a trusted web application. Mitigated via `SameSite` cookies, origin validation, and anti-CSRF tokens.
- **Database Index**: A data structure (typically a B-Tree) that improves the speed of data retrieval operations on a database table at the cost of additional storage and slower writes.
- **Context API**: React’s native mechanism for sharing state across the component tree without manually passing props down through every level (prop drilling).
- **Controlled Component**: An input form element whose current value is governed by React component state, with changes handled via callback event handlers (`onChange`).
- **Optimistic UI Update**: A pattern where the user interface updates immediately assuming an asynchronous action will succeed, rolling back to the previous state only if the server returns an error.
- **Idempotency**: A property of an operation whereby it can be applied multiple times without changing the result beyond the initial application (e.g., HTTP `GET`, `PUT`, `DELETE`, or our backfill script).
- **RBAC (Role-Based Access Control)**: An authorization approach that restricts system access to authorized users based on their assigned roles (`student`, `admin`).
- **Zod**: A TypeScript-first schema declaration and validation library with static type inference, used to validate inputs at the API perimeter.
- **Race Condition**: A software flaw where the output is dependent on the uncontrollable sequence or timing of concurrent execution threads or network requests.

---

## SECTION H: 60 Rapid-Fire Questions & Answers

1. **What is the port for the backend in development?** `5001`.
2. **What is the port for the frontend in development?** `5173`.
3. **What database is used?** MongoDB with Mongoose ODM.
4. **What is the name of the authentication cookie?** `student_hub_token`.
5. **What is the bcrypt salt cost?** 12 salt rounds.
6. **What is the default JWT expiration?** 7 days (`7d`).
7. **What is the minimum attendance threshold percentage?** 75%.
8. **What does CSUL501 stand for?** Design & Analysis of Algorithms.
9. **How many classes are needed for CSUL501 to reach 75%?** Exactly 6 consecutive classes.
10. **What is the current attendance of CSUL501?** 27 attended out of 38 conducted (71.05%).
11. **How many classes can be safely skipped in CSUL502?** 0 classes.
12. **Why is the ERP Aggregate (80.1%) lower than the Course Average (81.46%)?** Because of 24 hours of Techpravah event attendance (8 present, 16 absent = 33.33%).
13. **What math function is used for classes needed?** `Math.ceil()`.
14. **What math function is used for classes skippable?** `Math.floor()`.
15. **How many tests are in the server test suite?** 136 tests across 33 suites.
16. **How many tests are in the client test suite?** 11 tests across 2 suites.
17. **What is the total test count?** 147 passing tests.
18. **What library is used for drag-and-drop?** `@dnd-kit`.
19. **What library sanitizes Markdown against XSS?** `DOMPurify`.
20. **What library is used for charts?** `recharts`.
21. **What icon library is used across the UI?** `lucide-react`.
22. **Are there any emojis in the codebase?** No, zero emojis.
23. **What is the email of the demo student?** `demostudent99@university.edu`.
24. **What is the password of the demo student?** `DemoStudent@123`.
25. **What is the compound index on Subject?** `{ userId: 1, code: 1 }` (unique).
26. **What is the compound index on AttendanceRecord?** `{ userId: 1, subjectCode: 1 }` (unique).
27. **What is the rate limit on login?** 25 attempts per 15 minutes per IP.
28. **What is the rate limit on general routes?** 120 requests per minute per IP.
29. **What is the max body size for JSON payloads?** 1 megabyte (`1mb`).
30. **What HTTP status code is returned for validation errors?** `400 Bad Request`.
31. **What HTTP status code is returned for unauthenticated calls?** `401 Unauthorized`.
32. **What HTTP status code is returned for forbidden calls?** `403 Forbidden`.
33. **What HTTP status code is returned when a resource is missing?** `404 Not Found`.
34. **What HTTP status code is returned for conflict (duplicate study session)?** `409 Conflict`.
35. **What HTTP status code is returned when rate limited?** `429 Too Many Requests`.
36. **What font is used for sans-serif UI?** `Plus Jakarta Sans`.
37. **What font is used for serif editorial accents?** `Fraunces`.
38. **How is dark mode toggled in CSS?** Via `data-theme='dark'` on the `<html>` root element.
39. **What CSS media query respects vestibular disorders?** `@media (prefers-reduced-motion: reduce)`.
40. **Where is the production smoke script located?** `scripts/smoke-prod.sh`.
41. **How many steps are executed by the smoke script?** 8 steps.
42. **Why does Safari block cross-site cookies?** Intelligent Tracking Prevention (ITP).
43. **How does our architecture solve the Safari cookie block?** Vercel reverse proxy rewrite to `/api/*` making requests same-origin.
44. **What does the backfill script do?** Creates matching `Subject` records for orphaned `AttendanceRecords`.
45. **What flag allows running the backfill safely without writes?** `--dry-run`.
46. **What command was used to back up the database?** `mongodump --db student-hub --out ./backup-before-backfill`.
47. **What Git tag marks the pre-redesign rollback point?** `pre-redesign-main`.
48. **Where was legacy code moved?** `legacy-archive/`.
49. **Does `GET /api/goals` write to MongoDB?** No, it computes auto-linked metrics strictly in memory.
50. **What is the drop-below rule in goals?** If attendance drops below target, a goal reverts from completed back to active.
51. **Can a student access `/admin/students`?** No, rejected with `403 Forbidden`.
52. **How is Note search protected against ReDoS?** `escapeRegExp()` escapes all regex metacharacters.
53. **What weights are given in the Note text index?** Title: 5, Tags: 3, Content: 1.
54. **What happens if total conducted classes is 0?** Percentage is 0, recovery needed is 0, avoiding `NaN`.
55. **What is the shallow health check URL?** `GET /api/health`.
56. **What is the deep database readiness URL?** `GET /api/health/db`.
57. **What keyboard shortcut opens the Command Palette?** `⌘K` or `Ctrl+K`.
58. **What does `npm run format:check` do?** Checks if all files match Prettier standards without editing them.
59. **What does `npm run lint` do?** Runs ESLint across both server and client TypeScript files.
60. **What is the ultimate goal of Student Hub?** To eliminate exam debarment surprises and unify university student operations into one reliable platform.

---

*(End of Student Hub Viva Voce Master Preparation Pack)*

