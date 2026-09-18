import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  Check,
  Mail,
  Phone,
  Calendar,
  Building,
  ShieldCheck,
  Hash,
  ExternalLink,
} from "lucide-react";

export default function MyPageProfileCard({
  user,
  roleBadgeText,
  roleTheme = "blue", // "blue" | "emerald" | "purple" | "amber"
  fields = [],
  tags = [],
  onEditProfile,
  editButtonText = "Edit Details",
}) {
  const [copied, setCopied] = useState(false);

  const themeClasses = {
    blue: {
      avatarBg: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
      accentBadge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/60",
      dot: "bg-blue-500",
    },
    emerald: {
      avatarBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
      accentBadge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/60",
      dot: "bg-emerald-500",
    },
    purple: {
      avatarBg: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-800/60",
      accentBadge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900/60",
      dot: "bg-purple-500",
    },
    amber: {
      avatarBg: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
      accentBadge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60",
      dot: "bg-amber-500",
    },
  };

  const currentTheme = themeClasses[roleTheme] || themeClasses.blue;

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Active Member";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-slate-200 bg-white p-4.5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        {/* LEFT / PROFILE MAIN */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          {/* AVATAR */}
          <div
            className={`flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl border font-bold text-2xl sm:text-3xl shadow-sm ${currentTheme.avatarBg}`}
          >
            {initials}
          </div>

          {/* NAME & CONTACT */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {user?.name || "SetuGov User"}
              </h2>

              {user?.is_verified && (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                  title="Official Identity Verified"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  Verified
                </span>
              )}

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${currentTheme.accentBadge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${currentTheme.dot}`} />
                {roleBadgeText || user?.role}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
              {user?.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{user.email}</span>
                </div>
              )}

              {user?.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{user.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Joined {formattedDate}</span>
              </div>
            </div>

            {/* TAGS (e.g. Domain Expertise, Sectors) */}
            {tags && tags.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT / ACTIONS & ID */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t border-slate-100 lg:border-t-0 dark:border-slate-800">
          {onEditProfile && (
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {editButtonText}
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}

          {user?.id && (
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-500 hover:text-slate-900 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:text-white transition-colors"
              title="Copy Unique Identifier"
            >
              <Hash className="h-3 w-3 text-slate-400" />
              <span>UID: {user.id.slice(0, 8)}...</span>
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3 opacity-60 hover:opacity-100" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* METADATA GRID */}
      {fields && fields.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-100 pt-4.5 dark:border-slate-800/80">
          {fields.map((field, index) => {
            const Icon = field.icon || Building;
            return (
              <div
                key={index}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800/60 dark:bg-slate-800/30"
              >
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium uppercase tracking-wider">
                    {field.label}
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {field.value || "—"}
                </p>
                {field.subtext && (
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {field.subtext}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
