# Express.js TypeScript API Server

A production-ready, security-focused backend API server built with TypeScript, Express.js, and PostgreSQL. It features robust authentication, standardized error handling, structured logging, and "batteries-included" developer tooling.

## Features

### 🛡️ Security First

- **Authentication**: JWT-based auth with refresh token rotation and secure cookie support.
- **Hardening**:
  - `Helmet` for HTTP security headers (CSP, HSTS, etc.).
  - `Rate Limiting` to prevent brute-force and DDoS attacks.
  - `Argon2` for secure password hashing.
  - Mitigated timing attacks on login and password reset.
- **Validation**: Strict Zod schemas for all request inputs.

### 🏗️ Backend Essentials

- **Database**: Prisma ORM with PostgreSQL, supporting migrations and seeding.
- **Logging**: Pino logger with structured JSON logs (prod) and pretty-printing (dev), including request ID tracking and sensitive data redaction.
- **Error Handling**: Centralized, predictable error responses utilizing custom error classes (e.g., `NotFoundError`, `UnauthorizedError`).
- **Pagination**: Pagination helpers for list endpoints.

### 🐳 DevOps Ready

- **Docker**: Fully Dockerized with `docker-compose` for easy orchestration of app and database.
- **Config**: Type-safe configuration management aligned with environment variables.

## Prerequisites

- Node.js (v18+ recommended)
- pnpm
- Docker & Docker Compose (optional, for containerized run)

## Quick Start

### Local Development

1.  **Install dependencies**
    ```bash
    pnpm install
    ```

2.  **Environment Setup**
    ```bash
    cp .env.example .env
    # Update .env with your local DB credentials if needed
    ```

3.  **Database Setup**
    ```bash
    # Start Postgres (if not using your own)
    docker-compose up -d postgres

    # Run migrations and seed data
    pnpm db:migrate
    pnpm db:seed
    ```

4.  **Start Server**
    ```bash
    pnpm dev
    ```

### Using Docker

Run the entire stack (App + DB) with Docker Compose:

```bash
docker-compose up -d
```

## Environment Variables

| Variable                | Description                  | Default / Example         |
| :---------------------- | :--------------------------- | :------------------------ |
| **Server**              |                              |                           |
| `NODE_ENV`              | Environment mode             | `development`             |
| `PORT`                  | Server port                  | `3000`                    |
| `APP_URL`               | Application URL              | `http://localhost:3000`   |
| **Database**            |                              |                           |
| `DATABASE_URL`          | Connection string            | `postgresql://...`        |
| **Security**            |                              |                           |
| `CORS_ORIGIN`           | Allowed CORS origin(s)       | `http://localhost:3000`   |
| `RATE_LIMIT_...`        | Rate limiting config         | See `.env.example`        |
| **Auth (JWT)**          |                              |                           |
| `JWT_SECRET`            | Secret for signing tokens    | *Change this in prod*     |
| `JWT_ACCESS_EXPIRATION` | Access token TTL             | `15m`                     |
| `AUTH_...`              | Refresh/Reset token policies | See `.env.example`        |
| **Logging**             |                              |                           |
| `LOG_LEVEL`             | Logging verbosity            | `debug` / `info`          |

## Scripts

| Script                  | Description                              |
| :---------------------- | :--------------------------------------- |
| `pnpm dev`              | Start development server with hot-reload |
| `pnpm build`            | Compile TypeScript to `dist/`            |
| `pnpm start`            | Run production build                     |
| `pnpm test`             | Run unit & integration tests             |
| `pnpm lint`             | Lint code with ESLint                    |
| `pnpm db:migrate`       | Apply Prisma migrations                  |
| `pnpm db:seed`          | Seed database                            |
| `pnpm secrets:generate` | Generate secure random keys for `.env`   |

## Project Structure

```
src/
├── config/           # Environment & security configuration
├── features/         # Domain-driven feature modules
│   ├── auth/         # Authentication (Login, Register, Refresh)
│   ├── example/      # CRUD Example
│   └── health/       # Health checks
├── shared/
│   ├── errors/       # Custom error hierarchy
│   ├── middlewares/  # Global middlewares (Auth, Error, RateLimit)
│   ├── types/        # Global TypeScript definitions
│   └── utils/        # Helpers (Logger, API Response, Encryption)
├── app.ts            # Express app assembly
└── server.ts         # Entry point
```

## API Response Format

All API responses follow a consistent envelope structure:

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "requestId": "abc-123"
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested user was not found.",
    "details": {}
  },
  "requestId": "abc-123"
}
```
