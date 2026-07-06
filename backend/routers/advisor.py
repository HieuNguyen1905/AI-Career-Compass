import json
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from agents.career_advisor import AdvisorAgent
from core.career_engine import get_career_matches, has_completed_current_assessment
from core.deps import get_current_user
from db.database import (
    delete_conversation,
    delete_user_conversations,
    get_conversation,
    get_conversation_messages,
    get_profile_by_user_id,
    list_careers,
    list_conversations,
    make_conversation_id,
    record_assistant_message,
    record_user_message_with_id,
)
from models.schemas import (
    AdvisorChatRequest,
    AdvisorChatResponse,
    ConversationDetail,
    ConversationSummary,
    GuestAdvisorChatRequest,
    MockUser,
)

router = APIRouter(prefix="/advisor", tags=["advisor"])

advisor_agent = AdvisorAgent()

_RATE_LIMIT_MAX = 20
_RATE_LIMIT_WINDOW = 60.0
_rate_log: dict[str, deque[float]] = defaultdict(deque)
_SSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


def _context_field(source, key: str):
    if source is None:
        return None
    if isinstance(source, dict):
        return source.get(key)
    return getattr(source, key, None)


def _advisor_user_context(user: MockUser | None = None, profile=None) -> dict:
    return {
        "gradeLevel": _context_field(user, "gradeLevel") or _context_field(profile, "gradeLevel"),
        "gender": _context_field(user, "gender") or _context_field(profile, "gender"),
    }


def _check_rate_limit(user_id: str) -> None:
    now = time.monotonic()
    bucket = _rate_log[user_id]
    while bucket and now - bucket[0] > _RATE_LIMIT_WINDOW:
        bucket.popleft()
    if len(bucket) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Em \u0111ang g\u1eedi qu\u00e1 nhanh. H\u00e3y ch\u1edd m\u1ed9t ch\u00fat r\u1ed3i th\u1eed l\u1ea1i nh\u00e9.",
        )
    bucket.append(now)


async def _gather_context(user_id: str):
    profile = await run_in_threadpool(get_profile_by_user_id, user_id)
    career_paths = await run_in_threadpool(list_careers)
    career_titles = [career.title for career in career_paths]
    matches = (
        await run_in_threadpool(get_career_matches, profile, career_paths)
        if has_completed_current_assessment(profile)
        else []
    )
    return profile, matches, career_titles


async def _gather_guest_context(req: GuestAdvisorChatRequest):
    profile = req.profile
    career_paths = await run_in_threadpool(list_careers)
    career_titles = [career.title for career in career_paths]
    matches = (
        await run_in_threadpool(get_career_matches, profile, career_paths)
        if has_completed_current_assessment(profile)
        else []
    )
    return profile, matches, career_titles


async def _prepare_advisor_turn(
    current_user: MockUser,
    conversation_id: str,
    message: str,
) -> tuple:
    await run_in_threadpool(
        record_user_message_with_id,
        current_user.id,
        conversation_id,
        message[:80],
        message,
    )
    profile, matches, career_titles = await _gather_context(current_user.id)
    history = await run_in_threadpool(get_conversation_messages, conversation_id, current_user.id)
    if history and history[-1].role == "user" and history[-1].content == message:
        history = history[:-1]
    return profile, matches, history, career_titles, _advisor_user_context(current_user, profile)


def _validate_message(message: str) -> str:
    message = (message or "").strip()
    if not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tin nh\u1eafn tr\u1ed1ng.")
    if len(message) > 2000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tin nh\u1eafn qu\u00e1 d\u00e0i.")
    return message


@router.post("/guest/chat", response_model=AdvisorChatResponse)
async def advisor_guest_chat(req: GuestAdvisorChatRequest):
    message = _validate_message(req.message)
    conversation_id = req.conversationId or make_conversation_id()
    history = req.history[-12:]

    try:
        profile, matches, career_titles = await _gather_guest_context(req)
        user_context = _advisor_user_context(profile=profile)
        answer = await advisor_agent.generate_response(
            message,
            profile,
            matches,
            history,
            career_titles=career_titles,
            user_context=user_context,
        )
        return AdvisorChatResponse(answer=answer, conversationId=conversation_id)
    except Exception as exc:
        print("guest advisor generation failed", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kh\u00f4ng th\u1ec3 t\u1ea1o ph\u1ea3n h\u1ed3i l\u00fac n\u00e0y.",
        ) from exc


