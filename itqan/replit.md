# Itqan — نظام إدارة الأعمال الذكي

An Arabic-language business management system (HR, attendance, payroll, AI assistant) built with React + FastAPI + MongoDB.

## Stack

- **Frontend**: React (Create React App + CRACO), served as a static build
- **Backend**: FastAPI (Python 3.11), port 5000
- **Database**: MongoDB (local, started automatically by `start.sh`)
- **AI**: GROQ API (optional, for the AI chat assistant)

## How to run

The `Start application` workflow runs `bash start.sh`, which:
1. Installs Python dependencies (`backend/requirements.txt`) if needed
2. Builds the React frontend (`frontend/`) if `frontend/build/` doesn't exist yet
3. Starts MongoDB at `192.168.1.60:27017` with data in `/tmp/mongodb-data`
4. Starts the FastAPI/uvicorn server on port 5000

The backend serves both the REST API (`/api/*`) and the pre-built React frontend (static files).

## Environment / secrets

All config lives in `backend/.env`:

| Variable | Purpose |
|---|---|
| `MONGO_URL` | MongoDB connection string |
| `DB_NAME` | Database name |
| `JWT_SECRET` | Secret key for JWT auth tokens |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Default admin credentials |
| `CORS_ORIGINS` | Allowed origins (comma-separated) |
| `GROQ_API_KEY` | (optional) GROQ key for AI features |

## Default credentials

The app ships with a built-in admin account (created automatically on first start):

| Field | Value |
|---|---|
| Email | `admin@itqan.com` |
| Password | `Admin123!` |

## Important notes

- **Frontend rebuild**: `start.sh` skips `npm run build` if `frontend/build/` already exists. After editing any frontend code, delete `frontend/build/` before restarting the workflow so changes are picked up.
- **MongoDB data**: Stored in `/tmp/mongodb-data` — this is ephemeral and will be lost on repl restart. See follow-up task #3 for a fix.
- **Arabic fonts**: The CSP header in `backend/server.py` (line ~3958) was updated to allow `fonts.googleapis.com` and `fonts.gstatic.com` so Arabic typefaces (Cairo, Tajawal, Alexandria) load correctly.
- **AI assistant**: Works in rule-based mode by default. Set `GROQ_API_KEY` or `OPENAI_API_KEY` as a Replit secret to enable LLM responses.

## User preferences

- Keep the existing project structure (React frontend + FastAPI backend + MongoDB).
