import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const VARIANT_CLASSES = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm focus:ring-4 focus:ring-indigo-500/20 active:bg-indigo-800 dark:bg-indigo-600 dark:hover:bg-indigo-700",
  secondary:
    "bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-4 focus:ring-slate-500/20 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
  outline:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-4 focus:ring-slate-500/10 active:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-4 focus:ring-slate-500/10 active:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
  danger:
    "bg-red-600 text-white hover:bg-red-700 shadow-sm focus:ring-4 focus:ring-red-500/20 active:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 shadow-sm focus:ring-4 focus:ring-red-500/20 active:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm focus:ring-4 focus:ring-emerald-500/20 active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700",
  link:
    "bg-transparent text-indigo-600 underline-offset-4 hover:underline focus:ring-2 focus:ring-indigo-500/20 p-0 h-auto dark:text-indigo-400"
};

const SIZE_CLASSES = {
  xs: "h-7 px-2.5 text-xs rounded-lg gap-1.5",
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-9.5 sm:h-10 px-4 text-xs sm:text-sm rounded-xl gap-2",
  lg: "h-11 sm:h-12 px-5 text-sm sm:text-base rounded-xl gap-2.5",
  icon: "h-9 w-9 p-0 rounded-xl justify-center"
};

export const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    type = "button",
    disabled = false,
    loading = false,
    isLoading = false,
    loadingText,
    icon: Icon,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className = "",
    ...props
  },
  ref
) {
  const isBusy = Boolean(loading || isLoading);
  const isDisabled = disabled || isBusy;

  const chosenVariant = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const chosenSize = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  const StartIcon = LeftIcon || Icon;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-semibold transition-all outline-none select-none disabled:cursor-not-allowed disabled:opacity-60 ${chosenVariant} ${chosenSize} ${className}`}
      {...props}
    >
      {isBusy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        <>
          {StartIcon && (
            typeof StartIcon === "function" ? (
              <StartIcon className="h-4 w-4 shrink-0" />
            ) : (
              StartIcon
            )
          )}
          {children && <span>{children}</span>}
          {RightIcon && (
            typeof RightIcon === "function" ? (
              <RightIcon className="h-4 w-4 shrink-0" />
            ) : (
              RightIcon
            )
          )}
        </>
      )}
    </button>
  );
});

export default Button;
