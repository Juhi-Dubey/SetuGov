import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

const SIZE_MAP = {
  sm: { button: "h-7 w-7", icon: "h-3.5 w-3.5" },
  md: { button: "h-8.5 w-8.5", icon: "h-4 w-4" },
  lg: { button: "h-10 w-10", icon: "h-5 w-5" },
};

export function ThemeToggle({
  variant = "icon",
  size = "md",
  showLabel = false,
  className = "",
  ...props
}) {
  const { isDark, toggleTheme } = useTheme();
  const currentSize = SIZE_MAP[size] || SIZE_MAP.md;

  if (variant === "switch") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggleTheme}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
          isDark ? "bg-indigo-600" : "bg-slate-200"
        } ${className}`}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        {...props}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isDark ? "translate-x-5" : "translate-x-0"
          } flex items-center justify-center`}
        >
          {isDark ? (
            <Moon className="h-3 w-3 text-slate-800" />
          ) : (
            <Sun className="h-3 w-3 text-amber-500" />
          )}
        </span>
      </button>
    );
  }

  if (variant === "button" || showLabel) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 ${className}`}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        {...props}
      >
        {isDark ? (
          <>
            <Sun className={`${currentSize.icon} text-amber-400`} />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon className={`${currentSize.icon} text-slate-600`} />
            <span>Dark Mode</span>
          </>
        )}
      </button>
    );
  }

  // Default compact icon button matching SetuGov Topbar
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.04 }}
      type="button"
      onClick={toggleTheme}
      className={`relative flex ${currentSize.button} items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
          >
            <Sun className={`${currentSize.icon} text-amber-400`} />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
          >
            <Moon className={`${currentSize.icon} text-slate-600`} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default ThemeToggle;
