import { useEffect, useRef, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const CHAT_HISTORY_KEY = "documind_chat_history";
const LEGACY_CHAT_STORAGE_KEY = "documind_chat_messages";

const SUGGESTED_QUESTIONS = [
  {
    title: "Summarize a document",
    description: "Get the main points from your uploaded documents.",
    question: "Summarize the uploaded document.",
    icon: "📝",
  },
  {
    title: "Find specific information",
    description: "Find facts, dates, numbers, and other details.",
    question: "What are the most important details in my document?",
    icon: "🔎",
  },
  {
    title: "Explain something",
    description: "Get a simple explanation of difficult information.",
    question: "Explain the important information in my document simply.",
    icon: "💡",
  },
  {
    title: "Ask about my transcript",
    description: "Find academic information in your transcript.",
    question: "What is my CGPA according to my transcript?",
    icon: "🎓",
  },
];

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function getStoredConversations() {
  try {
    const storedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    const parsedHistory = storedHistory
      ? JSON.parse(storedHistory)
      : [];

    if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
      return parsedHistory;
    }

    const legacyMessages = JSON.parse(
      localStorage.getItem(LEGACY_CHAT_STORAGE_KEY) || "[]"
    );

    if (Array.isArray(legacyMessages) && legacyMessages.length > 0) {
      return [
        {
          id: createId(),
          title: legacyMessages.find(
            (message) => message.role === "user"
          )?.content || "Previous conversation",
          messages: legacyMessages,
          updatedAt: Date.now(),
        },
      ];
    }

    return [];
  } catch (error) {
    console.error("Unable to load saved chat history:", error);
    return [];
  }
}

