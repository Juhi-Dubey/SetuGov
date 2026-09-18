import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export default function MyPageStatCard({
  title,
  value,
  subtext,
  icon: Icon,
  color = "blue", // "blue" | "emerald" | "purple" | "amber" | "rose" | "slate"
  onClick,
  index = 0,
}) {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-100 dark:border-blue-900/50",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-100 dark:border-purple-900/50",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100 dark:border-rose-900/50",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700/60",
  };

  const iconStyle = colorStyles[color] || colorStyles.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      onClick={onClick}
      className={`group rounded-2xl border border-slate-200 bg-white p-4 sm:p-4.5 shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
        onClick
          ? "cursor-pointer hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700"
          : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div
          className={`flex h-8.5 w-8.5 items-center justify-center rounded-xl border ${iconStyle} transition-transform group-hover:scale-105`}
        >
          {Icon && <Icon className="h-4 w-4" />}
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </div>

        {onClick && (
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300" />
        )}
      </div>

      {subtext && (
        <div className="mt-1 text-xs text-slate-400 dark:text-slate-500 truncate">
          {subtext}
        </div>
      )}
    </motion.div>
  );
}
