import { NavLink, useNavigate } from "react-router-dom";

const navigation = [
  { name: "Dashboard", path: "/", icon: "◫" },
  { name: "AI Chat", path: "/chat", icon: "✧" },
  { name: "Documents", path: "/documents", icon: "▤" },
  { name: "Settings", path: "/settings", icon: "⚙" },
];

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();

  function handleLogout() {
    const confirmLogout = window.confirm("Are you sure you want to logout?");

    if (!confirmLogout) {
      return;
    }

    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("userEmail");
    onClose();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#111318] text-white transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold">
          R
        </div>

        <div className="min-w-0">
          <h1 className="text-lg font-semibold">AI-Chatbot</h1>
          <p className="text-xs text-gray-400">AI Knowledge Base</p>
        </div>

        <button
          type="button"
          aria-label="Close navigation menu"
          className="ml-auto rounded-lg p-2 text-xl leading-none text-gray-400 hover:bg-white/5 hover:text-white md:hidden"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-4 py-5">
        <NavLink
          to="/chat"
          onClick={onClose}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium transition hover:bg-blue-500"
        >
          <span className="text-lg">+</span>
          New Chat
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-4">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Workspace
        </p>

        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                isActive
                  ? "bg-blue-600/15 text-blue-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-semibold">
            S
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Shayan</p>
            <p className="text-xs text-gray-400">Free Plan</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg px-2 py-1 text-xs font-medium text-gray-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            Logout
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}

export default Sidebar;