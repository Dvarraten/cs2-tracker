import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import PasteButton from "./PasteButton";

// ─── Lazy-loaded index ──────────────────────────────────────────────────────
// items.json now lives in /public so it is fetched at runtime instead of
// being bundled into the JS. Cached at module scope so we only download
// + index it once for the whole app session.
let _indexCache = null;
let _loadPromise = null;

const EXTERIORS_CANON = [
  { name: "Factory New",    abbr: "fn" },
  { name: "Minimal Wear",   abbr: "mw" },
  { name: "Field-Tested",   abbr: "ft" },
  { name: "Well-Worn",      abbr: "ww" },
  { name: "Battle-Scarred", abbr: "bs" },
];

const CATEGORY_ORDER = ["weapon", "finish", "exterior"];
const CATEGORY_LABEL = {
  weapon:   "Weapon",
  finish:   "Skin",
  exterior: "Exterior",
};

function makeAcronym(name) {
  return name
    .split(/[\s\-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toLowerCase();
}

function buildEntry(name, extra = {}) {
  return {
    name,
    lower: name.toLowerCase(),
    acronym: makeAcronym(name),
    ...extra,
  };
}

function buildIndex(itemsData) {
  const weapons = new Set();
  const finishes = new Set();
  for (const v of Object.values(itemsData)) {
    if (v.weapon) weapons.add(v.weapon);
    if (v.finish) finishes.add(v.finish);
  }
  return {
    weapon:   [...weapons].sort().map((n) => buildEntry(n)),
    finish:   [...finishes].sort().map((n) => buildEntry(n)),
    exterior: EXTERIORS_CANON.map((e) => buildEntry(e.name, { abbr: e.abbr })),
  };
}

function loadIndex() {
  if (_indexCache) return Promise.resolve(_indexCache);
  if (_loadPromise) return _loadPromise;
  const url = `${process.env.PUBLIC_URL || ""}/items.json`;
  _loadPromise = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      _indexCache = buildIndex(data);
      return _indexCache;
    })
    .catch((err) => {
      _loadPromise = null; // allow retry on next mount
      throw err;
    });
  return _loadPromise;
}

// ─── Matching ───────────────────────────────────────────────────────────────
function scoreEntry(entry, q) {
  if (!q) return 0;
  if (entry.lower === q) return 1000;
  if (entry.abbr && entry.abbr === q) return 900;          // "fn" === "fn"
  if (entry.lower.startsWith(q)) return 700;               // "fac" → "Factory New"
  if (entry.abbr && entry.abbr.startsWith(q)) return 500;  // "f" → "fn" → "Factory New"
  if (entry.acronym && entry.acronym.startsWith(q)) return 400; // "bk" → "Butterfly Knife"
  if (entry.lower.includes(q)) return 200;                 // "rang" → "Boreal Forest" no, but "phase" → "Doppler Phase 1" etc.
  return 0;
}

function buildSuggestions(index, query, usedCategories) {
  if (!query || !index) return [];
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const out = [];
  for (const cat of CATEGORY_ORDER) {
    if (usedCategories.has(cat)) continue;
    for (const e of index[cat]) {
      const score = scoreEntry(e, q);
      if (score > 0) out.push({ category: cat, name: e.name, score });
    }
  }
  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ai = CATEGORY_ORDER.indexOf(a.category);
    const bi = CATEGORY_ORDER.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
  return out.slice(0, 12);
}

