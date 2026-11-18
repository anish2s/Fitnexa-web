# Deployment: dashboard (fitnexa-web)

The API side (MongoDB, secrets, the API's own `TRUST_PROXY`) is in `../fitnexa-backend/docs/DEPLOYMENT.md`.
This page covers what the Next.js server needs so that gym detection, per-visitor rate limits and
audit IPs stay correct and can't be spoofed.

## Topology (required)

```
visitor ──► Cloudflare ──► Next.js server (this repo) ──► API (private network only)
            (TLS, *.yourapp.in)   TRUSTED_PROXY_HOPS=1        TRUST_PROXY=<Next.js server address>
```

1. **The API must be reachable only through the Next.js server.** Give it no public route (private
   network / internal service address) and set the API's `TRUST_PROXY` to the Next.js server's
   address(es) only, e.g. `uniquelocal` or the exact private subnet. Production refuses a hop count.
   Anything else that reaches the API is identified by its own address and its `X-Forwarded-*`
   headers are ignored.
2. **The Next.js server must be reachable only through Cloudflare** (or your load balancer): allow
   inbound traffic only from Cloudflare's IP ranges, or use a tunnel. Set `TRUSTED_PROXY_HOPS` to the
   number of proxies in front of it that append to `X-Forwarded-For` (Cloudflare alone = `1`;
   Cloudflare + a platform load balancer = `2`). The server logs a warning at startup in production
   when it is unset.

## What the Next.js server sends to the API

On every API call (the `/api/*` proxy and server-side page rendering) it **overwrites**:

| Header | Value |
|---|---|
| `X-Forwarded-Host` | the gym's host (`powerhouse.yourapp.in`), so the API knows the gym |
| `X-Forwarded-Proto` | `https` |
| `X-Forwarded-For` | the visitor's IP: the entry `TRUSTED_PROXY_HOPS` places from the right of the chain it received. Entries further left were written by the visitor and are dropped (`lib/forwarding.ts`) |

`Forwarded`, `X-Real-IP`, `CF-Connecting-IP` and `True-Client-IP` from the browser are never passed on.

Why it matters: every request reaches the API from this one server. Without the visitor's IP all
gyms' visitors would share one rate-limit allowance (300 requests/minute) and one busy front desk could
lock everyone out. Raising the limit is not the fix. Proof: `tests/http/app.test.ts` in the backend
("client IP behind the Next.js server") and `lib/forwarding.test.ts` here.

## Caching and load
- Gym details (`GET /public/tenant`, name/colour/theme) are cached in the server's memory per host
  for 60 s. Edits through this server (owner settings/branding, any platform gym change) clear the
  cache at once; with several server instances the others pick changes up within 60 s.
- Page guards ask the API for the session's role (`GET /auth/session`) for owner-only and console
  pages, remembered per refresh cookie for 30 s (menu-link prefetches don't each cost a call).

## Status codes
- API unreachable: pages answer **503** with `Retry-After: 30` and a short "can't reach the service"
  page (`proxy.ts`); `/api/*` answers 503 `API_UNAVAILABLE` (JSON).
- Owner-only pages (`/staff`, `/audit-log`) and console pages (`/gyms/*`) answer **404** before
  rendering for anyone whose session doesn't qualify (the API enforces every permission regardless).

## Environment
| Variable | Example | Notes |
|---|---|---|
| `API_URL` | `http://10.0.1.5:4000` | private address of the API |
| `TRUSTED_PROXY_HOPS` | `1` | see Topology |
