# Express.js TypeScript API Boilerplate

A production-ready, security-focused backend API server built with TypeScript, Express.js, and PostgreSQL. Features robust authentication, standardized error handling, structured logging, and zero-config Docker setup.

## Features

### 🛡️ Security First

- **Authentication**: JWT-based auth with refresh token rotation
- **Hardening**: Helmet, Rate Limiting, Argon2 password hashing, timing attack mitigation
- **Validation**: Strict Zod schemas for all request inputs

### 🏗️ Backend Essentials

- **Database**: Prisma ORM with PostgreSQL, migrations, and seeding
- **Logging**: Pino structured JSON logs with request ID tracking
- **Error Handling**: Centralized, predictable error responses

### 🐳 DevOps Ready

- **Docker**: One command to run everything
- **Mailpit**: Email testing included
- **Config**: Type-safe environment configuration

---

## Quick Start

### Option 1: Docker (Recommended)

The fastest way to get started. Everything runs in containers - no local dependencies needed.

```bash
# Clone the repository
git clone https://github.com/your-username/simple-boilerplate.git
cd simple-boilerplate

# Start everything (DB + App + Mailpit)
docker compose up -d

# That's it! The app will:
# ✓ Wait for the database
# ✓ Run migrations
# ✓ Seed sample data
# ✓ Start the server
```

**Access Points:**
| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Health Check | http://localhost:3000/api/v1/health |
| Mailpit (Email UI) | http://localhost:8025 |

**Test Credentials (seeded automatically):**
| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `password123` |

**Useful Commands:**
```bash
docker compose logs -f app     # View app logs
docker compose ps              # Check container status
docker compose down            # Stop all containers
docker compose down -v         # Stop and remove data
```

### Running Multiple Instances

To run a second instance on the same machine without conflicts:

1. Create a separate config file:
   ```bash
   cp .env.example .env.app2
   ```

2. Edit `.env.app2` and change **APP_NAME** and **PORTS**:
   ```bash
   # Unique name to prevent container name conflicts
   APP_NAME=simple_boilerplate

   # Unique ports to prevent bind errors
   PORT=3001
   DB_PORT=5433
   MAIL_SMTP_PORT=1026
   MAIL_WEB_PORT=8026
   ```

3. Start the second instance:
   ```bash
   docker compose --env-file .env.app2 -p simple_boilerplate up -d
   ```

---

### Option 2: Local Development

For active development with hot-reload.

#### Prerequisites

- Node.js v18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL (local or Docker)

#### Step 1: Install Dependencies

```bash
git clone https://github.com/your-username/simple-boilerplate.git
cd simple-boilerplate
pnpm install
```

#### Step 2: Setup Environment

```bash
cp .env.example .env
```

Edit `.env` and update:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Generate with `pnpm secrets:generate`

#### Step 3: Setup Database

**Option A: Use Docker for PostgreSQL only**
```bash
docker run -d \
  --name postgres-dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=simple_boilerplate \
  -p 5432:5432 \
  postgres:15-alpine
```

**Option B: Use existing PostgreSQL**

Update `DATABASE_URL` in `.env` with your credentials.

#### Step 4: Run Migrations & Seed

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Apply migrations
pnpm db:seed        # Insert sample data
```

#### Step 5: Start Development Server

```bash
pnpm dev
```

Server runs at http://localhost:3000

---

## Environment Configuration

All configuration is managed through environment variables:

| File | Purpose |
|------|---------|
| `.env.example` | Template with all variables (used by Docker Compose) |
| `.env` | Local development configuration (git-ignored) |

> **Note**: Docker Compose reads from `.env.example` and overrides Docker-specific values (DATABASE_URL, MAIL_HOST) automatically.

### Key Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret for signing tokens | - |
| `JWT_ACCESS_EXPIRATION` | Access token TTL | `15m` |
| `MAIL_HOST` | SMTP host | `localhost` |
| `MAIL_PORT` | SMTP port | `1025` |

See `.env.example` for the complete list.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server with hot-reload |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run production build |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint` | Lint code with ESLint |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Apply migrations (dev) |
| `pnpm db:push` | Push schema changes |
| `pnpm db:seed` | Seed database |
| `pnpm db:studio` | Open Prisma Studio GUI |
| `pnpm db:reset` | Reset database |
| `pnpm secrets:generate` | Generate JWT secret |

---

## Project Structure

```
├── docker-compose.yml    # Container orchestration
├── Dockerfile            # Production Docker image
├── .env.example          # Environment template
├── .env                  # Local dev config (git-ignored)
├── .env.docker           # Docker config
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration files
│   └── seed.ts           # Seed data
├── scripts/
│   └── entrypoint.sh     # Docker startup script
├── src/
│   ├── config/           # Environment & security config
│   ├── features/         # Feature modules
│   │   ├── auth/         # Authentication
│   │   ├── example/      # CRUD example
│   │   └── health/       # Health checks
│   ├── shared/
│   │   ├── errors/       # Custom error classes
│   │   ├── middlewares/  # Global middlewares
│   │   ├── types/        # TypeScript definitions
│   │   └── utils/        # Helpers
│   ├── app.ts            # Express app setup
│   └── server.ts         # Entry point
└── tests/                # Test files
```

---

## API Endpoints

### Health Check
```
GET /api/v1/health
```

### Authentication
```
POST /api/v1/auth/register    # Register new user
POST /api/v1/auth/login       # Login
POST /api/v1/auth/refresh     # Refresh access token
POST /api/v1/auth/logout      # Logout
GET  /api/v1/auth/me          # Get current user
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

### Examples (Protected)
```
GET    /api/v1/examples       # List with pagination
GET    /api/v1/examples/:id   # Get by ID
POST   /api/v1/examples       # Create
PUT    /api/v1/examples/:id   # Update
DELETE /api/v1/examples/:id   # Delete
```

---

## API Response Format

All responses follow a consistent structure:

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
    "message": "The requested resource was not found."
  },
  "requestId": "abc-123"
}
```

---

## Email Testing with Mailpit

When running with Docker, emails are captured by Mailpit instead of being sent externally.

- **SMTP**: `mailpit:1025` (inside Docker) or `localhost:1025` (from host)
- **Web UI**: http://localhost:8025

All emails sent by the application (password reset, verification, etc.) appear in the Mailpit inbox.

---

## Troubleshooting

### Docker Issues

**Container won't start:**
```bash
docker compose logs app    # Check app logs
docker compose logs db     # Check database logs
```

**Reset everything:**
```bash
docker compose down -v     # Remove containers and volumes
docker compose up -d       # Fresh start
```

### Database Issues

**Connection refused:**
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in your `.env`

**Migration errors:**
```bash
pnpm db:reset             # Reset and re-apply migrations
```

### Port Conflicts

If ports are already in use, stop conflicting services or change ports in `.env`:
```bash
PORT=3001                 # Change API port
```

---

## License

ISC
