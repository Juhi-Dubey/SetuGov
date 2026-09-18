import { Inbox } from "lucide-react";

export default function MyPageEmptyState({
  title = "No records found",
  description = "There are no items to display right now.",
  icon: Icon = Inbox,
  action,
  actionText,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-slate-400 dark:text-slate-500">
        {description}
      </p>
      {action || (actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {actionText}
        </button>
      ))}
    </div>
  );
}
