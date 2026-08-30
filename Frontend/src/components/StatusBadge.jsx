// StatusBadge.jsx
// Reusable status badge — used in Pilot Dashboard AND Payment Screen
// Pass a `status` string, it maps automatically to the right color + label.

const STATUS_STYLES = {
  // Pilot statuses
  "On Track": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-600" },
  "At Risk": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-600" },
  "Critical": { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-600" },

  // Payment statuses
  "Paid": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-600" },
  "Pending": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-600" },
  "Upcoming": { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES["Upcoming"];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}