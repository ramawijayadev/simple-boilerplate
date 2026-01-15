# Express.js TypeScript API Server

A production-ready backend API server built with TypeScript and Express.js, featuring security middleware, structured logging, and comprehensive error handling.

## Prerequisites

- Node.js (v16 or higher recommended)
- pnpm

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start development server
pnpm dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `CORS_ORIGIN` | Allowed CORS origin(s) | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `LOG_LEVEL` | Logging level | `debug` (dev) / `info` (prod) |
| `LOG_DIR` | Log files directory | `logs` |
| `REQUEST_BODY_LIMIT` | Max request body size | `10mb` |
| `REQUEST_TIMEOUT_MS` | Request timeout (ms) | `30000` |

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start with hot-reload |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run production build |
| `pnpm lint` | Check linting |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm format` | Format with Prettier |

## API Endpoints

### Health Check

```http
GET /health
```

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-15T12:00:00.000Z"
  },
  "requestId": "uuid"
}
```

## Features

### Security Middleware

- **Helmet** - HTTP security headers (CSP, HSTS, X-Frame-Options)
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - DDoS/brute force protection
- **HPP** - HTTP Parameter Pollution protection

### Request Handling

- **Body Limits** - Configurable request body size limits
- **Request Timeout** - Automatic timeout handling
- **Validation** - Zod-based request validation

### Logging (Pino)

- **Development**: Pretty-printed colorized output
- **Production**: Structured JSON logs with file rotation
- **Features**: Request ID tracking, sensitive field redaction, child loggers

### Error Handling

Standardized error response format:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": {},
    "stack": "..." 
  },
  "requestId": "uuid"
}
```

**Available error classes:**
- `BadRequestError` (400)
- `ValidationError` (400) - with field details
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `AppError` - base class for custom errors

**Usage:**

```typescript
import { NotFoundError, ValidationError } from './shared/errors';
import { asyncHandler } from './shared/utils/asyncHandler';

// Throw errors in handlers
export const getUser = asyncHandler(async (req, res) => {
  const user = await findUser(req.params.id);
  if (!user) {
    throw NotFoundError.resource('User', req.params.id);
  }
  res.json({ success: true, data: user });
});
```

## Database (PostgreSQL & Prisma)

The project uses Prisma ORM with PostgreSQL.

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm db:studio` | Open Prisma Studio GUI |

## Logging (Pino)

Configured for both development and production with daily rotation.

- **Development**:
  - Console: Pretty-printed logs
  - Files: `logs/app.YYYY-MM-DD.log` (All logs), `logs/error.YYYY-MM-DD.log` (Errors only)
- **Production**:
  - Console: JSON output
  - Files: `logs/combined.log`, `logs/error.log` (unless daily rotation configured for prod)

## Testing

Built with Vitest and Supertest.

```bash
# Run unit & integration tests
pnpm test

# Run with coverage (requires @vitest/coverage-v8)
pnpm test:coverage
```

## Project Structure

```
src/
├── config/           # Environment & security config
├── features/         # Feature-based modules (Controller, Service, Repository)
│   ├── example/      # Example CRUD feature
│   └── health/       # Health check feature
├── shared/
│   ├── errors/       # Custom error classes
│   ├── middlewares/  # Express middlewares
│   ├── types/        # Global types
│   └── utils/        # Utilities (Logger, Prisma, AsyncHandler)
├── app.ts            # App setup
└── server.ts         # Entry point
```
