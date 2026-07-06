import hashlib
import json
import os
from typing import Any

from models.schemas import CareerProfile


def _stable_hash(namespace: str, payload: Any) -> str:
    serialized = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(f"{namespace}:{serialized}".encode("utf-8")).hexdigest()


def career_explanation_prompt_version() -> str:
    return os.getenv("CAREER_EXPLANATION_PROMPT_VERSION", "v2")


def build_assessment_hash(profile: CareerProfile) -> str:
    return _stable_hash(
        "career-assessment",
        {
            "gradeLevel": profile.gradeLevel,
            "goals": profile.goals,
            "constraints": profile.constraints,
            "assessmentAnswers": profile.assessmentAnswers or {},
        },
    )


def build_career_ids_hash(matches: list[dict[str, Any]]) -> str:
    return _stable_hash(
        "career-match-list",
        [
            {
                "id": str(match.get("id", "")),
                "score": match.get("score"),
            }
            for match in matches
        ],
    )
