# Assignment Management System (AMS)

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
