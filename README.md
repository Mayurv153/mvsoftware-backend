# MV Software — Production Backend

Production-ready Node.js backend for MV Software's web services agency with AI-agent-style architecture.

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js + Express** | HTTP server and API routing |
| **Supabase (Postgres)** | Database, Auth, and RLS |
| **MongoDB Atlas** | Agent workflow logs |
| **Razorpay** | Payment gateway (India) |
| **Resend** | Transactional emails |
| **node-cron** | Scheduled jobs (daily digest) |

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Set Up Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Paste the contents of `sql/schema.sql`
3. Click **Run** to create all tables, indexes, RLS policies, and seed data
4. Verify with: `SELECT * FROM plans;` — should return 4 plans

### 4. Start Development Server

```bash
npm run dev
```

Server starts at `http://localhost:5000`. Check health: `http://localhost:5000/api/health`

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | No | Health check |
| `POST` | `/api/service-requests` | No | Submit contact form |
| `POST` | `/api/payments/create-order` | JWT | Create Razorpay order |
| `POST` | `/api/payments/verify` | JWT | Verify payment signature |
| `POST` | `/api/webhooks/razorpay` | Webhook Sig | Razorpay event handler |
| `GET` | `/api/admin/requests` | Admin | List service requests |
| `GET` | `/api/admin/metrics` | Admin | Dashboard metrics |
| `GET` | `/api/admin/projects` | Admin | List projects |
| `GET` | `/api/admin/tasks` | Admin | List tasks |
| `POST` | `/api/agent/run` | Admin | Execute agent trigger |
| `GET` | `/api/agent/triggers` | Admin | List available triggers |

## Agent Architecture

The backend uses a **tool-based agent orchestrator**:

- **Tools**: `createProject`, `sendEmail`, `createTask`, `logEvent`, `updateMetrics`
- **Triggers**: `paymentSuccess` — chains all tools on successful payment
- **Scheduler**: `dailyDigest` — sends metrics summary at 8:30 AM IST

### Payment Success Workflow

1. ✅ Create project workspace in Supabase (with deadline)
2. ✅ Create internal task (priority based on plan)
3. ✅ Send admin notification email
4. ✅ Send client confirmation email
5. ✅ Increment dashboard metrics
6. ✅ Log workflow to MongoDB

## Deployment (Render)

1. Push to GitHub
2. Create new Web Service on [Render](https://render.com)
3. Connect your repo, use `render.yaml` for config
4. Set all environment variables in Render dashboard
5. Deploy!

Or use the `render.yaml` blueprint for auto-setup.

## Security Checklist

- [x] JWT verification via Supabase Auth
- [x] Admin-only routes with email whitelist
- [x] Razorpay webhook signature verification (HMAC-SHA256)
- [x] Idempotency keys to prevent duplicate charges
- [x] Rate limiting (general + payment-specific)
- [x] Helmet security headers
- [x] Input validation with Joi
- [x] Raw body parsing for webhook signature verification
- [x] CORS configuration
- [x] Environment variable validation on startup
- [x] Sanitized error responses in production
- [x] Graceful shutdown handling
- [x] Row Level Security (RLS) on all Supabase tables

## Testing

Import `postman/mv-software-api.json` into Postman or Thunder Client.

Set the `baseUrl` variable to `http://localhost:5000` and `authToken` to a valid Supabase JWT.

## License

Private — MV Software
