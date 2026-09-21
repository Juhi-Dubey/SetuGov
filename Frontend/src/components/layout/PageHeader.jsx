import { motion } from "framer-motion";

function PageHeader({
  title,
  description,
  action,
  actionIcon: ActionIcon,
  onAction,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-4 sm:mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          {title}
        </h1>

        {description && (
          <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-5 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={onAction}
          className="btn-primary inline-flex h-9.5 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-blue-600/15 transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
        >
          {ActionIcon && <ActionIcon className="h-4 w-4" />}
          {action}
        </button>
      )}
    </motion.div>
  );
}

export default PageHeader;
