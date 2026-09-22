import { Inbox, RotateCcw } from "lucide-react";

export function EmptyState({
  title = "No records found",
  description,
  message,
  subtext,
  icon: Icon = Inbox,
  action,
  actionText,
  actionLabel,
  onAction,
  onClick,
  actionIcon: ActionIcon,
  search,
  onClear,
  onReset,
  clearText = "Clear Filters",
  className = "",
  children,
}) {
  const displayTitle = title;
  const displayDescription =
    description ||
    message ||
    subtext ||
    (search
      ? "No records matched your search criteria."
      : "There are no records to display at this time.");

  const handleAction = onAction || onClick;
  const actionButtonText = actionText || actionLabel;
  const handleClear = onClear || onReset;

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 mb-3.5">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {displayTitle}
      </h3>

      {displayDescription && (
        <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {displayDescription}
        </p>
      )}

      {children && <div className="mt-3">{children}</div>}

      {/* Primary Action Button or Custom Action Node */}
      {action || (actionButtonText && handleAction && (
        <button
          type="button"
          onClick={handleAction}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800 dark:bg-indigo-600 dark:hover:bg-indigo-700"
        >
          {ActionIcon && <ActionIcon className="h-4 w-4 shrink-0" />}
          <span>{actionButtonText}</span>
        </button>
      ))}

      {/* Clear Search / Filters Button */}
      {handleClear && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{clearText}</span>
        </button>
      )}
    </div>
  );
}

export default EmptyState;