function Chat() {
  const [conversations, setConversations] = useState(
    getStoredConversations
  );
  const [currentChatId, setCurrentChatId] = useState(() => {
    const storedConversations = getStoredConversations();
    return storedConversations[0]?.id || null;
  });
  const [messages, setMessages] = useState(() => {
    const storedConversations = getStoredConversations();
    return storedConversations[0]?.messages || [];
  });
  const [input, setInput] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState("");

  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, sending]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error("Unable to save chat history:", error);
    }
  }, [conversations]);

  useEffect(() => {
    if (!currentChatId && conversations.length > 0) {
      setCurrentChatId(conversations[0].id);
      setMessages(conversations[0].messages);
    }
  }, [conversations, currentChatId]);

  useEffect(() => {
    if (!currentChatId) return;

    setConversations((previous) => {
      const currentConversation = previous.find(
        (conversation) => conversation.id === currentChatId
      );

      if (!currentConversation) {
        return previous;
      }

      return previous.map((conversation) =>
        conversation.id === currentChatId
          ? {
              ...conversation,
              messages,
              title:
                conversation.title === "New conversation" &&
                messages.find((message) => message.role === "user")
                  ? messages.find((message) => message.role === "user")
                      .content.slice(0, 60)
                  : conversation.title,
              updatedAt: Date.now(),
            }
          : conversation
      );
    });
  }, [messages, currentChatId]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // --------------------------------------------------
  // UPLOAD DOCUMENT
  // --------------------------------------------------

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];

    // Reset input so the same file can be selected again.
    event.target.value = "";

    if (!file) return;

    const allowedExtensions = [".pdf", ".txt", ".docx"];

    const extension = file.name
      .slice(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setUploadError(
        "Unsupported file format. Please select a PDF, TXT, or DOCX file."
      );
      setUploadStatus("");
      return;
    }

    if (file.size === 0) {
      setUploadError("The selected file is empty.");
      setUploadStatus("");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("The maximum allowed file size is 10 MB.");
      setUploadStatus("");
      return;
    }

    if (uploading) return;

    setUploading(true);
    setUploadError("");
    setUploadStatus(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();

      // This field name must match the backend's UploadFile parameter.
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE_URL}/api/documents/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.message ||
            `Upload failed with status ${response.status}.`
        );
      }

      const documentInfo = {
        id: result.document_id || createId(),
        filename: result.original_filename || file.name,
        pages: result.pages ?? 0,
        chunks: result.chunks ?? 0,
      };

      setUploadedDocuments((previous) => [
        ...previous.filter(
          (document) => document.id !== documentInfo.id
        ),
        documentInfo,
      ]);

      setUploadStatus(
        `Document "${documentInfo.filename}" is ready for questions.`
      );

      setUploadError("");
    } catch (error) {
      console.error("Document upload error:", error);

      setUploadStatus("");

      setUploadError(
        error.message ||
          "Could not upload the document. Make sure the backend is running."
      );
    } finally {
      setUploading(false);
    }
  };

  // --------------------------------------------------
  // SEND MESSAGE TO THE RAG BACKEND
  // --------------------------------------------------

  const handleSendMessage = async (event, suggestedQuestion) => {
    event?.preventDefault();

    const question = (
      typeof suggestedQuestion === "string"
        ? suggestedQuestion
        : input
    ).trim();

    if (!question || sending || uploading) return;

    const userMessage = {
      id: createId(),
      role: "user",
      content: question,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setSending(true);
    setChatError("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chat/document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            message: question,
          }),
          signal: controller.signal,
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.message ||
            `Chat request failed with status ${response.status}.`
        );
      }

      const assistantMessage = {
        id: createId(),
        role: "assistant",
        content:
          result.answer ||
          "I couldn't generate an answer for this question.",
        sources: Array.isArray(result.sources)
          ? result.sources
          : [],
        model: result.model || "Ollama",
        question,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      console.error("Chat request error:", error);

      setMessages((previous) => [
        ...previous,
        {
          id: createId(),
          role: "error",
          content:
            error.message ||
            "Something went wrong while contacting the backend.",
          retryQuestion: question,
        },
      ]);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      setSending(false);
    }
  };

  // --------------------------------------------------
  // RETRY FAILED QUESTION
  // --------------------------------------------------

  const handleRetry = (question) => {
    if (!question || sending) return;

    setMessages((previous) =>
      previous.filter(
        (message) =>
          !(
            message.role === "error" &&
            message.retryQuestion === question
          )
      )
    );

    handleSendMessage(null, question);
  };

  // --------------------------------------------------
  // COPY RESPONSE
  // --------------------------------------------------

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setChatError("");
    } catch {
      setChatError(
        "Could not copy the response. Check your browser permissions."
      );
    }
  };

  // --------------------------------------------------
  // START A NEW CHAT
  // --------------------------------------------------

  const handleNewChat = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    const newConversation = {
      id: createId(),
      title: "New conversation",
      messages: [],
      updatedAt: Date.now(),
    };

    setConversations((previous) => [
      newConversation,
      ...previous,
    ]);
    setCurrentChatId(newConversation.id);
    setMessages([]);
    setInput("");
    setSending(false);
    setChatError("");
    setUploadError("");
    setUploadStatus("");

    // Uploaded documents remain indexed in the backend.
    // Starting a new chat does not delete them.
  };

  // --------------------------------------------------
  // FORMAT SOURCE INFORMATION
  // --------------------------------------------------

  const formatSource = (source) => {
    if (!source) return "Uploaded document";

    const filename =
      source.filename ||
      source.original_filename ||
      "Uploaded document";

    const page =
      source.page !== undefined && source.page !== null
        ? ` · Page ${source.page}`
        : "";

    return `${filename}${page}`;
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="flex h-full min-h-[calc(100vh-2rem)] flex-col bg-[#0b0d12] text-white">
      {/* HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/15 text-xl">
            ✨
          </div>

          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              AI Chat
            </h1>

            <p className="text-xs text-gray-400">
              Ask questions about your documents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNewChat}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-200 transition hover:bg-white/10"
          >
            + New Chat
          </button>
        </div>
      </header>

      {/* CHAT CONTENT */}

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 md:px-8">
        {/* WELCOME SCREEN */}

        {!hasMessages && (
          <section className="my-auto py-8">
            <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-3xl shadow-lg shadow-violet-950/20">
              ✨
            </div>

            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Your documents.
                <span className="block text-violet-400">
                  Your answers.
                </span>
              </h2>

              <p className="mx-auto max-w-xl text-sm leading-7 text-gray-400 sm:text-base">
                Upload a document and ask questions in natural
                language. DocuMind AI retrieves relevant passages
                and uses them to help answer your questions.
              </p>
            </div>

            {/* SUGGESTED QUESTIONS */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((item) => (
                <button
                  type="button"
                  key={item.title}
                  onClick={() =>
                    setInput(item.question)
                  }
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-violet-400/30 hover:bg-violet-500/[0.06]"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xl">
                      {item.icon}
                    </span>

                    <span className="text-sm font-semibold text-gray-100">
                      {item.title}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-gray-400">
                    {item.description}
                  </p>

                  <p className="mt-3 text-xs text-violet-300 opacity-0 transition group-hover:opacity-100">
                    Use suggestion →
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* MESSAGE LIST */}

        {hasMessages && (
          <section className="flex-1 space-y-7 pb-8">
            {messages.map((message) => {
              if (message.role === "user") {
                return (
                  <div
                    key={message.id}
                    className="flex justify-end gap-3"
                  >
                    <div className="max-w-[85%] rounded-2xl rounded-br-md border border-violet-400/20 bg-violet-500/15 px-4 py-3 sm:max-w-[75%]">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-gray-100">
                        {message.content}
                      </p>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm">
                      You
                    </div>
                  </div>
                );
              }

              if (message.role === "error") {
                return (
                  <div
                    key={message.id}
                    className="flex gap-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-lg">
                      ⚠️
                    </div>

                    <div className="max-w-[85%] rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-4 sm:max-w-[75%]">
                      <p className="text-sm leading-6 text-red-300">
                        {message.content}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          handleRetry(message.retryQuestion)
                        }
                        disabled={sending}
                        className="mt-3 text-sm font-medium text-violet-300 hover:text-violet-200 disabled:opacity-50"
                      >
                        Try again ↻
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className="flex items-start gap-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-lg">
                    ✨
                  </div>

                  <div className="min-w-0 flex-1 pt-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-100">
                        DocuMind AI
                      </span>

                      <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-gray-400">
                        {message.model}
                      </span>
                    </div>

                    <div className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-300">
                      {message.content}
                    </div>

                    {/* SOURCES */}

                    {message.sources?.length > 0 && (
                      <div className="mt-5">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Sources
                        </h3>

                        <div className="space-y-2">
                          {message.sources.map(
                            (source, index) => (
                              <div
                                key={`${message.id}-source-${index}`}
                                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                              >
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="text-sm">
                                    📄
                                  </span>

                                  <span className="break-all text-xs font-medium text-violet-300">
                                    {formatSource(source)}
                                  </span>
                                </div>

                                {source.content && (
                                  <p className="whitespace-pre-wrap text-xs leading-6 text-gray-400">
                                    {source.content}
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* MESSAGE ACTIONS */}

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(message.content)
                        }
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition hover:bg-white/5 hover:text-white"
                      >
                        Copy response
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* LOADING INDICATOR */}

            {sending && (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
                  ✨
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" />

                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />

                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />

                    <span className="ml-2 text-xs text-gray-400">
                      Searching documents and generating an answer...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </section>
        )}

        {/* UPLOADED DOCUMENTS */}

        {uploadedDocuments.length > 0 && (
          <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-200">
                Uploaded in this session
              </h3>

              <span className="text-xs text-emerald-400">
                {uploadedDocuments.length}{" "}
                {uploadedDocuments.length === 1
                  ? "document"
                  : "documents"}
              </span>
            </div>

            <div className="space-y-3">
              {uploadedDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-lg">
                    📄
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-200">
                      {document.filename}
                    </p>

                    <p className="text-xs text-gray-500">
                      {document.pages} pages ·{" "}
                      {document.chunks} chunks
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-emerald-400">
                    Ready
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* UPLOAD STATUS */}

        {(uploadStatus || uploadError || chatError) && (
          <div className="mb-3 space-y-2">
            {uploadStatus && (
              <div
                role="status"
                className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-300"
              >
                {uploadStatus}
              </div>
            )}

            {uploadError && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300"
              >
                {uploadError}
              </div>
            )}

            {chatError && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300"
              >
                {chatError}
              </div>
            )}
          </div>
        )}

        {/* COMPOSER */}

        <section className="sticky bottom-0 z-10 mt-auto bg-[#0b0d12] pb-2 pt-3">
          <form
            onSubmit={(event) =>
              handleSendMessage(event)
            }
            className="rounded-2xl border border-white/10 bg-[#11141c] p-3 transition focus-within:border-violet-400/40"
          >
            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  handleSendMessage(event);
                }
              }}
              placeholder="Ask a question about your documents..."
              rows={2}
              maxLength={10000}
              disabled={sending || uploading}
              className="max-h-40 min-h-[56px] w-full resize-y bg-transparent px-2 py-2 text-sm leading-6 text-gray-100 outline-none placeholder:text-gray-500 disabled:opacity-50"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.docx"
                  disabled={uploading}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="document-upload"
                />

                <label
                  htmlFor="document-upload"
                  className={`inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs transition ${
                    uploading
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>📎</span>

                  <span>
                    {uploading
                      ? "Uploading..."
                      : "Attach document"}
                  </span>
                </label>

                <span className="text-[11px] text-gray-500">
                  PDF, TXT, DOCX · Max 10 MB
                </span>
              </div>

              <button
                type="submit"
                disabled={
                  !input.trim() || sending || uploading
                }
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>
                  {sending ? "Thinking..." : "Send"}
                </span>

                {!sending && <span>↑</span>}
              </button>
            </div>
          </form>

          <p className="mt-3 text-center text-[11px] leading-5 text-gray-500">
            DocuMind AI uses your indexed documents to answer questions.
            Verify important information against the original source.
          </p>
        </section>
      </main>
    </div>
  );
}

export default Chat;