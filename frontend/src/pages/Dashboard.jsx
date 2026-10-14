import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const initialStats = [
  {
    label: "Total Documents",
    value: "—",
    icon: "▤",
    color: "bg-blue-500/10 text-blue-400",
    description: "Documents in your library",
  },
  {
    label: "Total Conversations",
    value: "—",
    icon: "✧",
    color: "bg-purple-500/10 text-purple-400",
    description: "Conversation history",
  },
  {
    label: "Questions Answered",
    value: "—",
    icon: "✓",
    color: "bg-emerald-500/10 text-emerald-400",
    description: "Questions answered by AI",
  },
];

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [ollamaStatus, setOllamaStatus] = useState("checking");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      // Check backend and Ollama independently.
      const healthPromise = fetch(`${API_BASE_URL}/api/health`)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Backend health check failed.");
          }

          return response.json();
        })
        .then((data) => {
          if (isMounted) {
            setBackendStatus(
              data.status === "healthy" ? "connected" : "disconnected"
            );
          }
        })
        .catch(() => {
          if (isMounted) {
            setBackendStatus("disconnected");
          }
        });

      const ollamaPromise = fetch(`${API_BASE_URL}/api/ollama/status`)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Ollama status check failed.");
          }

          return response.json();
        })
        .then((data) => {
          if (isMounted) {
            setOllamaStatus(
              data.status === "connected" ? "connected" : "disconnected"
            );
          }
        })
        .catch(() => {
          if (isMounted) {
            setOllamaStatus("disconnected");
          }
        });

      // Requires GET /api/documents in the backend.
      const documentsPromise = fetch(`${API_BASE_URL}/api/documents`)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(
              "The document listing endpoint is not available."
            );
          }

          return response.json();
        })
        .then((data) => {
          if (!isMounted) return;

          const documentList = Array.isArray(data)
            ? data
            : Array.isArray(data.documents)
              ? data.documents
              : [];

          setDocuments(documentList);
        })
        .catch((err) => {
          if (!isMounted) return;

          setDocuments([]);
          setError(err.message);
        });

      await Promise.allSettled([
        healthPromise,
        ollamaPromise,
        documentsPromise,
      ]);

      if (isMounted) {
        setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = [
    {
      ...initialStats[0],
      value: loading ? "..." : error ? "—" : documents.length.toString(),
    },
    {
      ...initialStats[1],
      value: "—",
      description: "History tracking not configured",
    },
    {
      ...initialStats[2],
      value: "—",
      description: "Usage tracking not configured",
    },
  ];

  function formatDate(dateValue) {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="mx-auto max-w-7xl p-6 text-white md:p-10">
      {/* Header */}
      <header className="mb-10">
        <p className="mb-2 text-sm font-medium text-blue-400">
          YOUR WORKSPACE
        </p>

        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Welcome back, Shayan!
        </h1>

        <p className="mt-3 text-gray-400">
          Manage your knowledge base and continue learning with AI.
        </p>
      </header>

      {/* Service Status */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111318] p-5">
          <div>
            <p className="text-sm text-gray-400">FastAPI Backend</p>

            <p className="mt-2 font-semibold">
              {backendStatus === "checking"
                ? "Checking connection..."
                : backendStatus === "connected"
                  ? "Connected"
                  : "Disconnected"}
            </p>
          </div>

          <span
            className={`h-3 w-3 rounded-full ${
              backendStatus === "connected"
                ? "bg-emerald-400"
                : backendStatus === "disconnected"
                  ? "bg-red-400"
                  : "bg-yellow-400"
            }`}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111318] p-5">
          <div>
            <p className="text-sm text-gray-400">Ollama AI Model</p>

            <p className="mt-2 font-semibold">
              {ollamaStatus === "checking"
                ? "Checking connection..."
                : ollamaStatus === "connected"
                  ? "Llama 3.2 Connected"
                  : "Unavailable"}
            </p>
          </div>

          <span
            className={`h-3 w-3 rounded-full ${
              ollamaStatus === "connected"
                ? "bg-emerald-400"
                : ollamaStatus === "disconnected"
                  ? "bg-red-400"
                  : "bg-yellow-400"
            }`}
          />
        </div>
      </section>

      {/* Quick Action */}
      <section className="mb-10 rounded-2xl border border-white/10 bg-gradient-to-r from-blue-600/15 to-purple-600/10 p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">
              Chat with your AI assistant
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
              Ask general questions, learn programming concepts, or explore
              information in your uploaded documents.
            </p>
          </div>

          <Link
            to="/chat"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
          >
            Start a conversation
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Statistics */}
      <section className="mb-10">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Workspace overview</h2>

          <p className="mt-1 text-sm text-gray-400">
            Information from your application.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-[#111318] p-6 transition hover:border-white/20"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">{stat.label}</p>

                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${stat.color}`}
                >
                  {stat.icon}
                </span>
              </div>

              <p className="mt-5 text-3xl font-bold">{stat.value}</p>

              <p className="mt-2 text-xs text-gray-500">
                {stat.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Documents */}
      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Your documents</h2>

            <p className="mt-1 text-sm text-gray-400">
              View the documents available in your knowledge base.
            </p>
          </div>

          <Link
            to="/documents"
            className="shrink-0 text-sm font-medium text-blue-400 transition hover:text-blue-300"
          >
            View library →
          </Link>
        </div>

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-[#111318] p-8 text-center text-sm text-gray-400">
            Loading dashboard data...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
            <p className="font-medium text-amber-300">
              Document library is not connected yet.
            </p>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              {error} Your backend currently needs a GET /api/documents
              endpoint to return the uploaded document list.
            </p>

            <Link
              to="/documents"
              className="mt-4 inline-flex text-sm font-medium text-blue-400 hover:text-blue-300"
            >
              Open Documents →
            </Link>
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#111318] p-8 text-center">
            <div className="text-3xl">▤</div>

            <h3 className="mt-3 font-semibold">
              No documents found
            </h3>

            <p className="mt-2 text-sm text-gray-400">
              Upload a document to start building your knowledge base.
            </p>

            <Link
              to="/documents"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-500"
            >
              Upload a document
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.slice(0, 5).map((document, index) => {
              const filename =
                document.original_filename ||
                document.filename ||
                "Untitled document";

              return (
                <article
                  key={document.document_id || document.id || filename + index}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#111318] p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-lg text-blue-400">
                      ▤
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-medium">
                        {filename}
                      </h3>

                      <p className="mt-1 text-sm text-gray-400">
                        {document.pages != null
                          ? `${document.pages} pages`
                          : "Document"}{" "}
                        {document.chunks != null
                          ? `· ${document.chunks} chunks`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-xs text-gray-500">
                    {formatDate(
                      document.uploaded_at || document.created_at
                    )}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Refresh Information */}
      <div className="mt-8 border-t border-white/10 pt-5 text-xs text-gray-500">
        Dashboard data is refreshed when this page loads. Conversation and
        question statistics will become available after usage tracking is added
        to the backend.
      </div>
    </div>
  );
}

export default Dashboard;