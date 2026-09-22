const COLOR_CLASSES = {
  indigo: "bg-indigo-600 dark:bg-indigo-500",
  blue: "bg-blue-600 dark:bg-blue-500",
  emerald: "bg-emerald-500 dark:bg-emerald-400",
  green: "bg-emerald-500 dark:bg-emerald-400",
  amber: "bg-amber-500 dark:bg-amber-400",
  yellow: "bg-amber-500 dark:bg-amber-400",
  rose: "bg-rose-500 dark:bg-rose-400",
  red: "bg-rose-500 dark:bg-rose-400",
  violet: "bg-violet-600 dark:bg-violet-500",
  purple: "bg-violet-600 dark:bg-violet-500",
  slate: "bg-slate-600 dark:bg-slate-400"
};

const SIZE_CLASSES = {
  xs: "h-1",
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5"
};

export function Progress({
  value = 0,
  max = 100,
  size = "md",
  color = "indigo",
  className = "",
  indicatorClassName = "",
  barClassName = "",
  showLabel = false,
  label,
  animated = true,
  ...props
}) {
  const safeMax = max > 0 ? max : 100;
  const percentage = Math.min(100, Math.max(0, Math.round((Number(value || 0) / safeMax) * 100)));

  const barColor = COLOR_CLASSES[color] || COLOR_CLASSES.indigo;
  const trackHeight = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const activeBarClass = barClassName || indicatorClassName || barColor;

  return (
    <div className="w-full space-y-1.5" {...props}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
          <span>{label || "Progress"}</span>
          <span>{percentage}%</span>
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${trackHeight} ${className}`}
      >
        <div
          className={`h-full rounded-full ${activeBarClass} ${
            animated ? "transition-all duration-500 ease-out" : ""
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default Progress;
