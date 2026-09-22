import { forwardRef } from "react";

export const Table = forwardRef(function Table(
  {
    columns,
    data,
    keyField = "id",
    onRowClick,
    emptyMessage = "No records found.",
    containerClassName = "",
    className = "",
    children,
    ...props
  },
  ref
) {
  // If columns and data props are provided, render high-level structured data table
  if (Array.isArray(columns) && Array.isArray(data)) {
    return (
      <div className={`w-full overflow-x-auto ${containerClassName}`}>
        <table
          ref={ref}
          className={`w-full caption-bottom text-sm border-collapse ${className}`}
          {...props}
        >
          <TableHeader>
            <TableRow className="border-b border-slate-200 bg-slate-200 text-left text-slate-900 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100">
              {columns.map((col, idx) => (
                <TableHead
                  key={col.key || col.id || idx}
                  className={col.headerClassName || col.className || ""}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header || col.label || col.title || col.key}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-xs text-slate-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIdx) => {
                const rowKey = row[keyField] ?? row.id ?? rowIdx;
                const isClickable = typeof onRowClick === "function";

                return (
                  <TableRow
                    key={rowKey}
                    onClick={isClickable ? () => onRowClick(row, rowIdx) : undefined}
                    className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${
                      isClickable
                        ? "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/60"
                        : "hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
                    }`}
                  >
                    {columns.map((col, colIdx) => {
                      const value = col.key ? row[col.key] : undefined;
                      return (
                        <TableCell
                          key={col.key || col.id || colIdx}
                          className={col.cellClassName || col.className || ""}
                        >
                          {typeof col.render === "function"
                            ? col.render(value, row, rowIdx)
                            : (value ?? "—")}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </table>
      </div>
    );
  }

  // Primitive Table component wrapper
  return (
    <div className={`w-full overflow-x-auto ${containerClassName}`}>
      <table
        ref={ref}
        className={`w-full caption-bottom text-sm border-collapse ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
});

export const TableHeader = forwardRef(function TableHeader(
  { className = "", children, ...props },
  ref
) {
  return (
    <thead ref={ref} className={`[&_tr]:border-b ${className}`} {...props}>
      {children}
    </thead>
  );
});

export const TableBody = forwardRef(function TableBody(
  { className = "", children, ...props },
  ref
) {
  return (
    <tbody
      ref={ref}
      className={`[&_tr:last-child]:border-0 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
});

export const TableFooter = forwardRef(function TableFooter(
  { className = "", children, ...props },
  ref
) {
  return (
    <tfoot
      ref={ref}
      className={`border-t border-slate-200 bg-slate-50 font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 ${className}`}
      {...props}
    >
      {children}
    </tfoot>
  );
});

export const TableRow = forwardRef(function TableRow(
  { className = "", children, ...props },
  ref
) {
  return (
    <tr
      ref={ref}
      className={`border-b border-slate-200 transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/40 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
});

export const TableHead = forwardRef(function TableHead(
  { className = "", children, ...props },
  ref
) {
  return (
    <th
      ref={ref}
      className={`px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
});

export const TableCell = forwardRef(function TableCell(
  { className = "", children, ...props },
  ref
) {
  return (
    <td
      ref={ref}
      className={`px-4 py-3.5 align-middle text-xs sm:text-sm text-slate-700 dark:text-slate-300 ${className}`}
      {...props}
    >
      {children}
    </td>
  );
});

export const TableCaption = forwardRef(function TableCaption(
  { className = "", children, ...props },
  ref
) {
  return (
    <caption
      ref={ref}
      className={`mt-4 text-xs text-slate-500 dark:text-slate-400 ${className}`}
      {...props}
    >
      {children}
    </caption>
  );
});

export default Table;
