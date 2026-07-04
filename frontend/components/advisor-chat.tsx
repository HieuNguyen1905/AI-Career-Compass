"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  History,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Sparkles,
  Trash2,
  UserRound
} from "lucide-react";
import { MarkdownLite } from "@/components/markdown-lite";
import {
  clearGuestChat,
  deleteGuestConversation as deleteStoredGuestConversation,
  loadGuestChatState,
  loadGuestConversation,
  loadGuestConversationSummaries,
  loadGuestProfile,
  saveGuestConversation,
  setGuestActiveConversation,
  type GuestChatConversation,
} from "@/lib/guest-session";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
};

type ConversationDetail = {
  id: string;
  messages: { role: Message["role"]; content: string }[];
};

const introMessage: Message = {
  id: "intro",
  role: "assistant",
  content:
    "Chào bạn. Mình là **AI Career Coach**. Mình có thể giải thích hồ sơ, so sánh 2-3 hướng nghề, gợi ý lộ trình và hoạt động trải nghiệm nhỏ. Mình sẽ không áp đặt một lựa chọn duy nhất."
};

const suggestions = [
  "Em thích Tin học nên khám phá hướng nào?",
  "So sánh giúp em 2 nghề được gợi ý cao nhất.",
  "Lộ trình 4 tuần để thử một nghề là gì?"
];

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function AdvisorChat({ isGuest = false }: { isGuest?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([introMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const conversationIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function messagesFromGuestConversation(conversation: GuestChatConversation): Message[] {
    return conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    }));
  }

  function persistGuestConversation(conversationId: string, nextMessages: Message[]) {
    const now = new Date().toISOString();
    const storedMessages = nextMessages
      .filter((message) => message.id !== introMessage.id)
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: now,
      }));

    if (storedMessages.length === 0) {
      setGuestActiveConversation(null);
      return;
    }

    const existing = loadGuestConversation(conversationId);
    const title = existing?.title ?? storedMessages.find((message) => message.role === "user")?.content.slice(0, 80) ?? "Cuộc trò chuyện";
    saveGuestConversation({
      id: conversationId,
      title,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      messages: storedMessages,
    });
    setConversations(loadGuestConversationSummaries());
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const loadConversations = useCallback(async () => {
    if (isGuest) {
      setConversations(loadGuestConversationSummaries());
      return;
    }

    try {
      const res = await fetch("/api/advisor/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as ConversationSummary[];
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      /* danh sách lịch sử không bắt buộc, im lặng nếu lỗi */
    }
  }, [isGuest]);

  useEffect(() => {
    if (isGuest) {
      const state = loadGuestChatState();
      const activeConversation = state.activeId ? loadGuestConversation(state.activeId) : null;
      if (activeConversation) {
        conversationIdRef.current = activeConversation.id;
        setActiveId(activeConversation.id);
        setMessages(messagesFromGuestConversation(activeConversation));
      }
      setConversations(loadGuestConversationSummaries());
      return;
    }

    void loadConversations();
  }, [isGuest, loadConversations]);

  function startNewChat() {
    if (isLoading) return;
    conversationIdRef.current = null;
    if (isGuest) setGuestActiveConversation(null);
    setActiveId(null);
    setMessages([introMessage]);
    setError(null);
    setShowHistoryMobile(false);
    inputRef.current?.focus();
  }

  async function openConversation(id: string) {
    if (isLoading || id === activeId) return;
    setError(null);
    setShowHistoryMobile(false);
    if (isGuest) {
      const conversation = loadGuestConversation(id);
      if (!conversation) {
        setError("Không tìm thấy hội thoại dùng thử.");
        return;
      }
      conversationIdRef.current = conversation.id;
      setGuestActiveConversation(conversation.id);
      setActiveId(conversation.id);
      setMessages(messagesFromGuestConversation(conversation));
      return;
    }

    try {
      const res = await fetch(`/api/advisor/conversations/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Không tải được hội thoại.");
      const data = (await res.json()) as ConversationDetail;
      conversationIdRef.current = data.id;
      setActiveId(data.id);
      setMessages(
        data.messages.map((m, i) => ({ id: `${data.id}-${i}`, role: m.role, content: m.content }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    }
  }

  async function deleteConversation(id: string) {
    if (isLoading || deletingId) return;
    const target = conversations.find((conversation) => conversation.id === id);
    const confirmed = window.confirm(`Xóa hội thoại "${target?.title ?? "này"}"?`);
    if (!confirmed) return;

    setDeletingId(id);
    setError(null);
    if (isGuest) {
      deleteStoredGuestConversation(id);
      setConversations(loadGuestConversationSummaries());
      if (conversationIdRef.current === id) {
        conversationIdRef.current = null;
        setActiveId(null);
        setMessages([introMessage]);
      }
      setDeletingId(null);
      inputRef.current?.focus();
      return;
    }

    try {
      const res = await fetch(`/api/advisor/conversations/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Không xóa được hội thoại.");
      }

      setConversations((current) => current.filter((conversation) => conversation.id !== id));
      if (conversationIdRef.current === id) {
        conversationIdRef.current = null;
        setActiveId(null);
        setMessages([introMessage]);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Có lỗi khi xóa hội thoại.");
    } finally {
      setDeletingId(null);
      inputRef.current?.focus();
    }
  }

  async function clearHistory() {
    if (isLoading || isClearingHistory || conversations.length === 0) return;
    const confirmed = window.confirm("Xóa toàn bộ lịch sử chat?");
    if (!confirmed) return;

    setIsClearingHistory(true);
    setError(null);
    if (isGuest) {
      clearGuestChat();
      setConversations([]);
      conversationIdRef.current = null;
      setActiveId(null);
      setMessages([introMessage]);
      setShowHistoryMobile(false);
      setIsClearingHistory(false);
      inputRef.current?.focus();
      return;
    }

    try {
      const res = await fetch("/api/advisor/conversations", { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Không xóa được lịch sử chat.");
      }

      setConversations([]);
      conversationIdRef.current = null;
      setActiveId(null);
      setMessages([introMessage]);
      setShowHistoryMobile(false);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Có lỗi khi xóa lịch sử chat.");
    } finally {
      setIsClearingHistory(false);
      inputRef.current?.focus();
    }
  }
  const pollQueuedConversation = useCallback(async (id: string) => {
    const delays = [1500, 3000, 6000, 10000];
    for (const delayMs of delays) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (conversationIdRef.current !== id) return;

      try {
        const res = await fetch(`/api/advisor/conversations/${id}`, { cache: "no-store" });
        if (!res.ok) continue;
        const data = (await res.json()) as ConversationDetail;
        const lastMessage = data.messages[data.messages.length - 1];
        if (lastMessage?.role !== "assistant") continue;

        setActiveId(data.id);
        setMessages(
          data.messages.map((m, i) => ({ id: `${data.id}-${i}`, role: m.role, content: m.content }))
        );
        await loadConversations();
        return;
      } catch {
        /* polling is best-effort */
      }
    }
  }, [loadConversations]);

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: message };
    const assistantId = crypto.randomUUID();
    const previousMessages = messages.filter((m) => m.id !== introMessage.id);

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "" }
    ]);
    setInput("");
    setError(null);
    setIsLoading(true);

    let assistantContent = "";
    const appendToAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((current) =>
        current.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
      );
    };

    try {
      const requestBody = isGuest
        ? {
          message,
          conversationId: conversationIdRef.current,
          profile: loadGuestProfile(),
          history: previousMessages.slice(-12).map((item) => ({ role: item.role, content: item.content })),
        }
        : { message, conversationId: conversationIdRef.current };

      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Không nhận được phản hồi.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let queuedConversationId: string | null = null;

      // Đọc SSE: mỗi event là "data: {json}\n\n".
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;

          try {
            const evt = JSON.parse(payload) as {
              type: string;
              conversationId?: string;
              content?: string;
              message?: string;
            };
            if (evt.type === "meta" && evt.conversationId) {
              conversationIdRef.current = evt.conversationId;
              setActiveId(evt.conversationId);
            } else if (evt.type === "delta" && evt.content) {
              appendToAssistant(evt.content);
            } else if (evt.type === "queued") {
              queuedConversationId = evt.conversationId ?? conversationIdRef.current;
            } else if (evt.type === "error") {
              setError(evt.message ?? "Có lỗi khi tạo phản hồi.");
            }
          } catch {
            /* bỏ qua mảnh event không parse được */
          }
        }
      }

      setMessages((current) =>
        current.map((m) =>
          m.id === assistantId && !m.content
            ? { ...m, content: "Mình chưa tạo được phản hồi. Em thử lại giúp mình nhé." }
            : m
        )
      );
      const finalAssistantContent = assistantContent || "Mình chưa tạo được phản hồi. Em thử lại giúp mình nhé.";
      if (isGuest) {
        const conversationId = conversationIdRef.current ?? crypto.randomUUID();
        conversationIdRef.current = conversationId;
        setActiveId(conversationId);
        persistGuestConversation(conversationId, [
          ...messages,
          userMessage,
          { id: assistantId, role: "assistant", content: finalAssistantContent },
        ]);
      } else if (queuedConversationId) {
        void pollQueuedConversation(queuedConversationId);
      }
    } catch (requestError) {
      setMessages((current) => current.filter((m) => !(m.id === assistantId && !m.content)));
      setError(requestError instanceof Error ? requestError.message : "Có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
      void loadConversations();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  const showSuggestions = messages.length === 1 && !isLoading && !conversationIdRef.current;
  const layoutClassName = historyCollapsed
    ? "grid grid-cols-1 gap-4 lg:grid-cols-[54px_1fr] lg:items-start"
    : "grid grid-cols-1 gap-4 lg:grid-cols-[290px_1fr] lg:items-start";

  const historyList = (
    <div className="grid gap-1.5 overflow-y-auto p-2">
      {conversations.length === 0 ? (
        <p className="px-2 py-6 text-center text-xs text-slate-400">Chưa có hội thoại nào.</p>
      ) : (
        conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-start gap-1 rounded-xl border p-1.5 transition-colors ${
              c.id === activeId
                ? "border-violet-300 bg-violet-50"
                : "border-transparent hover:border-slate-200 hover:bg-slate-50"
            }`}
          >
            <button
              type="button"
              onClick={() => void openConversation(c.id)}
              className="min-w-0 flex-1 rounded-lg px-1.5 py-1 text-left"
              disabled={isLoading || deletingId === c.id}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-[13px] font-semibold text-slate-700">{c.title}</span>
                <span className="shrink-0 text-[10px] text-slate-400">{formatWhen(c.updatedAt)}</span>
              </div>
              {c.lastMessage ? (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{c.lastMessage}</p>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => void deleteConversation(c.id)}
              className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 opacity-100 transition-colors hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 disabled:pointer-events-none disabled:opacity-40 lg:opacity-0 lg:group-hover:opacity-100"
              disabled={isLoading || Boolean(deletingId) || isClearingHistory}
              aria-label={`Xóa hội thoại ${c.title}`}
              title="Xóa hội thoại"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className={layoutClassName}>
      {/* Sidebar lịch sử */}
      {historyCollapsed ? (
        <aside className="card hidden h-[calc(100dvh-7.5rem)] sm:h-[72vh] sm:min-h-[520px] sm:max-h-[820px] flex-col items-center gap-2 overflow-hidden p-2 lg:flex">
          <button
            type="button"
            onClick={() => setHistoryCollapsed(false)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-700"
            aria-label="Hiện lịch sử chat"
            title="Hiện lịch sử chat"
          >
            <PanelLeftOpen size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={startNewChat}
            className="grid h-9 w-9 place-items-center rounded-lg text-violet-600 transition-colors hover:bg-violet-50"
            aria-label="Tạo cuộc trò chuyện mới"
            title="Tạo cuộc trò chuyện mới"
          >
            <MessageSquarePlus size={18} aria-hidden />
          </button>
          <div className="mt-1 h-px w-7 bg-slate-200" />
          <span className="mt-1 grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-400">
            <History size={17} aria-hidden />
          </span>
        </aside>
      ) : (
        <aside className="card hidden h-[calc(100dvh-7.5rem)] sm:h-[72vh] sm:min-h-[520px] sm:max-h-[820px] flex-col overflow-hidden p-0 lg:flex">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-4 py-3">
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
              <History size={16} className="shrink-0 text-violet-500" aria-hidden />
              Lịch sử
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearHistory}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-40"
                disabled={isLoading || isClearingHistory || conversations.length === 0}
                aria-label="Xóa toàn bộ lịch sử chat"
                title="Xóa toàn bộ lịch sử"
              >
                <Trash2 size={15} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setHistoryCollapsed(true)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Ẩn lịch sử chat"
                title="Ẩn lịch sử chat"
              >
                <PanelLeftClose size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={startNewChat}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
              >
                <MessageSquarePlus size={14} aria-hidden />
                Mới
              </button>
            </div>
          </div>
          {historyList}
        </aside>
      )}

      {/* Khung chat */}
      <section className="card flex h-[calc(100dvh-7.5rem)] sm:h-[72vh] sm:min-h-[520px] sm:max-h-[820px] flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 sm:gap-3 border-b border-slate-200/70 bg-[linear-gradient(120deg,#7c3aed,#a21caf,#c026d3)] px-3.5 py-3 sm:px-5 sm:py-4 text-white shrink-0 selection:bg-purple-900 selection:text-white">
          <span className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Bot size={20} aria-hidden />
          </span>
          <div className="flex-1 min-w-0 pr-1">
            <strong className="block font-display text-sm sm:text-[15px] leading-tight truncate">AI Career Coach</strong>
            <span className="flex items-center gap-1.5 text-xs text-white/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7] shrink-0" />
              <span>Trực tuyến</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowHistoryMobile((v) => !v)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 lg:hidden"
            aria-label="Lịch sử trò chuyện"
          >
            <History size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={startNewChat}
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 lg:grid"
            aria-label="Tạo cuộc trò chuyện mới"
          >
            <MessageSquarePlus size={18} aria-hidden />
          </button>
        </div>

        {/* Lịch sử dạng drawer trên mobile */}
        {showHistoryMobile ? (
          <div className="max-h-56 overflow-y-auto border-b border-slate-200/70 bg-slate-50/60 lg:hidden">
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="text-xs font-semibold text-slate-500">Hội thoại gần đây</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={clearHistory}
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-40"
                  disabled={isLoading || isClearingHistory || conversations.length === 0}
                  aria-label="Xóa toàn bộ lịch sử chat"
                  title="Xóa toàn bộ lịch sử"
                >
                  <Trash2 size={13} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={startNewChat}
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700"
                >
                  <MessageSquarePlus size={12} aria-hidden />
                  Mới
                </button>
              </div>
            </div>
            {historyList}
          </div>
        ) : null}

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/60 to-white p-5 sm:p-6"
          aria-live="polite"
        >
          <div className="grid gap-4">
            {messages.map((message) => {
              const isUser = message.role === "user";
              const isStreamingEmpty = !isUser && !message.content && isLoading;
              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white shadow ${
                      isUser
                        ? "bg-[linear-gradient(135deg,#475569,#1e293b)]"
                        : "bg-[linear-gradient(135deg,#7c3aed,#c026d3)]"
                    }`}
                  >
                    {isUser ? <UserRound size={16} aria-hidden /> : <Bot size={16} aria-hidden />}
                  </span>
                  <div
                    className={
                      isUser
                        ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[linear-gradient(135deg,#7c3aed,#c026d3)] px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-[15px] leading-relaxed text-white shadow-[0_6px_16px_-6px_rgba(124,58,237,0.5)] break-words selection:bg-purple-900 selection:text-white"
                        : "max-w-[92%] overflow-x-auto rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-[15px] leading-relaxed text-slate-800 shadow-sm lg:max-w-[86%] break-words"
                    }
                  >
                    {isUser ? (
                      message.content
                    ) : isStreamingEmpty ? (
                      <span className="flex items-center gap-1.5 py-0.5">
                        <span className="h-2 w-2 animate-[pulseDot_1.2s_ease-in-out_infinite] rounded-full bg-violet-500" />
                        <span className="h-2 w-2 animate-[pulseDot_1.2s_ease-in-out_infinite_0.2s] rounded-full bg-fuchsia-500" />
                        <span className="h-2 w-2 animate-[pulseDot_1.2s_ease-in-out_infinite_0.4s] rounded-full bg-violet-500" />
                      </span>
                    ) : (
                      <MarkdownLite content={message.content} />
                    )}
                  </div>
                </div>
              );
            })}

            {showSuggestions ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-left text-xs font-semibold text-violet-700 transition-all hover:-translate-y-0.5 hover:bg-violet-100"
                  >
                    <Sparkles size={12} aria-hidden />
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            {error ? (
              <div className="mx-auto max-w-[85%] rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        {/* Composer */}
        <form className="flex gap-2 border-t border-slate-200/70 bg-white/90 p-3 sm:p-4 backdrop-blur shrink-0" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="field flex-1 min-w-0 text-[15px] sm:text-base"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ví dụ: Em thích Toán nhưng không thích code nhiều..."
            aria-label="Tin nhắn tư vấn"
          />
          <button
            className="btn btn-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed px-3.5 sm:px-4"
            type="submit"
            disabled={isLoading || !input.trim()}
          >
            <Send size={18} aria-hidden />
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </form>
      </section>
    </div>
  );
}
