import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

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

  // Compute visible page numbers with standard window
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (safePage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (safePage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages);
    }
    return pages;
  };

  const navButtonBaseClass =
    "flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:bg-white dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:disabled:border-slate-800 dark:disabled:hover:bg-slate-900";

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 ${className}`}
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
            <span className="text-slate-600 dark:text-slate-400">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                if (onPageChange) onPageChange(1);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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

      {/* Page Navigation Buttons (First, Previous, Numbered Pages, Next, Last) */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          {/* First Page («) */}
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => onPageChange(1)}
            aria-label="First Page"
            title="First Page"
            className={navButtonBaseClass}
          >
            <ChevronsLeft className="h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
          </button>

          {/* Previous Page (<) */}
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            aria-label="Previous Page"
            title="Previous Page"
            className={navButtonBaseClass}
          >
            <ChevronLeft className="h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
          </button>

          {/* Numbered Page Buttons */}
          <div className="flex items-center gap-1.5">
            {getPageNumbers().map((pageNum, idx) => {
              if (pageNum === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex h-8 w-6 items-center justify-center text-xs text-slate-400"
                  >
                    ...
                  </span>
                );
              }

              const isActive = pageNum === safePage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page (>) */}
          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            aria-label="Next Page"
            title="Next Page"
            className={navButtonBaseClass}
          >
            <ChevronRight className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" strokeWidth={2} />
          </button>

          {/* Last Page (») */}
          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label="Last Page"
            title="Last Page"
            className={navButtonBaseClass}
          >
            <ChevronsRight className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
