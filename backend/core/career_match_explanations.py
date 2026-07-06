import os
import time
from typing import Any

from fastapi import BackgroundTasks
from starlette.concurrency import run_in_threadpool

from agents.career_explanation import CareerExplanationAgent
from core.career_engine import (
    build_student_vector,
    get_career_matches,
    get_career_matches_from_ranked,
    has_completed_current_assessment,
)
from core.career_explanation_cache import (
    build_assessment_hash,
    build_career_ids_hash,
    career_explanation_prompt_version,
)
from db.database import (
    create_pending_career_match_explanation,
    get_career_match_explanation,
    get_profile_by_user_id,
    list_careers,
    list_careers_by_vector,
    mark_career_match_explanation_failed,
    mark_career_match_explanation_ready,
)
from models.schemas import CareerProfile


career_explanation_agent = CareerExplanationAgent()

_MATCH_CACHE_TTL_SECONDS = 120.0
_MATCH_CACHE_MAX_ENTRIES = 128
_READY_EXPLANATION_CACHE_TTL_SECONDS = 300.0
_READY_EXPLANATION_CACHE_MAX_ENTRIES = 128

_match_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_ready_explanation_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def _precompute_limit() -> int:
    try:
        return max(1, min(10, int(os.getenv("CAREER_EXPLANATION_PRECOMPUTE_LIMIT", "5"))))
    except ValueError:
        return 5


def _use_pgvector_matching() -> bool:
    return os.getenv("CAREER_MATCH_USE_PGVECTOR", "false").lower() in {"1", "true", "yes", "on"}


def _cache_get(cache: dict[str, tuple[float, Any]], key: str, ttl: float) -> Any | None:
    cached = cache.get(key)
    if not cached:
        return None
    created_at, value = cached
    if time.monotonic() - created_at > ttl:
        cache.pop(key, None)
        return None
    return value


def _cache_set(cache: dict[str, tuple[float, Any]], key: str, value: Any, max_entries: int) -> None:
    if len(cache) >= max_entries:
        oldest_key = min(cache, key=lambda item: cache[item][0])
        cache.pop(oldest_key, None)
    cache[key] = (time.monotonic(), value)


