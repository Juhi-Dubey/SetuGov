import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";

/**
 * Reusable Accessible Searchable Dropdown Component
 * Designed to seamlessly blend with SetuGov input styling
 */
export default function SearchableSelect({
  id,
  name,
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  disabled = false,
  required = false,
  error = "",
  className = "",
  ariaLabel
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Filter options based on search query
  const filteredOptions = options.filter(opt => {
    const text = typeof opt === "string" ? opt : opt.label;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Display label for selected value
  const getDisplayLabel = () => {
    if (!value) return "";
    const matched = options.find(opt => (typeof opt === "string" ? opt === value : opt.value === value));
    if (matched) {
      return typeof matched === "string" ? matched : matched.label;
    }
    // Safe fallback for legacy or unlisted data: display existing value without crashing
    return String(value);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Auto-focus search input on open
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const activeEl = listRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (opt) => {
    const selectedVal = typeof opt === "string" ? opt : opt.value;
    onChange(selectedVal);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const displayValue = getDisplayLabel();

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        aria-label={ariaLabel || label || placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`h-10 w-full rounded-xl border px-3.5 text-xs text-left flex items-center justify-between outline-none transition-all duration-150 ${
          disabled
            ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500"
            : isOpen
            ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            : error
            ? "border-red-400 bg-white dark:border-red-800 dark:bg-slate-950 text-slate-900 dark:text-white"
            : "border-slate-200 bg-white hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 text-slate-900 dark:text-white"
        }`}
      >
        <span className={`truncate ${!displayValue ? "text-slate-400 dark:text-slate-500" : ""}`}>
          {displayValue || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
            isOpen ? "rotate-180 text-emerald-600 dark:text-emerald-400" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-7 text-xs outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto py-1 text-xs divide-y divide-slate-50 dark:divide-slate-800/40"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const optVal = typeof opt === "string" ? opt : opt.value;
                const optLabel = typeof opt === "string" ? opt : opt.label;
                const isSelected = optVal === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={optVal}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-800 font-semibold dark:bg-emerald-950/60 dark:text-emerald-300"
                        : isHighlighted
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-800/80 dark:text-white"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="truncate">{optLabel}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