// ─── Tag → display string ───────────────────────────────────────────────────
function combineTagsToValue(tags) {
  const byCat = {};
  for (const t of tags) byCat[t.category] = t.name;
  let s = "";
  if (byCat.weapon)   s = byCat.weapon;
  if (byCat.finish)   s = s ? `${s} | ${byCat.finish}` : byCat.finish;
  if (byCat.exterior) s = s ? `${s} (${byCat.exterior})` : `(${byCat.exterior})`;
  return s;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function ItemAutoComplete({ value, onChange, placeholder, theme }) {
  const [tags, setTags]                 = useState([]);
  const [currentInput, setCurrentInput] = useState(value || "");
  const [index, setIndex]               = useState(_indexCache);
  const [loading, setLoading]           = useState(!_indexCache);
  const [loadError, setLoadError]       = useState(null);

  const [suggestions, setSuggestions]     = useState([]);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const wrapperRef = useRef(null);
  const inputRef   = useRef(null);

  const usedCategories = new Set(tags.map((t) => t.category));

  // Lazy-load index once
  useEffect(() => {
    let cancelled = false;
    if (_indexCache) {
      setIndex(_indexCache);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadIndex()
      .then((idx) => {
        if (!cancelled) {
          setIndex(idx);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err?.message || String(err));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // External reset: parent cleared value (e.g. after submit) → clear tags
  useEffect(() => {
    if (value === "" && (tags.length > 0 || currentInput)) {
      setTags([]);
      setCurrentInput("");
      setSuggestions([]);
      setShowDropdown(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Outside-click closes dropdown
  useEffect(() => {
    const onDoc = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const refreshSuggestions = (input, usedOverride) => {
    const used = usedOverride || usedCategories;
    const s = buildSuggestions(index, input, used);
    setSuggestions(s);
    setShowDropdown(s.length > 0);
    setSelectedIndex(s.length > 0 ? 0 : -1);
  };

  // ─ Mutations: each one updates state AND notifies parent ─
  const emit = (nextTags, nextInput) => {
    const derived = nextTags.length > 0
      ? combineTagsToValue(nextTags)
      : nextInput;
    if (derived !== value) onChange(derived);
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setCurrentInput(v);
    refreshSuggestions(v);
    emit(tags, v);
  };

  const addTag = (suggestion) => {
    const next = [
      ...tags.filter((t) => t.category !== suggestion.category),
      { category: suggestion.category, name: suggestion.name },
    ].sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    );
    setTags(next);
    setCurrentInput("");
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(0);
    emit(next, "");
    inputRef.current?.focus();
  };

  const removeTag = (categoryToRemove) => {
    const next = tags.filter((t) => t.category !== categoryToRemove);
    setTags(next);
    emit(next, currentInput);
    if (currentInput) {
      refreshSuggestions(currentInput, new Set(next.map((t) => t.category)));
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    // Backspace on empty input pops the last tag
    if (e.key === "Backspace" && !currentInput && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1].category);
      return;
    }

    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((p) => (p < suggestions.length - 1 ? p + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((p) => (p > 0 ? p - 1 : suggestions.length - 1));
        break;
      case "Enter":
      case "Tab":
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          addTag(suggestions[selectedIndex]);
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
    if (currentInput) refreshSuggestions(currentInput);
  };

  const handlePaste = (val) => {
    setTags([]);
    setCurrentInput(val);
    refreshSuggestions(val, new Set());
    emit([], val);
    inputRef.current?.focus();
  };

  // ─ Render ─
  const wrapperClasses = `flex flex-wrap items-center gap-1.5 w-full ${
    theme?.input ?? "bg-slate-800/60 border-slate-600/50"
  } rounded-lg pl-2 pr-9 py-1.5 min-h-[40px] border focus-within:border-indigo-400/60 transition-colors cursor-text`;

  return (
    <div ref={wrapperRef} className="relative">
      <div className={wrapperClasses} onClick={() => inputRef.current?.focus()}>
        {tags.map((tag) => (
          <span
            key={tag.category}
            className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-md bg-white/10 text-white text-sm border border-white/5"
            title={CATEGORY_LABEL[tag.category]}
          >
            <span className="text-[9px] uppercase tracking-wider opacity-60">
              {CATEGORY_LABEL[tag.category]}
            </span>
            <span className="text-sm">{tag.name}</span>
            <button
              type="button"
              onMouseDown={(e) => {
                // mousedown so the focus-blur dance doesn't swallow the click
                e.preventDefault();
                e.stopPropagation();
                removeTag(tag.category);
              }}
              className="ml-0.5 text-slate-300 hover:text-white p-0.5 rounded hover:bg-white/10"
              aria-label={`Remove ${CATEGORY_LABEL[tag.category]} tag`}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={
            tags.length === 0
              ? loading ? "Loading items…" : placeholder
              : "Add tag…"
          }
          autoComplete="off"
          className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-white placeholder-slate-500 px-1 py-1 text-sm"
        />
      </div>
      <PasteButton onPaste={handlePaste} />

      {showDropdown && suggestions.length > 0 && (
        <div
          className={`absolute z-50 left-0 right-0 mt-1 ${
            theme?.card ?? "bg-slate-800"
          } border ${
            theme?.cardBorder ?? "border-slate-700"
          } rounded-lg shadow-xl max-h-72 overflow-y-auto`}
        >
          {suggestions.map((s, i) => (
            <div
              key={`${s.category}:${s.name}`}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`flex items-center justify-between gap-3 px-3 py-2 cursor-pointer transition-colors ${
                i === selectedIndex
                  ? "bg-white/10 text-white"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <div className="text-sm font-medium truncate">{s.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 shrink-0">
                {CATEGORY_LABEL[s.category]}
              </div>
            </div>
          ))}
        </div>
      )}

      {loadError && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-red-900/40 border border-red-500/40 rounded-lg px-3 py-2 text-xs text-red-200">
          Failed to load item list: {loadError}
        </div>
      )}
    </div>
  );
}
