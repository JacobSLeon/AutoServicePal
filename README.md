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
docker compose up -d
```

Verify services are healthy:

```bash
docker compose ps
```

### 4. Run Database Migrations

```bash
docker compose exec backend npm run migrate
```

The migration command must run inside the backend container because `postgres` is
the Docker Compose service name. It is not resolvable from your host machine.

### 5. Seed the Admin User

```bash
docker compose exec backend npm run seed
```

### 6. Start the Backend API

```bash
docker compose logs -f backend
# API available at http://localhost:3000
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
| `docker compose up -d` | Start PostgreSQL + Redis + backend |
| `docker compose down` | Stop all Compose services |
| `docker compose exec backend npm run migrate` | Apply pending migrations |
| `docker compose exec backend npm run migrate:rollback` | Rollback last migration batch |
| `docker compose exec backend npm run seed` | Run all seed files |

---

## REST API

Base URL: `http://localhost:3000/api/v1`

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
