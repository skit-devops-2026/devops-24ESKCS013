# Student Hub — Production Cloud Deployment Guide

This guide details the step-by-step production deployment for the **Student Hub Academic Management Platform** using **MongoDB Atlas** (Database), **Render** (Express API), and **Vercel** (React Client).

---

## Architecture: Safari-Safe Same-Origin Reverse Proxy

Modern browsers (especially Apple Safari on iOS and macOS) enforce **Intelligent Tracking Prevention (ITP)**, which blocks cross-site `SameSite=None` third-party cookies by default. If your frontend (`vercel.app`) calls your backend (`onrender.com`) directly across domains, authentication cookies are stripped by Safari, causing login sessions to silently fail.

Student Hub overcomes this through a **same-origin reverse proxy**:
1. Vercel routes `/api/*` requests through an edge rewrite directly to the Render API backend.
2. The browser treats all API requests as first-party same-origin calls (`/api/...`).
3. Cookies operate under `SameSite=Lax`, which is 100% compliant with Safari, Chrome, Edge, and Firefox.

```
┌────────────────────────────────────────────────────────────────────────┐
│               Client Browser (Safari / Chrome / Firefox)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Same-Origin Requests
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Vercel Frontend (student-hub.vercel.app)             │
│   ├── Static Assets (HTML / JS / CSS)                                  │
│   └── Edge Rewrite: /api/*  ───►  https://student-hub-api.onrender.com │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS Proxied Request
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Render API Backend (Express + Node.js)               │
│   ├── Helmet Headers • Rate Limiting • JWT Session Cookies (Lax)      │
│   └── CSRF Protection (Active if SameSite=None is ever forced)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Mongoose TLS Connection
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   MongoDB Atlas (M0 Free Cloud Cluster)                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: MongoDB Atlas Database Setup

1. **Create an Atlas Account & Cluster**:
   * Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   * Create a new database cluster using the **M0 Free Tier** (choose AWS / your closest region).
   * Name your cluster (e.g. `Cluster0` or `student-hub-cluster`).

2. **Configure Network Access**:
   * Navigate to **Security** → **Network Access**.
   * Click **Add IP Address**.
   * Select **Allow Access from Anywhere** (`0.0.0.0/0`) or enter Render's static outbound IP addresses.
   * Confirm and save.

3. **Configure Database Access (Credentials)**:
   * Navigate to **Security** → **Database Access**.
   * Click **Add New Database User**.
   * Select **Password Authentication**.
   * Enter a username (e.g. `student_hub_admin`) and a secure password.
   * Grant role: **Read and write to any database**.

4. **Obtain Connection String**:
   * Navigate to **Deployments** → **Database**.
   * Click **Connect** on your cluster → choose **Drivers** (Node.js).
   * Copy the connection string format:
     ```text
     mongodb+srv://student_hub_admin:<password>@cluster0.xxxxx.mongodb.net/student-hub?retryWrites=true&w=majority
     ```
   * Replace `<password>` with your database user password, and ensure the database name at the end is `student-hub`.

5. **Safe Evaluator Demo Seeding**:
   To seed courses, tasks, notes, goals, and focus sessions for the evaluator demo account:
   ```bash
   MONGODB_URI="mongodb+srv://student_hub_admin:<password>@cluster0.xxxxx.mongodb.net/student-hub?retryWrites=true&w=majority" npm run seed:demo --prefix server
   ```
   > [!NOTE]
   > The `seed-demo-student.ts` script contains a hard assertion that strictly touches only `demostudent99@university.edu`. It will never modify or overwrite any personal or administrative student records.

---

## Step 2: Render API Deployment (Backend)

1. **Create Web Service**:
   * Sign in to [Render](https://render.com/).
   * Click **New +** → **Web Service**.
   * Connect your GitHub repository (`student-hub`).

2. **Configure Service Settings**:
   | Setting | Value |
   |---|---|
   | **Name** | `student-hub-api` |
   | **Region** | Choose region closest to your MongoDB Atlas cluster |
   | **Branch** | `main` |
   | **Root Directory** | `server` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm run start` |
   | **Plan Type** | Free |

3. **Configure Environment Variables**:
   Under **Environment Variables**, add:

   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production security optimizations |
   | `PORT` | `5001` | Server port (Render sets `$PORT` dynamically) |
   | `MONGODB_URI` | `mongodb+srv://.../student-hub` | Your MongoDB Atlas connection URI |
   | `CLIENT_ORIGIN` | `https://your-student-hub.vercel.app` | Vercel frontend URL for CORS & cookie policy |
   | `COOKIE_SAME_SITE` | `lax` | Enables Safari-safe SameSite=Lax cookies |
   | `JWT_SECRET` | *(Random 32+ char string)* | Secure secret for signing auth session tokens |
   | `JWT_EXPIRES_IN` | `7d` | Token session lifetime (e.g. 7 days) |

4. **Deploy**:
   * Click **Create Web Service**.
   * Wait for the build and deployment logs to finish.
   * Copy the public service URL (e.g. `https://student-hub-api.onrender.com`).
   * Test health check in your browser: `https://student-hub-api.onrender.com/api/health`.

---

## Step 3: Vercel Client Deployment (Frontend)

1. **Configure Reverse Proxy URL in Repository**:
   Before deploying to Vercel, open [`client/vercel.json`](file:///Users/manoj/Desktop/fsd%20project/client/vercel.json) and replace `https://YOUR-RENDER-API-URL.onrender.com` with your actual Render API URL:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://student-hub-api.onrender.com/api/:path*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

2. **Import Project on Vercel**:
   * Sign in to [Vercel](https://vercel.com/).
   * Click **Add New...** → **Project**.
   * Import your GitHub repository (`student-hub`).

3. **Configure Project Settings**:
   | Setting | Value |
   |---|---|
   | **Framework Preset** | `Vite` |
   | **Root Directory** | `client` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

4. **Configure Environment Variables**:
   Under **Environment Variables**, add:

   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_BASE_URL` | `/api` | Relative API path proxied via Vercel rewrite |

5. **Deploy**:
   * Click **Deploy**.
   * Once finished, copy your production domain (e.g. `https://student-hub.vercel.app`).
   * Ensure `CLIENT_ORIGIN` in your Render service matches this exact URL.

---

## Step 4: Automated Production Smoke Test

Once both the Render backend and Vercel frontend are live, run the automated production smoke test script:

```bash
# Run smoke tests through the Vercel proxy:
./scripts/smoke-prod.sh https://student-hub.vercel.app
```

The script automatically executes 8 end-to-end integration verifications:
1. Pings `/api/health` to confirm gateway connectivity.
2. Registers a transient ephemeral test student.
3. Authenticates via `/api/auth/login` and captures session cookies.
4. Validates identity persistence through `/api/auth/me`.
5. Creates an academic task on the Kanban board (`POST /api/tasks`).
6. Deletes the task cleanly (`DELETE /api/tasks/:id`).
7. Logs out via `/api/auth/logout`.
8. Asserts that subsequent authenticated requests are rejected with `401 Unauthorized`.

---

## Production Environment Variables Summary

### Render Backend API (`server`)
```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/student-hub?retryWrites=true&w=majority
CLIENT_ORIGIN=https://student-hub.vercel.app
COOKIE_SAME_SITE=lax
JWT_SECRET=super_secret_cryptographic_key_minimum_32_characters_long
JWT_EXPIRES_IN=7d
```

### Vercel Frontend Client (`client`)
```env
VITE_API_BASE_URL=/api
```

