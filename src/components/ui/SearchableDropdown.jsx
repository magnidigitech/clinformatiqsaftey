import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, X, Check, Search } from 'lucide-react';

/**
 * SearchableDropdown
 * ───────────────────
 * A combobox dropdown with live search/filter on typing ("ajax on typing").
 *
 * Props:
 *   value        – selected value (primitive)
 *   onChange     – callback when value changes: (val, selectedOption) => void
 *   options      – array of { value, label, sublabel? } or strings
 *   placeholder  – input placeholder
 *   inputClass   – classes for the input field
 *   className    – extra wrapper classes
 *   disabled     – whether the dropdown is disabled
 */
export default function SearchableDropdown({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select or search…',
  inputClass = '',
  className = '',
  disabled = false,
}) {
  // Normalize options to { value, label, sublabel }
  const normalizedOptions = React.useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value ?? opt.label,
          label: opt.label ?? String(opt.value),
          sublabel: opt.sublabel || ''
        };
      }
      return { value: opt, label: String(opt), sublabel: '' };
    });
  }, [options]);

  // Find currently selected option
  const selectedOption = React.useMemo(() => {
    return normalizedOptions.find(
      opt => opt.value === value || opt.label.toUpperCase() === String(value).toUpperCase()
    );
  }, [normalizedOptions, value]);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Sync display text when value changes externally or when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption ? selectedOption.label : (value || ''));
    }
  }, [value, selectedOption, isOpen]);

  // Filter options based on query
  const filteredOptions = React.useMemo(() => {
    if (!query.trim() || (selectedOption && query.trim() === selectedOption.label)) {
      return normalizedOptions;
    }
    const q = query.toLowerCase().trim();
    return normalizedOptions.filter(opt => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchVal = String(opt.value).toLowerCase().includes(q);
      const matchSub = opt.sublabel.toLowerCase().includes(q);
      return matchLabel || matchVal || matchSub;
    });
  }, [normalizedOptions, query, selectedOption]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        // Reset query back to selected label if user typed something invalid without selecting
        if (selectedOption) {
          setQuery(selectedOption.label);
        } else if (!value) {
          setQuery('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, value]);

  // Auto scroll highlighted item
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIdx];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  const handleSelect = (opt) => {
    setQuery(opt.label);
    setIsOpen(false);
    onChange?.(opt.value, opt);
    inputRef.current?.blur();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setQuery('');
    onChange?.('', null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(idx => Math.min(idx + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(idx => Math.max(idx - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && filteredOptions[highlightIdx]) {
        handleSelect(filteredOptions[highlightIdx]);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setQuery(selectedOption ? selectedOption.label : '');
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            setHighlightIdx(-1);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightIdx(0);
          }}
          onKeyDown={handleKeyDown}
          style={{ paddingRight: value ? '3.5rem' : '2.25rem' }}
          className={cn(
            'h-10 px-3 text-sm rounded-sm border border-slate-200 focus:ring-slate-400 focus:border-slate-400 shadow-sm transition-all w-full bg-white',
            'focus:outline-none truncate',
            inputClass
          )}
        />

        {/* Action icons right */}
        <div className="absolute right-2 flex items-center gap-1 text-slate-400 pointer-events-auto">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-slate-600 rounded-full transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
              } else {
                inputRef.current?.focus();
                setIsOpen(true);
              }
            }}
            className="p-1 hover:text-slate-600 transition-transform duration-150"
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform duration-150', isOpen && 'rotate-180')} />
          </button>
        </div>
      </div>

      {/* Options Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-sm shadow-xl max-h-60 overflow-hidden flex flex-col">
          {filteredOptions.length > 0 && (
            <div className="px-3 py-1 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex justify-between items-center">
              <span>{filteredOptions.length} option{filteredOptions.length !== 1 ? 's' : ''}</span>
              {query && <span className="text-slate-400 lowercase">matching "{query}"</span>}
            </div>
          )}

          <ul ref={listRef} className="overflow-y-auto max-h-52 divide-y divide-slate-50 text-sm">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-slate-400 italic">
                No matching options found
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedOption && selectedOption.value === opt.value;
                const isHighlighted = idx === highlightIdx;

                return (
                  <li
                    key={`${opt.value}-${idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevents blur before selection
                      handleSelect(opt);
                    }}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={cn(
                      'px-3 py-2 cursor-pointer flex items-center justify-between text-xs transition-colors',
                      isHighlighted && 'bg-slate-100 text-slate-900',
                      isSelected && 'bg-slate-100/80 font-bold text-slate-900',
                      !isHighlighted && !isSelected && 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      <span className={cn('truncate', isSelected && 'text-emerald-700')}>{opt.label}</span>
                    </div>
                    {opt.sublabel && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 ml-2">
                        {opt.sublabel}
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
