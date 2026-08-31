
import { NavLink } from "react-router-dom";
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
      label: "Startups",
      path: "/government/startups",
      icon: Rocket,
    },
    {
      label: "Evaluations",
      path: "/government/evaluations",
      icon: ClipboardCheck,
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
      label: "Reports",
      path: "/government/reports",
      icon: BarChart3,
    },
    {
      label: "Templates",
      path: "/government/templates",
      icon: FileStack,
    },
    {
      label: "Settings",
      path: "/government/settings",
      icon: Settings,
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
      label: "Dashboard",
      path: "/evaluator/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Assignments",
      path: "/evaluator/assignments",
      icon: ClipboardCheck,
    },
    {
      label: "Evaluations",
      path: "/evaluator/evaluations",
      icon: FileText,
    },
  ],

  admin: [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Users",
      path: "/admin/users",
      icon: Users,
    },
    {
      label: "Startups",
      path: "/admin/startups",
      icon: Rocket,
    },
    {
      label: "Criteria",
      path: "/admin/criteria",
      icon: ClipboardCheck,
    },
    {
      label: "Templates",
      path: "/admin/templates",
      icon: FileStack,
    },
    {
      label: "Audit",
      path: "/admin/audit",
      icon: ShieldCheck,
    },
    {
      label: "Settings",
      path: "/admin/settings",
      icon: Settings,
    },
  ],
};

function Sidebar({ role = "government", isOpen, onClose }) {
  const items = navigation[role] || navigation.government;

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
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 lg:static lg:z-auto lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Building2 className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-base font-bold tracking-tight">
                GovInnov
              </h1>

              <p className="text-[11px] text-slate-400">
                Innovation Procurement OS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Workspace
          </p>

          <div className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-[18px] w-[18px] ${
                          isActive
                            ? "text-current"
                            : "text-slate-400 group-hover:text-current"
                        }`}
                      />

                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Bottom Security Card */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />

              <span className="text-xs font-semibold">
                Secure Workspace
              </span>
            </div>

            <p className="text-[11px] leading-5 text-slate-400">
              Your workspace activity is protected and audited.
            </p>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

export default Sidebar;

