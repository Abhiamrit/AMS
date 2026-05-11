# MECON Limited — Assignment Management System (AMS)

> A Government of India Enterprise | Full-Stack Web Application

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Quick Start](#quick-start)
6. [Backend Setup](#backend-setup)
7. [Frontend Setup](#frontend-setup)
8. [Default Credentials](#default-credentials)
9. [User Roles & Features](#user-roles--features)
10. [API Endpoints](#api-endpoints)
11. [Environment Variables](#environment-variables)
12. [Production Deployment Notes](#production-deployment-notes)

---

## Project Overview

The MECON AMS is a role-based internal web application for managing assignments
across MECON Limited's organizational sections. It supports three user roles:

- **Admin** — Full system control, user management, audit trail
- **Staff User** — Create/edit clients and assignments, forward to MAS
- **MAS Officer** — Review forwarded assignments, add remarks, mark complete, export reports

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18, React Router v6, Tailwind CSS |
| Backend    | Node.js 18+, Express.js 4              |
| Database   | SQLite (via node-sqlite3-wasm — pure WASM, no native build) |
| Sessions   | express-session + memorystore           |
| PDF Export | PDFKit                                  |
| Excel Export | excel4node                            |
| Auth       | bcryptjs, HTTP-only session cookies     |

---

## Project Structure

```
ams-backend/
├── src/
│   ├── server.js              # Express app entry point
│   ├── models/
│   │   └── db.js              # SQLite connection + schema + compat shim
│   ├── middleware/
│   │   └── auth.js            # requireAuth, requireRole middleware
│   ├── routes/
│   │   ├── auth.js            # Login, logout, /me, verify-password
│   │   ├── admin.js           # User CRUD, stats, audit logs
│   │   ├── sections.js        # Section management
│   │   ├── clients.js         # Client CRUD
│   │   ├── assignments.js     # Assignment lifecycle
│   │   ├── export.js          # PDF + Excel generation
│   │   └── notifications.js   # In-app notifications
│   └── utils/
│       ├── seed.js            # Database seeder
│       ├── audit.js           # Audit log helper
│       ├── notifications.js   # Notification helpers
│       └── idgen.js           # Assignment/Client code generator
├── data/                      # SQLite DB files (auto-created)
├── .env                       # Environment variables
└── package.json

ams-frontend/
├── src/
│   ├── App.js                 # Routes + role-based guards
│   ├── context/
│   │   └── AuthContext.js     # Global auth state
│   ├── components/
│   │   ├── Layout.js          # Sidebar + topbar + notifications
│   │   ├── AssignmentTableBuilder.js  # Dynamic table editor
│   │   └── ui.js              # Shared UI components
│   ├── pages/
│   │   ├── LoginPage.js
│   │   ├── admin/             # AdminDashboard, Users, Sections, Assignments, Clients, AuditLog
│   │   ├── staff/             # StaffDashboard, Clients, Assignments, Create, Edit
│   │   └── mas/               # MasDashboard, MasReview
│   └── utils/
│       └── api.js             # Axios instance with credentials
├── .env
└── package.json
```

---

## Prerequisites

- **Node.js** v18 or higher (`node --version`)
- **npm** v8 or higher (`npm --version`)
- No database installation needed — SQLite runs embedded

---

## Quick Start

### Step 1 — Clone / Extract
```bash
# Extract the zip, then:
cd mecon-ams
```

### Step 2 — Backend
```bash
cd ams-backend
npm install
npm run seed        # Creates DB + seeds default users
npm run dev         # Starts on http://localhost:5000
```

### Step 3 — Frontend (new terminal)
```bash
cd ams-frontend
npm install
npm start           # Starts on http://localhost:3000
```

### Step 4 — Open Browser
```
http://localhost:3000
```

Login with any of the demo accounts below.

---

## Backend Setup

```bash
cd ams-backend

# Install dependencies
npm install

# Seed the database with default users and sections
npm run seed

# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

The server starts on **port 5000** by default.

---

## Frontend Setup

```bash
cd ams-frontend

# Install dependencies
npm install

# Start development server
npm start
```

The app starts on **port 3000** by default and proxies API calls to port 5000.

---

## Default Credentials

| Username | Password    | Role        |
|----------|-------------|-------------|
| admin    | Admin@1234  | Admin       |
| staff1   | Staff@1234  | Staff User  |
| staff2   | Staff@1234  | Staff User  |
| mas1     | Mas@1234    | MAS Officer |

> ⚠️ Change all passwords immediately in a production deployment.

---

## User Roles & Features

### 🔐 Admin
- Dashboard with system-wide statistics
- Create / activate / deactivate users (Staff & MAS)
- Reset any user's password
- Manage organizational sections
- View all clients and assignments across the system
- Full audit log with filters (action type, date range, entity ID)
- Real-time notification bell

### 📋 Staff User
- Personal dashboard showing own assignments
- Register clients (Government / Private) with auto-generated codes
- Create assignments with dynamic configurable data table
  - 4 column types: TEXT, NUMBER, DATE, CHECKBOX
  - Add/remove columns and rows freely in DRAFT state
- Edit draft assignments at any time
- Forward assignment to MAS (password-confirmed, irreversible)
- Real-time notification when assignment is completed by MAS

### 🏛️ MAS Officer
- Dashboard showing all PENDING and COMPLETED assignments
- Full read-only view of assignment details + data table
- Add / save MAS remarks at any time
- Mark assignment as Completed (notifies staff + admin)
- Export any assignment as **PDF** (with MECON letterhead)
- Export any assignment as **Excel** (formatted workbook)

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current session user |
| POST | /api/auth/verify-password | Password confirmation |

### Admin (Admin only)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/stats | System statistics |
| GET | /api/admin/users | List all users |
| POST | /api/admin/users | Create user |
| PATCH | /api/admin/users/:id/status | Activate/deactivate |
| PATCH | /api/admin/users/:id/reset-password | Reset password |
| GET | /api/admin/assignments | All assignments |
| GET | /api/admin/clients | All clients |
| GET | /api/admin/audit-logs | Audit log (filterable) |

### Sections
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/sections | Active sections (for dropdowns) |
| GET | /api/sections/all | All sections (Admin) |
| POST | /api/sections | Create section (Admin) |
| PATCH | /api/sections/:id | Update section (Admin) |

### Clients
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/clients | My clients (or all for Admin) |
| POST | /api/clients | Create client |
| PATCH | /api/clients/:id | Edit client |

### Assignments
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/assignments | List assignments (role-filtered) |
| GET | /api/assignments/:id | Full assignment details |
| POST | /api/assignments | Create draft |
| PUT | /api/assignments/:id | Update draft |
| POST | /api/assignments/:id/forward | Forward to MAS (Staff) |
| POST | /api/assignments/:id/complete | Mark complete (MAS) |
| PATCH | /api/assignments/:id/remarks | Save MAS remarks |

### Export (MAS + Admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/export/:id/pdf | Download PDF report |
| GET | /api/export/:id/excel | Download Excel workbook |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/notifications | My notifications |
| PATCH | /api/notifications/:id/read | Mark one as read |
| PATCH | /api/notifications/read-all/mark | Mark all as read |

---

## Environment Variables

### ams-backend/.env
```
PORT=5000
NODE_ENV=development
SESSION_SECRET=mecon_ams_super_secret_change_in_production_2024
SESSION_MAX_AGE_MS=1800000
DB_PATH=./data/ams.db
CLIENT_ORIGIN=http://localhost:3000
BCRYPT_SALT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MS=900000
```

### ams-frontend/.env
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_NAME=MECON AMS
```

---

## Security Features

- ✅ Passwords hashed with bcryptjs (10 rounds)
- ✅ HTTP-only session cookies (no JS access)
- ✅ Single active session per user (new login invalidates old)
- ✅ Account lockout after 5 failed attempts (15 minutes)
- ✅ Auto session expiry after 30 minutes of inactivity
- ✅ Role-based access control (RBAC) on every API route
- ✅ Full audit log for all sensitive actions
- ✅ Helmet.js security headers
- ✅ CORS restricted to configured origin
- ✅ Password re-confirmation before forwarding assignments

---

## Production Deployment Notes

1. **Session Store**: Replace `memorystore` with a persistent store:
   ```bash
   npm install connect-pg-simple   # for PostgreSQL
   # or
   npm install @databases/sqlite   # for SQLite-based persistent sessions
   ```

2. **Database**: For high concurrency, migrate to PostgreSQL using the same
   schema — the SQL is standard and fully compatible.

3. **Environment**:
   - Set `NODE_ENV=production`
   - Set `SESSION_SECRET` to a long random string
   - Set `secure: true` on cookies (requires HTTPS)
   - Set `CLIENT_ORIGIN` to your actual domain

4. **Logo**: Replace the Shield placeholder in `Layout.js` and `LoginPage.js`
   with the MECON logo image once provided.

5. **Process Manager**: Use PM2 for the backend:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name ams-backend
   ```

6. **Frontend Build**:
   ```bash
   cd ams-frontend && npm run build
   # Serve the build/ folder via Nginx or serve it from Express
   ```

---

## Assignment Code Format

Assignments are auto-numbered per financial year:
```
MECON/AMS/2024-25/0001
MECON/AMS/2024-25/0002
...
MECON/AMS/2025-26/0001   ← resets each April
```

Client codes are auto-generated:
```
CLT-2024-0001
CLT-2024-0002
```

---

*Developed as per AMS SRS specification for MECON Limited.*
*MECON Limited — A Government of India Enterprise*
