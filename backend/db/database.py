import json
import os
import random
import string
import time
import hmac
import hashlib
from contextlib import ExitStack
from datetime import datetime, timezone
from threading import Lock
from typing import Any

import bcrypt
from psycopg import errors
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from core.vector_features import format_pgvector, parse_pgvector
from models.schemas import (
    CareerPath,
    CareerProfile,
    Conversation,
    Message,
    MockUser,
    Role,
    UserStatus,
)


def _database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not configured.")
    return url


_pool: ConnectionPool | None = None
_pool_lock = Lock()


def _pool_sizes() -> tuple[int, int]:
    min_size = max(1, int(os.getenv("DB_POOL_MIN_SIZE", "4")))
    max_size = max(min_size, int(os.getenv("DB_POOL_MAX_SIZE", str(min_size))))
    return min_size, max_size


def _get_pool() -> ConnectionPool:
    global _pool
    if _pool is not None and not _pool.closed:
        return _pool

    with _pool_lock:
        if _pool is not None and not _pool.closed:
            return _pool

        _pool = None
        min_size, max_size = _pool_sizes()
        pool = ConnectionPool(
            conninfo=_database_url(),
            min_size=min_size,
            max_size=max_size,
            max_idle=300,
            timeout=float(os.getenv("DB_POOL_TIMEOUT", "10")),
            check=ConnectionPool.check_connection,
            kwargs={
                "row_factory": dict_row,
                "autocommit": True,
                "prepare_threshold": None,
                "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
            },
            open=True,
        )
        try:
            pool.wait(timeout=float(os.getenv("DB_POOL_READY_TIMEOUT", "10")))
        except Exception:
            if not pool.closed:
                pool.close()
            raise

        _pool = pool
        return _pool


def _connect():
    return _get_pool().connection()


