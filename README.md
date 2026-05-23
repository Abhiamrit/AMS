Assignment Management System (AMS)
A web-based internal workflow application built for MECON Limited to digitize and streamline the end-to-end lifecycle of engineering assignments — from client onboarding and assignment creation, through multi-section departmental review, to final MAS approval and document export.
Overview
AMS replaces manual, paper-based processes with a centralized role-based digital platform. Assignments are created by staff, routed through internal sections in a configurable sequence, reviewed by each section, and finally approved by a MAS Officer — all within a secure, audited environment.
Tech Stack
LayerTechnologyFrontendReact.js (SPA) with Tailwind CSSBackendNode.js + Express.js REST APIDatabaseSQLite (development) / PostgreSQL (production-ready)AuthExpress-session + bcryptExportPDFKit + excel4node
Features

Role-based access — Admin, Staff, Section Member, Section Head, and MAS Officer roles with completely separate dashboards and permissions
Client management — Create and manage government/private client records with auto-generated client codes
Assignment lifecycle — Draft → In Routing → Under Review → Pending → Completed
Multi-section routing — Staff configures an ordered chain of sections to review each assignment; each section works independently and sequentially
Section head assignment — Section heads can assign work to a member of their section or fill it themselves
Dynamic data tables — Configurable columns (Text, Number, Date, Checkbox) per assignment and per section
Send back — Creators can send assignments back to any section for corrections
MAS review and approval — MAS Officers add final remarks and mark assignments complete
PDF and Excel export — Server-side export of completed assignment reports
In-app notifications — Polling-based alerts for all key workflow events
Audit trail — Immutable logging of every significant action with user, role, IP, and timestamp
Account security — Login lockout after 5 failed attempts, single session enforcement, case-insensitive login

User Roles
RoleResponsibilitiesAdministratorUser management, section management, full audit log access, system statsStaff UserCreate clients, create assignments, configure routing, forward to MAS, send backSection HeadView section inbox, assign work to members, fill assignment dataSection MemberFill assigned section data tables, add remarks, mark section completeMAS OfficerFinal review, add remarks, mark complete, export PDF/Excel
Getting Started
Prerequisites

Node.js v18+ — download from nodejs.org
That's it — no database installation required

Installation
bash# 1. Clone the repository
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
The app will open automatically at http://localhost:3000
Default Login Credentials
RoleUsernamePasswordAdminadminAdmin@1234Staffstaff1staff@1234Section Headhead_elec (example)Staff@1234MAS Officermas1Mas@1234

Section head usernames follow the pattern head_ + short department name, e.g. head_elec, head_civil, head_mech

Project Structure
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
API Overview
MethodEndpointDescriptionPOST/api/auth/loginLoginPOST/api/auth/logoutLogoutGET/api/auth/meGet current session userGET/api/admin/usersList all users (Admin)POST/api/admin/usersCreate user (Admin)GET/api/assignmentsList assignmentsPOST/api/assignmentsCreate assignmentPOST/api/assignments/:id/routeStart routingPOST/api/assignments/:id/forward-masForward to MASGET/api/routing/section/:sectionIdSection inboxPOST/api/routing/:routingId/completeMark section donePOST/api/routing/:routingId/assignAssign to memberGET/api/export/:id/pdfExport PDFGET/api/export/:id/excelExport ExcelGET/api/notificationsGet notifications
Security

Passwords hashed with bcrypt (10 salt rounds)
Single session enforcement — logging in from a second device invalidates the first session
HTTP-only session cookies (XSS protection)
Helmet.js security headers
Account lockout after 5 failed login attempts (15 minute cooldown)
Role-based middleware on every protected route
Password re-verification required before forwarding assignments to MAS
Full audit trail with IP address logging

Screenshots

(Add screenshots here)

Suggested screenshots to take:

Login page — the first screen
Admin Dashboard — showing stats cards at the top
User Management page — the table of users
Staff — Create Assignment — the form with the data table builder
Staff — Route Setup — the section ordering screen
Section Head Dashboard — showing an assignment in the inbox
Assignment Work page — a section member filling in the data table
MAS Dashboard — showing a pending assignment
Exported PDF — open the downloaded PDF and screenshot it

To add them: create a folder called screenshots in your repo root, put the images there, then reference them like:
markdown![Login Page](screenshots/login.png)
![Admin Dashboard](screenshots/admin-dashboard.png)
Environment Variables
Create a .env file in the backend folder:
PORT=5000
NODE_ENV=development
SESSION_SECRET=your_secret_key_here
SESSION_MAX_AGE_MS=1800000
DB_PATH=./data/ams.db
CLIENT_ORIGIN=http://localhost:3000
BCRYPT_SALT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MS=900000
Document Version
v2.0 · May 2026# Assignment Management System (AMS)

A web-based internal workflow application for digitizing and streamlining the end-to-end lifecycle of assignments — from client onboarding and assignment creation through to Management Advisory Services (MAS) review, approval, and document export.

## Overview

AMS replaces manual and fragmented processes with a centralized, role-based digital platform. It handles assignment creation, inter-department forwarding, review, and export — all within a secure, audited environment.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (SPA) |
| Backend | Node.js + Express.js |
| Database | SQL Server (production) / SQLite (development) |

## Features

- **Role-based access** — Admin, Staff User, and MAS Officer roles with dedicated dashboards
- **Client management** — Create and manage government/private client records
- **Assignment lifecycle** — Draft → Forward → Review → Complete workflow
- **Dynamic data tables** — Configurable columns (Text, Number, Date, Checkbox) with predefined templates
- **MAS review & approval** — MAS Officers review, add remarks, and mark assignments complete
- **PDF & Excel export** — Server-side export with letterhead for completed assignments
- **In-app notifications** — Real-time alerts for key workflow events
- **Audit trail** — Immutable logging of all user actions

## User Roles

| Role | Responsibilities |
|------|-----------------|
| Administrator | User management, section master, full audit access |
| Staff User | Create clients, create/forward assignments |
| MAS Officer | Review, approve, and export assignments |

## Getting Started

```bash
# Install dependencies
npm install

# Development (SQLite)
npm run dev

# Production (SQL Server — configure connection in config/database.js)
npm start
```

## Project Structure

```
├── client/                  # React.js frontend
│   ├── src/
│   │   ├── pages/           # Admin, Staff, MAS dashboards
│   │   ├── components/      # Shared UI components
│   │   └── context/         # Auth context
├── server/
│   ├── routes/              # API route handlers
│   ├── controllers/         # Business logic
│   ├── middleware/          # Auth, roles, audit logging
│   └── services/            # PDF, Excel, notification services
└── config/                  # DB and session config
```

## Environment

- Node.js v18+ (LTS)
- Browser: Chrome 90+, Edge 90+, Firefox 88+
- Network: Internal intranet (LAN) — no internet required for core functionality
- Desktop-only in v1.0

## Security

- Passwords hashed with bcrypt (min. 10 salt rounds)
- Single-session enforcement per user
- HTTP-only session cookies (XSS protection)
- Auto-logout after 30 minutes of inactivity
- Password re-verification required before forwarding assignments

## Document Version

`v1.0 — Draft` · April 2026
