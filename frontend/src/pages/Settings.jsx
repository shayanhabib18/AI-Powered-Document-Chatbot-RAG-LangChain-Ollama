import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const STORAGE_KEY = "ragChatbotSettings";

const DEFAULT_SETTINGS = {
  // AI Model Settings
  provider: "Ollama",
  chatModel: "llama3.2",
  embeddingModel: "nomic-embed-text",
  responseLength: "Medium",

  // Chat Preferences
  streamResponses: false,
  showTimestamps: true,
  saveChatHistory: true,
  showSources: true,

  // Document Processing
  autoProcessDocuments: true,
  maxFileSize: "10",
  supportedFormats: ["PDF", "TXT", "DOCX"],

  // Appearance
  theme: "Dark",
  compactLayout: false,
};

const SETTINGS_SECTIONS = [
  {
    id: "ai-models",
    label: "AI Models",
    description: "Configure your language models",
    icon: "cpu",
  },
  {
    id: "chat",
    label: "Chat Preferences",
    description: "Personalize your conversations",
    icon: "chat",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Manage document processing",
    icon: "file",
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Customize the interface",
    icon: "appearance",
  },
  {
    id: "system",
    label: "System Information",
    description: "View application details",
    icon: "info",
  },
];

function SectionIcon({ name, className = "h-5 w-5" }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    viewBox: "0 0 24 24",
  };

  const paths = {
    cpu: (
      <>
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M9 9h6v6H9zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4" />
      </>
    ),

    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
      </>
    ),

    chat: (
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
    ),

    file: (
      <>
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M13 2v7h7M8 13h8m-8 4h8" />
      </>
    ),

    appearance: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 0 0 18z" />
      </>
    ),

    info: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4m0-4h.01" />
      </>
    ),

    check: <path d="m5 12 4 4L19 6" />,

    reset: <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />,

    upload: (
      <path d="M12 16V4m0 0L7 9m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    ),

    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.info}</svg>;
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? "bg-blue-600" : "bg-gray-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SettingRow({ title, description, children }) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-white/[0.06] py-5 last:border-b-0 sm:flex-row sm:items-center">
      <div className="max-w-lg">
        <h3 className="text-sm font-medium text-gray-200">
          {title}
        </h3>

        {description && (
          <p className="mt-1 text-xs leading-5 text-gray-500">
            {description}
          </p>
        )}
      </div>

      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  className = "",
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`min-w-0 rounded-xl border border-white/[0.09] bg-[#0B0D12] px-4 py-3 text-sm text-gray-200 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StatusBadge({ status }) {
  const isConnected = [
    "Connected",
    "Running",
    "Configured",
  ].includes(status);

  const isChecking = status === "Checking...";

  return (
    <span
      className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs ${
        isConnected
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : isChecking
            ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
            : "border-red-500/20 bg-red-500/10 text-red-400"
      }`}
    >
      {status}
    </span>
  );
}

