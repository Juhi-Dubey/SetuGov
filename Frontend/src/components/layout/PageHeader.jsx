import { motion } from "framer-motion";
import BackButton from "../common/BackButton";

/**
 * Universal PageHeader for SetuGov.
 * Enforces the canonical header hierarchy:
 * 1. Top action row: [Back / Breadcrumb / Navigation] <-> [Page-level actions]
 * 2. Page introduction:
 *    [Contextual Eyebrow Badge] (rounded-full bg-blue-50 text-blue-700)
 *    Page Title (text-2xl or text-3xl font-bold tracking-tight text-slate-900 dark:text-white)
 *    Page Description (mt-1 or mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 max-w-3xl)
 */
function PageHeader({
  title,
  description,
  badge,
  badgeIcon: BadgeIcon,
  backTo,
  backLabel = "Back",
  onBack,
  showBack = false,
  topActions,
  actions,
  action,
  actionIcon: ActionIcon,
  onAction,
  className = "",
  children,
}) {
  const hasTopRow = showBack || backTo || onBack || topActions;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`mb-6 ${className}`}
    >
      {/* 1. TOP ACTION ROW: Navigation <-> Actions */}
      {hasTopRow && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(showBack || backTo || onBack) && (
              <BackButton
                to={backTo}
                onClick={onBack}
                label={backLabel}
              />
            )}
          </div>
          {topActions && (
            <div className="flex flex-wrap items-center gap-2">
              {topActions}
            </div>
          )}
        </div>
      )}

      {/* 2. PAGE INTRO: Badge -> Title -> Description + Optional Header Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {/* Contextual Badge / Eyebrow */}
          {badge && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {BadgeIcon && <BadgeIcon className="h-3.5 w-3.5 shrink-0" />}
              <span>{badge}</span>
            </div>
          )}

          {/* Page Title */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>

          {/* Page Description */}
          {description && (
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}

          {children}
        </div>

        {/* Right Actions (CTA buttons) */}
        {(actions || action) && (
          <div className="flex flex-wrap items-center gap-2 sm:self-start pt-1 sm:pt-0 shrink-0">
            {actions}
            {action && (
              <button
                type="button"
                onClick={onAction}
                className="btn-primary inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
              >
                {ActionIcon && <ActionIcon className="h-4 w-4" />}
                {action}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default PageHeader;
