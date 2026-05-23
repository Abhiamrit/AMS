# Assignment Management System (AMS)

A web-based internal workflow application built for MECON Limited to digitize and streamline the end-to-end lifecycle of engineering assignments — from client onboarding and assignment creation, through multi-section departmental review, to final MAS approval and document export.

## Overview

AMS replaces manual, paper-based processes with a centralized role-based digital platform. Assignments are created by staff, routed through internal sections in a configurable sequence, reviewed by each section, and finally approved by a MAS Officer — all within a secure, audited environment.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js (SPA) with Tailwind CSS |
| Backend | Node.js + Express.js REST API |
| Database | SQLite (development) / PostgreSQL (production-ready) |
| Auth | Express-session + bcrypt |
| Export | PDFKit + excel4node |

## Features

- **Role-based access** — Admin, Staff, Section Member, Section Head, and MAS Officer roles with completely separate dashboards and permissions
- **Client management** — Create and manage government/private client records with auto-generated client codes
- **Assignment lifecycle** — Draft → In Routing → Under Review → Pending → Completed
- **Multi-section routing** — Staff configures an ordered chain of sections to review each assignment; each section works independently and sequentially
- **Section head assignment** — Section heads can assign work to a member of their section or fill it themselves
- **Dynamic data tables** — Configurable columns (Text, Number, Date, Checkbox) per assignment and per section
- **Send back** — Creators can send assignments back to any section for corrections
- **MAS review and approval** — MAS Officers add final remarks and mark assignments complete
- **PDF and Excel export** — Server-side export of completed assignment reports
- **In-app notifications** — Polling-based alerts for all key workflow events
- **Audit trail** — Immutable logging of every significant action with user, role, IP, and timestamp
- **Account security** — Login lockout after 5 failed attempts, single session enforcement, case-insensitive login

## User Roles

| Role | Responsibilities |
|------|-----------------|
| Administrator | User management, section management, full audit log access, system stats |
| Staff User | Create clients, create assignments, configure routing, forward to MAS, send back |
| Section Head | View section inbox, assign work to members, fill assignment data |
| Section Member | Fill assigned section data tables, add remarks, mark section complete |
| MAS Officer | Final review, add remarks, mark complete, export PDF/Excel |

## Getting Started

## Live Demo
https://assignment-management-system-c9az.onrender.com

### Prerequisites
- Node.js v18+ — download from [nodejs.org](https://nodejs.org)
- That's it — no database installation required

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Abhiamrit/AMS.git
cd AMS

# 2. Install backend dependencies
cd backend
npm install

# 3. Seed the database with initial users and sample data
npm run seed

# 4. Start the backend server
npm start

# 5. Open a second terminal, install frontend dependencies
cd frontend
npm install

# 6. Start the frontend
npm start
```

The app will open automatically at `http://localhost:3000`

### Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | Admin@1234 |
| Staff | staff1 | staff@1234 |
| Section Head | head_elec (example) | Staff@1234 |
| MAS Officer | mas1 | Mas@1234 |

> Section head usernames follow the pattern `head_` + short department name, e.g. `head_elec`, `head_civil`, `head_mech`

## Project Structure

```
AMS/
├── backend/
│   ├── src/
│   │   ├── models/          # Database schema and connection (SQLite)
│   │   ├── routes/          # API route handlers (auth, admin, assignments, routing, export)
│   │   ├── middleware/       # requireAuth, requireRole
│   │   ├── utils/           # Audit logging, ID generation, notifications, seed
│   │   └── server.js        # Express app entry point
│   ├── data/                # SQLite database file (auto-created on first run)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # Admin, Staff, Section, MAS dashboards and pages
│   │   ├── components/      # Shared UI components (Layout, AssignmentTableBuilder)
│   │   ├── context/         # AuthContext — global session state
│   │   ├── utils/           # Axios API instance
│   │   └── App.js           # React Router configuration
│   └── package.json
└── README.md
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current session user |
| GET | `/api/admin/users` | List all users (Admin) |
| POST | `/api/admin/users` | Create user (Admin) |
| GET | `/api/assignments` | List assignments |
| POST | `/api/assignments` | Create assignment |
| POST | `/api/assignments/:id/route` | Start routing |
| POST | `/api/assignments/:id/forward-mas` | Forward to MAS |
| GET | `/api/routing/section/:sectionId` | Section inbox |
| POST | `/api/routing/:routingId/complete` | Mark section done |
| POST | `/api/routing/:routingId/assign` | Assign to member |
| GET | `/api/export/:id/pdf` | Export PDF |
| GET | `/api/export/:id/excel` | Export Excel |
| GET | `/api/notifications` | Get notifications |

## Security

- Passwords hashed with bcrypt (10 salt rounds)
- Single session enforcement — logging in from a second device invalidates the first session
- HTTP-only session cookies (XSS protection)
- Helmet.js security headers
- Account lockout after 5 failed login attempts (15 minute cooldown)
- Role-based middleware on every protected route
- Password re-verification required before forwarding assignments to MAS
- Full audit trail with IP address logging

## Environment Variables

Create a `.env` file in the `backend` folder:

PORT=5000
NODE_ENV=development
SESSION_SECRET=your_secret_key_here
SESSION_MAX_AGE_MS=1800000
DB_PATH=./data/ams.db
CLIENT_ORIGIN=http://localhost:3000
BCRYPT_SALT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MS=900000

## Document Version

`v2.0` · May 2026
