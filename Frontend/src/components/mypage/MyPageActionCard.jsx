import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function MyPageActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  color = "blue", // "blue" | "emerald" | "purple" | "amber"
}) {
  const colorMap = {
    blue: "hover:border-blue-300 dark:hover:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
    emerald: "hover:border-emerald-300 dark:hover:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
    purple: "hover:border-purple-300 dark:hover:border-purple-800 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40",
    amber: "hover:border-amber-300 dark:hover:border-amber-800 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40",
  };

  const currentTheme = colorMap[color] || colorMap.blue;

  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 text-left shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${currentTheme}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${currentTheme}`}
        >
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
            {title}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
            {description}
          </p>
        </div>
      </div>

      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-colors group-hover:bg-slate-100 group-hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-white ml-2">
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </motion.button>
  );
}
