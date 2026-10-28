# Stockora API

Express 5, TypeScript, and MongoDB API for Stockora. Business records are scoped from the active membership loaded by authentication middleware; clients must not choose a tenant by sending a business ID.

## Local Setup

1. Install dependencies from the repository root:

   ```powershell
   pnpm --dir server install
   ```

2. Start MongoDB as a single-node replica set. The included compose file configures this for transaction support:

   ```powershell
   docker compose -f server/docker-compose.yml up -d
   ```

3. Copy `server/.env.example` to `server/.env`, replace both JWT secrets with independent random values, and set the platform-admin email and password.

4. Start the server and create the initial platform administrator:

   ```powershell
   pnpm --dir server dev
   pnpm --dir server admin:create
   ```

The API listens on `http://localhost:5000`; health is available at `/health`. Production startup requires SMTP configuration for account recovery. The development password-reset request returns a reset link in the `X-Development-Reset-Link` response header; never enable that behavior in production.

If Atlas TXT DNS lookup times out, the server retries using the Atlas SRV seed hosts with TLS enabled. If startup then reports `Authentication failed`, update `MONGODB_URI` with a valid Atlas **Database Access** username and password (not the Atlas website password). Percent-encode reserved characters in credentials, and confirm the machine's public IP is allowed in the Atlas network access list.

## Verification

```powershell
pnpm --dir server typecheck
pnpm --dir server test
pnpm --dir server build
```

The integration tests launch an ephemeral MongoDB replica set the first time and may download a MongoDB binary. Sales and purchase operations use database transactions and therefore require a replica set in every environment.

## API

All API routes are under `/api/v1`. Authenticated business requests use an access token in `Authorization: Bearer <token>`; refresh credentials are held in a rotated, HTTP-only cookie.

- Auth: `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`; `GET /auth/me`
- Business and members: `GET/PATCH /business`, `GET/POST /business/members`, `DELETE /business/members/:id`
- Inventory: `GET/POST /products`, `GET/PATCH/DELETE /products/:id`, `/products/:id/adjustments`, `/products/:id/movements`
- Customers and suppliers: CRUD/list routes under `/customers` and `/suppliers`; customer transactions and customer/supplier balance payments are included
- Sales: `GET/POST /sales`, `GET /sales/:id`, `/sales/:id/receipt`, `POST /sales/:id/payments`, `/sales/:id/returns`
- Purchases and expenses: `GET/POST /purchases`, `POST /purchases/:id/receive`, `GET/POST /expenses`, `DELETE /expenses/:id` (void)
- Reports: `GET /reports/dashboard`, `/reports/sales`, `/reports/inventory`, `/reports/expenses`, `/reports/profit`
- Platform admin: `GET /admin/overview`, `/admin/businesses`, `/admin/businesses/:id`, `/admin/audit-logs`; `PATCH /admin/businesses/:id/status`

Money is stored as integer minor units and returned in major currency units. The platform admin can inspect cross-business metrics and suspend accounts; every status change is audited and suspending a business revokes its active sessions.

## Production Notes

- Keep `.env` secrets private. Set `CLIENT_URL` to the exact trusted frontend origin.
- Configure SMTP and TLS, backups, monitoring, and a production MongoDB replica set.
- Provision the first super administrator with the CLI; never expose a public super-admin signup.
- The existing Next.js screens still use browser-local demo storage. This API is not yet wired into those screens; the browser demo is not the system of record.
- Review role assignments, audit retention, financial policies, and operational recovery before production use.
