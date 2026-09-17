import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Reusable Pagination Component for SetuGov
 *
 * @param {number} currentPage - Current active page (1-based)
 * @param {number} totalItems - Total count of items in the dataset
 * @param {number} pageSize - Number of items per page
 * @param {number[]} pageSizeOptions - Options for page size dropdown
 * @param {function} onPageChange - Callback when page changes
 * @param {function} [onPageSizeChange] - Optional callback when page size changes
 * @param {string} [itemName="items"] - Plural name of item being paginated (e.g. "evaluators", "pilots", "proposals")
 * @param {string} [className=""] - Additional custom classes for wrapper
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  itemName = "items",
  className = "",
}) {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {/* Item count summary and page size selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Showing{" "}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {startItem}–{endItem}
          </strong>{" "}
          of{" "}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {totalItems}
          </strong>{" "}
          {itemName}
        </span>

        {onPageSizeChange && pageSizeOptions && pageSizeOptions.length > 0 && (
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3 dark:border-slate-700">
            <span className="text-slate-400">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                if (onPageChange) onPageChange(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            aria-label="Previous Page"
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              if (
                totalPages > 7 &&
                pageNum !== 1 &&
                pageNum !== totalPages &&
                Math.abs(pageNum - safePage) > 1
              ) {
                if (pageNum === 2 || pageNum === totalPages - 1) {
                  return (
                    <span key={pageNum} className="px-1 text-xs text-slate-400">
                      ...
                    </span>
                  );
                }
                return null;
              }

              const isActive = pageNum === safePage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`flex h-8 min-w-[32px] items-center justify-center rounded-xl px-2 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            aria-label="Next Page"
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
