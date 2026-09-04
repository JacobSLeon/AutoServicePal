# AutoServicePal

> Cross-platform vehicle service history tracking application (iOS · Android · Web)

AutoServicePal centralises both Dealer and Private (self-performed) maintenance records into a single verified digital ledger.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9.0.0 |
| Docker & Docker Compose | Latest stable |

---

## Local Development Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd autoservicepal
npm install
```

### 2. Configure Environment

```bash
cp .env.example apps/backend/.env
# Edit apps/backend/.env and fill in your values
```

> **Email**: For local development, sign up for a free [Mailtrap](https://mailtrap.io) account and use its SMTP credentials. This captures outbound emails without sending them to real recipients.

### 3. Start Infrastructure (PostgreSQL + Redis)

```bash
docker-compose up -d
```

Verify services are healthy:

```bash
docker-compose ps
```

### 4. Run Database Migrations

```bash
cd apps/backend
npx knex migrate:latest
```

### 5. Seed the Admin User

```bash
npx knex seed:run
```

### 6. Start the Backend API

```bash
npm run dev
# API available at http://localhost:3001
```

---

## Project Structure

```
autoservicepal/
├── apps/
│   ├── backend/          # Node.js Express REST API
│   └── mobile-web/       # React Native / Expo cross-platform app
├── .env.example          # Environment variable template
├── docker-compose.yml    # Local dev infrastructure
└── README.md
```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run backend` | Start backend dev server |
| `npm run test:backend` | Run backend test suite |
| `npm run test:backend:coverage` | Run tests with coverage report |
| `docker-compose up -d` | Start PostgreSQL + Redis |
| `docker-compose down` | Stop infrastructure |
| `npx knex migrate:latest` | Apply pending migrations |
| `npx knex migrate:rollback` | Rollback last migration batch |
| `npx knex seed:run` | Run all seed files |

---

## REST API

Base URL: `http://localhost:3001/api/v1`

### Auth Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Authenticate and receive JWT |
| POST | `/auth/forgot-password` | Generate and email a temporary password |

> Full API documentation will be expanded as phases are completed.

---

## Environment Variables Reference

See [`.env.example`](.env.example) for all required variables with descriptions.

---

## Tech Stack

- **Backend**: Node.js, Express, Knex.js, PostgreSQL, Redis
- **Frontend**: React Native (Expo), Redux Toolkit
- **Auth**: JWT (custom)
- **Storage**: AWS S3 / GCP Cloud Storage
- **Email**: Nodemailer (SMTP)
- **External**: UK DVLA Vehicle Enquiry Service API
