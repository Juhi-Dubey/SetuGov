import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../../context/AuthContext";

function AppLayout({ children, role = "government", hideSearch = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const effectiveRole = user?.role ? user.role.toLowerCase() : role;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        role={effectiveRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={effectiveRole} onMenuClick={() => setSidebarOpen(true)} hideSearch={hideSearch} />

        <main className="flex-1 pt-3.5 px-3.5 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6">
          <div className="mx-auto w-full max-w-[1536px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
