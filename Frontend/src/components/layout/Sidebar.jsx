import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Rocket,
  ClipboardCheck,
  FlaskConical,
  CreditCard,
  BarChart3,
  FileStack,
  Settings,
  Users,
  ShieldCheck,
  X,
  Building2,
  UserCheck,
  UserPlus,
} from "lucide-react";

const navigation = {
  government: [
    {
      label: "Dashboard",
      path: "/government/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Challenges",
      path: "/government/challenges",
      icon: FileText,
    },
    {
      label: "Evaluators",
      path: "/government/evaluators",
      icon: UserCheck,
    },
    {
      label: "Pilots",
      path: "/government/pilots",
      icon: FlaskConical,
    },
    {
      label: "Payments",
      path: "/government/payments",
      icon: CreditCard,
    },
    {
      label: "Audit Logs",
      path: "/government/audit",
      icon: ShieldCheck,
    },
    {
      label: "Reports",
      path: "/government/reports",
      icon: BarChart3,
    },
  ],

  startup: [
    {
      label: "Dashboard",
      path: "/startup/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Challenges",
      path: "/startup/challenges",
      icon: FileText,
    },
    {
      label: "My Applications",
      path: "/startup/applications",
      icon: ClipboardCheck,
    },
    {
      label: "Pilots",
      path: "/startup/pilots",
      icon: FlaskConical,
    },
    {
      label: "Payments",
      path: "/startup/payments",
      icon: CreditCard,
    },
    {
      label: "Profile",
      path: "/startup/profile",
      icon: Users,
    },
    {
      label: "Documents",
      path: "/startup/documents",
      icon: FileStack,
    },
  ],

  evaluator: [
    {
      section: "WORKSPACE",
      label: "Dashboard",
      path: "/evaluator/dashboard",
      icon: LayoutDashboard,
    },
    {
      section: "WORKSPACE",
      label: "Challenges",
      path: "/evaluator/challenges",
      icon: FileText,
    },
    {
      section: "WORKSPACE",
      label: "My Applications",
      path: "/evaluator/my-applications",
      icon: ClipboardCheck,
    },
    {
      section: "WORKSPACE",
      label: "Proposal Evaluation",
      path: "/evaluator/evaluations",
      icon: UserCheck,
    },
    {
      section: "WORKSPACE",
      label: "Pilot Evaluation",
      path: "/evaluator/pilot-evaluations",
      icon: FlaskConical,
    },
    {
      section: "WORKSPACE",
      label: "Payments",
      path: "/evaluator/payments",
      icon: CreditCard,
    },
    {
      section: "ACCOUNT",
      label: "Profile / Settings",
      path: "/evaluator/my-page",
      icon: Settings,
    },
  ],

  admin: [
    {
      section: "WORKSPACE",
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      section: "WORKSPACE",
      label: "Join Requests",
      path: "/admin/access-requests",
      icon: UserPlus,
    },
    {
      section: "WORKSPACE",
      label: "Startups",
      path: "/admin/startups",
      icon: Rocket,
    },
    {
      section: "WORKSPACE",
      label: "Government Users",
      path: "/admin/users",
      icon: Users,
    },
    {
      section: "WORKSPACE",
      label: "Evaluators",
      path: "/admin/evaluators",
      icon: UserCheck,
    },
    {
      section: "WORKSPACE",
      label: "Audit Logs",
      path: "/admin/audit",
      icon: ShieldCheck,
    },
    {
      section: "ACCOUNT",
      label: "Platform Settings",
      path: "/admin/settings",
      icon: Settings,
    },
    {
      section: "ACCOUNT",
      label: "Admin Profile",
      path: "/admin/my-page",
      icon: ShieldCheck,
    },
  ],
};

function Sidebar({ role = "government", isOpen, onClose }) {
  const items = navigation[role] || navigation.government;
  const location = useLocation();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <motion.aside
        initial={{ x: -260 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:z-30 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white shadow-xs dark:bg-blue-600 dark:text-white">
              <Building2 className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                SetuGov
              </span>

              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                National Innovation Procurement
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-initial max-h-[calc(100vh-9.5rem)] overflow-y-auto px-3 pt-3 pb-1">
          {(() => {
            const sections = [];
            items.forEach((item) => {
              const secName = item.section || "Workspace";
              let sec = sections.find((s) => s.name.toUpperCase() === secName.toUpperCase());
              if (!sec) {
                sec = { name: secName, items: [] };
                sections.push(sec);
              }
              sec.items.push(item);
            });

            return sections.map((sec, idx) => (
              <div key={sec.name} className={idx > 0 ? "mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60" : ""}>
                <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {sec.name}
                </p>
                <div className="space-y-1">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isItemActive =
                      location.pathname === item.path ||
                      (item.path === "/evaluator/my-page" &&
                        (location.pathname === "/evaluator/my-page" || location.pathname === "/evaluator/profile"));

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        aria-current={isItemActive ? "page" : undefined}
                        className={({ isActive }) => {
                          const active = isActive || isItemActive;
                          return `group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium transition-all ${
                            active
                              ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                          }`;
                        }}
                      >
                        {({ isActive }) => {
                          const active = isActive || isItemActive;
                          return (
                            <>
                              {active && (
                                <span
                                  aria-hidden="true"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-blue-600 dark:bg-blue-400"
                                />
                              )}
                              <Icon
                                strokeWidth={active ? 2 : 1.75}
                                aria-hidden="true"
                                className={`h-4 w-4 shrink-0 ${
                                  active
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200"
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                            </>
                          );
                        }}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </nav>

        {/* Bottom Security Card */}
        <div className="mt-3 shrink-0 border-t border-slate-200 p-2.5 dark:border-slate-800">
          <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
            <div className="mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />

              <span className="text-xs font-semibold">
                Secure Workspace
              </span>
            </div>

            <p className="text-xs leading-4 text-slate-400">
              Your workspace activity is protected and audited.
            </p>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

export default Sidebar;