def ensure_runtime_schema() -> None:
    with _connect() as conn:
        conn.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" TEXT')
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS "CareerMatchExplanation" (
                "id" TEXT PRIMARY KEY,
                "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "assessmentHash" TEXT NOT NULL,
                "model" TEXT NOT NULL,
                "promptVersion" TEXT NOT NULL DEFAULT 'v1',
                "careerIdsHash" TEXT NOT NULL,
                "matchesJson" JSONB NOT NULL,
                "explanationsJson" JSONB,
                "status" TEXT NOT NULL DEFAULT 'pending',
                "errorMessage" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS "CareerMatchExplanation_userId_assessmentHash_model_promptVe_key"
            ON "CareerMatchExplanation"("userId", "assessmentHash", "model", "promptVersion", "careerIdsHash")
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS "CareerMatchExplanation_userId_assessmentHash_idx"
            ON "CareerMatchExplanation"("userId", "assessmentHash")
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS "User_createdAt_idx"
            ON "User"("createdAt" DESC)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS "Conversation_userId_updatedAt_idx"
            ON "Conversation"("userId", "updatedAt" DESC)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_id_idx"
            ON "Message"("conversationId", "createdAt" DESC, "id" DESC)
            """
        )


def warm_database_write_path() -> None:
    _, max_size = _pool_sizes()
    target = max(1, min(max_size, int(os.getenv("DB_POOL_WARM_WRITE_CONNECTIONS", str(max_size)))))
    with ExitStack() as stack:
        connections = [stack.enter_context(_connect()) for _ in range(target)]
        for conn in connections:
            conn.execute(
                'UPDATE "User" SET "updatedAt" = "updatedAt" WHERE "id" = %s',
                ("__warmup_missing__",),
            )


def close_pool() -> None:
    global _pool
    with _pool_lock:
        if _pool is not None:
            _pool.close()
            _pool = None


_CAREERS_TTL = 300.0
_USER_TTL = 30.0
_PROFILE_TTL = 30.0
_PROFILE_LIST_TTL = 15.0
_USERS_LIST_TTL = 15.0
_CONVERSATION_LIST_TTL = 15.0
_CONVERSATION_DETAIL_TTL = 15.0
_PASSWORD_VERIFY_TTL = 300.0
_PASSWORD_VERIFY_MAX_ENTRIES = 256

_careers_cache: tuple[float, list[CareerPath]] | None = None
_user_cache: dict[str, tuple[float, MockUser]] = {}
_profile_cache: dict[str, tuple[float, CareerProfile]] = {}
_profile_list_cache: tuple[float, list[CareerProfile]] | None = None
_users_list_cache: tuple[float, list[MockUser]] | None = None
_conversation_list_cache: dict[tuple[str, int], tuple[float, list[dict[str, Any]]]] = {}
_conversation_detail_cache: dict[tuple[str, str], tuple[float, Conversation]] = {}
_password_verify_cache: dict[str, float] = {}

CAREER_SELECT_COLUMNS = """
    "id",
    "title",
    "cluster",
    "summary",
    "subjects",
    "jobSkills",
    "majors",
    "activities",
    "jobTasks",
    "createdAt",
    "updatedAt",
    "onetCode",
    "featureVector",
    "featureVectorVersion",
    "featureVectorUpdatedAt"
"""


def _invalidate_careers_cache() -> None:
    global _careers_cache
    _careers_cache = None


def _invalidate_user_cache(user_id: str | None = None) -> None:
    if user_id is None:
        _user_cache.clear()
    else:
        _user_cache.pop(user_id, None)


def _replace_user_in_list_cache(user: MockUser) -> None:
    global _users_list_cache
    if _users_list_cache is None:
        return
    now = time.monotonic()
    if now - _users_list_cache[0] > _USERS_LIST_TTL:
        _users_list_cache = None
        return
    users = [cached_user for cached_user in _users_list_cache[1] if cached_user.id != user.id]
    users.append(user)
    users.sort(key=lambda cached_user: cached_user.createdAt, reverse=True)
    _users_list_cache = (now, users)


def _remove_user_from_list_cache(user_id: str) -> None:
    global _users_list_cache
    if _users_list_cache is None:
        return
    now = time.monotonic()
    if now - _users_list_cache[0] > _USERS_LIST_TTL:
        _users_list_cache = None
        return
    _users_list_cache = (
        now,
        [cached_user for cached_user in _users_list_cache[1] if cached_user.id != user_id],
    )


def _invalidate_profile_cache(user_id: str | None = None) -> None:
    global _profile_list_cache
    if user_id is None:
        _profile_cache.clear()
    else:
        _profile_cache.pop(user_id, None)
    _profile_list_cache = None


def _invalidate_conversation_list_cache(user_id: str) -> None:
    for cache_key in list(_conversation_list_cache):
        if cache_key[0] == user_id:
            _conversation_list_cache.pop(cache_key, None)


def _invalidate_conversation_cache(user_id: str, conversation_id: str | None = None) -> None:
    _invalidate_conversation_list_cache(user_id)
    for cache_key in list(_conversation_detail_cache):
        if cache_key[0] == user_id and (conversation_id is None or cache_key[1] == conversation_id):
            _conversation_detail_cache.pop(cache_key, None)


def _make_id(prefix: str) -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
    return f"{prefix}_{suffix}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _json_default(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _json_ready(value: Any) -> Any:
    return json.loads(json.dumps(value, ensure_ascii=False, default=_json_default))


def hash_password(password: str) -> str:
    try:
        rounds = max(8, min(12, int(os.getenv("BCRYPT_ROUNDS", "8"))))
    except ValueError:
        rounds = 8
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=rounds))
    return hashed.decode("utf-8")


def _password_cache_key(plain_password: str, hashed_password: str) -> str:
    secret = os.getenv("JWT_SECRET") or os.getenv("SESSION_SECRET") or _database_url()
    return hmac.new(
        secret.encode("utf-8"),
        f"{hashed_password}\0{plain_password}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _remember_verified_password(cache_key: str, now: float) -> None:
    if len(_password_verify_cache) >= _PASSWORD_VERIFY_MAX_ENTRIES:
        oldest_key = min(_password_verify_cache, key=_password_verify_cache.get)
        _password_verify_cache.pop(oldest_key, None)
    _password_verify_cache[cache_key] = now


def verify_password(plain_password: str, hashed_password: str) -> bool:
    now = time.monotonic()
    cache_key = _password_cache_key(plain_password, hashed_password)
    cached_at = _password_verify_cache.get(cache_key)
    if cached_at is not None and now - cached_at < _PASSWORD_VERIFY_TTL:
        return True

    try:
        verified = bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False
    if verified:
        _remember_verified_password(cache_key, now)
    return verified


def _as_list(value: Any) -> list[str]:
    if value is None:
        return []
    return list(value)


def _as_answers(value: Any) -> dict[str, int]:
    if isinstance(value, dict):
        return {str(key): int(score) for key, score in value.items()}
    return {}


def _user_from_row(row: dict[str, Any] | None) -> MockUser | None:
    if not row:
        return None
    return MockUser(
        id=row["id"],
        email=row["email"],
        name=row["name"],
        passwordHash=row["passwordHash"],
        role=Role(row["role"]),
        status=UserStatus(row["status"]),
        gradeLevel=row.get("gradeLevel"),
        gender=row.get("gender"),
        createdAt=row["createdAt"],
        updatedAt=row["updatedAt"],
    )


def _profile_from_row(row: dict[str, Any] | None) -> CareerProfile | None:
    if not row:
        return None
    return CareerProfile(
        id=row["id"],
        userId=row["userId"],
        gradeLevel=row["gradeLevel"],
        interests=_as_list(row["interests"]),
        strengths=_as_list(row["strengths"]),
        favoriteSubjects=_as_list(row["favoriteSubjects"]),
        values=_as_list(row.get("values")),
        riasec=_as_list(row["riasec"]),
        goals=row["goals"],
        constraints=row["constraints"],
        assessmentCompleted=bool(row.get("assessmentCompleted", False)),
        assessmentAnswers=_as_answers(row.get("assessmentAnswers")),
        createdAt=row["createdAt"],
        updatedAt=row["updatedAt"],
    )


def _career_from_row(row: dict[str, Any] | None) -> CareerPath | None:
    if not row:
        return None
    return CareerPath(
        id=row["id"],
        title=row["title"],
        cluster=row["cluster"],
        summary=row["summary"],
        subjects=_as_list(row["subjects"]),
        jobSkills=_as_list(row["jobSkills"]),
        majors=_as_list(row["majors"]),
        activities=_as_list(row["activities"]),
        jobTasks=_as_list(row["jobTasks"]),
        onetCode=row.get("onetCode"),
        featureVector=parse_pgvector(row.get("featureVector")),
        featureVectorVersion=row.get("featureVectorVersion"),
        featureVectorUpdatedAt=row.get("featureVectorUpdatedAt"),
        createdAt=row["createdAt"],
        updatedAt=row["updatedAt"],
    )


def list_users() -> list[MockUser]:
    global _users_list_cache
    now = time.monotonic()
    if _users_list_cache and now - _users_list_cache[0] < _USERS_LIST_TTL:
        return list(_users_list_cache[1])

    with _connect() as conn:
        rows = conn.execute('SELECT * FROM "User" ORDER BY "createdAt" DESC').fetchall()
    users = [user for user in (_user_from_row(row) for row in rows) if user]
    _users_list_cache = (now, users)
    return list(users)


def get_user_by_id(user_id: str) -> MockUser | None:
    now = time.monotonic()
    cached = _user_cache.get(user_id)
    if cached and now - cached[0] < _USER_TTL:
        return cached[1]

    with _connect() as conn:
        row = conn.execute('SELECT * FROM "User" WHERE "id" = %s', (user_id,)).fetchone()

    user = _user_from_row(row)
    if user is not None:
        _user_cache[user_id] = (now, user)
    return user


def get_user_by_email(email: str) -> MockUser | None:
    with _connect() as conn:
        row = conn.execute('SELECT * FROM "User" WHERE "email" = %s', (email.lower(),)).fetchone()
    user = _user_from_row(row)
    if user is not None:
        _user_cache[user.id] = (time.monotonic(), user)
    return user


def create_user(
    email: str,
    name: str,
    password_hash: str,
    role: Role,
    grade_level: str | None = None,
) -> MockUser | None:
    now = _now()
    user_id = _make_id("user")
    try:
        with _connect() as conn:
            row = conn.execute(
                """
                INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "status", "gradeLevel", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    user_id,
                    email.lower(),
                    name,
                    password_hash,
                    role.value,
                    UserStatus.ACTIVE.value,
                    grade_level or None,
                    now,
                    now,
                ),
            ).fetchone()
    except errors.UniqueViolation:
        return None

    user = _user_from_row(row)
    if user is not None:
        _user_cache[user.id] = (time.monotonic(), user)
        _replace_user_in_list_cache(user)
    return user


