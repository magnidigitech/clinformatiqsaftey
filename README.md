<p align="center">
  <img src="public/favicon.ico" alt="PharmaVigil" width="64" />
</p>

<h1 align="center">PharmaVigil</h1>

<p align="center">
  <strong>Pharmacovigilance Case Processing Training Platform</strong>
</p>

<p align="center">
  A full-stack desktop + web application that teaches students how to process
  Individual Case Safety Reports (ICSRs) following ICH E2B(R3) guidelines,
  with instructor review workflows and real-world MedDRA coding.
</p>

---

## ✨ Features

- **ICSR Case Management** — Create, edit, and submit adverse event reports with structured patient, drug, and event data
- **MedDRA Terminology** — Search and code adverse events using the MedDRA medical dictionary
- **Workflow Engine** — Role-based state machine: Draft → Data Entry → Submitted → Review → Approved/Rejected → Archived
- **Instructor Dashboard** — Review student submissions, provide feedback and scoring
- **Causality Assessment** — Built-in Naranjo and WHO-UMC causality evaluation tools
- **Audit Trail** — Full change history for regulatory compliance
- **Desktop + Web** — Runs as an Electron desktop app or a standard web application

---

## 🛠 Tech Stack

| Layer          | Technology                                    |
| -------------- | --------------------------------------------- |
| **Frontend**   | React 18, React Router, Zustand, Tailwind CSS |
| **UI**         | Radix UI, Lucide Icons, CVA                   |
| **Backend**    | Express.js, JWT Authentication, bcrypt        |
| **Database**   | PostgreSQL, Prisma ORM                        |
| **Desktop**    | Electron 28                                   |
| **Build**      | Vite 5, electron-builder                      |
| **Package Mgr**| pnpm                                          |

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

| Tool         | Version  | Check command       |
| ------------ | -------- | ------------------- |
| **Node.js**  | ≥ 18.x   | `node --version`    |
| **pnpm**     | ≥ 8.x    | `pnpm --version`    |
| **PostgreSQL** | ≥ 14.x | `psql --version`    |

---

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/pharmavigil/pharmavigil.git
cd pharmavigil
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your database credentials:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/pharmavigil"
JWT_SECRET="your-secret-key-here"
PORT=3000
```

### 4. Set up the database

```bash
# Run migrations
pnpm run db:migrate

# Seed lookup data (report types, countries)
pnpm run db:seed
```

### 5. Start the development server

```bash
# Full stack: Vite + Express + Electron
pnpm run dev

# Web only (no Electron window)
pnpm run dev:web
```

### Automated setup (Linux/macOS)

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

---

## 📁 Project Structure

```
pharmavigil/
├── electron/                 # Electron main process
│   ├── main.js              #   App bootstrap & BrowserWindow
│   ├── preload.js           #   Context bridge (IPC whitelist)
│   └── menu.js              #   Native application menu
├── prisma/
│   ├── schema.prisma        # Database schema (16 tables)
│   └── seed/
│       ├── seed.js          #   Main seed runner
│       ├── reporttypes.seed.js  # 6 report type definitions
│       └── countries.seed.js    # 55+ ISO country codes
├── server/                  # Express.js API server
│   ├── index.js             #   Server entry point
│   ├── routes/              #   API route handlers
│   ├── middleware/          #   Auth, validation, audit
│   └── services/            #   Business logic
├── src/                     # React frontend (Vite)
│   ├── components/          #   Reusable UI components
│   ├── pages/               #   Route pages
│   ├── stores/              #   Zustand state stores
│   ├── lib/                 #   Utilities & helpers
│   └── App.jsx              #   Root component
├── scripts/
│   ├── setup.sh             # Automated setup script
│   └── load-meddra.js       # MedDRA data loader
├── data/
│   └── meddra_v26.json      # MedDRA data (placeholder)
├── docs/
│   ├── API.md               # REST API reference
│   ├── SCHEMA.md            # Database schema docs
│   └── WORKFLOW.md          # Workflow state machine
├── public/                  # Static assets
├── index.html               # Vite entry HTML
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md                # ← You are here
```

---

## 🎓 First-Run Guide

### 1. Register an Admin Account

After starting the app, navigate to the registration page and create the first
user. The first registered user should be given the `ADMIN` role (you can set
this via Prisma Studio if the UI defaults to `STUDENT`):

```bash
pnpm run db:studio
```

### 2. Create Organisation & Users

As an admin:
- Create your college/university as an **Organisation**
- Create **Instructor** accounts for professors
- Create **Student** accounts (or let students self-register)

### 3. Create Your First Case

As a student:
1. Click **New Case** (or press `Ctrl+N`)
2. Fill in the **Patient** tab — demographics, medical history
3. Add **Products** (drugs) — at least one suspect drug
4. Add **Events** — adverse reactions with MedDRA coding
5. Complete the **Causality** assessment
6. Fill in **Reporter** information
7. Click **Submit for Review**

### 4. Review as Instructor

As an instructor:
1. Open the **Review Queue** from the dashboard
2. Select a submitted case
3. Evaluate completeness and accuracy
4. Provide feedback, score, and decision (Approve / Reject / Request Changes)

---

## 📝 Development Commands

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `pnpm run dev`       | Start all services (Vite + Express + Electron)   |
| `pnpm run dev:web`   | Start web only (Vite + Express, no Electron)     |
| `pnpm run dev:vite`  | Start Vite dev server only                       |
| `pnpm run dev:server`| Start Express API server only                    |
| `pnpm run build`     | Build for production (Vite + electron-builder)   |
| `pnpm run db:migrate`| Run Prisma migrations                            |
| `pnpm run db:seed`   | Run database seeds                               |
| `pnpm run db:studio` | Open Prisma Studio (database GUI)                |
| `pnpm run db:reset`  | Reset database and re-seed                       |

---

## 📚 Documentation

| Document                            | Description                    |
| ----------------------------------- | ------------------------------ |
| [docs/API.md](docs/API.md)         | REST API reference             |
| [docs/SCHEMA.md](docs/SCHEMA.md)   | Database schema & ER diagram   |
| [docs/WORKFLOW.md](docs/WORKFLOW.md)| Workflow state machine         |

---

## 🔐 Security

- **JWT Authentication** — Stateless token-based auth with configurable expiry
- **bcrypt** — Password hashing with salt rounds
- **Helmet** — HTTP security headers
- **Context Isolation** — Electron renderer is sandboxed
- **Input Validation** — Server-side validation on all endpoints
- **Audit Logging** — Every data change is recorded with user, timestamp, and old/new values

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024-2026 PharmaVigil Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
