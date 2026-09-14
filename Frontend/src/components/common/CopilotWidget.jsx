import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { copilotChat } from "../../services/aiService";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Derive a short page context slug from the current URL pathname */
function getContextHint(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  // Look for known page keywords in the path
  const keywords = [
    "pilot", "evaluation", "eligibility", "evidence",
    "decision", "contract", "payments", "audit",
    "application", "challenge", "dashboard", "report",
  ];
  for (const seg of [...segments].reverse()) {
    if (keywords.includes(seg)) return seg;
  }
  return segments[segments.length - 1] || "dashboard";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg">
        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-5">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 mb-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
            isUser
              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm"
          }`}
        >
          {msg.content}
        </div>

        {/* Suggestions chips */}
        {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1 max-w-full">
            {msg.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => msg.onSuggestionClick?.(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I am the SetuGov Copilot ✨\n\nI can help you with challenges, pilots, evaluations, startup eligibility, KPIs, procurement rules, and more.\n\nWhat would you like to know?",
  suggestions: [
    "How do I create a challenge?",
    "What is the SCALE / EXTEND / STOP decision?",
    "What documents does a startup need to submit?",
  ],
};

export default function CopilotWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const contextHint = getContextHint(location.pathname);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMessage(false);
  };

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || input).trim();
      if (!trimmed || loading) return;

      // Optimistic user message
      const userMsg = { id: Date.now(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      // Build history for context (exclude welcome message)
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));

      try {
        const res = await copilotChat(trimmed, contextHint, history);
        const data = res?.data || res;
        const assistantMsg = {
          id: Date.now() + 1,
          role: "assistant",
          content: data?.reply || "I could not generate a response. Please try again.",
          suggestions: data?.suggestions || [],
          onSuggestionClick: (s) => sendMessage(s),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (!isOpen) setHasNewMessage(true);
      } catch (err) {
        const errorMsg = {
          id: Date.now() + 1,
          role: "assistant",
          content:
            "I am having trouble connecting right now. Please check that all services are running and try again.",
          suggestions: [],
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, contextHint, isOpen]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{ ...WELCOME_MESSAGE, onSuggestionClick: undefined }]);
  };

  // Re-attach suggestion click handlers after clear
  const messagesWithHandlers = messages.map((m) =>
    m.role === "assistant" && m.suggestions?.length
      ? { ...m, onSuggestionClick: (s) => sendMessage(s) }
      : m
  );

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        id="copilot-trigger-btn"
        onClick={handleOpen}
        aria-label="Open SetuGov Copilot"
        className={`fixed bottom-6 right-6 z-50 group flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen ? "opacity-0 pointer-events-none scale-90" : "opacity-100 scale-100"
        } bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white`}
        style={{ boxShadow: "0 8px 32px rgba(99,102,241,0.45)" }}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-indigo-400 opacity-30 animate-ping pointer-events-none" />

        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
        <span className="font-semibold text-sm tracking-wide">Copilot</span>

        {/* Unread indicator */}
        {hasNewMessage && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
        )}
      </button>

      {/* ── Chat panel ── */}
      <div
        id="copilot-panel"
        className={`fixed bottom-6 right-6 z-50 flex flex-col transition-all duration-300 origin-bottom-right ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        }`}
        style={{
          width: "min(390px, calc(100vw - 24px))",
          height: "min(560px, calc(100vh - 80px))",
          borderRadius: "24px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(99,102,241,0.15)",
          background: "var(--copilot-bg, #fff)",
        }}
      >
        {/* Inner glass wrapper */}
        <div className="flex flex-col h-full rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/40 dark:border-slate-700/60">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">SetuGov Copilot</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-indigo-100 text-xs">
                  {user?.name ? `Hi, ${user.name.split(" ")[0]}` : "AI Assistant"}
                </p>
              </div>
            </div>

            {/* Clear + Close buttons */}
            <div className="flex items-center gap-1">
              <button
                id="copilot-clear-btn"
                onClick={clearChat}
                title="Clear chat"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                id="copilot-close-btn"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Context chip */}
          <div className="flex-shrink-0 px-4 pt-2 pb-1">
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {contextHint} page · {user?.role || "user"}
            </span>
          </div>

          {/* Messages */}
          <div
            id="copilot-messages"
            className="flex-1 overflow-y-auto px-4 py-3 space-y-0 scroll-smooth"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#c7d2fe transparent" }}
          >
            {messagesWithHandlers.map((msg) => (
              <Message key={msg.id} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-colors">
              <textarea
                ref={inputRef}
                id="copilot-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about SetuGov…"
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-none min-h-[20px] max-h-[100px] leading-relaxed disabled:opacity-60"
                style={{ fieldSizing: "content" }}
              />
              <button
                id="copilot-send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-lg hover:shadow-indigo-200 dark:hover:shadow-indigo-900/40"
              >
                <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                </svg>
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
