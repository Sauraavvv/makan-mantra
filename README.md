# Makan Mantraa

Indian real estate platform. The repo holds two independent services that talk to each other
only over HTTP — there are no cross-imports between them.

```
makan-mantra/
├── frontend/          Next.js app (App Router, Tailwind, shadcn)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.local
└── backend/           FastAPI service
    ├── main.py
    ├── routers/
    ├── requirements.txt
    ├── .env
    └── database/      MongoDB import scripts + collection backups
```

## Getting started

Both services run at the same time. Use two terminals.

### Backend (FastAPI, port 8000)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # first time only
pip install -r requirements.txt                      # first time only
python -m uvicorn main:app --port 8000 --reload
```

Docs at [http://localhost:8000/docs](http://localhost:8000/docs), health check at `/health`.

### Frontend (Next.js, port 3000)

```bash
cd frontend
npm install     # first time only
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Each service owns its own env file; neither reads the other's.

| File | Keys |
| --- | --- |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL`, `MONGODB_URL`, `JWT_SECRET`, `RESEND_API_KEY` |
| `backend/.env` | `MONGODB_URL` |

Both services connect to MongoDB directly: the backend serves the state/district/location
content APIs, while the frontend uses its own connection for auth only
(`frontend/src/lib/auth/db.ts`).

`NEXT_PUBLIC_API_URL` points the frontend at the backend (defaults to `http://localhost:8000`).
The backend's CORS allowlist in `main.py` must include the frontend origin.

## Database scripts

One-off import and sync scripts live in `backend/database/scripts/`. They resolve paths
relative to their own location and read `MONGODB_URL` from `backend/.env`, so run them
from anywhere:

```bash
python backend/database/scripts/import_state_overview_mongo.py
node   backend/database/scripts/import_district_overview_mongo.js
```

Collection backups are written to `backend/database/backups/`.
