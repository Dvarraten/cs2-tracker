import React, { useState, useEffect, useRef } from "react";
import itemsData from "../data/items.json";
import PasteButton from "./PasteButton";

// items.json is keyed by full-name (e.g. "AK-47 | Redline (Field-Tested)").
// Build a lightweight searchable list once at module load so we don't
// re-walk 13k+ entries on every keystroke.
const ITEM_LIST = Object.entries(itemsData).map(([fullName, data]) => ({
  fullName,
  rarity: data.rarity,
  color: data.color,
  searchKey: fullName.toLowerCase(),
}));

const MAX_RESULTS = 10;
const MIN_CHARS = 2;

export default function ItemAutoComplete({ value, onChange, placeholder, theme }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside the component
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const computeSuggestions = (input) => {
    if (!input || input.length < MIN_CHARS) return [];
    const q = input.toLowerCase();
    const out = [];
    for (let i = 0; i < ITEM_LIST.length && out.length < MAX_RESULTS; i++) {
      if (ITEM_LIST[i].searchKey.includes(q)) out.push(ITEM_LIST[i]);
    }
    return out;
  };

  const updateSuggestionsFor = (input) => {
    const filtered = computeSuggestions(input);
    setSuggestions(filtered);
    setShowDropdown(filtered.length > 0);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e) => {
    const input = e.target.value;
    onChange(input);
    updateSuggestionsFor(input);
  };

  const handlePaste = (val) => {
    onChange(val);
    updateSuggestionsFor(val);
    inputRef.current?.focus();
  };

  const handleSelect = (fullName) => {
    onChange(fullName);
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSelect(suggestions[selectedIndex].fullName);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleFocus = () => {
    if (value && value.length >= MIN_CHARS) {
      // Re-evaluate suggestions on focus in case value was set externally
      updateSuggestionsFor(value);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full ${theme?.input ?? "bg-slate-800/60 border-slate-600/50"} rounded-lg px-4 pr-9 py-2 text-white placeholder-slate-500 focus:outline-none transition-colors border`}
      />
      <PasteButton onPaste={handlePaste} />

      {showDropdown && suggestions.length > 0 && (
        <div
          className={`absolute z-50 left-0 right-0 mt-1 ${theme?.card ?? "bg-slate-800"} border ${theme?.cardBorder ?? "border-slate-700"} rounded-lg shadow-xl max-h-72 overflow-y-auto`}
        >
          {suggestions.map((item, index) => (
            <div
              key={item.fullName}
              onMouseDown={(e) => {
                // Use mousedown so blur doesn't close before click registers
                e.preventDefault();
                handleSelect(item.fullName);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? "bg-white/10 text-white"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <div className="text-sm font-medium truncate">{item.fullName}</div>
              {item.rarity && (
                <div
                  className="text-xs"
                  style={item.color ? { color: item.color } : undefined}
                >
                  {item.rarity}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
