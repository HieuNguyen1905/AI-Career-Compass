from pathlib import Path

from dotenv import load_dotenv

# Load backend-local env before importing modules that read env at import time.
load_dotenv(
    Path(__file__).resolve().parent / ".env",
    override=True,
    encoding="utf-8-sig",
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import close_pool
from routers import admin, advisor, assessment, auth, careers, profile

app = FastAPI(title="Career Copilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(assessment.router)
app.include_router(admin.router)
app.include_router(advisor.router)
app.include_router(careers.router)
app.include_router(profile.router)


@app.on_event("startup")
def warm_cache() -> None:
    try:
        from db.database import ensure_runtime_schema, list_careers, list_profiles, list_users, warm_database_write_path

        ensure_runtime_schema()
        list_careers()
        list_users()
        list_profiles()
        warm_database_write_path()
    except Exception as exc:
        print(f"Cache warm-up skipped: {exc}")


@app.on_event("shutdown")
def shutdown_event() -> None:
    close_pool()


@app.get("/")
async def root():
    return {"message": "Career Copilot API is running"}
