import React, { useState, useRef, useEffect } from "react";
import { X, Plus, Sparkles } from "lucide-react";

export const DEFAULT_TECH_SUGGESTIONS = [
  "Artificial Intelligence",
  "Machine Learning",
  "Computer Vision",
  "Natural Language Processing",
  "IoT",
  "Edge Computing",
  "Cloud Computing",
  "Blockchain",
  "Cybersecurity",
  "Robotics",
  "GIS",
  "Data Analytics",
  "Digital Twin",
  "AR/VR",
  "LoRaWAN"
];

/**
 * Professional Tag/Chip Multi-Value Input for Core Technologies
 * Unstop-style interaction: Enter, comma, paste multi-values, backspace removal, case-insensitive deduplication
 */
export default function TechTagInput({
  id = "core-technologies",
  value = [],
  onChange,
  suggestions = DEFAULT_TECH_SUGGESTIONS,
  placeholder = "Type a technology and press Enter",
  disabled = false,
  maxTags = 50,
  className = ""
}) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize: trim, check non-empty, case-insensitive duplicate check
  const normalizeAndAdd = (tagsToAdd) => {
    if (disabled) return;
    const currentTags = Array.isArray(value) ? [...value] : [];
    const currentLower = new Set(currentTags.map(t => t.toLowerCase()));

    let changed = false;
    for (const rawTag of tagsToAdd) {
      const trimmed = rawTag.trim();
      if (!trimmed) continue;
      if (currentLower.has(trimmed.toLowerCase())) continue;
      if (currentTags.length >= maxTags) break;

      currentTags.push(trimmed);
      currentLower.add(trimmed.toLowerCase());
      changed = true;
    }

    if (changed) {
      onChange(currentTags);
    }
  };

  const addSingleTag = (tag) => {
    normalizeAndAdd([tag]);
    setInputValue("");
    setHighlightedSuggestionIndex(-1);
    setShowSuggestions(false);
  };

  const removeTag = (indexToRemove) => {
    if (disabled) return;
    const updated = value.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    // Handle suggestion keyboard navigation if suggestions are visible
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedSuggestionIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        return;
      } else if (e.key === "Enter" && highlightedSuggestionIndex >= 0) {
        e.preventDefault();
        addSingleTag(filteredSuggestions[highlightedSuggestionIndex]);
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        normalizeAndAdd([inputValue]);
        setInputValue("");
        setShowSuggestions(false);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Backspace on empty input removes the last chip
      e.preventDefault();
      removeTag(value.length - 1);
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    if (!pasteData) return;

    // Split by comma, newline, or semicolon
    const items = pasteData.split(/[,;\n\r]+/).map(s => s.trim()).filter(Boolean);
    if (items.length > 0) {
      normalizeAndAdd(items);
      setInputValue("");
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filter suggestions not already selected and matching input query if typed
  const filteredSuggestions = suggestions.filter(sug => {
    const alreadySelected = (value || []).some(
      t => t.toLowerCase() === sug.toLowerCase()
    );
    if (alreadySelected) return false;
    if (!inputValue.trim()) return true;
    return sug.toLowerCase().includes(inputValue.trim().toLowerCase());
  });

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Main Tag Box Container */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`min-h-[46px] w-full rounded-xl border p-2 flex flex-wrap items-center gap-1.5 transition-all duration-150 cursor-text ${
          disabled
            ? "border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 cursor-not-allowed"
            : isFocused
            ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-950"
            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
        }`}
      >
        {/* Rendered Chips */}
        {value.map((tech, index) => (
          <span
            key={`${tech}-${index}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800/80 dark:text-emerald-300 transition-colors animate-in fade-in-50 zoom-in-95"
          >
            <span className="truncate max-w-[200px]">{tech}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="text-emerald-700 hover:text-red-600 dark:text-emerald-400 dark:hover:text-red-400 rounded-sm focus:outline-none focus:ring-1 focus:ring-red-400 p-0.5"
                aria-label={`Remove ${tech}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}

        {/* Text Input inside same container */}
        {!disabled && (
          <div className="flex-1 min-w-[140px]">
            <input
              ref={inputRef}
              id={id}
              type="text"
              value={inputValue}
              disabled={disabled}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
                setHighlightedSuggestionIndex(0);
              }}
              onFocus={() => {
                setIsFocused(true);
                setShowSuggestions(true);
              }}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={value.length === 0 ? placeholder : "Add more..."}
              className="h-7 w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
              aria-autocomplete="list"
            />
          </div>
        )}
      </div>

      {/* Autocomplete Suggestions Popup */}
      {showSuggestions && !disabled && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="mb-1.5 px-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-500" /> Suggested Technologies
            </span>
            <span className="text-[10px] text-slate-400">Click or press Enter to add</span>
          </div>
          <div className="max-h-48 overflow-y-auto flex flex-wrap gap-1.5 p-0.5">
            {filteredSuggestions.slice(0, 15).map((sug, index) => (
              <button
                key={sug}
                type="button"
                onClick={() => addSingleTag(sug)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                  index === highlightedSuggestionIndex
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                }`}
              >
                <Plus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
