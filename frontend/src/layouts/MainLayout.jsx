import { useState } from "react";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const STORAGE_KEY = "ragChatbotSettings";

function getAppearanceSettings() {
  try {
    const savedSettings = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    );

    return {
      theme: savedSettings.theme || "Dark",
      compactLayout: Boolean(savedSettings.compactLayout),
    };
  } catch {
    return {
      theme: "Dark",
      compactLayout: false,
    };
  }
}

function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [appearance, setAppearance] = useState(getAppearanceSettings);

  useEffect(() => {
    function updateAppearance(event) {
      setAppearance((current) => ({
        ...current,
        ...(event.detail || {}),
      }));
    }

    window.addEventListener("rag-settings-updated", updateAppearance);
    window.addEventListener("storage", updateAppearance);

    return () => {
      window.removeEventListener("rag-settings-updated", updateAppearance);
      window.removeEventListener("storage", updateAppearance);
    };
  }, []);

  const resolvedTheme =
    appearance.theme === "System"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "Light"
        : "Dark"
      : appearance.theme;

  return (
    <div
      data-theme={resolvedTheme.toLowerCase()}
      data-compact={appearance.compactLayout}
      className="app-shell flex h-screen overflow-hidden bg-[#0B0D12] text-white"
    >
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="flex h-16 items-center border-b border-white/10 px-4 md:hidden">
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={isSidebarOpen}
            className="rounded-lg p-2 text-2xl leading-none text-gray-300 hover:bg-white/5 hover:text-white"
            onClick={() => setIsSidebarOpen(true)}
          >
            ☰
          </button>
          <span className="ml-3 text-sm font-semibold text-gray-300">
            RAG Assistant
          </span>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;