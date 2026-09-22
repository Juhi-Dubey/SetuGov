import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const COLOR_MAP = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  yellow: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  orange: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
  red: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  purple: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
  cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400",
  teal: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  gray: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function StatCard({
  title,
  label,
  value,
  count,
  description,
  subtext,
  change,
  icon: Icon,
  color = "blue",
  iconClass,
  valueColor,
  onClick,
  to,
  href,
  className = "",
  index = 0,
}) {
  const displayTitle = title || label;
  const displayValue = value !== undefined ? value : count;
  const displayDescription = description || subtext || change;
  const isClickable = Boolean(onClick || to || href);

  const iconColorStyle = iconClass || COLOR_MAP[color] || COLOR_MAP.blue;

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {displayTitle}
        </h3>

        {Icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconColorStyle}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <p
          className={`text-2xl font-bold tracking-tight ${
            valueColor || "text-slate-900 dark:text-white"
          }`}
        >
          {displayValue}
        </p>

        {displayDescription && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {displayDescription}
          </p>
        )}
      </div>

      {isClickable && (
        <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-blue-400" />
      )}
    </>
  );

  const baseClasses = `relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
    isClickable
      ? "group cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
      : ""
  } ${className}`;

  if (to || href) {
    const destination = to || href;
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <Link to={destination} className={`block ${baseClasses}`}>
          {cardContent}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className={baseClasses}
    >
      {cardContent}
    </motion.div>
  );
}
