import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Search, Loader2, X, ChevronDown } from 'lucide-react';

/**
 * DrugAutocomplete
 * ─────────────────
 * Props:
 *   value        – current drug name string
 *   onChange     – (drugName: string) called when name changes
 *   onSelect     – (drugRecord: object) called when a suggestion is picked
 *   className    – extra wrapper classes
 *   placeholder  – input placeholder
 *   inputClass   – class forwarded to the <input> element
 */

let cachedDrugs = null; // module-level cache so we only fetch once

export default function DrugAutocomplete({
  value = '',
  onChange,
  onSelect,
  className = '',
  placeholder = 'Enter drug / brand name…',
  inputClass = '',
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const searchTimer = useRef(null);

  // ── Load drug database once ──────────────────────────────────────────
  useEffect(() => {
    if (cachedDrugs) { setDbLoaded(true); return; }
    fetch('/drug-lookup.json')
      .then(r => r.json())
      .then(data => {
        cachedDrugs = Array.isArray(data) ? data : [];
        setDbLoaded(true);
      })
      .catch(() => {
        cachedDrugs = [];
        setDbLoaded(true);
      });
  }, []);

  // ── Sync external value ──────────────────────────────────────────────
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // ── Fuzzy search ─────────────────────────────────────────────────────
  // Simple Levenshtein distance for typo tolerance
  const getDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion/deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const search = useCallback((q) => {
    if (!q || q.trim().length < 2 || !cachedDrugs) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const term = q.toLowerCase().trim();
    const results = [];
    for (let i = 0; i < cachedDrugs.length && results.length < 20; i++) {
      const d = cachedDrugs[i];
      const bn = (d.brand || '').toLowerCase();
      const gn = (d.generic || '').toLowerCase();
      
      // Exact substring match is best
      if (bn.includes(term) || gn.includes(term)) {
        results.push(d);
        continue;
      }

      // If they typed at least 4 letters, allow 1-2 typos for fuzzy matching
      if (term.length >= 4) {
        // Compare against substrings of the brand/generic name of similar length
        const bnSub = bn.substring(0, term.length);
        const gnSub = gn.substring(0, term.length);
        
        if (getDistance(term, bnSub) <= 2 || getDistance(term, gnSub) <= 2) {
          results.push(d);
        }
      }
    }
    setSuggestions(results);
    setOpen(results.length > 0);
    setHighlightIdx(-1);
  }, []);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange?.(q);
    clearTimeout(searchTimer.current);
    if (!dbLoaded) return;
    searchTimer.current = setTimeout(() => search(q), 150);
  };

  const handleSelect = (drug) => {
    setQuery(drug.brand || drug.generic || '');
    onChange?.(drug.brand || drug.generic || '');
    onSelect?.(drug);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIdx];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  const clear = () => {
    setQuery('');
    onChange?.('');
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', className)}>
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && search(query)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={cn(
            'pl-7 pr-7 h-7 w-full border border-slate-200 rounded text-xs bg-white',
            'focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400',
            'transition-all duration-150',
            inputClass
          )}
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {!dbLoaded && (
          <Loader2 className="absolute right-1.5 w-3.5 h-3.5 text-slate-400 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden max-h-72 flex flex-col">
          <div className="px-2.5 py-1 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            {suggestions.length} result{suggestions.length !== 1 ? 's' : ''}
          </div>
          <ul ref={listRef} className="overflow-y-auto">
            {suggestions.map((drug, idx) => (
              <li
                key={`${drug.ndc}-${idx}`}
                onMouseDown={() => handleSelect(drug)}
                className={cn(
                  'px-3 py-2 cursor-pointer border-b border-slate-50 last:border-0',
                  'hover:bg-emerald-50 transition-colors duration-100',
                  idx === highlightIdx && 'bg-emerald-50 border-l-2 border-l-emerald-400'
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-xs text-slate-800 truncate">{drug.brand}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{drug.ndc}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">{drug.generic}</div>
                <div className="flex gap-2 mt-0.5 flex-wrap">
                  {drug.form && (
                    <span className="text-[9px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">{drug.form}</span>
                  )}
                  {drug.route && (
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5">{drug.route}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