@router.post("/guest/chat/stream")
async def advisor_guest_chat_stream(req: GuestAdvisorChatRequest):
    message = _validate_message(req.message)
    conversation_id = req.conversationId or make_conversation_id()
    history = req.history[-12:]

    async def event_stream():
        yield f"data: {json.dumps({'type': 'meta', 'conversationId': conversation_id}, ensure_ascii=False)}\n\n"
        try:
            profile, matches, career_titles = await _gather_guest_context(req)
            user_context = _advisor_user_context(profile=profile)
            async for chunk in advisor_agent.generate_response_stream(
                message,
                profile,
                matches,
                history,
                career_titles=career_titles,
                user_context=user_context,
            ):
                if not chunk:
                    continue
                yield f"data: {json.dumps({'type': 'delta', 'content': chunk}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
        except Exception as exc:
            print("guest advisor stream generation failed", exc)
            yield f"data: {json.dumps({'type': 'error', 'message': 'Kh\u00f4ng th\u1ec3 t\u1ea1o ph\u1ea3n h\u1ed3i l\u00fac n\u00e0y.'}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.post("/chat", response_model=AdvisorChatResponse)
async def advisor_chat(
    req: AdvisorChatRequest,
    current_user: MockUser = Depends(get_current_user),
):
    _check_rate_limit(current_user.id)
    message = _validate_message(req.message)

    conversation_id = req.conversationId or make_conversation_id()
    try:
        profile, matches, history, career_titles, user_context = await _prepare_advisor_turn(
            current_user,
            conversation_id,
            message,
        )
        answer = await advisor_agent.generate_response(
            message,
            profile,
            matches,
            history,
            career_titles=career_titles,
            user_context=user_context,
        )
        if answer:
            await run_in_threadpool(record_assistant_message, conversation_id, answer)
        return AdvisorChatResponse(answer=answer, conversationId=conversation_id)
    except Exception as exc:
        print("advisor generation failed", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kh\u00f4ng th\u1ec3 t\u1ea1o ph\u1ea3n h\u1ed3i l\u00fac n\u00e0y.",
        ) from exc


@router.post("/chat/stream")
async def advisor_chat_stream(
    req: AdvisorChatRequest,
    current_user: MockUser = Depends(get_current_user),
):
    _check_rate_limit(current_user.id)
    message = _validate_message(req.message)
    conversation_id = req.conversationId or make_conversation_id()

    async def event_stream():
        yield f"data: {json.dumps({'type': 'meta', 'conversationId': conversation_id}, ensure_ascii=False)}\n\n"
        answer_parts: list[str] = []

        try:
            profile, matches, history, career_titles, user_context = await _prepare_advisor_turn(
                current_user,
                conversation_id,
                message,
            )
            async for chunk in advisor_agent.generate_response_stream(
                message,
                profile,
                matches,
                history,
                career_titles=career_titles,
                user_context=user_context,
            ):
                if not chunk:
                    continue
                answer_parts.append(chunk)
                yield f"data: {json.dumps({'type': 'delta', 'content': chunk}, ensure_ascii=False)}\n\n"

            answer = "".join(answer_parts).strip()
            if answer:
                await run_in_threadpool(record_assistant_message, conversation_id, answer)
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
        except Exception as exc:
            print("advisor stream generation failed", exc)
            yield f"data: {json.dumps({'type': 'error', 'message': 'Kh\u00f4ng th\u1ec3 t\u1ea1o ph\u1ea3n h\u1ed3i l\u00fac n\u00e0y.'}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.get("/conversations", response_model=list[ConversationSummary])
async def advisor_conversations(current_user: MockUser = Depends(get_current_user)):
    rows = await run_in_threadpool(list_conversations, current_user.id)
    return [ConversationSummary(**row) for row in rows]


@router.delete("/conversations")
async def clear_advisor_conversations(current_user: MockUser = Depends(get_current_user)):
    deleted_count = await run_in_threadpool(delete_user_conversations, current_user.id)
    return {"deletedCount": deleted_count}


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def advisor_conversation_detail(
    conversation_id: str,
    current_user: MockUser = Depends(get_current_user),
):
    conversation = await run_in_threadpool(get_conversation, conversation_id, current_user.id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kh\u00f4ng t\u00ecm th\u1ea5y h\u1ed9i tho\u1ea1i.",
        )
    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        createdAt=conversation.createdAt,
        messages=conversation.messages,
    )


@router.delete("/conversations/{conversation_id}")
async def delete_advisor_conversation(
    conversation_id: str, current_user: MockUser = Depends(get_current_user)
):
    deleted = await run_in_threadpool(delete_conversation, conversation_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy hội thoại.")
    return {"deleted": True}
