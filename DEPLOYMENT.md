# SMEPRO360 — Deployment Guide (Cloudflare + Supabase)

This stack deploys as three pieces:

| Piece     | Platform                       | URL                          |
|-----------|--------------------------------|------------------------------|
| Frontend  | Cloudflare Pages (static)      | https://smepro360.com        |
| Backend   | FastAPI (Docker / Tunnel)      | https://api.smepro360.com    |
| Database  | Supabase Postgres              | db.xxzjrhywtsqcafdtsdlg.supabase.co |

> **Why the backend isn't on Cloudflare Pages:** Pages only serves static files.
> FastAPI (Python + SQLAlchemy + psycopg2) needs a real Python runtime. Two supported
> options are below — pick **A** (managed, zero-maintenance) or **B** (Cloudflare-only via Tunnel).

---

## 0. Prerequisites already configured in this repo
- `backend/.env` → `DATABASE_URL` points at your Supabase Postgres (sslmode=require).
- `frontend/.env.production` → `REACT_APP_API_URL=https://api.smepro360.com/api/v1`.
- `frontend/public/_redirects` → SPA fallback (`/* /index.html 200`).
- `wrangler.toml` → Pages build output dir `frontend/build`.
- `backend/Dockerfile` → production image, respects `$PORT`.
- Supabase schema (120 tables) + RBAC + seeded demo data already loaded.

---

## 1. Database (Supabase) — DONE
The schema and all demo data are already provisioned in Supabase via the API
(no dummy data — every row was created through the real backend endpoints).

To re-seed from scratch later:
```bash
cd backend
# .env already points DATABASE_URL at Supabase
python -m uvicorn app.main:app --port 8000   # in one terminal
python seed_data.py                            # in another (seeds via the API)
python setup_attendance.py && python setup_approvals.py && python setup_payroll.py && python setup_projects.py
```

Connection string (Session pooler recommended for serverless backends):
```
postgresql://postgres:<DB_PASSWORD>@db.xxzjrhywtsqcafdtsdlg.supabase.co:5432/postgres?sslmode=require
```

---

## 2. Frontend → Cloudflare Pages

Build output is ready in `frontend/build/`.

### Option via Git (recommended)
1. Push this repo to GitHub.
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Pick the repo. Build settings:
   - **Framework preset:** Create React App
   - **Build command:** `cd frontend && CI=false npm install && npm run build`
   - **Build output directory:** `frontend/build`
   - **Environment variable:** `REACT_APP_API_URL = https://api.smepro360.com/api/v1`
4. Save & Deploy → you get `smepro360.pages.dev`.
5. **Custom Domains** tab → add `smepro360.com` and `www.smepro360.com`.

### Option via Wrangler CLI (needs Node ≥ 22)
```bash
cd frontend && CI=false npm run build
npx wrangler pages deploy build --project-name smepro360
```

---

## 3. Backend → choose ONE

### Option A — Render (managed Docker, free tier)
1. Push repo to GitHub.
2. Render → **New** → **Blueprint** → select repo (uses `backend/render.yaml`).
3. Fill the `sync:false` env vars:
   - `DATABASE_URL` = the Supabase string above
   - `SECRET_KEY` = a long random string
   - `FIRST_SUPERUSER_PASSWORD` = your admin password
4. Deploy. Render gives `https://smepro360-api.onrender.com`.
5. Add Custom Domain `api.smepro360.com` in Render → it shows a CNAME target.
6. In **Cloudflare DNS** add a `CNAME  api → <render-target>` (set **DNS only**, grey cloud).

### Option B — Cloudflare Tunnel (Cloudflare-only, run anywhere)
Use `cloudflared/config.yml` (instructions inside the file):
```bash
cloudflared tunnel login
cloudflared tunnel create smepro360-api
cloudflared tunnel route dns smepro360-api api.smepro360.com
# start backend, then:
cloudflared tunnel --config ./cloudflared/config.yml run
```
This maps `https://api.smepro360.com` → your local/VPS `:8000` over Cloudflare's edge.

---

## 4. Final checks
1. `https://api.smepro360.com/health` → `{"status":"healthy"}`
2. `https://api.smepro360.com/docs` → Swagger UI lists all routers.
3. Open `https://smepro360.com` → login `admin@smepro360.com / Admin@123456`.
4. Confirm CORS: `backend/.env` `BACKEND_CORS_ORIGINS` must include your Pages + custom domains.

## 5. Security before going live
- Change `SECRET_KEY` and `FIRST_SUPERUSER_PASSWORD`.
- Rotate the Supabase DB password (the dev one is in `.env`; never commit real secrets).
- In Supabase, keep RLS off only because access is mediated by the FastAPI layer (JWT + RBAC).
  If you ever expose PostgREST directly, enable RLS first.
