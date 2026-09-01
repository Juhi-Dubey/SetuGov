
import { AlertCircle } from "lucide-react";

function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error,
  disabled = false,
  rows = 5,
  helperText,
}) {
  const baseClasses =
    "w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-white";

  const stateClasses = error
    ? "border-red-400 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/60"
    : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-800";

  const commonProps = {
    id: name,
    name,
    value: value ?? "",
    onChange,
    placeholder,
    disabled,
    required,
    className: `${baseClasses} ${stateClasses}`,
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {type === "textarea" ? (
        <textarea
          {...commonProps}
          rows={rows}
          className={`${commonProps.className} resize-none py-3.5`}
        />
      ) : (
        <input
          {...commonProps}
          type={type}
          className={`${commonProps.className} h-12`}
        />
      )}

      {helperText && !error && (
        <p className="text-xs leading-5 text-slate-400">
          {helperText}
        </p>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}

export default FormField;

