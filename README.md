# AI Career Compass Frontend

Next.js frontend for AI Career Compass. The app lives in `frontend/` so the
repository can be connected directly to GitHub and deployed on Vercel as a
frontend project.

## Local Development

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

The default environment values point to a local backend at
`http://127.0.0.1:8000`. Update `frontend/.env` for your local machine. Do not
commit `.env`.

## Vercel

When importing this GitHub repository in Vercel, use these settings:

- Framework Preset: `Next.js`
- Root Directory: `frontend`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: leave the default empty value for Next.js

Add production environment variables in Vercel using `frontend/.env.example` as
the template.

## Git

First push from this machine:

```powershell
git add .
git commit -m "chore: configure frontend repository"
git push -u origin main
```
