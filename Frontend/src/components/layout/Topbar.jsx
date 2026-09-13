
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  CheckCheck,
  RotateCw,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Inbox,
  Clock,
  Loader2,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../services/notificationService.js";

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

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

function Topbar({ onMenuClick, role = "government" }) {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const notificationDropdownRef = useRef(null);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!authUser) return;
    if (!silent) setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const response = await getNotifications({ limit: 20 });
      if (response?.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount ?? 0);
      }
    } catch (err) {
      console.warn("Failed to load notifications:", err);
      if (!silent) {
        setNotificationsError(err?.message || "Unable to load notifications.");
      }
    } finally {
      if (!silent) setNotificationsLoading(false);
    }
  }, [authUser]);

  // Initial load and periodic refresh every 45 seconds when authenticated
  useEffect(() => {
    if (!authUser) return;
    fetchNotifications(true);
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [authUser, fetchNotifications]);

  const roleNames = {
    GOVERNMENT: "Government Officer",
    STARTUP: "Startup Founder",
    EVALUATOR: "Expert Evaluator",
    ADMIN: "Platform Administrator",
    government: "Government Officer",
    startup: "Startup Founder",
    evaluator: "Expert Evaluator",
    admin: "Platform Administrator",
  };

  const user = {
    name: authUser?.name || "Demo User",
    email: authUser?.email || "demo@setugov.in",
    role: roleNames[authUser?.role] || roleNames[role] || "Government Officer",
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(e.target)
      ) {
        setIsNotificationOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setIsNotificationOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleNotificationClick = async (item) => {
    if (!item.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await markNotificationAsRead(item.id);
      } catch (err) {
        console.warn("Error marking notification read:", err);
      }
    }

    if (item.link) {
      setIsNotificationOpen(false);
      navigate(item.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsAsRead();
    } catch (err) {
      console.warn("Error marking all read:", err);
      fetchNotifications(true);
    }
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "CHALLENGE_PUBLISHED":
        return <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "APPLICATION_SUBMITTED":
      case "APPLICATION_RECEIVED":
        return <Rocket className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "APPLICATION_SHORTLISTED":
      case "APPLICATION_SELECTED":
        return <CheckCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case "APPLICATION_REJECTED":
        return <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case "EVALUATION_SUBMITTED":
        return <ClipboardCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "PILOT_CREATED":
      case "PILOT_STARTED":
        return <Rocket className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "SCALE_DECISION":
        return <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "STARTUP_VERIFIED":
        return <CheckCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      navigate("/login", { replace: true });
    }
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
        <div className="relative" ref={notificationDropdownRef}>
          <button
            type="button"
            onClick={() => {
              const nextState = !isNotificationOpen;
              setIsNotificationOpen(nextState);
              if (nextState) {
                setProfileOpen(false);
                fetchNotifications(false);
              }
            }}
            className="relative rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />

            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATIONS PANEL */}
          <AnimatePresence>
            {isNotificationOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-14 w-80 sm:w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 z-50"
              >
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors"
                        title="Mark all as read"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Mark all read</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fetchNotifications(false)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                      title="Refresh"
                    >
                      <RotateCw
                        className={`h-3.5 w-3.5 ${notificationsLoading ? "animate-spin text-indigo-600" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {/* BODY */}
                <div className="max-h-[380px] overflow-y-auto">
                  {notificationsLoading && notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400 mb-2" />
                      <p className="text-xs">Loading notifications...</p>
                    </div>
                  ) : notificationsError ? (
                    <div className="p-6 text-center">
                      <AlertCircle className="mx-auto h-6 w-6 text-rose-500 mb-2" />
                      <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        {notificationsError}
                      </p>
                      <button
                        type="button"
                        onClick={() => fetchNotifications(false)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <RotateCw className="h-3 w-3" />
                        Retry
                      </button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 mb-3">
                        <Inbox className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        No new notifications
                      </p>
                      <p className="mt-1 text-xs text-slate-400 max-w-xs">
                        You don't have any notifications yet. Important updates about challenges, applications, and pilots will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`group flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                            !item.is_read
                              ? "bg-indigo-50/40 hover:bg-indigo-50/70 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                              !item.is_read
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {getNotificationIcon(item.type)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-xs font-semibold truncate ${
                                  !item.is_read
                                    ? "text-slate-900 dark:text-white"
                                    : "text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {item.title}
                              </p>
                              <span className="shrink-0 text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {formatRelativeTime(item.created_at)}
                              </span>
                            </div>

                            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {item.message}
                            </p>

                            {item.link && (
                              <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline">
                                <span>View details</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </div>

                          {!item.is_read && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.04 }}
      type="button"
      onClick={toggleTheme}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
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
