
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Moon,
  Sun,
  FileText,
  Building2,
  Rocket,
  ClipboardCheck,
  Settings,
  X,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const searchDatabase = [
  // Challenges
  {
    type: "Challenge",
    title: "AI-Based Citizen Grievance Management",
    desc: "Public service NLP grievance routing",
    path: "/startup/challenges/1",
    category: "Challenges",
    icon: FileText,
  },
  {
    type: "Challenge",
    title: "Smart Waste Collection System",
    desc: "IoT sensors for municipal routes",
    path: "/startup/challenges/2",
    category: "Challenges",
    icon: FileText,
  },
  {
    type: "Challenge",
    title: "Digital Healthcare Access Platform",
    desc: "Rural telemedicine and diagnostics",
    path: "/startup/challenges/3",
    category: "Challenges",
    icon: FileText,
  },
  {
    type: "Challenge",
    title: "Agricultural Market Intelligence",
    desc: "Predictive crop pricing and logistics",
    path: "/startup/challenges/4",
    category: "Challenges",
    icon: FileText,
  },
  {
    type: "Challenge",
    title: "Drone-Based Infrastructure Surveillance",
    desc: "Automated municipal bridge inspections",
    path: "/startup/challenges/5",
    category: "Challenges",
    icon: FileText,
  },

  // Startups
  {
    type: "Startup",
    title: "TechNova Solutions",
    desc: "Artificial Intelligence & NLP",
    path: "/admin/startups",
    category: "Startups",
    icon: Rocket,
  },
  {
    type: "Startup",
    title: "GreenGrid Technologies",
    desc: "Smart City & IoT Sensors",
    path: "/admin/startups",
    category: "Startups",
    icon: Rocket,
  },
  {
    type: "Startup",
    title: "MediPulse AI",
    desc: "Healthcare Diagnostics",
    path: "/admin/startups",
    category: "Startups",
    icon: Rocket,
  },
  {
    type: "Startup",
    title: "AgriConnect Labs",
    desc: "Agritech Market Platform",
    path: "/admin/startups",
    category: "Startups",
    icon: Rocket,
  },

  // Pages
  {
    type: "Page",
    title: "Startup Challenges Directory",
    desc: "Browse and apply for government problem statements",
    path: "/startup/challenges",
    category: "Navigation",
    icon: FileText,
  },
  {
    type: "Page",
    title: "Pilot Management Workspace",
    desc: "Track milestones, deliverables and sandbox trials",
    path: "/startup/pilot",
    category: "Navigation",
    icon: Rocket,
  },
  {
    type: "Page",
    title: "Startup Documents Vault",
    desc: "Company registration, compliance and pilot proofs",
    path: "/startup/documents",
    category: "Navigation",
    icon: FileText,
  },
  {
    type: "Page",
    title: "Evaluator Assignments",
    desc: "Review assigned startup applications and scorecards",
    path: "/evaluator/assignments",
    category: "Navigation",
    icon: ClipboardCheck,
  },
  {
    type: "Page",
    title: "Submitted Evaluations",
    desc: "View scored applications and decision recommendations",
    path: "/evaluator/evaluations",
    category: "Navigation",
    icon: ClipboardCheck,
  },
  {
    type: "Page",
    title: "Evaluation Criteria Configuration",
    desc: "Manage assessment weights and scoring metrics",
    path: "/admin/criteria",
    category: "Navigation",
    icon: Settings,
  },
  {
    type: "Page",
    title: "User Management Directory",
    desc: "Manage government officers, startups, and evaluators",
    path: "/admin/users",
    category: "Navigation",
    icon: User,
  },
  {
    type: "Page",
    title: "Procurement Templates Library",
    desc: "Configure challenge and evaluation form schemas",
    path: "/admin/templates",
    category: "Navigation",
    icon: FileText,
  },
  {
    type: "Page",
    title: "Platform Settings & Security",
    desc: "Security policies, notifications, and MFA",
    path: "/admin/settings",
    category: "Navigation",
    icon: Settings,
  },
];

