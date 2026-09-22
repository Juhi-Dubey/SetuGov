import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Standardized BackButton component for SetuGov.
 * Provides consistent compact styling, left arrow icon, light/dark mode support,
 * hover/focus states, and flexible navigation (via `to`, `onClick`, or `navigate(-1)`).
 *
 * @param {string} [label="Back"] - Text label for the button/link
 * @param {string} [to] - Target route path (renders react-router Link if provided and no onClick)
 * @param {Function} [onClick] - Click handler (renders HTML button)
 * @param {string} [className=""] - Additional CSS classes
 * @param {React.ReactNode} [children] - Optional children fallback for label
 * @param {string} [ariaLabel] - Accessibility label
 */
export default function BackButton({
  label = "Back",
  to,
  onClick,
  className = "",
  children,
  ariaLabel,
  ...props
}) {
  const navigate = useNavigate();
  const displayText = children || label;
  const accessibleLabel =
    ariaLabel || (typeof displayText === "string" ? displayText : "Go back");

  const baseClasses = `group inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:hover:border-slate-700 cursor-pointer shrink-0 ${className}`;

  if (to && !onClick) {
    return (
      <Link
        to={to}
        className={baseClasses}
        aria-label={accessibleLabel}
        {...props}
      >
        <ArrowLeft className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:-translate-x-0.5 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200" />
        <span>{displayText}</span>
      </Link>
    );
  }

  const handleClick = (event) => {
    if (onClick) {
      onClick(event);
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={baseClasses}
      aria-label={accessibleLabel}
      {...props}
    >
      <ArrowLeft className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:-translate-x-0.5 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200" />
      <span>{displayText}</span>
    </button>
  );
}