def update_user(user_id: str, updates: dict[str, Any]) -> MockUser | None:
    allowed = {
        "name": '"name"',
        "role": '"role"',
        "status": '"status"',
        "gradeLevel": '"gradeLevel"',
        "gender": '"gender"',
    }
    assignments = []
    values: list[Any] = []

    for key, column in allowed.items():
        if key not in updates:
            continue
        value = updates[key]
        if isinstance(value, (Role, UserStatus)):
            value = value.value
        assignments.append(f"{column} = %s")
        values.append(value if value != "" else None)

    if not assignments:
        return get_user_by_id(user_id)

    values.extend([_now(), user_id])
    with _connect() as conn:
        row = conn.execute(
            f'UPDATE "User" SET {", ".join(assignments)}, "updatedAt" = %s WHERE "id" = %s RETURNING *',
            tuple(values),
        ).fetchone()

    _invalidate_user_cache(user_id)
    user = _user_from_row(row)
    if user is not None:
        _replace_user_in_list_cache(user)
    return user


def delete_user(user_id: str) -> None:
    with _connect() as conn:
        conn.execute('DELETE FROM "User" WHERE "id" = %s', (user_id,))
    _invalidate_user_cache(user_id)
    _invalidate_profile_cache(user_id)
    _remove_user_from_list_cache(user_id)
    _invalidate_conversation_cache(user_id)