function Settings() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("ai-models");

  const [settings, setSettings] = useState({
    ...DEFAULT_SETTINGS,
  });

  const [savedSettings, setSavedSettings] = useState({
    ...DEFAULT_SETTINGS,
  });

  const [notification, setNotification] = useState("");

  const [notificationType, setNotificationType] =
    useState("success");

  const [isDirty, setIsDirty] = useState(false);

  const [checkingStatus, setCheckingStatus] = useState(false);

  const [systemStatus, setSystemStatus] = useState({
    backend: "Checking...",
    ollama: "Checking...",
    chatModel: "llama3.2",
    embeddingModel: "nomic-embed-text",
    apiUrl: API_BASE_URL,
    lastChecked: null,
  });

  // Load saved preferences from localStorage.
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);

      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        const supportedSettings = { ...parsedSettings };

        delete supportedSettings.temperature;
        delete supportedSettings.chunkSize;
        delete supportedSettings.chunkOverlap;
        delete supportedSettings.retrievalCount;
        delete supportedSettings.similarityThreshold;

        const restoredSettings = {
          ...DEFAULT_SETTINGS,
          ...supportedSettings,
        };

        // Prevent an old or malformed preference from removing formats.
        restoredSettings.supportedFormats = Array.isArray(
          parsedSettings.supportedFormats
        )
          ? supportedSettings.supportedFormats
          : [...DEFAULT_SETTINGS.supportedFormats];

        setSettings(restoredSettings);
        setSavedSettings(restoredSettings);
      }
    } catch (error) {
      console.error("Unable to load settings:", error);
    }
  }, []);

  // Check the real backend and Ollama status.
  async function checkSystemStatus() {
    setCheckingStatus(true);

    const results = {
      backend: "Disconnected",
      ollama: "Unavailable",
      chatModel: settings.chatModel || "llama3.2",
      embeddingModel:
        settings.embeddingModel || "nomic-embed-text",
      apiUrl: API_BASE_URL,
      lastChecked: new Date().toISOString(),
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/health`
      );

      if (response.ok) {
        results.backend = "Connected";

        const healthData = await response.json();

        if (healthData.model) {
          results.chatModel = healthData.model;
        }
      }
    } catch (error) {
      console.error("Backend health check failed:", error);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ollama/status`
      );

      if (response.ok) {
        const data = await response.json();

        const reportedStatus =
          data.status ?? data.available ?? data.connected;

        // Support common API status response formats.
        if (
          reportedStatus === true ||
          ["connected", "available", "running", "ok"].includes(
            String(reportedStatus).toLowerCase()
          )
        ) {
          results.ollama = "Connected";
        } else {
          results.ollama = "Unavailable";
        }

        if (data.model) {
          results.chatModel = data.model;
        }

        if (data.embedding_model) {
          results.embeddingModel = data.embedding_model;
        }
      }
    } catch (error) {
      console.error("Ollama status check failed:", error);
    }

    setSystemStatus(results);
    setCheckingStatus(false);
  }

  useEffect(() => {
    checkSystemStatus();

    // The status check should run when this page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Display notifications.
  function showNotification(message, type = "success") {
    setNotification(message);
    setNotificationType(type);
  }

  // Clear the notification when dismissed.
  function dismissNotification() {
    setNotification("");
  }

  // Update an individual preference.
  function updateSetting(key, value) {
    setSettings((previous) => {
      const nextSettings = {
        ...previous,
        [key]: value,
      };

      if (key === "theme" || key === "compactLayout") {
        window.dispatchEvent(
          new CustomEvent("rag-settings-updated", {
            detail: {
              theme: nextSettings.theme,
              compactLayout: nextSettings.compactLayout,
            },
          })
        );
      }

      return nextSettings;
    });

    setIsDirty(true);
    setNotification("");
  }

  // Logout.
  function handleLogout() {
    const confirmLogout = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmLogout) return;

    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("userEmail");

    navigate("/login", { replace: true });
  }

  // Validate and save preferences.
  function saveSettings() {
    try {
      const supportedSettings = { ...settings };

      delete supportedSettings.temperature;
      delete supportedSettings.chunkSize;
      delete supportedSettings.chunkOverlap;
      delete supportedSettings.retrievalCount;
      delete supportedSettings.similarityThreshold;

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(supportedSettings)
      );
      window.dispatchEvent(
        new CustomEvent("rag-settings-updated", {
          detail: {
            theme: settings.theme,
            compactLayout: settings.compactLayout,
          },
        })
      );

      setSavedSettings({ ...settings });
      setIsDirty(false);

      showNotification(
        "Settings saved successfully in this browser."
      );
    } catch (error) {
      console.error("Unable to save settings:", error);

      showNotification(
        "Unable to save settings in this browser.",
        "error"
      );
    }
  }

  // Restore default values without saving.
  function resetSettings() {
    setSettings({ ...DEFAULT_SETTINGS });
    window.dispatchEvent(
      new CustomEvent("rag-settings-updated", {
        detail: {
          theme: DEFAULT_SETTINGS.theme,
          compactLayout: DEFAULT_SETTINGS.compactLayout,
        },
      })
    );
    setIsDirty(true);
    setNotification("");
  }

  // Discard unsaved changes.
  function restoreSavedSettings() {
    setSettings({ ...savedSettings });
    window.dispatchEvent(
      new CustomEvent("rag-settings-updated", {
        detail: {
          theme: savedSettings.theme,
          compactLayout: savedSettings.compactLayout,
        },
      })
    );
    setIsDirty(false);
    setNotification("");
  }

  // Reset all preferences.
  function resetAllSettings() {
    const confirmed = window.confirm(
      "Reset all saved settings to their default values?"
    );

    if (!confirmed) return;

    try {
      localStorage.removeItem(STORAGE_KEY);

      setSettings({ ...DEFAULT_SETTINGS });
      setSavedSettings({ ...DEFAULT_SETTINGS });
      setIsDirty(false);
      window.dispatchEvent(
        new CustomEvent("rag-settings-updated", {
          detail: {
            theme: DEFAULT_SETTINGS.theme,
            compactLayout: DEFAULT_SETTINGS.compactLayout,
          },
        })
      );

      showNotification("All settings have been reset.");
    } catch (error) {
      console.error("Unable to reset settings:", error);

      showNotification(
        "Unable to reset settings.",
        "error"
      );
    }
  }

  const activeItem = SETTINGS_SECTIONS.find(
    (section) => section.id === activeSection
  );

  return (
    <div className="min-h-screen bg-[#0B0D12] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Preferences
              </div>

              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Settings
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Customize your AI assistant, configure document
                retrieval, and manage your application preferences.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 text-sm font-medium text-red-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            >
              <SectionIcon name="logout" className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Notification */}
        {notification && (
          <div
            role="status"
            className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 ${
              notificationType === "error"
                ? "border-red-500/20 bg-red-500/[0.07]"
                : "border-blue-500/20 bg-blue-500/[0.07]"
            }`}
          >
            <SectionIcon
              name={
                notificationType === "error" ? "info" : "check"
              }
              className={`h-5 w-5 shrink-0 ${
                notificationType === "error"
                  ? "text-red-400"
                  : "text-blue-400"
              }`}
            />

            <p className="flex-1 text-sm text-gray-200">
              {notification}
            </p>

            <button
              type="button"
              onClick={dismissNotification}
              className="text-gray-500 hover:text-white"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="rounded-2xl border border-white/[0.07] bg-[#111318] p-3">
            <p className="px-3 pb-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              Settings Menu
            </p>

            <nav className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {SETTINGS_SECTIONS.map((section) => {
                const isActive =
                  activeSection === section.id;

                return (
                  <button
                    type="button"
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                      isActive
                        ? "border border-blue-500/20 bg-blue-500/10 text-blue-400"
                        : "border border-transparent text-gray-400 hover:bg-white/[0.04] hover:text-gray-200"
                    }`}
                  >
                    <SectionIcon
                      name={section.icon}
                      className="h-5 w-5 shrink-0"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {section.label}
                      </span>

                      <span
                        className={`mt-1 block text-[11px] leading-4 ${
                          isActive
                            ? "text-blue-400/70"
                            : "text-gray-500"
                        }`}
                      >
                        {section.description}
                      </span>
                    </span>

                    {isActive && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Configuration notice */}
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />

                <span className="text-xs font-medium text-gray-300">
                  Local Preferences
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Preferences are stored in this browser. Runtime
                settings require backend integration to take effect.
              </p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111318]">
            {/* Section Header */}
            <div className="border-b border-white/[0.07] px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                  <SectionIcon name={activeItem.icon} />
                </div>

                <div>
                  <h2 className="text-lg font-semibold">
                    {activeItem.label}
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    {activeItem.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-2 sm:px-7">
              {/* AI MODELS */}
              {activeSection === "ai-models" && (
                <div>
                  <div className="py-5">
                    <h3 className="text-sm font-semibold text-gray-200">
                      Model Configuration
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Your current project uses Ollama, LangChain,
                      and local document embeddings.
                    </p>
                  </div>

                  <SettingRow
                    title="AI Provider"
                    description="Provider configured for your local AI runtime."
                  >
                    <SelectField
                      label="AI Provider"
                      value={settings.provider}
                      onChange={(value) =>
                        updateSetting("provider", value)
                      }
                      options={[
                        {
                          label: "Ollama (Local)",
                          value: "Ollama",
                        },
                      ]}
                      className="w-full sm:w-56"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Chat Model"
                    description="Select a model preference. The backend must be updated before this changes the actual running model."
                  >
                    <SelectField
                      label="Chat Model"
                      value={settings.chatModel}
                      onChange={(value) =>
                        updateSetting("chatModel", value)
                      }
                      options={[
                        {
                          label: "Llama 3.2",
                          value: "llama3.2",
                        },
                        {
                          label: "Llama 3.2 · 3B",
                          value: "llama3.2:3b",
                        },
                        {
                          label: "Llama 3.1 · 8B",
                          value: "llama3.1:8b",
                        },
                        {
                          label: "Mistral · 7B",
                          value: "mistral:7b",
                        },
                        {
                          label: "Gemma 2 · 2B",
                          value: "gemma2:2b",
                        },
                      ]}
                      className="w-full sm:w-56"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Embedding Model"
                    description="Used to convert document content into vectors."
                  >
                    <SelectField
                      label="Embedding Model"
                      value={settings.embeddingModel}
                      onChange={(value) =>
                        updateSetting("embeddingModel", value)
                      }
                      options={[
                        {
                          label: "Nomic Embed Text",
                          value: "nomic-embed-text",
                        },
                        {
                          label: "All-MiniLM",
                          value: "all-minilm",
                        },
                      ]}
                      className="w-full sm:w-56"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Response Length"
                    description="Preferred response length for future backend integration."
                  >
                    <SelectField
                      label="Response Length"
                      value={settings.responseLength}
                      onChange={(value) =>
                        updateSetting("responseLength", value)
                      }
                      options={[
                        { label: "Short", value: "Short" },
                        { label: "Medium", value: "Medium" },
                        { label: "Long", value: "Long" },
                      ]}
                      className="w-full sm:w-56"
                    />
                  </SettingRow>
                </div>
              )}

              {/* CHAT PREFERENCES */}
              {activeSection === "chat" && (
                <div>
                  <div className="py-5">
                    <h3 className="text-sm font-semibold text-gray-200">
                      Conversation Preferences
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Personalize chat behavior and display options.
                    </p>
                  </div>

                  <SettingRow
                    title="Stream Responses"
                    description="Stream generated answers incrementally when supported by the backend."
                  >
                    <Toggle
                      label="Stream Responses"
                      checked={settings.streamResponses}
                      onChange={(value) =>
                        updateSetting("streamResponses", value)
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Show Timestamps"
                    description="Display the time each message was sent."
                  >
                    <Toggle
                      label="Show Timestamps"
                      checked={settings.showTimestamps}
                      onChange={(value) =>
                        updateSetting("showTimestamps", value)
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Save Chat History"
                    description="Preference for retaining previous conversations."
                  >
                    <Toggle
                      label="Save Chat History"
                      checked={settings.saveChatHistory}
                      onChange={(value) =>
                        updateSetting("saveChatHistory", value)
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Show Sources and Citations"
                    description="Display document references when returned by the backend."
                  >
                    <Toggle
                      label="Show Sources and Citations"
                      checked={settings.showSources}
                      onChange={(value) =>
                        updateSetting("showSources", value)
                      }
                    />
                  </SettingRow>

                  <div className="my-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <h4 className="text-sm font-medium text-gray-300">
                      Chat History
                    </h4>

                    <p className="mt-2 text-xs leading-6 text-gray-500">
                      These settings store preferences only.
                      Persistent conversations require a history
                      database and backend endpoints.
                    </p>
                  </div>
                </div>
              )}

              {/* DOCUMENT SETTINGS */}
              {activeSection === "documents" && (
                <div>
                  <div className="py-5">
                    <h3 className="text-sm font-semibold text-gray-200">
                      Document Processing
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Configure your upload preferences.
                    </p>
                  </div>

                  <SettingRow
                    title="Automatic Processing"
                    description="Process uploaded documents automatically when supported by the upload workflow."
                  >
                    <Toggle
                      label="Automatic Document Processing"
                      checked={settings.autoProcessDocuments}
                      onChange={(value) =>
                        updateSetting("autoProcessDocuments", value)
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Maximum File Size"
                    description="Preferred maximum file size. The backend must enforce this limit."
                  >
                    <SelectField
                      label="Maximum File Size"
                      value={settings.maxFileSize}
                      onChange={(value) =>
                        updateSetting("maxFileSize", value)
                      }
                      options={[
                        { label: "2 MB", value: "2" },
                        { label: "5 MB", value: "5" },
                        { label: "10 MB", value: "10" },
                        { label: "20 MB", value: "20" },
                        { label: "50 MB", value: "50" },
                      ]}
                      className="w-full sm:w-40"
                    />
                  </SettingRow>

                  <div className="border-b border-white/[0.06] py-5">
                    <h3 className="text-sm font-medium text-gray-200">
                      Supported Formats
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Formats currently supported by your upload API.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {DEFAULT_SETTINGS.supportedFormats.map(
                        (format) => (
                          <span
                            key={format}
                            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300"
                          >
                            .{format.toLowerCase()}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="my-5 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                    <div className="flex items-start gap-3">
                      <SectionIcon
                        name="info"
                        className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
                      />

                      <div>
                        <h4 className="text-sm font-medium text-amber-300">
                          Upload Validation
                        </h4>

                        <p className="mt-1 text-xs leading-6 text-gray-400">
                          Your current backend supports PDF, TXT,
                          and DOCX files with a 10 MB limit. Changing
                          the preference here does not automatically
                          change the backend validation rules.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* APPEARANCE */}
              {activeSection === "appearance" && (
                <div>
                  <div className="py-5">
                    <h3 className="text-sm font-semibold text-gray-200">
                      Appearance Preferences
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Choose your preferred interface appearance.
                    </p>
                  </div>

                  <div className="border-b border-white/[0.06] py-5">
                    <h3 className="text-sm font-medium text-gray-200">
                      Color Theme
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Choose a theme preference.
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        {
                          value: "Dark",
                          label: "Dark",
                          description: "Easy on the eyes",
                          background: "bg-[#0B0D12]",
                          panel: "bg-[#171A23]",
                          border: "border-blue-500",
                        },
                        {
                          value: "Light",
                          label: "Light",
                          description: "Bright and clean",
                          background: "bg-gray-100",
                          panel: "bg-white",
                          border: "border-gray-300",
                        },
                        {
                          value: "System",
                          label: "System",
                          description: "Follow device settings",
                          background:
                            "bg-gradient-to-r from-[#0B0D12] to-gray-100",
                          panel:
                            "bg-gradient-to-r from-[#171A23] to-white",
                          border: "border-gray-500",
                        },
                      ].map((theme) => {
                        const selected =
                          settings.theme === theme.value;

                        return (
                          <button
                            type="button"
                            key={theme.value}
                            onClick={() =>
                              updateSetting("theme", theme.value)
                            }
                            className={`rounded-xl border p-3 text-left transition ${
                              selected
                                ? "border-blue-500/60 bg-blue-500/[0.05]"
                                : "border-white/[0.08] hover:border-white/[0.16]"
                            }`}
                          >
                            <div
                              className={`h-20 overflow-hidden rounded-lg border ${theme.border} ${theme.background} p-2`}
                            >
                              <div
                                className={`h-3 w-1/2 rounded ${theme.panel}`}
                              />

                              <div className="mt-2 flex gap-2">
                                <div
                                  className={`h-10 w-1/4 rounded ${theme.panel}`}
                                />

                                <div className="flex-1 space-y-2">
                                  <div
                                    className={`h-3 w-full rounded ${theme.panel}`}
                                  />

                                  <div
                                    className={`h-3 w-2/3 rounded ${theme.panel}`}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-200">
                                {theme.label}
                              </span>

                              {selected && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                                  <SectionIcon
                                    name="check"
                                    className="h-3 w-3"
                                  />
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-gray-500">
                              {theme.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <SettingRow
                    title="Compact Layout"
                    description="Prefer denser spacing throughout the application."
                  >
                    <Toggle
                      label="Compact Layout"
                      checked={settings.compactLayout}
                      onChange={(value) =>
                        updateSetting("compactLayout", value)
                      }
                    />
                  </SettingRow>

                  <div className="my-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-xs leading-6 text-gray-500">
                      Theme and layout preferences are saved locally.
                      The entire application must read these values
                      to apply them globally.
                    </p>
                  </div>
                </div>
              )}

              {/* SYSTEM INFORMATION */}
              {activeSection === "system" && (
                <div>
                  <div className="py-5">
                    <h3 className="text-sm font-semibold text-gray-200">
                      System Information
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Check your backend and review your actual project
                      technologies.
                    </p>
                  </div>

                  {/* Service Health */}
                  <div className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-200">
                        Service Health
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Check FastAPI and Ollama availability.
                      </p>

                      {systemStatus.lastChecked && (
                        <p className="mt-2 text-xs text-gray-600">
                          Last checked:{" "}
                          {new Date(
                            systemStatus.lastChecked
                          ).toLocaleTimeString()}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={checkSystemStatus}
                      disabled={checkingStatus}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-400 transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg
                        className={`h-4 w-4 ${
                          checkingStatus ? "animate-spin" : ""
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20 7v5h-5M4 17v-5h5"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2"
                        />
                      </svg>

                      {checkingStatus
                        ? "Checking..."
                        : "Refresh Status"}
                    </button>
                  </div>

                  {/* System Cards */}
                  <div className="space-y-3 py-2">
                    {[
                      {
                        label: "FastAPI Backend",
                        value: systemStatus.apiUrl,
                        status: systemStatus.backend,
                      },
                      {
                        label: "Ollama Runtime",
                        value: "Local AI model service",
                        status: systemStatus.ollama,
                      },
                      {
                        label: "Chat Model",
                        value: systemStatus.chatModel,
                        status: systemStatus.ollama,
                      },
                      {
                        label: "Embedding Model",
                        value: systemStatus.embeddingModel,
                        status: systemStatus.ollama,
                      },
                      {
                        label: "Frontend",
                        value: "React + Tailwind CSS",
                        status: "Running",
                      },
                      {
                        label: "RAG Framework",
                        value: "LangChain",
                        status: "Configured",
                      },
                      {
                        label: "Vector Database",
                        value: "ChromaDB",
                        status: "Configured",
                      },
                      {
                        label: "Document Formats",
                        value: "PDF, TXT, DOCX",
                        status: "Configured",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">
                            {item.label}
                          </p>

                          <p className="mt-1 break-words text-sm font-medium text-gray-200">
                            {item.value}
                          </p>
                        </div>

                        <StatusBadge status={item.status} />
                      </div>
                    ))}
                  </div>

                  {/* Project Configuration */}
                  <div className="my-5 rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-4">
                    <h4 className="text-sm font-medium text-blue-300">
                      DocuMind AI Configuration
                    </h4>

                    <div className="mt-3 space-y-2 text-xs leading-5 text-gray-400">
                      <p>
                        <span className="text-gray-300">
                          Frontend:
                        </span>{" "}
                        React, React Router, Tailwind CSS
                      </p>

                      <p>
                        <span className="text-gray-300">
                          Backend:
                        </span>{" "}
                        Python + FastAPI
                      </p>

                      <p>
                        <span className="text-gray-300">
                          Language model:
                        </span>{" "}
                        Ollama + llama3.2
                      </p>

                      <p>
                        <span className="text-gray-300">
                          Embeddings:
                        </span>{" "}
                        nomic-embed-text
                      </p>

                      <p>
                        <span className="text-gray-300">
                          Retrieval:
                        </span>{" "}
                        LangChain + ChromaDB
                      </p>

                      <p>
                        <span className="text-gray-300">
                          API endpoint:
                        </span>{" "}
                        {API_BASE_URL}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetAllSettings}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                  >
                    <SectionIcon
                      name="reset"
                      className="h-4 w-4"
                    />
                    Reset All Settings
                  </button>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {activeSection !== "system" && (
              <div className="flex flex-col justify-between gap-3 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
                <p className="text-xs text-gray-500">
                  {isDirty
                    ? "You have unsaved changes."
                    : "Your current settings are saved locally."}
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetSettings}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/[0.05]"
                  >
                    <SectionIcon
                      name="reset"
                      className="h-4 w-4"
                    />
                    Reset Defaults
                  </button>

                  {isDirty && (
                    <button
                      type="button"
                      onClick={restoreSavedSettings}
                      className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/[0.05]"
                    >
                      Discard
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={saveSettings}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  >
                    <SectionIcon
                      name="check"
                      className="h-4 w-4"
                    />
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Footer Note */}
        <footer className="mt-6 flex items-start gap-2 px-1 text-xs leading-5 text-gray-500">
          <SectionIcon
            name="info"
            className="mt-0.5 h-4 w-4 shrink-0"
          />

          <p>
            Preferences are stored locally. AI model selection,
            retrieval settings, document limits, chat persistence,
            and appearance changes require integration with the
            relevant backend services or shared application layout.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default Settings;