function Topbar({ onMenuClick, role = "government" }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const roleNames = {
    government: "Government Officer",
    startup: "Startup Founder",
    evaluator: "Expert Evaluator",
    admin: "Platform Administrator",
  };

  const user = {
    name: "Demo User",
    email: "demo@setugov.in",
    role: roleNames[role] || "Government Officer",
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return searchDatabase.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectResult = (path) => {
    setSearchQuery("");
    setSearchOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    console.log("Logout requested");
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 lg:px-8">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        {/* MOBILE MENU */}
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* GLOBAL SEARCH */}
        <div ref={searchRef} className="relative hidden md:block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search challenges, startups, pages..."
            className="h-10 w-64 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950 lg:w-80"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* SEARCH DROPDOWN */}
          <AnimatePresence>
            {searchOpen && searchQuery.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-12 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 lg:w-96"
              >
                <div className="max-h-80 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <div className="space-y-1">
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {searchResults.length} Result{searchResults.length > 1 ? "s" : ""} Found
                      </p>
                      {searchResults.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectResult(item.path)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                  {item.title}
                                </p>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  {item.type}
                                </span>
                              </div>
                              <p className="truncate text-[11px] text-slate-400">
                                {item.desc}
                              </p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No matching results for "{searchQuery}"
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">

        {/* MOBILE SEARCH */}
        <button
          type="button"
          className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white md:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* NOTIFICATIONS */}
        <button
          type="button"
          className="relative rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-950" />
        </button>

        {/* THEME TOGGLE */}
        <ThemeButton />

        {/* DIVIDER */}
        <div className="mx-2 hidden h-8 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

        {/* PROFILE */}
        <div className="relative">

          <button
            type="button"
            onClick={() =>
              setProfileOpen(
                (previous) => !previous
              )
            }
            className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {/* AVATAR */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
              {user.name.charAt(0)}
            </div>

            {/* USER NAME + ROLE */}
            <div className="hidden text-left lg:block">
              <p className="max-w-32 truncate text-sm font-semibold text-slate-900 dark:text-white">
                {user.name}
              </p>

              <p className="max-w-32 truncate text-[11px] text-slate-400">
                {user.role}
              </p>
            </div>

            <ChevronDown
              className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
                profileOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {/* PROFILE DROPDOWN */}
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -8,
                  scale: 0.98,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                  scale: 0.98,
                }}
                transition={{
                  duration: 0.15,
                }}
                className="absolute right-0 top-14 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900"
              >

                {/* USER INFO */}
                <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                      {user.name.charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {user.name}
                      </p>

                      <p className="truncate text-xs text-slate-400">
                        {user.email}
                      </p>

                      <p className="mt-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                        {user.role}
                      </p>
                    </div>

                  </div>
                </div>

                {/* MENU */}
                <div className="p-2">

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <User className="h-4 w-4" />

                    My Profile
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />

                    Logout
                  </button>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

/* ================================================= */
/* THEME BUTTON */
/* ================================================= */

function ThemeButton() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const savedTheme =
      localStorage.getItem("theme");

    if (savedTheme) {
      return savedTheme === "dark";
    }

    return window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
  });

  useEffect(() => {
    const root =
      document.documentElement;

    root.classList.toggle("dark", dark);

    localStorage.setItem(
      "theme",
      dark ? "dark" : "light"
    );
  }, [dark]);

  const toggleTheme = () => {
    setDark((previous) => !previous);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.04 }}
      type="button"
      onClick={toggleTheme}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
      aria-label={
        dark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      title={
        dark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
    >
      <AnimatePresence
        mode="wait"
        initial={false}
      >
        {dark ? (
          <motion.div
            key="sun"
            initial={{
              rotate: -90,
              opacity: 0,
              scale: 0.7,
            }}
            animate={{
              rotate: 0,
              opacity: 1,
              scale: 1,
            }}
            exit={{
              rotate: 90,
              opacity: 0,
              scale: 0.7,
            }}
            transition={{
              duration: 0.2,
            }}
          >
            <Sun className="h-5 w-5" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{
              rotate: 90,
              opacity: 0,
              scale: 0.7,
            }}
            animate={{
              rotate: 0,
              opacity: 1,
              scale: 1,
            }}
            exit={{
              rotate: -90,
              opacity: 0,
              scale: 0.7,
            }}
            transition={{
              duration: 0.2,
            }}
          >
            <Moon className="h-5 w-5" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default Topbar;
