# Production Deployment

This folder is a clean deploy package. It intentionally excludes local virtualenvs,
installed dependencies, real `.env` files, caches, logs, editor metadata, and AI
agent workspace files.

## Included

- `backend/`: FastAPI source and `requirements.txt`
- `frontend/`: Next.js source, config, `package.json`, and `package-lock.json`
- `prisma/`: Prisma schema, migrations, and seed script
- `docs/`: lightweight project docs and architecture SVG assets
- `README.md`, `.env.example`, `docker-compose.yml`, `vercel.json`

## Environment

Create environment files from the templates:

```powershell
Copy-Item .env.example backend\.env
Copy-Item .env.example frontend\.env
```

Set production values for:

- `DATABASE_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `API_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `OPENAI_API_KEY` if AI responses should use OpenAI instead of fallback logic

Do not commit real `.env` files.

## Database

Run migrations from the `frontend` directory, where Prisma dependencies are
installed:

```powershell
cd frontend
npm ci
npx prisma generate --schema ..\prisma\schema.prisma
npx prisma migrate deploy --schema ..\prisma\schema.prisma
```

Seed data when needed:

```powershell
cd ..
$env:DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
node prisma\seed.mjs
```

The database should support the `vector` extension if pgvector matching is used.

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Frontend

```powershell
cd frontend
npm ci
npm run build
npm run start
```

For Vercel, use `frontend` as the project/root directory or keep the included
`vercel.json` settings aligned with your hosting setup.