def _copy_matches(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [dict(match) for match in matches]


async def build_career_matches(profile: CareerProfile, limit: int = 5) -> list[dict[str, Any]]:
    safe_limit = max(1, min(10, limit))
    match_cache_key = f"{build_assessment_hash(profile)}:{safe_limit}"
    cached_matches = _cache_get(_match_cache, match_cache_key, _MATCH_CACHE_TTL_SECONDS)
    if cached_matches is not None:
        return _copy_matches(cached_matches)

    matches = None

    if _use_pgvector_matching():
        student_vector = build_student_vector(profile)
    else:
        student_vector = None

    if student_vector:
        try:
            ranked_careers = await run_in_threadpool(
                list_careers_by_vector,
                student_vector,
                safe_limit,
            )
            if ranked_careers:
                matches = get_career_matches_from_ranked(
                    profile,
                    ranked_careers,
                    limit=safe_limit,
                )
        except Exception as exc:
            print(f"pgvector career matching failed, falling back to in-memory scoring: {exc}")

    if matches is None:
        careers = await run_in_threadpool(list_careers)
        matches = get_career_matches(profile, careers, limit=safe_limit)

    _cache_set(_match_cache, match_cache_key, _copy_matches(matches), _MATCH_CACHE_MAX_ENTRIES)
    return matches


def _cache_identity(profile: CareerProfile, matches: list[dict[str, Any]]) -> dict[str, str]:
    return {
        "assessment_hash": build_assessment_hash(profile),
        "career_ids_hash": build_career_ids_hash(matches),
        "model": career_explanation_agent.model,
        "prompt_version": career_explanation_prompt_version(),
    }


def _identity_cache_key(user_id: str, identity: dict[str, str]) -> str:
    return ":".join(
        [
            user_id,
            identity["assessment_hash"],
            identity["model"],
            identity["prompt_version"],
            identity["career_ids_hash"],
        ]
    )


def _ready_explanations_from_record(record: dict[str, Any] | None) -> dict[str, Any] | None:
    if (
        record
        and record.get("status") == "ready"
        and isinstance(record.get("explanationsJson"), dict)
    ):
        return record["explanationsJson"]
    return None


def _apply_cached_explanations(
    matches: list[dict[str, Any]],
    explanations: dict[str, Any],
    source: str = "stored",
) -> list[dict[str, Any]]:
    enriched_matches: list[dict[str, Any]] = []

    for match in matches:
        career_id = str(match["id"])
        reason_objects = explanations.get(career_id)
        if not isinstance(reason_objects, list):
            enriched_matches.append(match)
            continue

        reasons = [
            str(reason.get("text", "")).strip()
            for reason in reason_objects
            if isinstance(reason, dict) and str(reason.get("text", "")).strip()
        ]
        if not reasons:
            enriched_matches.append(match)
            continue

        enriched_matches.append(
            {
                **match,
                "reasons": reasons,
                "reasonEvidence": reason_objects,
                "explanationSource": source,
            }
        )

    return enriched_matches


async def read_cached_explanations_or_schedule(
    user_id: str,
    profile: CareerProfile,
    matches: list[dict[str, Any]],
    background_tasks: BackgroundTasks | None = None,
) -> list[dict[str, Any]]:
    identity = _cache_identity(profile, matches)
    ready_cache_key = _identity_cache_key(user_id, identity)
    cached_explanations = _cache_get(
        _ready_explanation_cache,
        ready_cache_key,
        _READY_EXPLANATION_CACHE_TTL_SECONDS,
    )
    if cached_explanations is not None:
        return _apply_cached_explanations(matches, cached_explanations)

    record = await run_in_threadpool(
        get_career_match_explanation,
        user_id,
        identity["assessment_hash"],
        identity["model"],
        identity["prompt_version"],
        identity["career_ids_hash"],
    )

    ready_explanations = _ready_explanations_from_record(record)
    if ready_explanations is not None:
        _cache_set(
            _ready_explanation_cache,
            ready_cache_key,
            ready_explanations,
            _READY_EXPLANATION_CACHE_MAX_ENTRIES,
        )
        return _apply_cached_explanations(matches, ready_explanations)

    if background_tasks is not None:
        generated = await ensure_career_match_explanations(
            user_id,
            profile,
            limit=len(matches) or 5,
        )
        if generated:
            cached_explanations = _cache_get(
                _ready_explanation_cache,
                ready_cache_key,
                _READY_EXPLANATION_CACHE_TTL_SECONDS,
            )
            if cached_explanations is not None:
                return _apply_cached_explanations(matches, cached_explanations)

            record = await run_in_threadpool(
                get_career_match_explanation,
                user_id,
                identity["assessment_hash"],
                identity["model"],
                identity["prompt_version"],
                identity["career_ids_hash"],
            )
            ready_explanations = _ready_explanations_from_record(record)
            if ready_explanations is not None:
                _cache_set(
                    _ready_explanation_cache,
                    ready_cache_key,
                    ready_explanations,
                    _READY_EXPLANATION_CACHE_MAX_ENTRIES,
                )
                return _apply_cached_explanations(matches, ready_explanations)

    return matches


def queue_career_explanation_precompute(background_tasks: BackgroundTasks, user_id: str) -> None:
    background_tasks.add_task(precompute_career_match_explanations, user_id, _precompute_limit())


async def ensure_career_match_explanations(
    user_id: str,
    profile: CareerProfile | None = None,
    limit: int = 5,
) -> bool:
    record_id: str | None = None

    try:
        if profile is None:
            profile = await run_in_threadpool(get_profile_by_user_id, user_id)
        if not profile or not has_completed_current_assessment(profile):
            return False

        matches = await build_career_matches(profile, limit)
        if not matches:
            return False

        identity = _cache_identity(profile, matches)
        ready_cache_key = _identity_cache_key(user_id, identity)
        cached_explanations = _cache_get(
            _ready_explanation_cache,
            ready_cache_key,
            _READY_EXPLANATION_CACHE_TTL_SECONDS,
        )
        if cached_explanations is not None:
            return True

        record, _claimed = await run_in_threadpool(
            create_pending_career_match_explanation,
            user_id,
            identity["assessment_hash"],
            identity["model"],
            identity["prompt_version"],
            identity["career_ids_hash"],
            matches,
        )
        record_id = record["id"]

        ready_explanations = _ready_explanations_from_record(record)
        if ready_explanations is not None:
            _cache_set(
                _ready_explanation_cache,
                ready_cache_key,
                ready_explanations,
                _READY_EXPLANATION_CACHE_MAX_ENTRIES,
            )
            return True

        explanations = await career_explanation_agent.generate_explanations(profile, matches)
        if not explanations:
            await run_in_threadpool(
                mark_career_match_explanation_failed,
                record_id,
                "No career explanations were generated.",
            )
            return False

        await run_in_threadpool(
            mark_career_match_explanation_ready,
            record_id,
            explanations,
        )
        _cache_set(
            _ready_explanation_cache,
            ready_cache_key,
            explanations,
            _READY_EXPLANATION_CACHE_MAX_ENTRIES,
        )
        return True
    except Exception as exc:
        print(f"Career explanation generation failed: {exc}")
        if record_id:
            await run_in_threadpool(
                mark_career_match_explanation_failed,
                record_id,
                str(exc),
            )
        return False


async def precompute_career_match_explanations(user_id: str, limit: int = 5) -> None:
    await ensure_career_match_explanations(user_id, limit=limit)


async def build_guest_career_matches_with_explanations(
    profile: CareerProfile,
    limit: int = 5,
) -> list[dict[str, Any]] | None:
    matches = await build_career_matches(profile, limit)
    if not matches:
        return None

    explanations = await career_explanation_agent.generate_explanations(profile, matches)
    if not explanations:
        return None

    return _apply_cached_explanations(matches, explanations, source="ai")