def list_profiles() -> list[CareerProfile]:
    global _profile_list_cache
    now = time.monotonic()
    if _profile_list_cache and now - _profile_list_cache[0] < _PROFILE_LIST_TTL:
        return list(_profile_list_cache[1])

    with _connect() as conn:
        rows = conn.execute('SELECT * FROM "CareerProfile" ORDER BY "updatedAt" DESC').fetchall()
    profiles = [profile for profile in (_profile_from_row(row) for row in rows) if profile]
    _profile_list_cache = (now, profiles)
    return list(profiles)


def get_profile_by_user_id(user_id: str) -> CareerProfile | None:
    now = time.monotonic()
    cached = _profile_cache.get(user_id)
    if cached and now - cached[0] < _PROFILE_TTL:
        return cached[1]

    with _connect() as conn:
        row = conn.execute('SELECT * FROM "CareerProfile" WHERE "userId" = %s', (user_id,)).fetchone()

    profile = _profile_from_row(row)
    if profile is not None:
        _profile_cache[user_id] = (now, profile)
    return profile


def get_career_match_explanation(
    user_id: str,
    assessment_hash: str,
    model: str,
    prompt_version: str,
    career_ids_hash: str,
) -> dict[str, Any] | None:
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM "CareerMatchExplanation"
            WHERE "userId" = %s
              AND "assessmentHash" = %s
              AND "model" = %s
              AND "promptVersion" = %s
              AND "careerIdsHash" = %s
            LIMIT 1
            """,
            (user_id, assessment_hash, model, prompt_version, career_ids_hash),
        ).fetchone()
    return dict(row) if row else None


def create_pending_career_match_explanation(
    user_id: str,
    assessment_hash: str,
    model: str,
    prompt_version: str,
    career_ids_hash: str,
    matches: list[dict[str, Any]],
) -> tuple[dict[str, Any], bool]:
    now = _now()
    explanation_id = _make_id("explanation")

    with _connect() as conn:
        row = conn.execute(
            """
            INSERT INTO "CareerMatchExplanation" (
                "id", "userId", "assessmentHash", "model", "promptVersion",
                "careerIdsHash", "matchesJson", "status", "createdAt", "updatedAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s, %s)
            ON CONFLICT ("userId", "assessmentHash", "model", "promptVersion", "careerIdsHash")
            DO NOTHING
            RETURNING *
            """,
            (
                explanation_id,
                user_id,
                assessment_hash,
                model,
                prompt_version,
                career_ids_hash,
                Jsonb(_json_ready(matches)),
                now,
                now,
            ),
        ).fetchone()

    if row:
        return dict(row), True

    existing = get_career_match_explanation(
        user_id,
        assessment_hash,
        model,
        prompt_version,
        career_ids_hash,
    )
    if existing:
        return existing, False

    raise RuntimeError("Could not create or load career match explanation cache record.")


def mark_career_match_explanation_ready(
    explanation_id: str,
    explanations: dict[str, list[dict[str, Any]]],
) -> None:
    with _connect() as conn:
        conn.execute(
            """
            UPDATE "CareerMatchExplanation"
            SET "status" = 'ready',
                "explanationsJson" = %s,
                "errorMessage" = NULL,
                "updatedAt" = %s
            WHERE "id" = %s
            """,
            (Jsonb(_json_ready(explanations)), _now(), explanation_id),
        )


def mark_career_match_explanation_failed(explanation_id: str, error_message: str) -> None:
    with _connect() as conn:
        conn.execute(
            """
            UPDATE "CareerMatchExplanation"
            SET "status" = 'failed',
                "errorMessage" = %s,
                "updatedAt" = %s
            WHERE "id" = %s
            """,
            (error_message[:1000], _now(), explanation_id),
        )


def upsert_profile(user_id: str, input_data: dict[str, Any]) -> CareerProfile:
    now = _now()
    profile_id = _make_id("profile")
    payload = {
        "gradeLevel": input_data.get("gradeLevel", ""),
        "interests": input_data.get("interests", []),
        "strengths": input_data.get("strengths", []),
        "favoriteSubjects": input_data.get("favoriteSubjects", []),
        "values": input_data.get("values", []),
        "riasec": input_data.get("riasec", []),
        "goals": input_data.get("goals", ""),
        "constraints": input_data.get("constraints", ""),
        "assessmentCompleted": bool(input_data.get("assessmentCompleted", False)),
        "assessmentAnswers": Jsonb(input_data.get("assessmentAnswers", {})),
    }

    with _connect() as conn:
        row = conn.execute(
            """
            INSERT INTO "CareerProfile" (
                "id", "userId", "gradeLevel", "interests", "strengths", "favoriteSubjects",
                "values", "riasec", "goals", "constraints", "assessmentCompleted",
                "assessmentAnswers", "createdAt", "updatedAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT ("userId") DO UPDATE SET
                "gradeLevel" = EXCLUDED."gradeLevel",
                "interests" = EXCLUDED."interests",
                "strengths" = EXCLUDED."strengths",
                "favoriteSubjects" = EXCLUDED."favoriteSubjects",
                "values" = EXCLUDED."values",
                "riasec" = EXCLUDED."riasec",
                "goals" = EXCLUDED."goals",
                "constraints" = EXCLUDED."constraints",
                "assessmentCompleted" = EXCLUDED."assessmentCompleted",
                "assessmentAnswers" = EXCLUDED."assessmentAnswers",
                "updatedAt" = EXCLUDED."updatedAt"
            RETURNING *
            """,
            (
                profile_id,
                user_id,
                payload["gradeLevel"],
                payload["interests"],
                payload["strengths"],
                payload["favoriteSubjects"],
                payload["values"],
                payload["riasec"],
                payload["goals"],
                payload["constraints"],
                payload["assessmentCompleted"],
                payload["assessmentAnswers"],
                now,
                now,
            ),
        ).fetchone()

    profile = _profile_from_row(row)
    if profile is None:
        raise RuntimeError("Could not upsert career profile.")
    _invalidate_profile_cache(user_id)
    return profile


def list_careers() -> list[CareerPath]:
    global _careers_cache
    now = time.monotonic()
    if _careers_cache and now - _careers_cache[0] < _CAREERS_TTL:
        return _careers_cache[1]

    with _connect() as conn:
        rows = conn.execute(
            f'SELECT {CAREER_SELECT_COLUMNS} FROM "CareerPath" ORDER BY "cluster" ASC, "title" ASC'
        ).fetchall()

    careers = [career for career in (_career_from_row(row) for row in rows) if career]
    _careers_cache = (now, careers)
    return careers


def list_careers_by_vector(feature_vector: list[float], limit: int = 5) -> list[tuple[CareerPath, float]]:
    vector_literal = format_pgvector(feature_vector)
    safe_limit = max(1, min(50, int(limit)))

    with _connect() as conn:
        conn.execute("SET ivfflat.probes = 10")
        rows = conn.execute(
            """
            SELECT
                {columns},
                GREATEST(0, 1 - ("featureVector" <=> %s::vector)) AS "similarity"
            FROM "CareerPath"
            WHERE "featureVector" IS NOT NULL
            ORDER BY "featureVector" <=> %s::vector
            LIMIT %s
            """.format(columns=CAREER_SELECT_COLUMNS),
            (vector_literal, vector_literal, safe_limit),
        ).fetchall()

    ranked: list[tuple[CareerPath, float]] = []
    for row in rows:
        career = _career_from_row(row)
        if career is not None:
            ranked.append((career, float(row.get("similarity") or 0.0)))
    return ranked


def get_career_by_id(career_id: str) -> CareerPath | None:
    for career in list_careers():
        if career.id == career_id:
            return career
    return None


def create_career(input_data: dict[str, Any]) -> CareerPath:
    now = _now()
    career_id = _make_id("career")
    with _connect() as conn:
        row = conn.execute(
            """
            INSERT INTO "CareerPath" (
                "id", "title", "cluster", "summary", "subjects", "jobSkills", "majors",
                "activities", "jobTasks", "createdAt", "updatedAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING {columns}
            """.format(columns=CAREER_SELECT_COLUMNS),
            (
                career_id,
                input_data["title"],
                input_data["cluster"],
                input_data["summary"],
                input_data.get("subjects", []),
                input_data.get("jobSkills", []),
                input_data.get("majors", []),
                input_data.get("activities", []),
                input_data.get("jobTasks", []),
                now,
                now,
            ),
        ).fetchone()

    career = _career_from_row(row)
    if career is None:
        raise RuntimeError("Could not create career.")
    _invalidate_careers_cache()
    return career


def update_career(career_id: str, input_data: dict[str, Any]) -> CareerPath | None:
    with _connect() as conn:
        row = conn.execute(
            """
            UPDATE "CareerPath" SET
                "title" = %s,
                "cluster" = %s,
                "summary" = %s,
                "subjects" = %s,
                "jobSkills" = %s,
                "majors" = %s,
                "activities" = %s,
                "jobTasks" = %s,
                "updatedAt" = %s
            WHERE "id" = %s
            RETURNING {columns}
            """.format(columns=CAREER_SELECT_COLUMNS),
            (
                input_data["title"],
                input_data["cluster"],
                input_data["summary"],
                input_data.get("subjects", []),
                input_data.get("jobSkills", []),
                input_data.get("majors", []),
                input_data.get("activities", []),
                input_data.get("jobTasks", []),
                _now(),
                career_id,
            ),
        ).fetchone()

    _invalidate_careers_cache()
    return _career_from_row(row)


def delete_career(career_id: str) -> None:
    with _connect() as conn:
        conn.execute('DELETE FROM "CareerPath" WHERE "id" = %s', (career_id,))
    _invalidate_careers_cache()


def save_conversation(user_id: str, title: str, user_message: str, assistant_message: str) -> Conversation:
    now = _now()
    conversation_id = _make_id("conversation")
    user_message_id = _make_id("message")
    assistant_message_id = _make_id("message")

    with _connect() as conn:
        with conn.transaction():
            row = conn.execute(
                """
                INSERT INTO "Conversation" ("id", "title", "userId", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (conversation_id, title, user_id, now, now),
            ).fetchone()
            conn.execute(
                """
                INSERT INTO "Message" ("id", "conversationId", "role", "content", "createdAt")
                VALUES (%s, %s, %s, %s, %s), (%s, %s, %s, %s, %s)
                """,
                (
                    user_message_id,
                    conversation_id,
                    "user",
                    user_message,
                    now,
                    assistant_message_id,
                    conversation_id,
                    "assistant",
                    assistant_message,
                    now,
                ),
            )

    _invalidate_conversation_cache(user_id, conversation_id)
    return Conversation(
        id=row["id"],
        userId=row["userId"],
        title=row["title"],
        createdAt=row["createdAt"],
        messages=[
            Message(role="user", content=user_message, createdAt=now),
            Message(role="assistant", content=assistant_message, createdAt=now),
        ],
    )


def _message_from_row(row: dict[str, Any]) -> Message:
    return Message(
        role=row["role"],
        content=row["content"],
        createdAt=row["createdAt"],
    )


def conversation_belongs_to_user(conversation_id: str, user_id: str) -> bool:
    with _connect() as conn:
        row = conn.execute(
            'SELECT 1 FROM "Conversation" WHERE "id" = %s AND "userId" = %s',
            (conversation_id, user_id),
        ).fetchone()
    return row is not None


def make_conversation_id() -> str:
    return _make_id("conversation")


def record_user_message_with_id(
    user_id: str, conversation_id: str, title: str, user_message: str
) -> str:
    now = _now()

    if conversation_belongs_to_user(conversation_id, user_id):
        with _connect() as conn:
            with conn.transaction():
                conn.execute(
                    """
                    INSERT INTO "Message" ("id", "conversationId", "role", "content", "createdAt")
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (_make_id("message"), conversation_id, "user", user_message, now),
                )
                conn.execute(
                    'UPDATE "Conversation" SET "updatedAt" = %s WHERE "id" = %s',
                    (now, conversation_id),
                )
        _invalidate_conversation_cache(user_id, conversation_id)
        return conversation_id

    with _connect() as conn:
        with conn.transaction():
            conn.execute(
                """
                INSERT INTO "Conversation" ("id", "title", "userId", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s)
                """,
                (conversation_id, title, user_id, now, now),
            )
            conn.execute(
                """
                INSERT INTO "Message" ("id", "conversationId", "role", "content", "createdAt")
                VALUES (%s, %s, %s, %s, %s)
                """,
                (_make_id("message"), conversation_id, "user", user_message, now),
            )
    _invalidate_conversation_cache(user_id, conversation_id)
    return conversation_id


def record_user_message(
    user_id: str, conversation_id: str | None, title: str, user_message: str
) -> str:
    """Persist the user's turn. Creates a new conversation when conversation_id is
    None (or not owned by the user) and returns the conversation id to thread on."""
    now = _now()

    if conversation_id and conversation_belongs_to_user(conversation_id, user_id):
        with _connect() as conn:
            with conn.transaction():
                conn.execute(
                    """
                    INSERT INTO "Message" ("id", "conversationId", "role", "content", "createdAt")
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (_make_id("message"), conversation_id, "user", user_message, now),
                )
                conn.execute(
                    'UPDATE "Conversation" SET "updatedAt" = %s WHERE "id" = %s',
                    (now, conversation_id),
                )
        _invalidate_conversation_cache(user_id, conversation_id)
        return conversation_id

    new_id = _make_id("conversation")
    with _connect() as conn:
        with conn.transaction():
            conn.execute(
                """
                INSERT INTO "Conversation" ("id", "title", "userId", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s)
                """,
                (new_id, title, user_id, now, now),
            )
            conn.execute(
                """
                INSERT INTO "Message" ("id", "conversationId", "role", "content", "createdAt")
                VALUES (%s, %s, %s, %s, %s)
                """,
                (_make_id("message"), new_id, "user", user_message, now),
            )
    _invalidate_conversation_cache(user_id, new_id)
    return new_id


def record_assistant_message(conversation_id: str, assistant_message: str) -> None:
    now = _now()
    user_id: str | None = None
    with _connect() as conn:
        with conn.transaction():
            conn.execute(
                """
                INSERT INTO "Message" ("id", "conversationId", "role", "content", "createdAt")
                VALUES (%s, %s, %s, %s, %s)
                """,
                (_make_id("message"), conversation_id, "assistant", assistant_message, now),
            )
            row = conn.execute(
                'UPDATE "Conversation" SET "updatedAt" = %s WHERE "id" = %s RETURNING "userId"',
                (now, conversation_id),
            ).fetchone()
            user_id = row["userId"] if row else None
    if user_id:
        _invalidate_conversation_cache(user_id, conversation_id)


def get_conversation_messages(
    conversation_id: str, user_id: str, limit: int = 12
) -> list[Message]:
    """Return the most recent `limit` messages (chronological) for a conversation the
    user owns. Used to give the model multi-turn memory."""
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT m."role", m."content", m."createdAt"
            FROM "Message" m
            JOIN "Conversation" c ON c."id" = m."conversationId"
            WHERE m."conversationId" = %s AND c."userId" = %s
            ORDER BY m."createdAt" DESC, m."id" DESC
            LIMIT %s
            """,
            (conversation_id, user_id, limit),
        ).fetchall()
    return [_message_from_row(row) for row in reversed(rows)]


def get_conversation(conversation_id: str, user_id: str) -> Conversation | None:
    cache_key = (user_id, conversation_id)
    now = time.monotonic()
    cached = _conversation_detail_cache.get(cache_key)
    if cached and now - cached[0] < _CONVERSATION_DETAIL_TTL:
        return cached[1]

    with _connect() as conn:
        conv = conn.execute(
            'SELECT * FROM "Conversation" WHERE "id" = %s AND "userId" = %s',
            (conversation_id, user_id),
        ).fetchone()
        if not conv:
            return None
        rows = conn.execute(
            """
            SELECT "role", "content", "createdAt" FROM "Message"
            WHERE "conversationId" = %s
            ORDER BY "createdAt" ASC, "id" ASC
            """,
            (conversation_id,),
        ).fetchall()
    conversation = Conversation(
        id=conv["id"],
        userId=conv["userId"],
        title=conv["title"],
        createdAt=conv["createdAt"],
        messages=[_message_from_row(row) for row in rows],
    )
    _conversation_detail_cache[cache_key] = (now, conversation)
    return conversation


def list_conversations(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    """Lightweight summaries for the history sidebar (no full message bodies)."""
    safe_limit = max(1, min(100, int(limit)))
    cache_key = (user_id, safe_limit)
    now = time.monotonic()
    cached = _conversation_list_cache.get(cache_key)
    if cached and now - cached[0] < _CONVERSATION_LIST_TTL:
        return [dict(summary) for summary in cached[1]]

    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT c."id", c."title", c."createdAt", c."updatedAt",
                   COALESCE(last_message."content", '') AS "lastMessage"
            FROM "Conversation" c
            LEFT JOIN LATERAL (
                SELECT m."content"
                FROM "Message" m
                WHERE m."conversationId" = c."id"
                ORDER BY m."createdAt" DESC, m."id" DESC
                LIMIT 1
            ) last_message ON TRUE
            WHERE c."userId" = %s
            ORDER BY c."updatedAt" DESC
            LIMIT %s
            """,
            (user_id, safe_limit),
        ).fetchall()
    summaries = [
        {
            "id": row["id"],
            "title": row["title"],
            "createdAt": row["createdAt"],
            "updatedAt": row["updatedAt"],
            "lastMessage": (row["lastMessage"] or "")[:120],
        }
        for row in rows
    ]
    _conversation_list_cache[cache_key] = (now, summaries)
    return [dict(summary) for summary in summaries]


def delete_conversation(conversation_id: str, user_id: str) -> bool:
    with _connect() as conn:
        with conn.transaction():
            owned = conn.execute(
                'SELECT 1 FROM "Conversation" WHERE "id" = %s AND "userId" = %s',
                (conversation_id, user_id),
            ).fetchone()
            if not owned:
                return False
            conn.execute('DELETE FROM "Message" WHERE "conversationId" = %s', (conversation_id,))
            conn.execute(
                'DELETE FROM "Conversation" WHERE "id" = %s AND "userId" = %s',
                (conversation_id, user_id),
            )
    return True


def delete_user_conversations(user_id: str) -> int:
    with _connect() as conn:
        with conn.transaction():
            count_row = conn.execute(
                'SELECT COUNT(*) AS "count" FROM "Conversation" WHERE "userId" = %s',
                (user_id,),
            ).fetchone()
            deleted_count = int(count_row["count"] or 0)
            if deleted_count == 0:
                return 0
            conn.execute(
                """
                DELETE FROM "Message" m
                USING "Conversation" c
                WHERE m."conversationId" = c."id" AND c."userId" = %s
                """,
                (user_id,),
            )
            conn.execute('DELETE FROM "Conversation" WHERE "userId" = %s', (user_id,))
    return deleted_count


def add_weighted_tags(bucket: dict[str, int], tags: list[str] | None, score: int) -> None:
    if not tags or score < 3:
        return
    weight = 1 if score == 3 else score
    for tag in tags:
        bucket[tag] = bucket.get(tag, 0) + weight


def top_tags(bucket: dict[str, int], max_count: int) -> list[str]:
    return [tag for tag, _ in sorted(bucket.items(), key=lambda item: (-item[1], item[0]))[:max_count]]


def build_profile_payload_from_assessment(
    grade_level: str,
    goals: str,
    constraints: str,
    answers: dict[str, int],
) -> dict[str, Any]:
    from db.assessment_questions import assessment_questions

    subjects: dict[str, int] = {}
    interests: dict[str, int] = {}
    strengths: dict[str, int] = {}
    values: dict[str, int] = {}
    riasec: dict[str, int] = {}

    for question in assessment_questions:
        score = answers.get(question.id, 3)
        add_weighted_tags(subjects, question.weights.favoriteSubjects, score)
        add_weighted_tags(interests, question.weights.interests, score)
        add_weighted_tags(strengths, question.weights.strengths, score)
        add_weighted_tags(values, question.weights.values, score)
        add_weighted_tags(riasec, question.weights.riasec, score)

    return {
        "gradeLevel": grade_level,
        "interests": top_tags(interests, 7),
        "strengths": top_tags(strengths, 7),
        "favoriteSubjects": top_tags(subjects, 5),
        "values": top_tags(values, 5),
        "riasec": top_tags(riasec, 3),
        "goals": goals,
        "constraints": constraints,
        "assessmentCompleted": True,
        "assessmentAnswers": answers,
    }


def build_transient_profile_from_assessment(
    grade_level: str,
    goals: str,
    constraints: str,
    answers: dict[str, int],
    gender: str | None = None,
    user_id: str = "guest_user",
) -> CareerProfile:
    now = _now()
    payload = build_profile_payload_from_assessment(
        grade_level=grade_level,
        goals=goals,
        constraints=constraints,
        answers=answers,
    )
    return CareerProfile(
        id=_make_id("guest_profile"),
        userId=user_id,
        gradeLevel=payload["gradeLevel"],
        gender=gender,
        interests=payload["interests"],
        strengths=payload["strengths"],
        favoriteSubjects=payload["favoriteSubjects"],
        values=payload["values"],
        riasec=payload["riasec"],
        goals=payload["goals"],
        constraints=payload["constraints"],
        assessmentCompleted=payload["assessmentCompleted"],
        assessmentAnswers=payload["assessmentAnswers"],
        createdAt=now,
        updatedAt=now,
    )


def build_profile_from_assessment(
    user_id: str,
    grade_level: str,
    goals: str,
    constraints: str,
    answers: dict[str, int],
) -> CareerProfile:
    payload = build_profile_payload_from_assessment(
        grade_level=grade_level,
        goals=goals,
        constraints=constraints,
        answers=answers,
    )
    return upsert_profile(
        user_id,
        payload,
    )
